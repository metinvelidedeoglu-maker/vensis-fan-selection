<?php
declare(strict_types=1);

require_once __DIR__ . '/domain.php';

$auth = agent_authorize('quote:draft');
$request = agent_request_json(262144);
$result = agent_quote_draft($request, $auth['id'], $auth['identity'], $auth['config']);
agent_audit($auth['id'], 'quotation_draft', $request, ['draftId' => $result['draftId'], 'lines' => count($result['lines'])]);
agent_json($result, 201);
