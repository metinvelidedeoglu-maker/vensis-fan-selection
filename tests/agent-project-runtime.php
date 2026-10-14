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
check($prepared['quoteDraft']['lines'][0]['seriesTitle'] === 'Axial Wall Type Ex-proof Fans', 'draft preserves the catalogue series title');
check($prepared['quoteDraft']['lines'][0]['image'] === 'assets/products/AXW-ATEX.webp', 'draft preserves the catalogue image');
check($prepared['project']['items'][0]['series'] === 'Axial Wall Type Ex-proof Fans', 'project uses the descriptive product title');
check($prepared['project']['items'][0]['seriesCode'] === 'AXW/ATEX', 'project separately preserves the technical series code');
check($prepared['project']['items'][0]['seriesTitle'] === 'Axial Wall Type Ex-proof Fans', 'project preserves seriesTitle');
check($prepared['project']['items'][0]['image'] === 'assets/products/AXW-ATEX.webp', 'project preserves the catalogue image');
check($prepared['project']['meta']['preparedBy'] === 'deneme', 'preparer is preserved');
check($prepared['quoteDraft']['customer']['name'] === 'deneme', 'customer is preserved');
check($prepared['project']['items'][0]['required'] === ['q' => 1500, 'p' => 100], 'required duty is mapped');
check(agent_prepare_project_write($flat, 'erman', $config)['project']['id'] === $prepared['project']['id'], 'retry uses the same ID');
check(agent_payload_hash(['q' => 1500.0]) === agent_payload_hash(['q' => 1500]), 'integer and integral float JSON numbers have the same hash');
check(agent_prepare_project_write(json_decode(json_encode($prepared), true), 'erman', $config)['project']['id'] === $prepared['project']['id'], 'draft proof survives JSON transport');

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
$oldFull=$legacyRecord;$oldFull['requestId']='apr_oldfull000000000000001';$oldFull['status']='consumed';$oldFull['payload']=['project'=>$read['project']];
agent_approval_store(static function(array $s) use($oldFull): array { $s['requests'][$oldFull['requestId']]=$oldFull; return [$s,[],true]; });
check(agent_read_project(['requestId'=>$oldFull['requestId']],'erman')['project']['id']===$read['project']['id'], 'older approved projects can be read for updates');
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

// Reproduce the historical plug-in record shape, then repair presentation only.
$broken = project_store_mutate(static function(array &$state) use($prepared): array {
    $id = $prepared['project']['id'];
    $project = $state['projects'][$id];
    $project['status'] = 'quoted';
    $project['meta']['status'] = 'quoted';
    $project['items'][0]['series'] = 'AXW/ATEX';
    $project['items'][0]['description'] = 'Existing free note';
    $project['items'][0]['safetyWarning'] = 'ATEX: Zone 1 Gas / Zone 21 Dust';
    unset($project['items'][0]['seriesCode'], $project['items'][0]['seriesTitle'], $project['items'][0]['image']);
    $project['updatedAt'] = (new DateTimeImmutable($project['updatedAt']))->modify('+1 millisecond')->format('Y-m-d\TH:i:s.v\Z');
    $state['projects'][$id] = $project;
    return $project;
});
$protectedBefore = agent_payload_hash([
    'quantity' => $broken['items'][0]['quantity'], 'price' => $broken['items'][0]['price'],
    'discountPercent' => $broken['items'][0]['discountPercent'], 'required' => $broken['items'][0]['required'],
    'selected' => $broken['items'][0]['selected'], 'motorPower' => $broken['items'][0]['motorPower'],
    'status' => $broken['status'], 'description' => $broken['items'][0]['description'],
]);
$repairSource = $flat;
$repairSource['project']['quantity'] = 2;
$repairDraft = agent_legacy_project_draft($repairSource['project'], 'erman', $config);
$repairPayload = agent_project_from_draft($repairDraft, 'erman', $config, [
    'id' => $broken['id'], 'expectedUpdatedAt' => $broken['updatedAt'], 'updateMode' => 'catalog-presentation',
]);
check($repairPayload['updateMode'] === 'catalog-presentation', 'presentation repair is explicit');
check($repairPayload['project']['status'] === 'quoted', 'presentation repair preserves quoted status');
check($repairPayload['project']['items'][0]['series'] === 'Axial Wall Type Ex-proof Fans', 'presentation repair replaces code-only display');
check($repairPayload['project']['items'][0]['seriesCode'] === 'AXW/ATEX', 'presentation repair retains the technical code');
check($repairPayload['project']['items'][0]['image'] === 'assets/products/AXW-ATEX.webp', 'presentation repair restores the image');
check($repairPayload['project']['items'][0]['safetyWarning'] === '', 'presentation repair removes an unverified legacy ATEX claim');
$repairApproval = approval($repairPayload, $config, 'presentation-repair');
$rp = $repairApproval['approval']['payload'];
$repaired = agent_store_project_write(agent_prepare_project_write($rp, 'erman', $config), $rp, $repairApproval['approvalGrant'], 'erman', $config);
check(count(project_store_read()['projects']) === 1, 'presentation repair does not duplicate the project');
check(agent_payload_hash([
    'quantity' => $repaired['project']['items'][0]['quantity'], 'price' => $repaired['project']['items'][0]['price'],
    'discountPercent' => $repaired['project']['items'][0]['discountPercent'], 'required' => $repaired['project']['items'][0]['required'],
    'selected' => $repaired['project']['items'][0]['selected'], 'motorPower' => $repaired['project']['items'][0]['motorPower'],
    'status' => $repaired['project']['status'], 'description' => $repaired['project']['items'][0]['description'],
]) === $protectedBefore, 'presentation repair preserves commercial, duty, status and free-note data');

// User-supplied product notes use a separate, narrow update mode. This allows
// project ATEX requirements to be shown without treating them as catalogued
// certificate evidence or changing any commercial/selection field.
$catalogForNote = agent_catalog();
$noteModelMatches = array_values(array_filter($catalogForNote['models'], static fn(array $model): bool => $model['model'] === 'AXW/ATEX 35-4M-0.18'));
check(count($noteModelMatches) === 1, 'line-note fixture model is unique');
$noteModel = $noteModelMatches[0];
$noteToken = agent_selection_token([
    'sub' => 'erman', 'modelId' => $noteModel['id'], 'catalog' => $catalogForNote['sourceHash'],
    'required' => ['airflowM3h' => 1500, 'pressurePa' => 100],
    'selected' => ['airflowM3h' => 1500, 'pressurePa' => 100],
    'exp' => time() + (int) $config['selection_token_ttl_seconds'],
], $config);
$atexRequirement = "ATEX (project requirement): Zone 1 Gas / Zone 21 Dust\nII 2G Ex db IIC T4 Gb\nII 2D Ex tb IIIC T125°C Db\nFinal equipment marking must be verified against the manufacturer's certificate before order.";
$noteDraft = agent_quote_draft([
    'project' => ['name' => $repaired['project']['name']],
    'customer' => ['name' => 'deneme'],
    'lines' => [[
        'selectionToken' => $noteToken, 'quantity' => 2, 'discountPercent' => 0,
        'description' => $atexRequirement,
    ]],
], 'erman', ['maximum_discount_percent' => 0], $config);
check($noteDraft['lines'][0]['description'] === $atexRequirement, 'quote draft preserves the user-supplied line note');
$notePayload = agent_project_from_draft($noteDraft, 'erman', $config, [
    'id' => $repaired['project']['id'], 'expectedUpdatedAt' => $repaired['project']['updatedAt'], 'updateMode' => 'line-description',
]);
check($notePayload['project']['items'][0]['description'] === $atexRequirement, 'line-description update changes the product note');
$noteProtected = $notePayload['project'];
$noteProtected['items'][0]['description'] = $repaired['project']['items'][0]['description'];
$noteProtected['updatedAt'] = $repaired['project']['updatedAt'];
check(agent_payload_hash($noteProtected) === agent_payload_hash($repaired['project']), 'line-description update preserves every other project field');
$noteApproval = approval($notePayload, $config, 'line-description-update');
$np = $noteApproval['approval']['payload'];
$noted = agent_store_project_write(agent_prepare_project_write($np, 'erman', $config), $np, $noteApproval['approvalGrant'], 'erman', $config);
check($noted['project']['items'][0]['description'] === $atexRequirement, 'approved line description is stored');
check($noted['project']['status'] === 'quoted' && $noted['project']['items'][0]['quantity'] === 2, 'line description update preserves status and quantity');

// Mirror the ten Ford Otosan AXD/ATEX lines from the reported production record.
$fordSpecs = [
    ['AXD/ATEX 40-2T-1', 4000, 300, 4339, 353, 1529.6],
    ['AXD/ATEX 50-2T-3', 10000, 350, 10358, 376, 2062.4],
    ['AXD/ATEX 56-2T-4', 11000, 400, 12097, 484, 2456.0],
    ['AXD/ATEX 63-2T-5,5', 14000, 400, 15324, 479, 3059.2],
    ['AXD/ATEX 56-2T-4', 12000, 400, 12699, 448, 2456.0],
    ['AXD/ATEX 56-2T-4', 12000, 450, 12296, 472, 2456.0],
    ['AXD/ATEX 50-2T-3', 9000, 350, 9796, 415, 2062.4],
    ['AXD/ATEX 40-2T-1.5', 6000, 300, 6000, 300, 1636.8],
    ['AXD/ATEX 50-2T-3', 9000, 350, 9796, 415, 2062.4],
    ['AXD/ATEX 45-2T-2', 7000, 300, 7863, 379, 1888.0],
];
$catalog = agent_catalog();
$fordLines = [];
foreach ($fordSpecs as [$modelName, $rq, $rp, $sq, $sp, $price]) {
    $matches = array_values(array_filter($catalog['models'], static fn(array $model): bool => $model['model'] === $modelName));
    check(count($matches) === 1, 'Ford fixture model is unique: ' . $modelName);
    $model = $matches[0];
    check(abs((float) $model['pricing']['listPrice'] - $price) < 0.0001, 'Ford fixture price matches catalogue: ' . $modelName);
    $fordLines[] = ['selectionToken' => agent_selection_token([
        'sub' => 'erman', 'modelId' => $model['id'], 'catalog' => $catalog['sourceHash'],
        'required' => ['airflowM3h' => $rq, 'pressurePa' => $rp],
        'selected' => ['airflowM3h' => $sq, 'pressurePa' => $sp],
        'exp' => time() + (int) $config['selection_token_ttl_seconds'],
    ], $config), 'quantity' => 1, 'discountPercent' => 0];
}
$fordDraft = agent_quote_draft([
    'project' => ['name' => 'Ford Otosan Exproof Fan'],
    'customer' => ['name' => 'Javenis'], 'lines' => $fordLines,
], 'erman', ['maximum_discount_percent' => 0], $config);
$fordPayload = agent_project_from_draft($fordDraft, 'erman', $config);
check(count($fordDraft['lines']) === 10 && count($fordPayload['project']['items']) === 10, 'Ford fixture keeps all ten lines');
check(abs((float) $fordDraft['totals']['netTotal'] - 21668.8) < 0.0001, 'Ford fixture total remains EUR 21,668.80');
check(array_column($fordPayload['project']['items'], 'model') === array_column($fordSpecs, 0), 'Ford fixture model order is unchanged');
$fordBroken = $fordPayload['project'];
$fordBroken['status'] = 'quoted';
$fordBroken['meta']['status'] = 'quoted';
foreach ($fordBroken['items'] as &$item) {
    $item['series'] = 'AXD/ATEX';
    $item['safetyWarning'] = 'ATEX: Zone 1 Gas / Zone 21 Dust';
    unset($item['seriesCode'], $item['seriesTitle'], $item['image']);
}
unset($item);
$protectedProject = static function(array $project): array {
    foreach ($project['items'] as &$item) {
        foreach (['series', 'seriesCode', 'seriesTitle', 'manufacturer', 'image', 'nominalAirflow', 'noise', 'safetyWarning'] as $field) {
            unset($item[$field]);
        }
    }
    unset($item);
    return $project;
};
$fordFixed = agent_project_with_catalog_presentation($fordBroken, $fordPayload['project']);
check(agent_payload_hash($protectedProject($fordFixed)) === agent_payload_hash($protectedProject($fordBroken)), 'Ford repair changes presentation fields only');
check(count(array_filter($fordFixed['items'], static fn(array $item): bool =>
    $item['series'] === 'Axial Duct Type Ex-proof Fan'
    && $item['seriesCode'] === 'AXD/ATEX'
    && $item['seriesTitle'] === 'Axial Duct Type Ex-proof Fan'
    && $item['image'] === 'assets/products/AXD-ATEX.webp'
    && $item['safetyWarning'] === ''
)) === 10, 'Ford repair restores descriptive titles and catalogue images without unverified ATEX text');
echo json_encode(['passed'=>$checks,'projects'=>count(project_store_read()['projects']),'drafts'=>count(project_store_read()['agentDrafts'])]), PHP_EOL;
