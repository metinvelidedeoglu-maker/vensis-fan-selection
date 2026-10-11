<?php
declare(strict_types=1);
require $argv[1] . '/api/agent/project-domain.php';
set_exception_handler(static function(Throwable $error): void {
    fwrite(STDERR, get_class($error) . ': ' . $error->getMessage() . "\n" . $error->getTraceAsString() . "\n");
    exit(1);
});
$config = ['signing_key' => str_repeat('test-key-', 8), 'selection_token_ttl_seconds' => 1800,
    'approval_grant_ttl_seconds' => 900, 'approval_request_ttl_seconds' => 604800, 'maximum_discount_percent' => 0];
$checks = 0;
function check(bool $condition, string $label): void {
    global $checks;
    if (!$condition) { throw new RuntimeException($label); }
    $checks++;
}
function denied(callable $call, int $status, string $label): void {
    try { $call(); } catch (AgentApiException $error) { check($error->httpStatus === $status, $label . ': ' . $error->getMessage()); return; }
    throw new RuntimeException($label . ' was not blocked');
}
function approval(array $payload, array $config, string $key): array {
    $r = agent_create_approval_request(['action' => 'project.write', 'summary' => 'test', 'reason' => 'test',
        'payload' => $payload, 'idempotencyKey' => $key], 'erman', $config);
    agent_review_approval(['requestId' => $r['approval']['requestId'], 'decision' => 'approved'], 'metin_approver', $config);
    return agent_approval_status(['requestId' => $r['approval']['requestId']], 'erman', ['approval:request'], $config);
}
$flat = ['project' => ['name' => 'deneme', 'customerName' => 'deneme', 'preparedBy' => 'deneme',
    'model' => 'AXW/ATEX 35-4M-0.18', 'airflowM3h' => 1500, 'pressurePa' => 100, 'quantity' => 1,
    'currency' => 'EUR', 'quoteDraftId' => 'draft_801257e1db65a19bcd2be254']];
$prepared = agent_prepare_project_write($flat, 'erman', $config);
check(preg_match('/^prj_[a-f0-9]{24}$/', $prepared['project']['id']) === 1, 'new project gets a valid server ID');
check($prepared['project']['items'][0]['price'] === 1244.8, 'price comes from catalogue');
check($prepared['project']['meta']['preparedBy'] === 'deneme', 'preparer is preserved');
check($prepared['quoteDraft']['customer']['name'] === 'deneme', 'customer is preserved');
check($prepared['project']['items'][0]['required'] === ['q' => 1500, 'p' => 100], 'required duty is mapped');
check(agent_prepare_project_write($flat, 'erman', $config)['project']['id'] === $prepared['project']['id'], 'retry uses the same ID');

// Reproduce an already-approved legacy payload, without rewriting its hash.
$oldId = 'apr_legacy0000000000000001';
$legacyRecord = ['requestId' => $oldId, 'action' => 'project.write', 'status' => 'approved', 'summary' => 'test',
    'reason' => 'test', 'payload' => $flat, 'payloadHash' => agent_payload_hash($flat), 'requestedBy' => 'erman',
    'createdAt' => gmdate('c'), 'requestExpiresAt' => gmdate('c', time()+604800),
    'reviewedBy' => 'metin_approver', 'reviewedAt' => gmdate('c'), 'reviewedUnix' => time()];
agent_approval_store(static function(array $s) use($oldId,$legacyRecord): array { $s['requests'][$oldId]=$legacyRecord;return [$s,[],true]; });
$grant = agent_approval_grant($legacyRecord, $config);
$result = agent_store_project_write($prepared, $flat, $grant, 'erman', $config);
check($result['stored'] === true && $result['operation'] === 'create', 'approved legacy payload is stored');
$read = agent_read_project(['requestId' => $oldId], 'erman');
check($read['project']['id'] === $prepared['project']['id'], 'project is independently read back');
check($read['draftId'] === $prepared['quoteDraft']['draftId'], 'persistent draft is read back');
check($read['quoteDraft']['totals']['netTotal'] === 1244.8, 'persistent quote total matches');
check(count(project_store_read()['projects']) === 1, 'only one project exists');
denied(fn() => agent_store_project_write($prepared, $flat, $grant, 'erman', $config), 409, 'single-use grant replay');
check(count(project_store_read()['projects']) === 1, 'replay creates no duplicate');
denied(fn() => agent_read_project(['projectId' => $prepared['project']['id']], 'another_user'), 404, 'other identity cannot read');

$changed = $flat; $changed['project']['id'] = $prepared['project']['id']; $changed['project']['quantity'] = 2;
$changed['expectedUpdatedAt'] = $read['project']['updatedAt'];
$a = approval($changed, $config, 'update-1'); $p = $a['approval']['payload'];
$updated = agent_store_project_write(agent_prepare_project_write($p,'erman',$config),$p,$a['approvalGrant'],'erman',$config);
check($updated['operation'] === 'update' && $updated['project']['items'][0]['quantity'] === 2, 'explicit update changes one project');
check(count(project_store_read()['projects']) === 1, 'update does not create a project');
check($updated['quoteDraft']['totals']['netTotal'] === 2489.6, 'updated quote is stored atomically');

$stale = approval($changed, $config, 'stale-update'); $sp=$stale['approval']['payload'];
denied(fn() => agent_store_project_write(agent_prepare_project_write($sp,'erman',$config),$sp,$stale['approvalGrant'],'erman',$config),409,'stale update');
check(agent_approval_status(['requestId'=>$stale['approval']['requestId']],'erman',['approval:request'],$config)['approval']['status']==='approved','conflict does not consume approval');
$bad=$flat;$bad['project']['id']='../bad';$bad['expectedUpdatedAt']=$read['project']['updatedAt'];
denied(fn()=>agent_prepare_project_write($bad,'erman',$config),422,'malformed project ID');
$bad=$flat;$bad['project']['discountPercent']=30;
denied(fn()=>agent_prepare_project_write($bad,'erman',$config),403,'discount cannot be smuggled into legacy data');
$bad=$prepared;$bad['project']['items'][0]['price']=1;
denied(fn()=>agent_prepare_project_write($bad,'erman',$config),403,'signed quote price tampering');
$bad=$prepared;$bad['quoteDraft']['customer']['name']='different';
denied(fn()=>agent_prepare_project_write($bad,'erman',$config),403,'signed quote tampering');
$bad=$prepared;$bad['project']['meta']['status']='quoted';
denied(fn()=>agent_prepare_project_write($bad,'erman',$config),403,'quote publication status');

$createAgain=approval($flat,$config,'create-again');$cp=$createAgain['approval']['payload'];
denied(fn()=>agent_store_project_write(agent_prepare_project_write($cp,'erman',$config),$cp,$createAgain['approvalGrant'],'erman',$config),409,'existing ID is never overwritten by create');
$fresh=agent_create_approval_request(['action'=>'project.write','summary'=>'test','reason'=>'test','payload'=>$flat,'idempotencyKey'=>'same-key'],'erman',$config);
$retry=agent_create_approval_request(['action'=>'project.write','summary'=>'test','reason'=>'test','payload'=>$flat,'idempotencyKey'=>'same-key'],'erman',$config);
check($fresh['approval']['requestId']===$retry['approval']['requestId'],'approval retry uses the same request');
$different=$flat;$different['project']['quantity']=4;
denied(fn()=>agent_create_approval_request(['action'=>'project.write','summary'=>'test','reason'=>'test','payload'=>$different,'idempotencyKey'=>'same-key'],'erman',$config),409,'idempotency conflict');

$expired=$legacyRecord;$expired['reviewedUnix']=time()-901;$expiredToken=agent_approval_grant($expired,$config);
denied(fn()=>agent_verify_approval_grant($expiredToken,'erman','project.write',$flat,$config),403,'approval expiry preserved');
denied(fn()=>agent_verify_approval_grant($grant,'another_user','project.write',$flat,$config),403,'identity-bound grant');
$wrong=$flat;$wrong['project']['quantity']=10;
denied(fn()=>agent_verify_approval_grant($grant,'erman','project.write',$wrong,$config),403,'payload-bound grant');
echo json_encode(['passed'=>$checks,'projects'=>count(project_store_read()['projects']),'drafts'=>count(project_store_read()['agentDrafts'])]), PHP_EOL;
