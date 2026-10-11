<?php
declare(strict_types=1);

require_once __DIR__ . '/project-domain.php';

$auth = agent_authorize('quote:draft');
$request = agent_request_json(262144);
$result = agent_quote_draft($request, $auth['id'], $auth['identity'], $auth['config']);
try {
    $result['projectWritePayload'] = agent_project_from_draft($result, $auth['id'], $auth['config'], $request['project'] ?? []);
} catch (EditApiException $error) {
    throw new AgentApiException($error->getMessage(), $error->httpStatus);
}
$result['nextAction'] = 'Use projectWritePayload unchanged for project.write approval. After explicit Metin review, execute approval.payload unchanged and read the saved project back.';
agent_audit($auth['id'], 'quotation_draft', $request, ['draftId' => $result['draftId'], 'lines' => count($result['lines'])]);
agent_json($result, 201);
