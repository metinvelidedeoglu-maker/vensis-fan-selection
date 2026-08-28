<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/edit/bootstrap.php';

function custom_product_api_authorize(string $method, bool $requireCsrf = false): array
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

function custom_product_store_directory(): string
{
    $configPath = edit_persistent_config_path();
    if ($configPath === '') {
        throw new EditApiException('Persistent custom product storage is unavailable.', 500);
    }
    $directory = dirname($configPath);
    if (!is_dir($directory) && !@mkdir($directory, 0700, true) && !is_dir($directory)) {
        throw new EditApiException('Persistent custom product storage is unavailable.', 500);
    }
    @chmod($directory, 0700);
    return $directory;
}

function custom_product_store_path(): string
{
    return custom_product_store_directory() . DIRECTORY_SEPARATOR . 'custom-products-v1.json';
}

function custom_product_store_empty(): array
{
    return ['version' => 1, 'updatedAt' => gmdate('c'), 'products' => []];
}

function custom_product_store_load_unlocked(string $path): array
{
    if (!is_file($path)) {
        return custom_product_store_empty();
    }
    $size = @filesize($path);
    if (!is_int($size) || $size < 0 || $size > 12 * 1024 * 1024) {
        throw new EditApiException('Custom product storage is invalid.', 500);
    }
    $source = @file_get_contents($path);
    if (!is_string($source)) {
        throw new EditApiException('Custom product storage could not be read.', 500);
    }
    try {
        $state = json_decode($source, true, 128, JSON_THROW_ON_ERROR);
    } catch (JsonException) {
        throw new EditApiException('Custom product storage contains invalid data.', 500);
    }
    if (!is_array($state) || !is_array($state['products'] ?? null)) {
        throw new EditApiException('Custom product storage contains invalid records.', 500);
    }
    return $state;
}

function custom_product_store_lock(int $operation): array
{
    $path = custom_product_store_path();
    $lockPath = $path . '.lock';
    $handle = @fopen($lockPath, 'c+');
    if ($handle === false || !@chmod($lockPath, 0600) || !flock($handle, $operation)) {
        if (is_resource($handle)) {
            @fclose($handle);
        }
        throw new EditApiException('Custom product storage lock is unavailable.', 500);
    }
    return [$path, $handle];
}

function custom_product_store_unlock($handle): void
{
    @flock($handle, LOCK_UN);
    @fclose($handle);
}

function custom_product_store_read(): array
{
    [$path, $handle] = custom_product_store_lock(LOCK_SH);
    try {
        return custom_product_store_load_unlocked($path);
    } finally {
        custom_product_store_unlock($handle);
    }
}

function custom_product_store_mutate(callable $mutator): array
{
    [$path, $handle] = custom_product_store_lock(LOCK_EX);
    try {
        $state = custom_product_store_load_unlocked($path);
        $result = $mutator($state);
        $state['version'] = 1;
        $state['updatedAt'] = gmdate('c');
        $temporary = @tempnam(dirname($path), '.custom-products-');
        if (!is_string($temporary)) {
            throw new EditApiException('Custom product storage could not be written.', 500);
        }
        try {
            $json = json_encode($state, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
            if (@file_put_contents($temporary, $json, LOCK_EX) === false || !@chmod($temporary, 0600) || !@rename($temporary, $path)) {
                throw new EditApiException('Custom product storage could not be written.', 500);
            }
        } finally {
            if (is_file($temporary)) {
                @unlink($temporary);
            }
        }
        return is_array($result) ? $result : [];
    } finally {
        custom_product_store_unlock($handle);
    }
}

function custom_product_text(mixed $value, string $field, int $maximumLength, bool $allowLines = false): string
{
    if ($value === null) {
        return '';
    }
    if (!is_string($value) && !is_int($value) && !is_float($value)) {
        throw new EditApiException("Custom product field {$field} is invalid.", 422);
    }
    $value = trim((string) $value);
    $controls = $allowLines ? '/[\x00-\x08\x0B\x0C\x0E-\x1F]/' : '/[\x00-\x1F]/';
    if (strlen($value) > $maximumLength || preg_match($controls, $value)) {
        throw new EditApiException("Custom product field {$field} is invalid.", 422);
    }
    return $value;
}

function custom_product_number(mixed $value, float $minimum = 0, float $maximum = 100000000): float
{
    if ($value === '' || $value === null) {
        return 0.0;
    }
    if (!is_numeric($value)) {
        throw new EditApiException('Custom product numeric field is invalid.', 422);
    }
    $number = (float) $value;
    if (!is_finite($number) || $number < $minimum || $number > $maximum) {
        throw new EditApiException('Custom product numeric field is invalid.', 422);
    }
    return $number;
}

function custom_product_timestamp(mixed $value, string $field): string
{
    if (!is_string($value) || strlen($value) > 40) {
        throw new EditApiException("Custom product field {$field} is invalid.", 422);
    }
    try {
        $date = new DateTimeImmutable($value);
    } catch (Throwable) {
        throw new EditApiException("Custom product field {$field} is invalid.", 422);
    }
    return $date->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d\TH:i:s.v\Z');
}

function custom_product_id(mixed $value): string
{
    $id = custom_product_text($value, 'id', 120);
    if (preg_match('/^[A-Za-z0-9][A-Za-z0-9_-]{2,119}$/', $id) !== 1) {
        throw new EditApiException('Custom product ID is invalid.', 422);
    }
    return $id;
}

function custom_product_image(mixed $value): string
{
    $image = custom_product_text($value, 'image', 10000);
    if ($image === '') {
        return '';
    }
    if (preg_match('#^https://#i', $image) === 1) {
        return $image;
    }
    if (preg_match('#^data:image/(?:webp|png|jpeg);base64,[A-Za-z0-9+/=]+$#', $image) === 1) {
        return $image;
    }
    throw new EditApiException('Custom product image is invalid.', 422);
}

function custom_product_record(mixed $value): array
{
    if (!is_array($value)) {
        throw new EditApiException('Custom product record is invalid.', 422);
    }
    $type = custom_product_text($value['productType'] ?? '', 'productType', 20);
    if (!in_array($type, ['fan', 'electrical'], true)) {
        throw new EditApiException('Custom product type is invalid.', 422);
    }
    $model = custom_product_text($value['model'] ?? '', 'model', 240);
    if ($model === '') {
        throw new EditApiException('Custom product model is required.', 422);
    }
    return [
        'id' => custom_product_id($value['id'] ?? ''),
        'productType' => $type,
        'model' => $model,
        'series' => custom_product_text($value['series'] ?? '', 'series', 300),
        'manufacturer' => custom_product_text($value['manufacturer'] ?? '', 'manufacturer', 240),
        'description' => custom_product_text($value['description'] ?? '', 'description', 4000, true),
        'nominalAirflow' => custom_product_number($value['nominalAirflow'] ?? 0),
        'voltage' => custom_product_text($value['voltage'] ?? '', 'voltage', 160),
        'frequency' => custom_product_text($value['frequency'] ?? '', 'frequency', 160),
        'motorPower' => custom_product_number($value['motorPower'] ?? 0),
        'speed' => custom_product_number($value['speed'] ?? 0),
        'current' => custom_product_number($value['current'] ?? 0),
        'noise' => custom_product_number($value['noise'] ?? 0),
        'power' => custom_product_text($value['power'] ?? '', 'power', 160),
        'lumen' => custom_product_text($value['lumen'] ?? '', 'lumen', 160),
        'ip' => custom_product_text($value['ip'] ?? '', 'ip', 160),
        'price' => custom_product_number($value['price'] ?? 0),
        'discountPercent' => custom_product_number($value['discountPercent'] ?? 0, 0, 100),
        'quantity' => max(1, min(100000, (int) round(custom_product_number($value['quantity'] ?? 1, 1, 100000)))),
        'image' => custom_product_image($value['image'] ?? ''),
        'createdAt' => custom_product_timestamp($value['createdAt'] ?? '', 'createdAt'),
        'updatedAt' => custom_product_timestamp($value['updatedAt'] ?? '', 'updatedAt'),
    ];
}

function custom_product_public_state(array $state): array
{
    $products = array_values(array_filter($state['products'] ?? [], 'is_array'));
    usort($products, static function (array $left, array $right): int {
        $brand = strnatcasecmp((string) ($left['manufacturer'] ?? ''), (string) ($right['manufacturer'] ?? ''));
        return $brand !== 0 ? $brand : strnatcasecmp((string) ($left['model'] ?? ''), (string) ($right['model'] ?? ''));
    });
    return ['products' => $products, 'updatedAt' => (string) ($state['updatedAt'] ?? '')];
}
