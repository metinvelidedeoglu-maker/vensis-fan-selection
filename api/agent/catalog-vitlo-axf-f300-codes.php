<?php
declare(strict_types=1);

// Runtime catalogue correction: no prices, IDs, curves or certification claims change.
function agent_catalog_vitlo_axf_f300_codes(array $catalog): array
{
    $changed = 0;
    foreach ($catalog['models'] as &$model) {
        if (strcasecmp((string) ($model['manufacturer'] ?? ''), 'Vitlo') !== 0
            || !in_array((string) ($model['series'] ?? ''), ['AXF', 'BOX-AXF'], true)
            || strcasecmp((string) ($model['technical']['fireRating'] ?? ''), 'F300') !== 0) {
            continue;
        }
        $old = trim((string) ($model['model'] ?? ''));
        if ($old === '' || preg_match('/\\bF300\\b/i', $old)) {
            continue;
        }
        $model['model'] = $old . ' F300';
        if (trim((string) ($model['display'] ?? '')) === $old) {
            $model['display'] = $model['model'];
        }
        $changed++;
    }
    unset($model);
    if ($changed > 0) {
        $catalog['sourceHash'] = hash('sha256', (string) ($catalog['sourceHash'] ?? '') . "\\0" . "vitlo-axf-f300-v1:" . $changed);
    }
    return $catalog;
}
