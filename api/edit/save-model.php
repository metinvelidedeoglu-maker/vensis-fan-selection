<?php
declare(strict_types=1);
require __DIR__ . '/bootstrap.php';

edit_require_method('POST');
edit_require_same_origin();
$config = edit_config();
edit_require_configured($config);
edit_require_session($config);
edit_require_csrf();

$data = edit_request_json();
$modelKey = $data['modelKey'] ?? null;
$changes = $data['changes'] ?? null;
if (!is_string($modelKey) || $modelKey === '' || strlen($modelKey) > 240 || preg_match('/[\x00-\x1F]/', $modelKey)) {
    throw new EditApiException('Model key is invalid.', 422);
}
if (!is_array($changes)) {
    throw new EditApiException('Editable model fields are required.', 422);
}

$normalized = edit_normalize_changes($changes);
$result = edit_commit_model($config, $modelKey, $normalized);
edit_audit($config, $result['unchanged'] ? 'model_unchanged' : 'model_committed', [
    'modelKeyHash' => substr(hash('sha256', $modelKey), 0, 16),
    'model' => $result['model'] ?? '',
    'path' => $result['path'],
    'fields' => $result['fields'],
    'commit' => $result['commitSha'] ?? '',
]);

edit_json([
    'ok' => true,
    'unchanged' => $result['unchanged'],
    'model' => $result['model'] ?? '',
    'fields' => $result['fields'],
    'commitSha' => $result['commitSha'] ?? null,
    'commitUrl' => $result['commitUrl'] ?? null,
]);

