<?php
declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

$config = customer_api_authorize('POST', true);
$data = edit_request_json(2 * 1024 * 1024);
$incoming = $data['customers'] ?? null;
if (!is_array($incoming) || count($incoming) > 2000) {
    throw new EditApiException('Customer sync payload is invalid.', 422);
}
$records = [];
foreach ($incoming as $value) {
    $record = customer_record($value);
    $records[$record['id']] = $record;
}
$result = customer_store_mutate(static function (array &$state) use ($records): array {
    $state['customers'] = is_array($state['customers'] ?? null) ? $state['customers'] : [];
    foreach ($records as $id => $record) {
        $current = is_array($state['customers'][$id] ?? null) ? $state['customers'][$id] : null;
        $currentTime = is_array($current) ? (string) ($current['updatedAt'] ?? '') : '';
        if ($currentTime === '' || strcmp($record['updatedAt'], $currentTime) >= 0) {
            $state['customers'][$id] = $record;
        }
    }
    return customer_public_state($state);
});

edit_audit($config, 'customers_synced', ['customers' => count($records)]);
edit_json(array_merge(['ok' => true], $result));
