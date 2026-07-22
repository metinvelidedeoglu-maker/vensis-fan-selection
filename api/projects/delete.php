<?php
declare(strict_types=1);
require __DIR__ . '/bootstrap.php';

$config = project_api_authorize('POST', true);
$data = edit_request_json();
$projectId = project_id($data['projectId'] ?? null);
$deletedAt = project_timestamp($data['deletedAt'] ?? null, 'deletedAt', gmdate('c'));
$result = project_store_mutate(static function (array &$state) use ($projectId, $deletedAt): array {
    $existing = is_array($state['projects'][$projectId] ?? null) ? $state['projects'][$projectId] : null;
    $existingTime = is_array($existing) ? (string) ($existing['updatedAt'] ?? '') : '';
    $currentDeletion = (string) ($state['tombstones'][$projectId] ?? '');
    $deleted = $existingTime === '' || strcmp($deletedAt, $existingTime) >= 0;
    if ($deleted) {
        unset($state['projects'][$projectId]);
    }
    if ($currentDeletion === '' || strcmp($deletedAt, $currentDeletion) > 0) {
        $state['tombstones'][$projectId] = $deletedAt;
    }
    return [
        'deleted' => $deleted,
        'project' => $state['projects'][$projectId] ?? null,
        'deletedAt' => $state['tombstones'][$projectId],
    ];
});

edit_audit($config, $result['deleted'] ? 'project_deleted' : 'project_delete_ignored', [
    'projectIdHash' => substr(hash('sha256', $projectId), 0, 16),
]);

edit_json(array_merge(['ok' => true], $result));
