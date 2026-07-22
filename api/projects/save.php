<?php
declare(strict_types=1);
require __DIR__ . '/bootstrap.php';

$config = project_api_authorize('POST', true);
$data = edit_request_json(2 * 1024 * 1024);
$project = project_record($data['project'] ?? null);
$result = project_store_mutate(static function (array &$state) use ($project): array {
    $id = $project['id'];
    $incomingTime = $project['updatedAt'];
    $existing = is_array($state['projects'][$id] ?? null) ? $state['projects'][$id] : null;
    $existingTime = is_array($existing) ? (string) ($existing['updatedAt'] ?? '') : '';
    $deletedTime = (string) ($state['tombstones'][$id] ?? '');
    $newerThanProject = $existingTime === '' || strcmp($incomingTime, $existingTime) >= 0;
    $newerThanDeletion = $deletedTime === '' || strcmp($incomingTime, $deletedTime) > 0;
    $stored = $newerThanProject && $newerThanDeletion;
    if ($stored) {
        $state['projects'][$id] = $project;
        unset($state['tombstones'][$id]);
    }
    return [
        'stored' => $stored,
        'project' => $state['projects'][$id] ?? null,
        'deletedAt' => $state['tombstones'][$id] ?? null,
    ];
});

edit_audit($config, $result['stored'] ? 'project_saved' : 'project_save_ignored', [
    'projectIdHash' => substr(hash('sha256', $project['id']), 0, 16),
    'items' => count($project['items']),
]);

edit_json(array_merge(['ok' => true], $result));

