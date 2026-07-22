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

$data = edit_request_json(4500000);
$seriesKey = $data['seriesKey'] ?? null;
$changes = $data['changes'] ?? null;
if (!is_string($seriesKey) || $seriesKey === '' || strlen($seriesKey) > 180 || preg_match('/[\x00-\x1F]/', $seriesKey)) {
    throw new EditApiException('Series key is invalid.', 422);
}
if (!is_array($changes)) {
    throw new EditApiException('Editable series fields are required.', 422);
}

$normalized = edit_normalize_series_changes($changes);
$image = edit_normalize_series_image($data['image'] ?? null);
if ($normalized === [] && $image === null) {
    throw new EditApiException('No editable series values were supplied.', 422);
}

$result = edit_commit_series($config, $seriesKey, $normalized, $image);
edit_audit($config, $result['unchanged'] ? 'series_unchanged' : 'series_committed', [
    'seriesKeyHash' => substr(hash('sha256', $seriesKey), 0, 16),
    'series' => $result['series'] ?? '',
    'path' => $result['path'],
    'fields' => $result['fields'],
    'imagePath' => $result['imagePath'] ?? '',
    'commit' => $result['commitSha'] ?? '',
]);

edit_json([
    'ok' => true,
    'unchanged' => $result['unchanged'],
    'series' => $result['series'] ?? $seriesKey,
    'fields' => $result['fields'],
    'commitSha' => $result['commitSha'] ?? null,
    'commitUrl' => $result['commitUrl'] ?? null,
]);
