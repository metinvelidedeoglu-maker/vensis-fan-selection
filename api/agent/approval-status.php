<?php
declare(strict_types=1);

require_once __DIR__ . '/approval.php';

$auth = agent_authorize_any(['approval:request', 'approval:review']);
$request = agent_request_json(4096);
$result = agent_approval_status($request, $auth['id'], $auth['matchedScopes'], $auth['config']);
agent_audit($auth['id'], 'approval_status', $request, ['requestId' => $result['approval']['requestId'], 'status' => $result['approval']['status']]);
agent_json($result);
