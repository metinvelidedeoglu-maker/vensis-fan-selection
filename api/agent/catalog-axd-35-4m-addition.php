<?php
declare(strict_types=1);
function agent_catalog_add_axd_35_4m(array $catalog): array
{
    $id = 'AXD|AXD 35-4M-0.18|2860|27';
    $sourceId = 'AXD|AXD 35-4T-0.27|2860|24';
    $wallId = 'AXW|AXW 35-4T-0.27|2860|30';
    $singleId = 'AXW/ATEX|AXW/ATEX 35-4M-0.18|2860|15';
    $byId = [];
    foreach ($catalog['models'] as $model) $byId[$model['id']] = $model;
    if (isset($byId[$id])) return $catalog;
    $source = $byId[$sourceId] ?? null;
    $wall = $byId[$wallId] ?? null;
    $single = $byId[$singleId] ?? null;
    if ($source === null || $wall === null || $single === null ||
        $source['selectionPoints'] !== $wall['selectionPoints'] ||
        $source['selectionPoints'] !== $single['selectionPoints']) {
        throw new AgentApiException('AXD derived model sources are unavailable or inconsistent.', 503);
    }
    $new = $source;
    $new['id'] = $id;
    $new['productKey'] = $id;
    $new['model'] = 'AXD 35-4M-0.18';
    $new['display'] = 'AXD 35-4M-0.18';
    $new['pricing'] = ['listPrice' => 600, 'currency' => 'EUR'];
    $new['motor']['voltage'] = $single['motor']['voltage'];
    $new['motor']['frequency'] = '50 Hz';
    $new['motor']['currentA'] = 0;
    $new['sourcePage'] = '';
    $new['verification'] = ['status' => 'catalog-derived', 'sourceCatalogue' => '', 'sourcePage' => '', 'caution' => '', 'derivation' => [
        'date' => '2026-11-10', 'requestedBy' => 'Metin', 'performanceAndDuctGeometry' => $sourceId,
        'comparedWallPerformance' => $wallId, 'singlePhaseSupply' => $singleId,
        'price' => ['basis' => 'user-specified', 'amount' => 600, 'currency' => 'EUR'],
        'manufacturerConfirmation' => 'pending', 'notAtex' => true
    ]];
    $new['quoteEligible'] = true;
    $catalog['models'][] = $new;
    $catalog['sourceHash'] = hash('sha256', (string) ($catalog['sourceHash'] ?? '') . "\0" . $id . "\0" . json_encode($new, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    return $catalog;
}
