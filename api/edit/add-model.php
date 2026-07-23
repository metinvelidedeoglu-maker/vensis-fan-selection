<?php
declare(strict_types=1);
require __DIR__ . '/bootstrap.php';

edit_require_method('POST');
edit_require_same_origin();
$config = edit_config();
edit_require_configured($config);
edit_require_session($config);
edit_require_csrf();
edit_require_persistent_config($config);

$data = edit_request_json();
$seriesKey = $data['seriesKey'] ?? null;
$values = $data['values'] ?? null;
if (!is_string($seriesKey) || $seriesKey === '' || strlen($seriesKey) > 180 || preg_match('/[\x00-\x1F\x7F]/', $seriesKey)) {
    throw new EditApiException('Series key is invalid.', 422);
}
if (!is_array($values)) {
    throw new EditApiException('New product values are required.', 422);
}

$normalized = edit_normalize_changes($values);
if (!isset($normalized['model']) || $normalized['model'] === '') {
    throw new EditApiException('Model name cannot be empty.', 422);
}
$result = edit_commit_new_model($config, $seriesKey, $normalized);
edit_audit($config, 'model_added', [
    'modelKeyHash' => substr(hash('sha256', $result['modelKey']), 0, 16),
    'seriesKeyHash' => substr(hash('sha256', $seriesKey), 0, 16),
    'model' => $result['model'],
    'path' => $result['path'],
    'commit' => $result['commitSha'],
]);

edit_json([
    'ok' => true,
    'model' => $result['model'],
    'series' => $result['series'],
    'commitSha' => $result['commitSha'],
    'commitUrl' => $result['commitUrl'],
], 201);
