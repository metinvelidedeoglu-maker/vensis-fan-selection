<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/edit/bootstrap.php';

function customer_api_authorize(string $method, bool $requireCsrf = false): array
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

function customer_store_directory(): string
{
    $configPath = edit_persistent_config_path();
    if ($configPath === '') {
        throw new EditApiException('Persistent customer storage is unavailable.', 500);
    }
    $directory = dirname($configPath);
    if (!is_dir($directory) && !@mkdir($directory, 0700, true) && !is_dir($directory)) {
        throw new EditApiException('Persistent customer storage is unavailable.', 500);
    }
    @chmod($directory, 0700);
    return $directory;
}

function customer_store_path(): string
{
    return customer_store_directory() . DIRECTORY_SEPARATOR . 'customers-v1.json';
}

function customer_seed_records(): array
{
    $path = __DIR__ . '/private/seed.json';
    if (!is_file($path)) {
        return [];
    }
    $source = @file_get_contents($path);
    if (!is_string($source)) {
        return [];
    }
    try {
        $names = json_decode($source, true, 64, JSON_THROW_ON_ERROR);
    } catch (JsonException) {
        return [];
    }
    if (!is_array($names)) {
        return [];
    }
    $createdAt = '2026-08-25T00:00:00.000Z';
    $records = [];
    foreach (array_slice($names, 0, 2000) as $index => $name) {
        if (!is_string($name) || trim($name) === '') {
            continue;
        }
        $id = 'faz1-' . str_pad((string) ($index + 1), 3, '0', STR_PAD_LEFT);
        $records[$id] = [
            'id' => $id,
            'companyName' => trim($name),
            'taxOffice' => '',
            'taxNo' => '',
            'contact' => '',
            'phone' => '',
            'email' => '',
            'address' => '',
            'history' => [],
            'createdAt' => $createdAt,
            'updatedAt' => $createdAt,
        ];
    }
    return $records;
}

function customer_store_empty(): array
{
    return [
        'version' => 1,
        'updatedAt' => gmdate('c'),
        'customers' => customer_seed_records(),
    ];
}

function customer_store_load_unlocked(string $path): array
{
    if (!is_file($path)) {
        return customer_store_empty();
    }
    $size = @filesize($path);
    if (!is_int($size) || $size < 0 || $size > 12 * 1024 * 1024) {
        throw new EditApiException('Customer storage is invalid.', 500);
    }
    $source = @file_get_contents($path);
    if (!is_string($source)) {
        throw new EditApiException('Customer storage could not be read.', 500);
    }
    try {
        $state = json_decode($source, true, 128, JSON_THROW_ON_ERROR);
    } catch (JsonException) {
        throw new EditApiException('Customer storage contains invalid data.', 500);
    }
    if (!is_array($state) || !is_array($state['customers'] ?? null)) {
        throw new EditApiException('Customer storage contains invalid records.', 500);
    }
    return $state;
}

function customer_store_lock(int $operation): array
{
    $path = customer_store_path();
    $lockPath = $path . '.lock';
    $handle = @fopen($lockPath, 'c+');
    if ($handle === false || !@chmod($lockPath, 0600) || !flock($handle, $operation)) {
        if (is_resource($handle)) {
            @fclose($handle);
        }
        throw new EditApiException('Customer storage lock is unavailable.', 500);
    }
    return [$path, $handle];
}

function customer_store_unlock($handle): void
{
    @flock($handle, LOCK_UN);
    @fclose($handle);
}

function customer_store_read(): array
{
    [$path, $handle] = customer_store_lock(LOCK_SH);
    try {
        return customer_store_load_unlocked($path);
    } finally {
        customer_store_unlock($handle);
    }
}

function customer_store_mutate(callable $mutator): array
{
    [$path, $handle] = customer_store_lock(LOCK_EX);
    try {
        $state = customer_store_load_unlocked($path);
        $result = $mutator($state);
        $state['version'] = 1;
        $state['updatedAt'] = gmdate('c');
        $temporary = @tempnam(dirname($path), '.customers-');
        if (!is_string($temporary)) {
            throw new EditApiException('Customer storage could not be written.', 500);
        }
        try {
            $json = json_encode($state, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
            if (@file_put_contents($temporary, $json, LOCK_EX) === false || !@chmod($temporary, 0600) || !@rename($temporary, $path)) {
                throw new EditApiException('Customer storage could not be written.', 500);
            }
        } finally {
            if (is_file($temporary)) {
                @unlink($temporary);
            }
        }
        return is_array($result) ? $result : [];
    } finally {
        customer_store_unlock($handle);
    }
}

function customer_text(mixed $value, string $field, int $maximumLength, bool $allowLines = false): string
{
    if (!is_string($value) && !is_int($value) && !is_float($value)) {
        throw new EditApiException("Customer field {$field} is invalid.", 422);
    }
    $value = trim((string) $value);
    $controls = $allowLines ? '/[\x00-\x08\x0B\x0C\x0E-\x1F]/' : '/[\x00-\x1F]/';
    if (strlen($value) > $maximumLength || preg_match($controls, $value)) {
        throw new EditApiException("Customer field {$field} is invalid.", 422);
    }
    return $value;
}

function customer_timestamp(mixed $value, string $field): string
{
    if (!is_string($value) || strlen($value) > 40) {
        throw new EditApiException("Customer field {$field} is invalid.", 422);
    }
    try {
        $date = new DateTimeImmutable($value);
    } catch (Throwable) {
        throw new EditApiException("Customer field {$field} is invalid.", 422);
    }
    return $date->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d\TH:i:s.v\Z');
}

function customer_record(mixed $value): array
{
    if (!is_array($value)) {
        throw new EditApiException('Customer record is invalid.', 422);
    }
    $id = customer_text($value['id'] ?? '', 'id', 120);
    if (preg_match('/^[A-Za-z0-9][A-Za-z0-9_-]{2,119}$/', $id) !== 1) {
        throw new EditApiException('Customer ID is invalid.', 422);
    }
    $record = [
        'id' => $id,
        'companyName' => customer_text($value['companyName'] ?? '', 'companyName', 500),
        'taxOffice' => customer_text($value['taxOffice'] ?? '', 'taxOffice', 240),
        'taxNo' => customer_text($value['taxNo'] ?? '', 'taxNo', 80),
        'contact' => customer_text($value['contact'] ?? '', 'contact', 240),
        'phone' => customer_text($value['phone'] ?? '', 'phone', 120),
        'email' => customer_text($value['email'] ?? '', 'email', 320),
        'address' => customer_text($value['address'] ?? '', 'address', 4000, true),
        'history' => [],
        'createdAt' => customer_timestamp($value['createdAt'] ?? '', 'createdAt'),
        'updatedAt' => customer_timestamp($value['updatedAt'] ?? '', 'updatedAt'),
    ];
    if ($record['companyName'] === '') {
        throw new EditApiException('Customer company name is required.', 422);
    }
    return $record;
}

function customer_public_state(array $state): array
{
    $customers = array_values(array_filter($state['customers'] ?? [], 'is_array'));
    usort($customers, static fn(array $left, array $right): int => strnatcasecmp((string) ($left['companyName'] ?? ''), (string) ($right['companyName'] ?? '')));
    return ['customers' => $customers, 'updatedAt' => (string) ($state['updatedAt'] ?? '')];
}
