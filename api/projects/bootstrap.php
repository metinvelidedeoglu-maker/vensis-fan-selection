<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/edit/bootstrap.php';

function project_api_authorize(string $method, bool $requireCsrf = false): array
{
    edit_require_method($method);
    edit_require_same_origin();
    $config = edit_config();
    edit_require_configured($config);
    edit_require_session($config);
    edit_require_persistent_config($config);
    if ($requireCsrf) {
        edit_require_csrf();
    }
    return $config;
}

function project_store_directory(): string
{
    $configPath = edit_persistent_config_path();
    if ($configPath === '') {
        throw new EditApiException('Persistent project storage is unavailable.', 500);
    }
    $directory = dirname($configPath);
    if (!is_dir($directory) && !@mkdir($directory, 0700, true) && !is_dir($directory)) {
        throw new EditApiException('Persistent project storage is unavailable.', 500);
    }
    @chmod($directory, 0700);
    return $directory;
}

function project_store_path(): string
{
    return project_store_directory() . DIRECTORY_SEPARATOR . 'projects-v1.json';
}

function project_store_empty(): array
{
    return [
        'version' => 1,
        'updatedAt' => gmdate('c'),
        'projects' => [],
        'tombstones' => [],
    ];
}

function project_store_load_unlocked(string $path): array
{
    if (!is_file($path)) {
        return project_store_empty();
    }
    $size = @filesize($path);
    if (!is_int($size) || $size < 0 || $size > 25 * 1024 * 1024) {
        throw new EditApiException('Project storage is invalid.', 500);
    }
    $source = @file_get_contents($path);
    if (!is_string($source)) {
        throw new EditApiException('Project storage could not be read.', 500);
    }
    try {
        $state = json_decode($source, true, 128, JSON_THROW_ON_ERROR);
    } catch (JsonException) {
        throw new EditApiException('Project storage contains invalid data.', 500);
    }
    if (!is_array($state) || !is_array($state['projects'] ?? null) || !is_array($state['tombstones'] ?? null)) {
        throw new EditApiException('Project storage contains invalid records.', 500);
    }
    return $state;
}

function project_store_lock(int $operation): array
{
    $path = project_store_path();
    $lockPath = $path . '.lock';
    $handle = @fopen($lockPath, 'c+');
    if ($handle === false || !@chmod($lockPath, 0600) || !flock($handle, $operation)) {
        if (is_resource($handle)) {
            @fclose($handle);
        }
        throw new EditApiException('Project storage lock is unavailable.', 500);
    }
    return [$path, $handle];
}

function project_store_unlock($handle): void
{
    @flock($handle, LOCK_UN);
    @fclose($handle);
}

function project_store_read(): array
{
    [$path, $handle] = project_store_lock(LOCK_SH);
    try {
        return project_store_load_unlocked($path);
    } finally {
        project_store_unlock($handle);
    }
}

function project_store_mutate(callable $mutator): array
{
    [$path, $handle] = project_store_lock(LOCK_EX);
    try {
        $state = project_store_load_unlocked($path);
        $result = $mutator($state);
        $state['version'] = 1;
        $state['updatedAt'] = gmdate('c');
        $temporary = @tempnam(dirname($path), '.projects-');
        if (!is_string($temporary)) {
            throw new EditApiException('Project storage could not be written.', 500);
        }
        try {
            $json = json_encode($state, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
            if (@file_put_contents($temporary, $json, LOCK_EX) === false || !@chmod($temporary, 0600) || !@rename($temporary, $path)) {
                throw new EditApiException('Project storage could not be written.', 500);
            }
        } finally {
            if (is_file($temporary)) {
                @unlink($temporary);
            }
        }
        return is_array($result) ? $result : [];
    } finally {
        project_store_unlock($handle);
    }
}

function project_id(mixed $value): string
{
    if (!is_string($value)) {
        throw new EditApiException('Project ID is invalid.', 422);
    }
    $value = trim($value);
    if (preg_match('/^prj_[A-Za-z0-9_-]{6,120}$/', $value) !== 1) {
        throw new EditApiException('Project ID is invalid.', 422);
    }
    return $value;
}

function project_text(mixed $value, string $field, int $maximumLength, bool $allowLines = false): string
{
    if (!is_string($value) && !is_int($value) && !is_float($value)) {
        throw new EditApiException("Project field {$field} is invalid.", 422);
    }
    $value = trim((string) $value);
    $controls = $allowLines ? '/[\x00-\x08\x0B\x0C\x0E-\x1F]/' : '/[\x00-\x1F]/';
    if (strlen($value) > $maximumLength || preg_match($controls, $value)) {
        throw new EditApiException("Project field {$field} is invalid.", 422);
    }
    return $value;
}

function project_number(mixed $value, string $field, float $minimum, float $maximum): float|int
{
    if (!is_int($value) && !is_float($value) && !(is_string($value) && is_numeric($value))) {
        throw new EditApiException("Project field {$field} is invalid.", 422);
    }
    $number = (float) $value;
    if (!is_finite($number) || $number < $minimum || $number > $maximum) {
        throw new EditApiException("Project field {$field} is outside the allowed range.", 422);
    }
    return floor($number) === $number ? (int) $number : $number;
}

function project_timestamp(mixed $value, string $field, ?string $fallback = null): string
{
    if (($value === null || $value === '') && $fallback !== null) {
        $value = $fallback;
    }
    if (!is_string($value) || strlen($value) > 40) {
        throw new EditApiException("Project field {$field} is invalid.", 422);
    }
    try {
        $date = new DateTimeImmutable($value);
    } catch (Throwable) {
        throw new EditApiException("Project field {$field} is invalid.", 422);
    }
    return $date->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d\TH:i:s.v\Z');
}

function project_point(mixed $value, string $field): ?array
{
    if ($value === null) {
        return null;
    }
    if (!is_array($value)) {
        throw new EditApiException("Project field {$field} is invalid.", 422);
    }
    return [
        'q' => project_number($value['q'] ?? 0, $field . '.q', 0, 1000000000),
        'p' => project_number($value['p'] ?? 0, $field . '.p', 0, 1000000000),
    ];
}

function project_item(array $source): array
{
    $result = [];
    $strings = [
        'itemKey' => [360, false], 'id' => [180, false], 'key' => [240, false],
        'productKey' => [240, false], 'model' => [240, false], 'series' => [240, false],
        'manufacturer' => [180, false], 'image' => [4096, false], 'voltage' => [120, false],
        'frequency' => [120, false], 'description' => [5000, true],
        'productType' => [24, false], 'category' => [240, false], 'orderCode' => [240, false],
        'power' => [120, false], 'currentText' => [120, false], 'phase' => [120, false],
        'ip' => [120, false], 'insulation' => [240, false], 'lumen' => [120, false],
        'operatingTemperature' => [120, false],
        'priceSource' => [180, false], 'priceCurrency' => [12, false],
    ];
    foreach ($strings as $field => [$maximumLength, $allowLines]) {
        if (array_key_exists($field, $source)) {
            $result[$field] = project_text($source[$field], $field, $maximumLength, $allowLines);
        }
    }
    if (array_key_exists('mode', $source)) {
        $mode = project_text($source['mode'], 'mode', 30);
        if (!in_array($mode, ['selection', 'catalog', 'custom'], true)) {
            throw new EditApiException('Project item mode is invalid.', 422);
        }
        $result['mode'] = $mode;
    }
    if (array_key_exists('productType', $result) && !in_array($result['productType'], ['fan', 'electrical'], true)) {
        throw new EditApiException('Project item product type is invalid.', 422);
    }
    $numbers = [
        'nominalAirflow' => [0, 1000000000], 'motorPower' => [0, 1000000],
        'current' => [0, 1000000], 'speed' => [0, 1000000], 'noise' => [0, 10000],
        'price' => [0, 1000000000], 'discountPercent' => [0, 100], 'quantity' => [1, 1000000],
    ];
    foreach ($numbers as $field => [$minimum, $maximum]) {
        if (array_key_exists($field, $source)) {
            $result[$field] = project_number($source[$field], $field, $minimum, $maximum);
        }
    }
    foreach (['required', 'selected'] as $field) {
        if (array_key_exists($field, $source)) {
            $result[$field] = project_point($source[$field], $field);
        }
    }
    foreach (['addedAt', 'updatedAt'] as $field) {
        if (array_key_exists($field, $source) && $source[$field] !== '') {
            $result[$field] = project_timestamp($source[$field], $field);
        }
    }
    return $result;
}

function project_status(mixed $value): string
{
    $status = project_text($value, 'status', 24);
    if (!in_array($status, ['draft', 'quoted', 'won', 'ordered', 'lost'], true)) {
        throw new EditApiException('Project status is invalid.', 422);
    }
    return $status;
}

function project_order_id(mixed $value): string
{
    if (!is_string($value)) {
        throw new EditApiException('Order ID is invalid.', 422);
    }
    $value = trim($value);
    if (preg_match('/^ord_[A-Za-z0-9_-]{6,120}$/', $value) !== 1) {
        throw new EditApiException('Order ID is invalid.', 422);
    }
    return $value;
}

function project_order_date(mixed $value, string $fallback): string
{
    $date = project_text(($value === null || $value === '') ? $fallback : $value, 'orderDate', 10);
    if (preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $date, $parts) !== 1
        || !checkdate((int) $parts[2], (int) $parts[3], (int) $parts[1])) {
        throw new EditApiException('Order date is invalid.', 422);
    }
    return $date;
}

function project_order_boolean(mixed $value, string $field): bool
{
    if (!is_bool($value)) {
        throw new EditApiException("Order field {$field} is invalid.", 422);
    }
    return $value;
}

function project_order_item(array $source): array
{
    $item = project_item($source);
    $fields = [
        'itemKey', 'mode', 'productType', 'productKey', 'model', 'series', 'manufacturer', 'description',
        'category', 'orderCode', 'power', 'currentText', 'phase', 'ip', 'insulation', 'lumen', 'operatingTemperature',
        'nominalAirflow', 'required', 'selected', 'voltage', 'frequency', 'motorPower',
        'current', 'speed', 'quantity',
    ];
    $result = array_intersect_key($item, array_flip($fields));
    $result['included'] = array_key_exists('included', $source)
        ? project_order_boolean($source['included'], 'included')
        : true;
    return $result;
}

function project_order(array $source, array $fallbackProject): array
{
    $createdAt = project_timestamp($source['createdAt'] ?? null, 'order.createdAt', gmdate('c'));
    $updatedAt = project_timestamp($source['updatedAt'] ?? null, 'order.updatedAt', $createdAt);
    $status = project_text($source['status'] ?? 'draft', 'order.status', 24);
    if (!in_array($status, ['draft', 'sent'], true)) {
        throw new EditApiException('Order status is invalid.', 422);
    }
    $recipientType = project_text($source['recipientType'] ?? 'manufacturer', 'recipientType', 24);
    if (!in_array($recipientType, ['manufacturer', 'distributor'], true)) {
        throw new EditApiException('Order recipient type is invalid.', 422);
    }

    $projectSource = is_array($source['project'] ?? null) ? $source['project'] : [];
    $nestedProjectId = project_id($projectSource['id'] ?? $fallbackProject['id']);
    if ($nestedProjectId !== $fallbackProject['id']) {
        throw new EditApiException('Order project is invalid.', 422);
    }

    $itemsSource = $source['items'] ?? [];
    if (!is_array($itemsSource) || count($itemsSource) > 500) {
        throw new EditApiException('Order items are invalid.', 422);
    }
    $items = [];
    foreach ($itemsSource as $item) {
        if (!is_array($item)) {
            throw new EditApiException('Order item is invalid.', 422);
        }
        $items[] = project_order_item($item);
    }

    $sentAt = '';
    if (($source['sentAt'] ?? '') !== '') {
        $sentAt = project_timestamp($source['sentAt'], 'order.sentAt');
    }

    return [
        'id' => project_order_id($source['id'] ?? null),
        'orderNumber' => project_text($source['orderNumber'] ?? '', 'orderNumber', 160),
        'sourceQuotationNumber' => project_text($source['sourceQuotationNumber'] ?? '', 'sourceQuotationNumber', 160),
        'status' => $status,
        'orderDate' => project_order_date($source['orderDate'] ?? null, substr($createdAt, 0, 10)),
        'createdAt' => $createdAt,
        'updatedAt' => $updatedAt,
        'sentAt' => $sentAt,
        'orderingCompany' => project_text($source['orderingCompany'] ?? '', 'orderingCompany', 240),
        'recipientType' => $recipientType,
        'supplier' => project_text($source['supplier'] ?? '', 'supplier', 240),
        'supplierContact' => project_text($source['supplierContact'] ?? '', 'supplierContact', 240),
        'supplierEmail' => project_text($source['supplierEmail'] ?? '', 'supplierEmail', 320),
        'deliveryTime' => project_text($source['deliveryTime'] ?? '', 'deliveryTime', 500),
        'deliveryPlace' => project_text($source['deliveryPlace'] ?? '', 'deliveryPlace', 500),
        'paymentTerms' => project_text($source['paymentTerms'] ?? '', 'paymentTerms', 500),
        'note' => project_text($source['note'] ?? '', 'note', 5000, true),
        'project' => [
            'id' => $nestedProjectId,
            'name' => project_text($projectSource['name'] ?? $fallbackProject['name'], 'order.project.name', 240),
            'reference' => project_text($projectSource['reference'] ?? $fallbackProject['reference'], 'order.project.reference', 500),
            'contact' => project_text($projectSource['contact'] ?? $fallbackProject['contact'], 'order.project.contact', 240),
        ],
        'items' => $items,
    ];
}

function project_record(mixed $value): array
{
    if (!is_array($value)) {
        throw new EditApiException('Project record is invalid.', 422);
    }
    $id = project_id($value['id'] ?? null);
    $createdAt = project_timestamp($value['createdAt'] ?? null, 'createdAt', gmdate('c'));
    $updatedAt = project_timestamp($value['updatedAt'] ?? null, 'updatedAt', $createdAt);
    $metaSource = is_array($value['meta'] ?? null) ? $value['meta'] : [];
    $name = project_text($metaSource['name'] ?? $value['name'] ?? '', 'name', 240);
    $reference = project_text($metaSource['reference'] ?? $value['reference'] ?? '', 'reference', 500);
    $contact = project_text($metaSource['contact'] ?? $value['contact'] ?? '', 'contact', 240);
    $globalDiscount = project_number($metaSource['globalDiscount'] ?? 0, 'globalDiscount', 0, 100);
    $status = project_status($metaSource['status'] ?? $value['status'] ?? 'draft');
    $lastQuotationNumber = project_text($metaSource['lastQuotationNumber'] ?? '', 'lastQuotationNumber', 160);
    $itemsSource = $value['items'] ?? [];
    if (!is_array($itemsSource) || count($itemsSource) > 500) {
        throw new EditApiException('Project items are invalid.', 422);
    }
    $items = [];
    foreach ($itemsSource as $item) {
        if (!is_array($item)) {
            throw new EditApiException('Project item is invalid.', 422);
        }
        $items[] = project_item($item);
    }
    $ordersSource = $metaSource['orders'] ?? [];
    if (!is_array($ordersSource) || count($ordersSource) > 100) {
        throw new EditApiException('Project orders are invalid.', 422);
    }
    $orders = [];
    $fallbackProject = ['id' => $id, 'name' => $name, 'reference' => $reference, 'contact' => $contact];
    foreach ($ordersSource as $order) {
        if (!is_array($order)) {
            throw new EditApiException('Project order is invalid.', 422);
        }
        $orders[] = project_order($order, $fallbackProject);
    }
    return [
        'id' => $id,
        'name' => $name !== '' ? $name : 'Untitled Project',
        'reference' => $reference,
        'contact' => $contact,
        'status' => $status,
        'createdAt' => $createdAt,
        'updatedAt' => $updatedAt,
        'meta' => [
            'name' => $name,
            'reference' => $reference,
            'contact' => $contact,
            'globalDiscount' => $globalDiscount,
            'status' => $status,
            'lastQuotationNumber' => $lastQuotationNumber,
            'orders' => $orders,
        ],
        'items' => $items,
    ];
}

function project_public_state(array $state): array
{
    return [
        'projects' => array_values($state['projects']),
        'tombstones' => $state['tombstones'],
        'updatedAt' => (string) ($state['updatedAt'] ?? ''),
    ];
}
