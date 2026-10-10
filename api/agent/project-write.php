<?php
declare(strict_types=1);

// Load the project domain first, then restore the Agent API exception handler.
// Project validation/storage exceptions are translated below so callers receive
// the original safe 4xx response instead of a generic integration failure.
require_once dirname(__DIR__) . '/projects/bootstrap.php';
require_once __DIR__ . '/approval.php';

$auth = agent_authorize('project:write');
$request = agent_request_json(2 * 1024 * 1024);
$approvalGrant = agent_text($request['approvalGrant'] ?? null, 'approvalGrant', 4096, true);
$payload = $request['payload'] ?? null;
if (!is_array($payload) || !is_array($payload['project'] ?? null)) {
    throw new AgentApiException('payload.project must contain the exact approved project.', 422);
}

try {
    $project = project_record($payload['project']);

    // This endpoint is deliberately narrower than the normal project editor:
    // it cannot smuggle an order or a commercial discount into a project write.
    if (($project['meta']['orders'] ?? []) !== []) {
        throw new AgentApiException('Project approval cannot create or change orders.', 403);
    }
    if (($project['status'] ?? '') !== 'draft') {
        throw new AgentApiException('Project approval can only save a draft project.', 403);
    }
    if ((float) ($project['meta']['globalDiscount'] ?? 0) !== 0.0) {
        throw new AgentApiException('Project approval cannot apply a global discount.', 403);
    }
    foreach ($project['items'] as $item) {
        if ((float) ($item['discountPercent'] ?? 0) !== 0.0) {
            throw new AgentApiException('Project approval cannot apply an item discount.', 403);
        }
    }
    $project['meta']['preparedBy'] = 'Erman';

    // Consume first: a storage failure may require a fresh approval, but a
    // successful write can never reuse the same one-time grant.
    $grant = agent_consume_approval_grant($approvalGrant, $auth['id'], 'project.write', $payload, $auth['config']);
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
} catch (EditApiException $error) {
    throw new AgentApiException($error->getMessage(), $error->httpStatus);
}

agent_audit($auth['id'], 'project_write_executed', $request, [
    'requestId' => (string) ($grant['rid'] ?? ''),
    'projectIdHash' => substr(hash('sha256', $project['id']), 0, 16),
    'stored' => (bool) ($result['stored'] ?? false),
    'items' => count($project['items']),
]);

agent_json(array_merge([
    'ok' => true,
    'executed' => true,
    'action' => 'project.write',
    'approvalRequestId' => (string) ($grant['rid'] ?? ''),
], $result), 201);
