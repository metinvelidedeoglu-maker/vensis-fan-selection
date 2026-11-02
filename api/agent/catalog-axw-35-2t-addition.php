<?php
declare(strict_types=1);
function agent_catalog_add_axw_35_2t(array $catalog): array
{
    $id = 'AXW|AXW 35-2T-0.37|4000|30';
    $sourceId = 'AXD|AXD 35-2T-0.37|4000|24';
    $wallId = 'AXW|AXW 35-4T-0.27|2860|30';
    $atexId = 'AXW/ATEX|AXW/ATEX 35-2T-0.37|4000|12';
    $source = null;
    $wall = null;
    $atex = null;
    foreach ($catalog['models'] as $model) {
        if (($model['id'] ?? '') === $id) return $catalog;
        if (($model['id'] ?? '') === $sourceId) $source = $model;
        elseif (($model['id'] ?? '') === $wallId) $wall = $model;
        elseif (($model['id'] ?? '') === $atexId) $atex = $model;
    }
    if ($source === null || $wall === null || $atex === null || $source['selectionPoints'] !== $atex['selectionPoints']) {
        throw new AgentApiException('AXW derived model sources are unavailable or inconsistent.', 503);
    }
    $warning = 'Provisional AXW catalog record: curve, motor and price derived from AXD 35-2T-0.37; mounting and dimensions from standard AXW family. Manufacturer confirmation required before final specification. Not ATEX.';
    $new = $source;
    $new['id'] = $id;
    $new['productKey'] = $id;
    $new['model'] = 'AXW 35-2T-0.37';
    $new['display'] = 'AXW 35-2T-0.37';
    $new['series'] = 'AXW';
    $new['seriesTitle'] = $wall['seriesTitle'];
    $new['categories'] = $wall['categories'];
    $new['image'] = $wall['image'];
    $new['technical'] = $wall['technical'];
    $new['technical']['nominalAirflowM3h'] = $source['technical']['nominalAirflowM3h'];
    $new['technical']['soundDbA'] = $source['technical']['soundDbA'];
    $new['technical']['safetyWarning'] = $warning;
    $new['sourcePage'] = 33;
    $new['verification'] = ['status' => 'catalog-derived', 'sourceCatalogue' => '', 'sourcePage' => 33, 'caution' => $warning];
    $new['quoteEligible'] = true;
    $catalog['models'][] = $new;
    $catalog['sourceHash'] = hash('sha256', (string) ($catalog['sourceHash'] ?? '') . "\\0" . $id . "\\0" . json_encode($new, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    return $catalog;
}
