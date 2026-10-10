<?php
declare(strict_types=1);

require_once __DIR__ . '/approval.php';

$auth = agent_authorize('approval:request');
$request = agent_request_json(147456);
$result = agent_create_approval_request($request, $auth['id'], $auth['config']);
agent_audit($auth['id'], 'approval_request', $request, ['requestId' => $result['approval']['requestId'], 'action' => $result['approval']['action']]);
agent_json($result, 202);
