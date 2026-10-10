<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

function agent_catalog(): array
{
    static $catalog;
    if (is_array($catalog)) {
        return $catalog;
    }
    $path = __DIR__ . '/catalog-v1.json';
    $raw = @file_get_contents($path);
    if (!is_string($raw) || $raw === '') {
        throw new AgentApiException('The selection catalog is unavailable.', 503);
    }
    try {
        $catalog = json_decode($raw, true, 256, JSON_THROW_ON_ERROR);
    } catch (JsonException) {
        throw new AgentApiException('The selection catalog is invalid.', 500);
    }
    if (!is_array($catalog) || (int) ($catalog['schemaVersion'] ?? 0) !== 1 || !is_array($catalog['models'] ?? null)) {
        throw new AgentApiException('The selection catalog is invalid.', 500);
    }
    return $catalog;
}
function agent_number(mixed $value, string $field, float $minimum, float $maximum): float
{
    if (!is_int($value) && !is_float($value) && !(is_string($value) && is_numeric($value))) {
        throw new AgentApiException("{$field} must be numeric.", 422);
    }
    $number = (float) $value;
    if (!is_finite($number) || $number < $minimum || $number > $maximum) {
        throw new AgentApiException("{$field} is outside the allowed range.", 422);
    }
    return $number;
}

function agent_text(mixed $value, string $field, int $maximumLength, bool $required = false): string
{
    if ($value === null && !$required) {
        return '';
    }
    if (!is_string($value) && !is_int($value) && !is_float($value)) {
        throw new AgentApiException("{$field} is invalid.", 422);
    }
    $text = trim((string) $value);
    if (($required && $text === '') || strlen($text) > $maximumLength || preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F]/', $text)) {
        throw new AgentApiException("{$field} is invalid.", 422);
    }
    return $text;
}

function agent_text_list(mixed $value, string $field, int $maximumItems = 50): array
{
    if ($value === null) {
        return [];
    }
    if (!is_array($value) || count($value) > $maximumItems) {
        throw new AgentApiException("{$field} is invalid.", 422);
    }
    $result = [];
    foreach ($value as $item) {
        $text = agent_text($item, $field, 160, true);
        if (!in_array($text, $result, true)) {
            $result[] = $text;
        }
    }
    return $result;
}

function agent_curve_points(array $points): array
{
    $result = [];
    $previousKey = '';
    foreach ($points as $point) {
        if (!is_array($point) || count($point) < 2) {
            continue;
        }
        $pressure = (float) $point[0];
        $airflow = (float) $point[1];
        $key = $pressure . '|' . $airflow;
        if (is_finite($pressure) && is_finite($airflow) && $key !== $previousKey) {
            $result[] = [$pressure, $airflow];
            $previousKey = $key;
        }
    }
    return $result;
}

function agent_restrict_interval(?array $interval, float $start, float $end, float $minimum, float $maximum): ?array
{
    if ($interval === null) {
        return null;
    }
    $difference = $end - $start;
    if (abs($difference) < 1e-12) {
        return $start >= $minimum && $start <= $maximum ? $interval : null;
    }
    $first = ($minimum - $start) / $difference;
    $second = ($maximum - $start) / $difference;
    $low = max($interval[0], min($first, $second));
    $high = min($interval[1], max($first, $second));
    return $low <= $high + 1e-12 ? [max(0.0, $low), min(1.0, $high)] : null;
}

function agent_candidate(float $pressure, float $airflow, float $requiredAirflow, float $requiredPressure): array
{
    $qd = ($airflow - $requiredAirflow) / $requiredAirflow;
    $pd = ($pressure - $requiredPressure) / $requiredPressure;
    $systemPressure = $requiredPressure * pow($airflow / $requiredAirflow, 2);
    $systemGap = abs($pressure - $systemPressure) / max($requiredPressure, $systemPressure, 1.0);
    $dutyGap = abs($qd) + abs($pd);
    return [
        'airflowM3h' => $airflow,
        'pressurePa' => $pressure,
        'airflowDeviation' => $qd,
        'pressureDeviation' => $pd,
        'systemGap' => $systemGap,
        'dutyGap' => $dutyGap,
        'score' => $dutyGap + $systemGap,
        'matchMode' => $systemGap < 1e-7 ? 'system-intersection' : 'tolerance-nearest',
    ];
}

function agent_operating_point(array $rawPoints, float $requiredAirflow, float $requiredPressure, array $bounds): ?array
{
    $curve = agent_curve_points($rawPoints);
    $exact = [];
    $candidates = [];
    $residual = static fn(array $point): float => (float) $point[0] - $requiredPressure * pow((float) $point[1] / $requiredAirflow, 2);
    $add = static function (float $pressure, float $airflow) use (&$candidates, $bounds, $requiredAirflow, $requiredPressure): void {
        if ($pressure < $bounds['pressureMin'] - 1e-7 || $pressure > $bounds['pressureMax'] + 1e-7 || $airflow < $bounds['airflowMin'] - 1e-7 || $airflow > $bounds['airflowMax'] + 1e-7) {
            return;
        }
        $candidates[] = agent_candidate($pressure, $airflow, $requiredAirflow, $requiredPressure);
    };
    if (count($curve) === 1) {
        $add($curve[0][0], $curve[0][1]);
    }
    for ($index = 0; $index < count($curve) - 1; $index++) {
        $start = $curve[$index];
        $end = $curve[$index + 1];
        $startResidual = $residual($start);
        $endResidual = $residual($end);
        if (abs($startResidual) < 1e-9) {
            $exact[] = agent_candidate($start[0], $start[1], $requiredAirflow, $requiredPressure);
            continue;
        }
        if ($startResidual * $endResidual > 0) {
            continue;
        }
        $low = 0.0;
        $high = 1.0;
        $currentLowResidual = $startResidual;
        for ($iteration = 0; $iteration < 45; $iteration++) {
            $middle = ($low + $high) / 2;
            $point = [$start[0] + ($end[0] - $start[0]) * $middle, $start[1] + ($end[1] - $start[1]) * $middle];
            $middleResidual = $residual($point);
            if (($middleResidual <=> 0) === ($currentLowResidual <=> 0)) {
                $low = $middle;
                $currentLowResidual = $middleResidual;
            } else {
                $high = $middle;
            }
        }
        $fraction = ($low + $high) / 2;
        $exact[] = agent_candidate($start[0] + ($end[0] - $start[0]) * $fraction, $start[1] + ($end[1] - $start[1]) * $fraction, $requiredAirflow, $requiredPressure);
    }
    for ($index = 0; $index < count($curve) - 1; $index++) {
        $start = $curve[$index];
        $end = $curve[$index + 1];
        $interval = agent_restrict_interval([0.0, 1.0], $start[0], $end[0], $bounds['pressureMin'], $bounds['pressureMax']);
        $interval = agent_restrict_interval($interval, $start[1], $end[1], $bounds['airflowMin'], $bounds['airflowMax']);
        if ($interval === null) {
            continue;
        }
        $pressureDifference = $end[0] - $start[0];
        $airflowDifference = $end[1] - $start[1];
        $pointAt = static fn(float $fraction): array => [$start[0] + $pressureDifference * $fraction, $start[1] + $airflowDifference * $fraction];
        $lowPoint = $pointAt($interval[0]);
        $highPoint = $pointAt($interval[1]);
        $lowResidual = $residual($lowPoint);
        $highResidual = $residual($highPoint);
        $add($lowPoint[0], $lowPoint[1]);
        $add($highPoint[0], $highPoint[1]);
        if ($lowResidual * $highResidual < 0) {
            $low = $interval[0];
            $high = $interval[1];
            $currentLowResidual = $lowResidual;
            for ($iteration = 0; $iteration < 45; $iteration++) {
                $middle = ($low + $high) / 2;
                $middleResidual = $residual($pointAt($middle));
                if (($middleResidual <=> 0) === ($currentLowResidual <=> 0)) {
                    $low = $middle;
                    $currentLowResidual = $middleResidual;
                } else {
                    $high = $middle;
                }
            }
            $intersection = $pointAt(($low + $high) / 2);
            $add($intersection[0], $intersection[1]);
        }
        if (abs($airflowDifference) > 1e-12) {
            $stationary = (($pressureDifference * pow($requiredAirflow, 2) / (2 * $requiredPressure * $airflowDifference)) - $start[1]) / $airflowDifference;
            if ($stationary > $interval[0] && $stationary < $interval[1]) {
                $nearest = $pointAt($stationary);
                $add($nearest[0], $nearest[1]);
            }
        }
    }
    $pool = $exact ?: $candidates;
    if (!$pool) {
        return null;
    }
    usort($pool, $exact
        ? static fn(array $a, array $b): int => $a['dutyGap'] <=> $b['dutyGap']
        : static fn(array $a, array $b): int => ($a['systemGap'] <=> $b['systemGap']) ?: ($a['dutyGap'] <=> $b['dutyGap']));
    return $pool[0];
}

function agent_selection_input(array $request): array
{
    $tolerance = is_array($request['tolerance'] ?? null) ? $request['tolerance'] : [];
    $filters = is_array($request['filters'] ?? null) ? $request['filters'] : [];
    $input = [
        'airflowM3h' => agent_number($request['airflowM3h'] ?? null, 'airflowM3h', 1, 100000000),
        'pressurePa' => agent_number($request['pressurePa'] ?? null, 'pressurePa', 1, 10000000),
        'airflowMinPercent' => agent_number($tolerance['airflowMinPercent'] ?? -10, 'tolerance.airflowMinPercent', -90, 500),
        'airflowMaxPercent' => agent_number($tolerance['airflowMaxPercent'] ?? 20, 'tolerance.airflowMaxPercent', -90, 500),
        'pressureMinPercent' => agent_number($tolerance['pressureMinPercent'] ?? -10, 'tolerance.pressureMinPercent', -90, 500),
        'pressureMaxPercent' => agent_number($tolerance['pressureMaxPercent'] ?? 20, 'tolerance.pressureMaxPercent', -90, 500),
        'manufacturers' => agent_text_list($filters['manufacturers'] ?? null, 'filters.manufacturers'),
        'categories' => agent_text_list($filters['categories'] ?? null, 'filters.categories'),
        'series' => agent_text_list($filters['series'] ?? null, 'filters.series'),
        'limit' => (int) agent_number($request['limit'] ?? 10, 'limit', 1, 25),
    ];
    if ($input['airflowMinPercent'] > $input['airflowMaxPercent'] || $input['pressureMinPercent'] > $input['pressureMaxPercent']) {
        throw new AgentApiException('Tolerance minimum cannot exceed its maximum.', 422);
    }
    return $input;
}

function agent_base64url_encode(string $value): string
{
    return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
}

function agent_base64url_decode(string $value): string
{
    $padding = strlen($value) % 4;
    if ($padding) {
        $value .= str_repeat('=', 4 - $padding);
    }
    $decoded = base64_decode(strtr($value, '-_', '+/'), true);
    if (!is_string($decoded)) {
        throw new AgentApiException('Selection token is invalid.', 422);
    }
    return $decoded;
}

function agent_selection_token(array $payload, array $config): string
{
    $encoded = agent_base64url_encode(json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
    $signature = hash_hmac('sha256', $encoded, (string) $config['signing_key'], true);
    return $encoded . '.' . agent_base64url_encode($signature);
}

function agent_verify_selection_token(string $token, string $identityId, array $config, array $catalog): array
{
    $parts = explode('.', $token);
    if (count($parts) !== 2 || strlen($token) > 4096) {
        throw new AgentApiException('Selection token is invalid.', 422);
    }
    $expected = hash_hmac('sha256', $parts[0], (string) $config['signing_key'], true);
    $provided = agent_base64url_decode($parts[1]);
    if (!hash_equals($expected, $provided)) {
        throw new AgentApiException('Selection token is invalid.', 422);
    }
    try {
        $payload = json_decode(agent_base64url_decode($parts[0]), true, 16, JSON_THROW_ON_ERROR);
    } catch (JsonException) {
        throw new AgentApiException('Selection token is invalid.', 422);
    }
    if (!is_array($payload) || ($payload['sub'] ?? '') !== $identityId || (int) ($payload['exp'] ?? 0) < time() || ($payload['catalog'] ?? '') !== ($catalog['sourceHash'] ?? '')) {
        throw new AgentApiException('Selection token is expired or invalid.', 422);
    }
    return $payload;
}

function agent_accessory_suggestions(array $model, array $catalog): array
{
    $items = is_array($catalog['accessories']['items'] ?? null) ? $catalog['accessories']['items'] : [];
    $power = (float) ($model['motor']['powerKw'] ?? 0);
    $current = (float) ($model['motor']['currentA'] ?? 0);
    $voltage = strtolower((string) ($model['motor']['voltage'] ?? ''));
    $identity = strtolower((string) ($model['series'] ?? '') . ' ' . (string) ($model['model'] ?? '') . ' ' . (string) ($model['control'] ?? ''));
    $ec = str_contains($identity, ' ec') || str_contains($identity, '-ec') || preg_match('/\b(?:4v|6v|8v|10v)\b/', $identity) === 1;
    $suggestions = [];
    foreach ($items as $item) {
        $category = (string) ($item['category'] ?? '');
        $specs = (string) ($item['specs'] ?? '');
        $reason = '';
        if ($ec && $category === 'Hız Kontrolü' && stripos($specs, 'EC motor') !== false) {
            $reason = 'EC motor control candidate; verify the exact control signal and manufacturer compatibility.';
        } elseif (!$ec && $power > 0 && $category === 'Frekans İnverteri' && (str_contains($voltage, '380') || str_contains($voltage, '400'))) {
            if (preg_match('/(\d+(?:[,.]\d+)?)\s*kW/ui', $specs, $match) === 1 && (float) str_replace(',', '.', $match[1]) >= $power) {
                $reason = 'Power-rated inverter candidate; verify current, phase, EMC, enclosure and application requirements.';
            }
        } elseif (!$ec && $current > 0 && $category === 'Hız Kontrolü' && stripos($specs, 'EC motor') === false) {
            if (preg_match('/(\d+(?:[,.]\d+)?)\s*A\b/ui', $specs, $match) === 1 && (float) str_replace(',', '.', $match[1]) >= $current) {
                $reason = 'Current-rated speed-controller candidate; verify motor/control compatibility before use.';
            }
        }
        if ($reason !== '') {
            $suggestions[] = [
                'id' => $item['id'], 'model' => $item['model'], 'category' => $category,
                'manufacturer' => $item['manufacturer'], 'listPrice' => $item['price'],
                'currency' => $catalog['accessories']['currency'] ?? 'EUR', 'specs' => $specs,
                'compatibilityStatus' => 'review-required', 'reason' => $reason,
            ];
        }
    }
    usort($suggestions, static fn(array $a, array $b): int => ($a['listPrice'] <=> $b['listPrice']) ?: strcmp((string) $a['model'], (string) $b['model']));
    return array_slice($suggestions, 0, 5);
}

function agent_select(array $request, string $identityId, array $config): array
{
    $input = agent_selection_input($request);
    $catalog = agent_catalog();
    $bounds = [
        'airflowMin' => $input['airflowM3h'] * (1 + $input['airflowMinPercent'] / 100),
        'airflowMax' => $input['airflowM3h'] * (1 + $input['airflowMaxPercent'] / 100),
        'pressureMin' => $input['pressurePa'] * (1 + $input['pressureMinPercent'] / 100),
        'pressureMax' => $input['pressurePa'] * (1 + $input['pressureMaxPercent'] / 100),
    ];
    $results = [];
    $excludedNeedsReview = 0;
    foreach ($catalog['models'] as $model) {
        if (!empty($model['catalogOnly']) || empty($model['selectionPoints'])) {
            continue;
        }
        if (empty($model['quoteEligible'])) {
            $excludedNeedsReview++;
            continue;
        }
        if ($input['manufacturers'] && !in_array($model['manufacturer'] ?? '', $input['manufacturers'], true)) {
            continue;
        }
        if ($input['series'] && !in_array($model['series'] ?? '', $input['series'], true)) {
            continue;
        }
        if ($input['categories'] && array_diff($input['categories'], is_array($model['categories'] ?? null) ? $model['categories'] : [])) {
            continue;
        }
        $point = agent_operating_point($model['selectionPoints'], $input['airflowM3h'], $input['pressurePa'], $bounds);
        if ($point === null) {
            continue;
        }
        $results[] = ['model' => $model, 'point' => $point];
    }
    usort($results, static fn(array $a, array $b): int => ($a['point']['score'] <=> $b['point']['score']) ?: (($a['model']['motor']['powerKw'] ?? 0) <=> ($b['model']['motor']['powerKw'] ?? 0)));
    $results = array_slice($results, 0, $input['limit']);
    $now = time();
    $output = [];
    foreach ($results as $row) {
        $model = $row['model'];
        $point = $row['point'];
        $token = agent_selection_token([
            'v' => 1, 'sub' => $identityId, 'modelId' => $model['id'], 'catalog' => $catalog['sourceHash'],
            'required' => ['airflowM3h' => $input['airflowM3h'], 'pressurePa' => $input['pressurePa']],
            'selected' => ['airflowM3h' => $point['airflowM3h'], 'pressurePa' => $point['pressurePa']],
            'iat' => $now, 'exp' => $now + (int) $config['selection_token_ttl_seconds'],
        ], $config);
        $output[] = [
            'selectionToken' => $token,
            'selectionTokenExpiresAt' => gmdate('c', $now + (int) $config['selection_token_ttl_seconds']),
            'model' => [
                'id' => $model['id'], 'productKey' => $model['productKey'], 'name' => $model['model'],
                'control' => $model['control'], 'manufacturer' => $model['manufacturer'],
                'series' => $model['series'], 'seriesTitle' => $model['seriesTitle'], 'categories' => $model['categories'],
                'motor' => $model['motor'], 'technical' => $model['technical'], 'verification' => $model['verification'],
                'pricing' => $model['pricing'], 'sourcePage' => $model['sourcePage'],
            ],
            'operatingPoint' => $point,
            'accessorySuggestions' => agent_accessory_suggestions($model, $catalog),
        ];
    }
    return [
        'ok' => true,
        'mode' => 'read-only-selection',
        'catalog' => ['schemaVersion' => $catalog['schemaVersion'], 'sourceHash' => $catalog['sourceHash']],
        'request' => $input,
        'bounds' => $bounds,
        'results' => $output,
        'safety' => [
            'excludedNeedsEngineeringReview' => $excludedNeedsReview,
            'accessoryCompatibilityRequiresReview' => true,
            'technicalSelectionMustBeReviewedBeforeCustomerUse' => true,
        ],
    ];
}

function agent_model_by_id(array $catalog, string $id): array
{
    foreach ($catalog['models'] as $model) {
        if (($model['id'] ?? '') === $id) {
            return $model;
        }
    }
    throw new AgentApiException('Selected model is no longer available.', 409);
}

function agent_accessory_by_id(array $catalog, string $id): array
{
    foreach ($catalog['accessories']['items'] ?? [] as $item) {
        if (($item['id'] ?? '') === $id) {
            return $item;
        }
    }
    throw new AgentApiException('Selected accessory is not available.', 422);
}

function agent_quote_draft(array $request, string $identityId, array $identity, array $config): array
{
    $catalog = agent_catalog();
    $lines = $request['lines'] ?? null;
    if (!is_array($lines) || !$lines || count($lines) > 50) {
        throw new AgentApiException('lines must contain between 1 and 50 fan selections.', 422);
    }
    $globalCeiling = (float) $config['maximum_discount_percent'];
    $identityCeiling = isset($identity['maximum_discount_percent']) ? (float) $identity['maximum_discount_percent'] : $globalCeiling;
    $discountCeiling = max(0.0, min($globalCeiling, $identityCeiling));
    $draftLines = [];
    $total = 0.0;
    $currency = '';
    $warnings = ['Draft only: no customer communication, project write, order creation or price-policy change was performed.'];
    foreach ($lines as $index => $line) {
        if (!is_array($line)) {
            throw new AgentApiException("lines.{$index} is invalid.", 422);
        }
        $token = agent_text($line['selectionToken'] ?? null, "lines.{$index}.selectionToken", 4096, true);
        $payload = agent_verify_selection_token($token, $identityId, $config, $catalog);
        $model = agent_model_by_id($catalog, (string) ($payload['modelId'] ?? ''));
        if (empty($model['quoteEligible'])) {
            throw new AgentApiException('A selected model requires engineering review and cannot enter a quotation draft.', 409);
        }
        $quantity = (int) agent_number($line['quantity'] ?? 1, "lines.{$index}.quantity", 1, 100000);
        $discount = agent_number($line['discountPercent'] ?? 0, "lines.{$index}.discountPercent", 0, 100);
        if ($discount > $discountCeiling + 1e-9) {
            throw new AgentApiException("lines.{$index}.discountPercent exceeds this identity's approved ceiling.", 403);
        }
        $price = (float) ($model['pricing']['listPrice'] ?? 0);
        $lineCurrency = strtoupper((string) ($model['pricing']['currency'] ?? 'EUR'));
        if ($price <= 0) {
            throw new AgentApiException('A selected model has no verified list price and cannot enter a quotation draft.', 409);
        }
        if ($currency !== '' && $currency !== $lineCurrency) {
            throw new AgentApiException('A quotation draft cannot mix currencies.', 422);
        }
        $currency = $lineCurrency;
        $netUnit = $price * (1 - $discount / 100);
        $lineTotal = $netUnit * $quantity;
        $total += $lineTotal;
        $draftLine = [
            'type' => 'fan', 'modelId' => $model['id'], 'productKey' => $model['productKey'],
            'model' => $model['model'], 'manufacturer' => $model['manufacturer'], 'series' => $model['series'],
            'quantity' => $quantity, 'listUnitPrice' => $price, 'discountPercent' => $discount,
            'netUnitPrice' => $netUnit, 'lineTotal' => $lineTotal, 'currency' => $currency,
            'requiredDuty' => $payload['required'], 'selectedDuty' => $payload['selected'],
            'motor' => $model['motor'], 'technical' => $model['technical'], 'verification' => $model['verification'],
            'accessories' => [],
        ];
        $accessories = $line['accessories'] ?? [];
        if (!is_array($accessories) || count($accessories) > 20) {
            throw new AgentApiException("lines.{$index}.accessories is invalid.", 422);
        }
        foreach ($accessories as $accessoryIndex => $accessoryRequest) {
            if (!is_array($accessoryRequest)) {
                throw new AgentApiException("lines.{$index}.accessories.{$accessoryIndex} is invalid.", 422);
            }
            $accessory = agent_accessory_by_id($catalog, agent_text($accessoryRequest['id'] ?? null, 'accessory.id', 160, true));
            $accessoryQuantity = (int) agent_number($accessoryRequest['quantity'] ?? $quantity, 'accessory.quantity', 1, 100000);
            $accessoryPrice = (float) ($accessory['price'] ?? 0);
            $accessoryCurrency = strtoupper((string) ($catalog['accessories']['currency'] ?? 'EUR'));
            if ($accessoryCurrency !== $currency || $accessoryPrice <= 0) {
                throw new AgentApiException('Accessory price or currency is unavailable.', 409);
            }
            $accessoryTotal = $accessoryPrice * $accessoryQuantity;
            $total += $accessoryTotal;
            $draftLine['accessories'][] = [
                'id' => $accessory['id'], 'model' => $accessory['model'], 'category' => $accessory['category'],
                'manufacturer' => $accessory['manufacturer'], 'specs' => $accessory['specs'],
                'quantity' => $accessoryQuantity, 'listUnitPrice' => $accessoryPrice,
                'discountPercent' => 0, 'lineTotal' => $accessoryTotal, 'currency' => $currency,
                'compatibilityStatus' => 'review-required',
            ];
            $warnings[] = 'Accessory compatibility is not approved automatically: ' . $accessory['model'];
        }
        $draftLines[] = $draftLine;
    }
    $project = is_array($request['project'] ?? null) ? $request['project'] : [];
    $customer = is_array($request['customer'] ?? null) ? $request['customer'] : [];
    $draftPayload = [
        'v' => 1, 'identity' => $identityId, 'catalog' => $catalog['sourceHash'],
        'project' => [
            'name' => agent_text($project['name'] ?? '', 'project.name', 240),
            'reference' => agent_text($project['reference'] ?? '', 'project.reference', 500),
            'contact' => agent_text($project['contact'] ?? '', 'project.contact', 240),
        ],
        'customer' => [
            'name' => agent_text($customer['name'] ?? '', 'customer.name', 240),
            'contact' => agent_text($customer['contact'] ?? '', 'customer.contact', 240),
            'email' => agent_text($customer['email'] ?? '', 'customer.email', 320),
        ],
        'notes' => agent_text($request['notes'] ?? '', 'notes', 5000),
        'lines' => $draftLines, 'currency' => $currency, 'total' => $total,
    ];
    $draftId = 'draft_' . substr(hash_hmac('sha256', json_encode($draftPayload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE), (string) $config['signing_key']), 0, 24);
    return [
        'ok' => true,
        'status' => 'draft',
        'draftId' => $draftId,
        'preparedBy' => $identityId,
        'createdAt' => gmdate('c'),
        'approvalRequired' => true,
        'commercialLimits' => ['maximumDiscountPercent' => $discountCeiling, 'priceSource' => 'server catalog list price'],
        'project' => $draftPayload['project'],
        'customer' => $draftPayload['customer'],
        'notes' => $draftPayload['notes'],
        'lines' => $draftLines,
        'totals' => ['currency' => $currency, 'netTotal' => $total],
        'warnings' => array_values(array_unique($warnings)),
        'nextAction' => 'Review technical suitability, accessory compatibility and commercial terms; obtain user approval before sending or publishing.',
    ];
}

