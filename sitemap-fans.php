<?php
header('Content-Type: application/xml; charset=UTF-8');
header('Cache-Control: public, max-age=3600');

$site = 'https://select.vensis.com.tr';
$urls = [];

function xml_escape_fan($value) {
    return htmlspecialchars($value, ENT_XML1 | ENT_QUOTES, 'UTF-8');
}

function add_fan_url(&$urls, $loc, $timestamp) {
    if (!$loc) return;
    if (!isset($urls[$loc]) || $timestamp > $urls[$loc]) $urls[$loc] = $timestamp;
}

function fan_lang_url($loc, $lang) {
    return $loc . (strpos($loc, '?') === false ? '?' : '&') . 'lang=' . rawurlencode($lang);
}

function fan_route($site, $brand, $series, $model = '') {
    $brandLower = strtolower(trim($brand));
    if ($brandLower === 'vitlo') {
        $params = ['brand' => 'vitlo', 'series' => $series];
        if ($model !== '') $params['model'] = $model;
        return $site . '/catalog-brand.html?' . http_build_query($params, '', '&', PHP_QUERY_RFC3986);
    }
    if (strpos($brandLower, 'soler') !== false || $brandLower === 'sp') {
        $params = ['brand' => 'sp', 'series' => $series];
        if ($model !== '') $params['model'] = $model;
        return $site . '/catalog-brand.html?' . http_build_query($params, '', '&', PHP_QUERY_RFC3986);
    }
    if ($brandLower === 'vortice') {
        $params = ['series' => $series];
        if ($model !== '') $params['model'] = $model;
        return $site . '/catalog-vortice.html?' . http_build_query($params, '', '&', PHP_QUERY_RFC3986);
    }
    return '';
}

function add_row_routes(&$urls, $site, $row, $timestamp) {
    if (!is_array($row)) return;
    $brand = trim((string)($row['brand'] ?? $row['manufacturer'] ?? ''));
    $series = trim((string)($row['series'] ?? $row['family'] ?? ''));
    $productCode = trim((string)($row['productCode'] ?? ''));
    $modelName = trim((string)($row['model'] ?? ''));
    $model = $productCode !== '' ? $productCode : $modelName;
    if ($brand === '' || $series === '') return;

    // Vortice public catalog is filtered by the 2026 price-list policy.
    // Raw Vortice files contain unpriced products that are intentionally hidden,
    // so Vortice routes are added separately from the authoritative priced list.
    if (strtolower($brand) === 'vortice') return;

    add_fan_url($urls, fan_route($site, $brand, $series), $timestamp);
    if ($model !== '') add_fan_url($urls, fan_route($site, $brand, $series, $model), $timestamp);
}

function parse_json_push_rows($source) {
    if (!preg_match('/window\.models\.push\(\.\.\.(\[[\s\S]*\])\s*\);?/', $source, $match)) return [];
    $decoded = json_decode($match[1], true);
    return is_array($decoded) ? $decoded : [];
}

function parse_object_literal_rows($source) {
    $rows = [];

    // Standalone object-literal rows that repeat brand/series/productCode.
    preg_match_all("/key:'[^']+'[\\s\\S]*?model:'([^']+)'[\\s\\S]*?brand:'([^']+)'[\\s\\S]*?series:'([^']+)'[\\s\\S]*?productCode:'([^']+)'/", $source, $matches, PREG_SET_ORDER);
    foreach ($matches as $match) {
        $rows[] = [
            'model' => stripcslashes($match[1]),
            'brand' => stripcslashes($match[2]),
            'series' => stripcslashes($match[3]),
            'productCode' => stripcslashes($match[4])
        ];
    }
    if ($rows) return $rows;

    // Newer CR additions use a shared `const base={brand:'Vitlo', ...}` and spread
    // that base into each row, so brand is not repeated inside every object.
    $baseBrand = '';
    if (preg_match("/const\\s+base\\s*=\\s*\\{[\\s\\S]*?brand:'([^']+)'/", $source, $brandMatch)) {
        $baseBrand = stripcslashes($brandMatch[1]);
    } elseif (preg_match("/const\\s+base\\s*=\\s*\\{[\\s\\S]*?manufacturer:'([^']+)'/", $source, $brandMatch)) {
        $baseBrand = stripcslashes($brandMatch[1]);
    }
    if ($baseBrand === '') return [];

    preg_match_all("/key:'[^']+'[\\s\\S]*?model:'([^']+)'[\\s\\S]*?series:'([^']+)'[\\s\\S]*?productCode:'([^']+)'/", $source, $spreadMatches, PREG_SET_ORDER);
    foreach ($spreadMatches as $match) {
        $rows[] = [
            'model' => stripcslashes($match[1]),
            'brand' => $baseBrand,
            'series' => stripcslashes($match[2]),
            'productCode' => stripcslashes($match[3])
        ];
    }
    return $rows;
}

function parse_assigned_json_object($source, $assignment) {
    $offset = strpos($source, $assignment);
    if ($offset === false) return [];
    $json = trim(substr($source, $offset + strlen($assignment)));
    $json = preg_replace('/;\s*$/', '', $json);
    $decoded = json_decode($json, true);
    return is_array($decoded) ? $decoded : [];
}

function add_priced_vortice_routes(&$urls, $site, $priceListPath) {
    if (!is_file($priceListPath)) return;
    $source = file_get_contents($priceListPath);
    if ($source === false) return;
    $priceList = parse_assigned_json_object($source, 'window.VensisVorticePriceList2026_1=');
    $timestamp = filemtime($priceListPath) ?: time();

    foreach (($priceList['entries'] ?? []) as $entry) {
        if (!is_array($entry) || (float)($entry['listPrice'] ?? 0) <= 0) continue;
        $series = trim((string)($entry['series'] ?? ''));
        $productCode = trim((string)($entry['productCode'] ?? ''));
        $model = trim((string)($entry['model'] ?? ''));
        if ($series === '') continue;

        add_fan_url($urls, fan_route($site, 'vortice', $series), $timestamp);
        // registry.js preserves row.productCode as technical.productCode, and the
        // catalog SEO preselector accepts technical.productCode in ?model=.
        $identity = $productCode !== '' ? $productCode : $model;
        if ($identity !== '') add_fan_url($urls, fan_route($site, 'vortice', $series, $identity), $timestamp);
    }
}

function add_cr_matrix_series_routes(&$urls, $site, $matrixPath) {
    if (!is_file($matrixPath)) return;
    $timestamp = filemtime($matrixPath) ?: time();
    $series = ['CRS','CRS/ATEX','CRK','CRK/ATEX','CRD','CRD/ATEX','CRH','CRH/ATEX'];
    foreach ($series as $code) add_fan_url($urls, fan_route($site, 'vitlo', $code), $timestamp);
}

$files = array_merge(
    glob(__DIR__ . '/data/fans-*.js') ?: [],
    glob(__DIR__ . '/data/soler-palau-catalog*.js') ?: [],
    glob(__DIR__ . '/data/sp-roof*.js') ?: []
);
$files = array_values(array_unique($files));
sort($files);

foreach ($files as $file) {
    if (!is_file($file)) continue;
    $source = file_get_contents($file);
    if ($source === false) continue;
    $timestamp = filemtime($file) ?: time();
    $rows = parse_json_push_rows($source);
    if (!$rows) $rows = parse_object_literal_rows($source);
    foreach ($rows as $row) add_row_routes($urls, $site, $row, $timestamp);
}

add_cr_matrix_series_routes($urls, $site, __DIR__ . '/data/cr-family-matrix.js');
add_priced_vortice_routes($urls, $site, __DIR__ . '/data/vortice-prices-2026-1.js');

ksort($urls);
echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">' . "\n";
foreach ($urls as $loc => $timestamp) {
    $en = fan_lang_url($loc, 'en');
    $tr = fan_lang_url($loc, 'tr');
    foreach ([$en, $tr] as $localized) {
        echo '  <url><loc>' . xml_escape_fan($localized) . '</loc><lastmod>' . gmdate('Y-m-d', $timestamp) . '</lastmod>';
        echo '<xhtml:link rel="alternate" hreflang="en" href="' . xml_escape_fan($en) . '" />';
        echo '<xhtml:link rel="alternate" hreflang="tr" href="' . xml_escape_fan($tr) . '" />';
        echo '<xhtml:link rel="alternate" hreflang="x-default" href="' . xml_escape_fan($en) . '" />';
        echo '</url>' . "\n";
    }
}
echo '</urlset>' . "\n";
