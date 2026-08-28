<?php
declare(strict_types=1);
require __DIR__ . '/bootstrap.php';

$config = custom_product_api_authorize('POST', true);
$data = edit_request_json(64 * 1024);
$product = custom_product_record($data['product'] ?? null);
$result = custom_product_store_mutate(static function (array &$state) use ($product): array {
    $state['products'] = is_array($state['products'] ?? null) ? $state['products'] : [];
    if (count($state['products']) >= 1000 && !isset($state['products'][$product['id']])) {
        throw new EditApiException('Custom product library limit reached.', 422);
    }
    $id = $product['id'];
    $current = is_array($state['products'][$id] ?? null) ? $state['products'][$id] : null;
    $currentTime = is_array($current) ? (string) ($current['updatedAt'] ?? '') : '';
    $stored = $currentTime === '' || strcmp($product['updatedAt'], $currentTime) >= 0;
    if ($stored) {
        $state['products'][$id] = $product;
    }
    return ['stored' => $stored, 'product' => $state['products'][$id] ?? null];
});

edit_audit($config, $result['stored'] ? 'custom_product_saved' : 'custom_product_save_ignored', [
    'productIdHash' => substr(hash('sha256', $product['id']), 0, 16),
    'type' => $product['productType'],
]);
edit_json(array_merge(['ok' => true], $result));
