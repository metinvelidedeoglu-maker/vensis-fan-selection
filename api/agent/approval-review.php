<?php
declare(strict_types=1);

require_once __DIR__ . '/approval.php';

$auth = agent_authorize('approval:review');
$request = agent_request_json(16384);
$result = agent_review_approval($request, $auth['id'], $auth['config']);
agent_audit($auth['id'], 'approval_review', $request, ['requestId' => $result['approval']['requestId'], 'decision' => $result['approval']['status']]);
agent_json($result);
