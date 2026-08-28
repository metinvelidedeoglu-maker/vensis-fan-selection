<?php
declare(strict_types=1);
require __DIR__ . '/bootstrap.php';

$config = custom_product_api_authorize('POST', true);
$data = edit_request_json();
$id = custom_product_id($data['id'] ?? '');
$result = custom_product_store_mutate(static function (array &$state) use ($id): array {
    $state['products'] = is_array($state['products'] ?? null) ? $state['products'] : [];
    $deleted = isset($state['products'][$id]);
    unset($state['products'][$id]);
    return ['deleted' => $deleted, 'id' => $id];
});

edit_audit($config, 'custom_product_deleted', [
    'productIdHash' => substr(hash('sha256', $id), 0, 16),
    'deleted' => (bool) ($result['deleted'] ?? false),
]);
edit_json(array_merge(['ok' => true], $result));
