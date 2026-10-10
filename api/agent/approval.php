<?php
declare(strict_types=1);

require_once __DIR__ . '/domain.php';

function agent_approval_actions(): array
{
    return ['project.write', 'customer.write', 'order.write', 'quotation.send', 'quotation.publish'];
}

function agent_canonicalize(mixed $value): mixed
{
    if (!is_array($value)) {
        return $value;
    }
    $isList = $value === [] || array_keys($value) === range(0, count($value) - 1);
    if (!$isList) {
        ksort($value, SORT_STRING);
    }
    foreach ($value as $key => $item) {
        $value[$key] = agent_canonicalize($item);
    }
    return $value;
}

function agent_payload_hash(array $payload): string
{
    return hash('sha256', json_encode(agent_canonicalize($payload), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRESERVE_ZERO_FRACTION));
}

function agent_approval_store(callable $mutation): mixed
{
    $path = agent_runtime_file('agent-approvals-v1.json');
    $lockPath = agent_runtime_file('agent-approvals-v1.lock');
    $lock = @fopen($lockPath, 'c+');
    if ($lock === false || !flock($lock, LOCK_EX)) {
        throw new AgentApiException('Approval storage is unavailable.', 500);
    }
    try {
        $raw = is_file($path) ? @file_get_contents($path) : '';
        $store = is_string($raw) && $raw !== '' ? json_decode($raw, true) : ['version' => 1, 'requests' => []];
        if (!is_array($store) || (int) ($store['version'] ?? 0) !== 1 || !is_array($store['requests'] ?? null)) {
            throw new AgentApiException('Approval storage is invalid.', 500);
        }
        [$nextStore, $result, $changed] = $mutation($store);
        if ($changed) {
            if (count($nextStore['requests']) > 1000) {
                uasort($nextStore['requests'], static fn(array $a, array $b): int => ((int) ($a['createdUnix'] ?? 0)) <=> ((int) ($b['createdUnix'] ?? 0)));
                $nextStore['requests'] = array_slice($nextStore['requests'], -1000, null, true);
            }
            $temporary = $path . '.tmp-' . bin2hex(random_bytes(8));
            $encoded = json_encode($nextStore, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
            if (@file_put_contents($temporary, $encoded, LOCK_EX) === false || !@rename($temporary, $path)) {
                @unlink($temporary);
                throw new AgentApiException('Approval storage could not be updated.', 500);
            }
            @chmod($path, 0600);
        }
        @chmod($lockPath, 0600);
        return $result;
    } finally {
        flock($lock, LOCK_UN);
        fclose($lock);
    }
}

function agent_approval_public(array $record, bool $includePayload): array
{
    $result = [
        'requestId' => $record['requestId'],
        'action' => $record['action'],
        'status' => $record['status'],
        'summary' => $record['summary'],
        'reason' => $record['reason'],
        'payloadHash' => $record['payloadHash'],
        'requestedBy' => $record['requestedBy'],
        'createdAt' => $record['createdAt'],
        'requestExpiresAt' => $record['requestExpiresAt'],
        'reviewedBy' => $record['reviewedBy'] ?? null,
        'reviewedAt' => $record['reviewedAt'] ?? null,
        'decisionNote' => $record['decisionNote'] ?? '',
    ];
    if ($includePayload) {
        $result['payload'] = $record['payload'];
    }
    return $result;
}

function agent_create_approval_request(array $request, string $identityId, array $config): array
{
    $action = agent_text($request['action'] ?? null, 'action', 80, true);
    if (!in_array($action, agent_approval_actions(), true)) {
        throw new AgentApiException('action is not eligible for approval.', 422);
    }
    $summary = agent_text($request['summary'] ?? null, 'summary', 500, true);
    $reason = agent_text($request['reason'] ?? null, 'reason', 2000, true);
    $payload = $request['payload'] ?? null;
    if (!is_array($payload) || $payload === []) {
        throw new AgentApiException('payload must contain the exact proposed operation.', 422);
    }
    $encodedPayload = json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    if (!is_string($encodedPayload) || strlen($encodedPayload) > 131072) {
        throw new AgentApiException('payload is too large.', 413);
    }
    $idempotencyKey = agent_text($request['idempotencyKey'] ?? '', 'idempotencyKey', 160);
    $now = time();
    $record = agent_approval_store(static function (array $store) use ($action, $summary, $reason, $payload, $idempotencyKey, $identityId, $config, $now): array {
        if ($idempotencyKey !== '') {
            foreach ($store['requests'] as $existing) {
                if (($existing['requestedBy'] ?? '') === $identityId && ($existing['action'] ?? '') === $action && ($existing['idempotencyKey'] ?? '') === $idempotencyKey) {
                    return [$store, $existing, false];
                }
            }
        }
        $id = 'apr_' . bin2hex(random_bytes(12));
        $record = [
            'requestId' => $id,
            'action' => $action,
            'status' => 'pending',
            'summary' => $summary,
            'reason' => $reason,
            'payload' => $payload,
            'payloadHash' => agent_payload_hash($payload),
            'idempotencyKey' => $idempotencyKey,
            'requestedBy' => $identityId,
            'createdUnix' => $now,
            'createdAt' => gmdate('c', $now),
            'requestExpiresAt' => gmdate('c', $now + (int) $config['approval_request_ttl_seconds']),
        ];
        $store['requests'][$id] = $record;
        return [$store, $record, true];
    });
    return ['ok' => true, 'executed' => false, 'approval' => agent_approval_public($record, false)];
}

function agent_review_approval(array $request, string $reviewerId, array $config): array
{
    $requestId = agent_text($request['requestId'] ?? null, 'requestId', 64, true);
    $decision = agent_text($request['decision'] ?? null, 'decision', 16, true);
    if (!in_array($decision, ['approved', 'rejected'], true)) {
        throw new AgentApiException('decision must be approved or rejected.', 422);
    }
    $note = agent_text($request['note'] ?? '', 'note', 2000);
    $now = time();
    $record = agent_approval_store(static function (array $store) use ($requestId, $decision, $note, $reviewerId, $now): array {
        $record = $store['requests'][$requestId] ?? null;
        if (!is_array($record)) {
            throw new AgentApiException('Approval request was not found.', 404);
        }
        if (($record['requestedBy'] ?? '') === $reviewerId) {
            throw new AgentApiException('Requester and reviewer must be separate identities.', 403);
        }
        if (($record['status'] ?? '') !== 'pending') {
            throw new AgentApiException('Approval request has already been reviewed.', 409);
        }
        if (strtotime((string) ($record['requestExpiresAt'] ?? '')) < $now) {
            throw new AgentApiException('Approval request has expired.', 409);
        }
        $record['status'] = $decision;
        $record['reviewedBy'] = $reviewerId;
        $record['reviewedAt'] = gmdate('c', $now);
        $record['reviewedUnix'] = $now;
        $record['decisionNote'] = $note;
        $store['requests'][$requestId] = $record;
        return [$store, $record, true];
    });
    return ['ok' => true, 'executed' => false, 'approval' => agent_approval_public($record, true), 'grantAvailable' => $decision === 'approved'];
}

function agent_approval_grant(array $record, array $config): string
{
    $reviewedUnix = (int) ($record['reviewedUnix'] ?? 0);
    return agent_selection_token([
        'v' => 1,
        'typ' => 'approval',
        'rid' => $record['requestId'],
        'sub' => $record['requestedBy'],
        'reviewer' => $record['reviewedBy'],
        'action' => $record['action'],
        'payloadHash' => $record['payloadHash'],
        'iat' => $reviewedUnix,
        'exp' => $reviewedUnix + (int) $config['approval_grant_ttl_seconds'],
    ], $config);
}

function agent_approval_status(array $request, string $identityId, array $matchedScopes, array $config): array
{
    $requestId = agent_text($request['requestId'] ?? null, 'requestId', 64, true);
    $isReviewer = in_array('approval:review', $matchedScopes, true);
    $record = agent_approval_store(static function (array $store) use ($requestId, $identityId, $isReviewer): array {
        $record = $store['requests'][$requestId] ?? null;
        if (!is_array($record) || (!$isReviewer && ($record['requestedBy'] ?? '') !== $identityId)) {
            throw new AgentApiException('Approval request was not found.', 404);
        }
        return [$store, $record, false];
    });
    $result = ['ok' => true, 'executed' => false, 'approval' => agent_approval_public($record, $isReviewer)];
    if (($record['status'] ?? '') === 'approved') {
        $expires = (int) ($record['reviewedUnix'] ?? 0) + (int) $config['approval_grant_ttl_seconds'];
        if ($expires >= time()) {
            $result['approvalGrant'] = agent_approval_grant($record, $config);
            $result['approvalGrantExpiresAt'] = gmdate('c', $expires);
        } else {
            $result['approvalGrantExpired'] = true;
        }
    }
    return $result;
}

function agent_verify_approval_grant(string $token, string $identityId, string $action, array $payload, array $config): array
{
    $parts = explode('.', $token);
    if (count($parts) !== 2 || strlen($token) > 4096) {
        throw new AgentApiException('Approval grant is invalid.', 422);
    }
    $expected = hash_hmac('sha256', $parts[0], (string) $config['signing_key'], true);
    if (!hash_equals($expected, agent_base64url_decode($parts[1]))) {
        throw new AgentApiException('Approval grant is invalid.', 422);
    }
    try {
        $grant = json_decode(agent_base64url_decode($parts[0]), true, 16, JSON_THROW_ON_ERROR);
    } catch (JsonException) {
        throw new AgentApiException('Approval grant is invalid.', 422);
    }
    if (!is_array($grant) || ($grant['typ'] ?? '') !== 'approval' || ($grant['sub'] ?? '') !== $identityId || ($grant['action'] ?? '') !== $action || ($grant['payloadHash'] ?? '') !== agent_payload_hash($payload) || (int) ($grant['exp'] ?? 0) < time()) {
        throw new AgentApiException('Approval grant is expired or does not match this operation.', 403);
    }
    return $grant;
}

function agent_consume_approval_grant(string $token, string $identityId, string $action, array $payload, array $config): array
{
    $grant = agent_verify_approval_grant($token, $identityId, $action, $payload, $config);
    $requestId = (string) ($grant['rid'] ?? '');
    return agent_approval_store(static function (array $store) use ($requestId, $identityId, $action, $grant): array {
        $record = $store['requests'][$requestId] ?? null;
        if (!is_array($record) || ($record['status'] ?? '') !== 'approved' || ($record['requestedBy'] ?? '') !== $identityId || ($record['action'] ?? '') !== $action || ($record['payloadHash'] ?? '') !== ($grant['payloadHash'] ?? '') || ($record['reviewedBy'] ?? '') !== ($grant['reviewer'] ?? '')) {
            throw new AgentApiException('Approval grant has already been used or is no longer valid.', 409);
        }
        $record['status'] = 'consumed';
        $record['consumedBy'] = $identityId;
        $record['consumedAt'] = gmdate('c');
        $store['requests'][$requestId] = $record;
        return [$store, $grant, true];
    });
}
