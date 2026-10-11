<?php
declare(strict_types=1);
require_once __DIR__ . '/project-domain.php';

$auth = agent_authorize('project:write');
$request = agent_request_json(2 * 1024 * 1024);
$approvalGrant = agent_text($request['approvalGrant'] ?? null, 'approvalGrant', 4096, true);
$payload = $request['payload'] ?? null;
if (!is_array($payload)) {
    throw new AgentApiException('payload must contain the exact approved project.', 422);
}
try {
    $prepared = agent_prepare_project_write($payload, $auth['id'], $auth['config']);
    $result = agent_store_project_write($prepared, $payload, $approvalGrant, $auth['id'], $auth['config']);
} catch (EditApiException $error) {
    throw new AgentApiException($error->getMessage(), $error->httpStatus);
}
agent_audit($auth['id'], 'project_write_executed', $request, [
    'requestId' => $result['approvalRequestId'],
    'projectIdHash' => substr(hash('sha256', $result['project']['id']), 0, 16),
    'stored' => true, 'items' => count($result['project']['items']),
]);
agent_json(array_merge(['ok' => true, 'executed' => true, 'action' => 'project.write'], $result), 201);
