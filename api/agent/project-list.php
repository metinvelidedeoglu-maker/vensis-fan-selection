<?php
declare(strict_types=1);

/**
 * Read-only, scoped inventory of Project Cloud records.
 * Important: projects are not a complete history of quotations or sent offers.
 */
require_once __DIR__ . '/project-domain.php';

$auth = agent_authorize('project:list');
$request = agent_request_json(4096);
foreach (array_keys($request) as $key) {
    if (!in_array($key, ['from', 'to', 'dateField', 'limit', 'offset', 'snapshot'], true)) {
        throw new AgentApiException('Unknown project inventory filter.', 422);
    }
}

$timezone = new DateTimeZone('Europe/Istanbul');
$parseDate = static function (mixed $value, string $field) use ($timezone): DateTimeImmutable {
    if (!is_string($value) || preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) !== 1) {
        throw new AgentApiException("Invalid {$field} date. Use YYYY-MM-DD.", 422);
    }
    $date = DateTimeImmutable::createFromFormat('!Y-m-d', $value, $timezone);
    if (!$date || $date->format('Y-m-d') !== $value) {
        throw new AgentApiException("Invalid {$field} date.", 422);
    }
    return $date;
};
$from = $parseDate($request['from'] ?? null, 'from');
$to = $parseDate($request['to'] ?? null, 'to');
if ($to < $from || $from->diff($to)->days > 366) {
    throw new AgentApiException('The date range must be ordered and at most 366 days.', 422);
}
$endExclusive = $to->modify('+1 day');
$dateField = $request['dateField'] ?? 'createdAt';
if (!is_string($dateField) || !in_array($dateField, ['createdAt', 'updatedAt'], true)) {
    throw new AgentApiException('dateField must be createdAt or updatedAt.', 422);
}
$limit = $request['limit'] ?? 100;
$offset = $request['offset'] ?? 0;
if (!is_int($limit) || $limit < 1 || $limit > 100 ||
    !is_int($offset) || $offset < 0 || $offset > 1000000) {
    throw new AgentApiException('Invalid inventory pagination.', 422);
}
$expectedSnapshot = $request['snapshot'] ?? null;
if ($expectedSnapshot !== null && (!is_string($expectedSnapshot) ||
    preg_match('/^[a-f0-9]{64}$/', $expectedSnapshot) !== 1)) {
    throw new AgentApiException('Invalid inventory snapshot.', 422);
}

try {
    $state = project_store_read(); // Existing private Project Cloud; no mutations.
} catch (EditApiException $error) {
    throw new AgentApiException('Project Cloud inventory is unavailable.', $error->httpStatus);
}
$rows = [];
foreach ($state['projects'] as $project) {
    if (!is_array($project) || !isset($project['id'], $project[$dateField]) ||
        !is_string($project[$dateField])) {
        throw new AgentApiException('Project Cloud contains an incomplete project record.', 500);
    }
    try {
        $stamp = new DateTimeImmutable($project[$dateField]);
    } catch (Throwable) {
        throw new AgentApiException('Project Cloud contains an invalid project timestamp.', 500);
    }
    if ($stamp < $from || $stamp >= $endExclusive) {
        continue;
    }
    $meta = is_array($project['meta'] ?? null) ? $project['meta'] : [];
    $rows[] = [
        'projectId' => (string) $project['id'],
        'name' => (string) ($project['name'] ?? ''),
        'customer' => (string) ($project['reference'] ?? ''),
        'status' => (string) ($project['status'] ?? 'draft'),
        'createdAt' => (string) ($project['createdAt'] ?? ''),
        'updatedAt' => (string) ($project['updatedAt'] ?? ''),
        'lastQuotationNumber' => (string) ($meta['lastQuotationNumber'] ?? ''),
    ];
}
usort($rows, static function (array $left, array $right) use ($dateField): int {
    return strcmp($right[$dateField], $left[$dateField])
        ?: strcmp($left['projectId'], $right['projectId']);
});
$snapshot = hash('sha256', json_encode($rows, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));
if ($expectedSnapshot !== null && !hash_equals($snapshot, $expectedSnapshot)) {
    throw new AgentApiException('Project inventory changed during pagination; restart from offset 0.', 409);
}
$total = count($rows);
$page = array_slice($rows, $offset, $limit);
$nextOffset = $offset + count($page);
agent_audit($auth['id'], 'project.list', $request, ['total' => $total, 'returned' => count($page)]);
agent_json([
    'ok' => true,
    'source' => 'project_cloud',
    'recordType' => 'project',
    'notQuotationHistory' => true,
    'from' => $from->format('Y-m-d'),
    'to' => $to->format('Y-m-d'),
    'timezone' => 'Europe/Istanbul',
    'dateField' => $dateField,
    'total' => $total,
    'offset' => $offset,
    'nextOffset' => $nextOffset < $total ? $nextOffset : null,
    'snapshot' => $snapshot,
    'projects' => $page,
]);
