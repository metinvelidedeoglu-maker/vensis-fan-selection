<?php
declare(strict_types=1);
require_once __DIR__ . '/project-domain.php';

$auth = agent_authorize('project:write');
$request = agent_request_json(4096);
try {
    $result = agent_read_project($request, $auth['id']);
} catch (EditApiException $error) {
    throw new AgentApiException($error->getMessage(), $error->httpStatus);
}
agent_json($result);
