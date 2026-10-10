<?php
declare(strict_types=1);

require_once __DIR__ . '/domain.php';

$auth = agent_authorize('fan:select');
$request = agent_request_json();
$result = agent_select($request, $auth['id'], $auth['config']);
agent_audit($auth['id'], 'fan_selection', $request, ['results' => count($result['results'])]);
agent_json($result);
