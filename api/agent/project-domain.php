<?php
declare(strict_types=1);

// Load Project Cloud before the Agent exception handler.
require_once dirname(__DIR__) . '/projects/bootstrap.php';
require_once __DIR__ . '/approval.php';

function agent_draft_snapshot(array $draft): array
{
    return array_intersect_key($draft, array_flip([
        'draftId', 'status', 'preparedBy', 'createdAt', 'project', 'customer',
        'notes', 'lines', 'totals', 'sourceDraftId',
    ]));
}

function agent_project_from_draft(array $draft, string $identityId, array $config, array $options = []): array
{
    $snapshot = agent_draft_snapshot($draft);
    $snapshot['preparedBy'] = agent_text($options['preparedBy'] ?? $draft['preparedBy'] ?? $identityId, 'preparedBy', 240);
    $sourceId = agent_text($snapshot['sourceDraftId'] ?? $snapshot['draftId'], 'draftId', 160, true);
    $providedId = $options['id'] ?? '';
    $id = $providedId === '' ? 'prj_' . substr(hash('sha256', $identityId . '|' . $sourceId), 0, 24) : project_id($providedId);
    $items = [];
    foreach ($snapshot['lines'] as $index => $line) {
        if (($line['accessories'] ?? []) !== []) {
            throw new AgentApiException('Accessory project storage requires a separately reviewed item mapping.', 422);
        }
        $items[] = [
            'itemKey' => 'line-' . ($index + 1), 'mode' => 'selection', 'productType' => 'fan',
            'id' => $line['modelId'], 'productKey' => $line['productKey'],
            'model' => $line['model'], 'manufacturer' => $line['manufacturer'], 'series' => $line['series'],
            'quantity' => $line['quantity'], 'price' => $line['listUnitPrice'], 'priceCurrency' => $line['currency'],
            'discountPercent' => $line['discountPercent'],
            'required' => ['q' => $line['requiredDuty']['airflowM3h'], 'p' => $line['requiredDuty']['pressurePa']],
            'selected' => ['q' => $line['selectedDuty']['airflowM3h'], 'p' => $line['selectedDuty']['pressurePa']],
            'motorPower' => $line['motor']['powerKw'], 'speed' => $line['motor']['speedRpm'],
            'current' => $line['motor']['currentA'], 'voltage' => $line['motor']['voltage'],
            'frequency' => $line['motor']['frequency'],
        ];
    }
    $name = $snapshot['project']['name'];
    $project = project_record([
        'id' => $id, 'name' => $name, 'createdAt' => $snapshot['createdAt'], 'updatedAt' => $snapshot['createdAt'],
        'meta' => [
            'name' => $name, 'reference' => $snapshot['project']['reference'] ?: $snapshot['customer']['name'],
            'contact' => $snapshot['project']['contact'] ?: $snapshot['customer']['contact'],
            'preparedBy' => $snapshot['preparedBy'], 'status' => 'draft', 'globalDiscount' => 0, 'orders' => [],
        ],
        'items' => $items,
    ]);
    $result = [
        'operation' => $providedId === '' ? 'create' : 'update', 'project' => $project,
        'quoteDraft' => $snapshot,
        'quoteDraftSignature' => hash_hmac('sha256', $identityId . '|' . agent_payload_hash($snapshot), (string) $config['signing_key']),
    ];
    if ($providedId !== '') {
        $result['expectedUpdatedAt'] = project_timestamp($options['expectedUpdatedAt'] ?? null, 'expectedUpdatedAt');
    }
    return $result;
}

function agent_legacy_project_draft(array $source, string $identityId, array $config): array
{
    $modelName = agent_text($source['model'] ?? null, 'project.model', 240, true);
    $catalog = agent_catalog();
    $matches = array_values(array_filter($catalog['models'], static fn(array $model): bool => ($model['model'] ?? '') === $modelName));
    if (count($matches) !== 1 || empty($matches[0]['quoteEligible'])) {
        throw new AgentApiException('Project model is ambiguous or requires engineering review. Use a signed quotation draft.', 422);
    }
    $model = $matches[0];
    $q = agent_number($source['airflowM3h'] ?? null, 'airflowM3h', 1, 100000000);
    $p = agent_number($source['pressurePa'] ?? null, 'pressurePa', 1, 10000000);
    $point = agent_operating_point($model['selectionPoints'], $q, $p, [
        'airflowMin' => $q * 0.9, 'airflowMax' => $q * 1.2, 'pressureMin' => $p * 0.9, 'pressureMax' => $p * 1.2,
    ]);
    if ($point === null) {
        throw new AgentApiException('Project fan does not meet the requested duty within the approved default tolerance.', 422);
    }
    if (strtoupper((string) ($source['currency'] ?? 'EUR')) !== strtoupper($model['pricing']['currency'])) {
        throw new AgentApiException('Project currency does not match the server catalogue.', 422);
    }
    $token = agent_selection_token([
        'sub' => $identityId, 'modelId' => $model['id'], 'catalog' => $catalog['sourceHash'],
        'required' => ['airflowM3h' => $q, 'pressurePa' => $p],
        'selected' => ['airflowM3h' => $point['airflowM3h'], 'pressurePa' => $point['pressurePa']],
        'exp' => time() + (int) $config['selection_token_ttl_seconds'],
    ], $config);
    $draft = agent_quote_draft([
        'project' => ['name' => $source['name'] ?? '', 'reference' => $source['reference'] ?? '', 'contact' => $source['contact'] ?? ''],
        'customer' => ['name' => $source['customerName'] ?? ''], 'notes' => $source['description'] ?? '',
        'lines' => [['selectionToken' => $token, 'quantity' => $source['quantity'] ?? 1, 'discountPercent' => 0]],
    ], $identityId, ['maximum_discount_percent' => 0], $config);
    if (($source['quoteDraftId'] ?? '') !== '') {
        $draft['sourceDraftId'] = agent_text($source['quoteDraftId'], 'quoteDraftId', 160);
    }
    return $draft;
}

function agent_prepare_project_write(array $payload, string $identityId, array $config): array
{
    $source = $payload['project'] ?? null;
    if (!is_array($source)) {
        throw new AgentApiException('payload.project must contain the exact approved project.', 422);
    }
    try {
        if (!array_key_exists('items', $source) && isset($source['model'])) {
            if (($source['orders'] ?? []) !== [] || ($source['meta']['orders'] ?? []) !== []
                || (float) ($source['globalDiscount'] ?? $source['meta']['globalDiscount'] ?? 0) !== 0.0
                || (float) ($source['discountPercent'] ?? 0) !== 0.0
                || ($source['status'] ?? $source['meta']['status'] ?? 'draft') !== 'draft') {
                throw new AgentApiException('Project approval cannot create orders, change status or apply discounts.', 403);
            }
            $draft = agent_legacy_project_draft($source, $identityId, $config);
            $options = ['preparedBy' => $source['preparedBy'] ?? $identityId];
            if (($source['id'] ?? '') !== '') {
                $options['id'] = $source['id'];
                $options['expectedUpdatedAt'] = $payload['expectedUpdatedAt'] ?? null;
            }
            $payload = agent_project_from_draft($draft, $identityId, $config, $options);
            $source = $payload['project'];
        }
        $project = project_record($source);
        if (($project['meta']['orders'] ?? []) !== []) {
            throw new AgentApiException('Project approval cannot create or change orders.', 403);
        }
        if ($project['status'] !== 'draft') {
            throw new AgentApiException('Project approval can only save a draft project.', 403);
        }
        if ((float) $project['meta']['globalDiscount'] !== 0.0) {
            throw new AgentApiException('Project approval cannot apply a global discount.', 403);
        }
        foreach ($project['items'] as $item) {
            if ((float) ($item['discountPercent'] ?? 0) !== 0.0) {
                throw new AgentApiException('Project approval cannot apply an item discount.', 403);
            }
        }
        if (isset($payload['quoteDraft'])) {
            $snapshot = $payload['quoteDraft'];
            if (!is_array($snapshot) || !is_string($payload['quoteDraftSignature'] ?? null)
                || !hash_equals(hash_hmac('sha256', $identityId . '|' . agent_payload_hash($snapshot), (string) $config['signing_key']), $payload['quoteDraftSignature'])) {
                throw new AgentApiException('Quotation draft signature is invalid.', 403);
            }
            $options = ['preparedBy' => $snapshot['preparedBy']];
            if (($payload['operation'] ?? '') === 'update') {
                $options['id'] = $project['id'];
                $options['expectedUpdatedAt'] = $payload['expectedUpdatedAt'] ?? null;
            }
            $expected = agent_project_from_draft($snapshot, $identityId, $config, $options);
            if (agent_payload_hash($expected['project']) !== agent_payload_hash($project)) {
                throw new AgentApiException('Project does not match the signed quotation draft.', 403);
            }
        }
        $operation = $payload['operation'] ?? 'save';
        if (!in_array($operation, ['create', 'update', 'save'], true)) {
            throw new AgentApiException('Project operation is invalid.', 422);
        }
        if ($operation === 'update') {
            $payload['expectedUpdatedAt'] = project_timestamp($payload['expectedUpdatedAt'] ?? null, 'expectedUpdatedAt');
        }
        $payload['project'] = $project;
        return $payload;
    } catch (EditApiException $error) {
        throw new AgentApiException($error->getMessage(), $error->httpStatus);
    }
}

function agent_store_project_write(array $prepared, array $originalPayload, string $token, string $identityId, array $config): array
{
    // Verify the ORIGINAL approved payload, before any schema conversion.
    $grant = agent_verify_approval_grant($token, $identityId, 'project.write', $originalPayload, $config);
    $project = $prepared['project'];
    return project_store_mutate(static function (array &$state) use ($prepared, $project, $originalPayload, $token, $identityId, $config, $grant): array {
        $id = $project['id'];
        $existing = $state['projects'][$id] ?? null;
        if (($state['tombstones'][$id] ?? '') !== '') {
            throw new AgentApiException('A deleted project cannot be restored by this connector.', 409);
        }
        $operation = $prepared['operation'] ?? 'save';
        if ($operation === 'create' && is_array($existing)) {
            throw new AgentApiException('Project already exists. Read it and explicitly request an update; no duplicate was created.', 409);
        }
        if ($operation === 'update' && !is_array($existing)) {
            throw new AgentApiException('The project to update was not found.', 404);
        }
        if (is_array($existing)) {
            if (($existing['status'] ?? '') !== 'draft' || ($existing['meta']['orders'] ?? []) !== []
                || (float) ($existing['meta']['globalDiscount'] ?? 0) !== 0.0
                || array_filter($existing['items'] ?? [], static fn(array $item): bool => (float) ($item['discountPercent'] ?? 0) !== 0.0)) {
                throw new AgentApiException('Existing commercial status, discounts or orders cannot be overwritten by this connector.', 403);
            }
            if (($prepared['expectedUpdatedAt'] ?? '') !== ($existing['updatedAt'] ?? '')) {
                throw new AgentApiException('Project changed or expectedUpdatedAt is missing. Read it again before requesting an update.', 409);
            }
        }
        // Conflicts and validation are checked before consuming the one-use grant.
        agent_consume_approval_grant($token, $identityId, 'project.write', $originalPayload, $config);
        $saved = $project;
        if (is_array($existing)) {
            $saved['createdAt'] = $existing['createdAt'];
        }
        $saved['updatedAt'] = (new DateTimeImmutable())->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d\TH:i:s.v\Z');
        if (is_array($existing) && strcmp($saved['updatedAt'], $existing['updatedAt']) <= 0) {
            $saved['updatedAt'] = (new DateTimeImmutable($existing['updatedAt']))->modify('+1 millisecond')->format('Y-m-d\TH:i:s.v\Z');
        }
        $state['projects'][$id] = $saved;
        $draftId = null;
        if (isset($prepared['quoteDraft'])) {
            $draftId = $prepared['quoteDraft']['draftId'];
            $state['agentDrafts'][$draftId] = ['projectId' => $id, 'requestedBy' => $identityId, 'draft' => $prepared['quoteDraft']];
        }
        $receipt = ['requestId' => $grant['rid'], 'projectId' => $id, 'draftId' => $draftId,
            'requestedBy' => $identityId, 'payloadHash' => agent_payload_hash($originalPayload), 'storedAt' => $saved['updatedAt']];
        $state['agentReceipts'][$grant['rid']] = $receipt;
        return ['stored' => true, 'project' => $saved, 'quoteDraft' => $prepared['quoteDraft'] ?? null,
            'draftId' => $draftId, 'approvalRequestId' => $grant['rid'], 'operation' => is_array($existing) ? 'update' : 'create'];
    });
}

function agent_read_project(array $request, string $identityId): array
{
    $state = project_store_read();
    $projectId = $request['projectId'] ?? null;
    $requestId = $request['requestId'] ?? null;
    $receipts = array_values(array_filter($state['agentReceipts'] ?? [], static fn(array $receipt): bool =>
        ($receipt['requestedBy'] ?? '') === $identityId
        && (($projectId !== null && ($receipt['projectId'] ?? '') === $projectId)
            || ($requestId !== null && ($receipt['requestId'] ?? '') === $requestId))));
    if (!$receipts) {
        throw new AgentApiException('Saved project was not found or is not visible to this identity.', 404);
    }
    $receipt = $receipts[count($receipts) - 1];
    $project = $state['projects'][$receipt['projectId']] ?? null;
    if (!is_array($project)) {
        throw new AgentApiException('Saved project was not found.', 404);
    }
    $draft = $state['agentDrafts'][$receipt['draftId'] ?? '']['draft'] ?? null;
    return ['ok' => true, 'executed' => false, 'stored' => true, 'project' => $project,
        'quoteDraft' => $draft, 'draftId' => $receipt['draftId'], 'receipt' => $receipt];
}
