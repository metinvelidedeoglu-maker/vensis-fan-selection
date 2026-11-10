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

function fan_slug($value) {
    $value = trim((string)$value);
    if ($value === '') return '';
    $value = str_replace('&', ' and ', $value);
    if (function_exists('iconv')) {
        $ascii = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value);
        if ($ascii !== false && $ascii !== '') $value = $ascii;
    }
    $value = strtolower($value);
    $value = preg_replace('/[^a-z0-9]+/', '-', $value);
    return trim((string)$value, '-');
}

function fan_brand_slug($brand) {
    global $catalogBrands;
    foreach ($catalogBrands as $entry) {
        if (strcasecmp((string)($entry['name'] ?? ''), (string)$brand) === 0) return $entry['slug'];
    }
    return fan_slug($brand);
}

function fan_lang_url($loc, $lang) {
    $prefix = 'https://select.vensis.com.tr';
    if (strpos($loc, $prefix) !== 0) return $loc;
    return $prefix . '/' . rawurlencode($lang) . substr($loc, strlen($prefix));
}

function fan_route($site, $brand, $series, $model = '') {
    $brandSlug = fan_brand_slug($brand);
    $seriesSlug = fan_slug($series);
    if ($brandSlug === '' || $seriesSlug === '') return '';
    $route = $site . '/fan/' . rawurlencode($brandSlug) . '/' . rawurlencode($seriesSlug) . '/';
    if ($model !== '') {
        $modelSlug = fan_slug($model);
        if ($modelSlug !== '') $route .= rawurlencode($modelSlug) . '/';
    }
    return $route;
}

// Same authoritative records as catalog, selection, projects and quotations.
$file = __DIR__ . '/data/ventilation-catalog.js';
$source = file_get_contents($file);
$prefix = 'window.VensisVentilationData=';
$offset = strpos($source, $prefix);
if ($offset === false) { http_response_code(503); exit; }
$json = preg_replace('/;\s*$/', '', trim(substr($source, $offset + strlen($prefix))));
$catalog = json_decode($json, true);
if (!is_array($catalog) || ($catalog['schemaVersion'] ?? null) !== 3) { http_response_code(503); exit; }
$catalogBrands = $catalog['brands'] ?? [];
$timestamp = filemtime($file) ?: time();
// The browser catalog applies this audited AXW extension before loading models.
// Include the same derived route in the sitemap, without changing the canonical file.
$axwExtension = __DIR__ . '/data/ventilation-axw-35-2t-addition.js';
if (is_file($axwExtension)) {
    $byId = [];
    foreach ($catalog['models'] as $entry) $byId[$entry['id']] = $entry;
    $newId = 'AXW|AXW 35-2T-0.37|4000|30';
    $duct = $byId['AXD|AXD 35-2T-0.37|4000|24'] ?? null;
    $wall = $byId['AXW|AXW 35-4T-0.27|2860|30'] ?? null;
    $atex = $byId['AXW/ATEX|AXW/ATEX 35-2T-0.37|4000|12'] ?? null;
    if (!isset($byId[$newId]) && $duct && $wall && $atex &&
        ($duct['performance']['sourcePoints'] ?? null) === ($atex['performance']['sourcePoints'] ?? null)) {
        $derived = $duct;
        $derived['id'] = $newId;
        $derived['seriesId'] = 'AXW';
        $derived['model'] = 'AXW 35-2T-0.37';
        $derived['technical'] = $wall['technical'];
        $catalog['models'][] = $derived;
        $timestamp = max($timestamp, filemtime($axwExtension) ?: 0);
    }
}
$axdExtension = __DIR__ . '/data/ventilation-axd-35-4m-addition.js';
if (is_file($axdExtension)) {
    $byId = [];
    foreach ($catalog['models'] as $entry) $byId[$entry['id']] = $entry;
    $newId = 'AXD|AXD 35-4M-0.18|2860|27';
    $duct = $byId['AXD|AXD 35-4T-0.27|2860|24'] ?? null;
    $wall = $byId['AXW|AXW 35-4T-0.27|2860|30'] ?? null;
    $single = $byId['AXW/ATEX|AXW/ATEX 35-4M-0.18|2860|15'] ?? null;
    if (!isset($byId[$newId]) && $duct && $wall && $single &&
        $duct['performance']['sourcePoints'] === $wall['performance']['sourcePoints'] &&
        $duct['performance']['sourcePoints'] === $single['performance']['sourcePoints']) {
        $derived = $duct;
        $derived['id'] = $newId;
        $derived['model'] = 'AXD 35-4M-0.18';
        $catalog['models'][] = $derived;
        $timestamp = max($timestamp, filemtime($axdExtension) ?: 0);
    }
}
$seriesById = [];
foreach ($catalog['series'] as $series) {
    $seriesById[$series['id']] = $series;
    add_fan_url($urls, fan_route($site, $series['manufacturer'], $series['code']), $timestamp);
}
$routeCounts = [];
foreach ($catalog['models'] as $model) {
    $baseIdentity = $model['technical']['productCode'] ?? '';
    if ($baseIdentity === '') $baseIdentity = $model['model'];
    $key = $model['seriesId'] . '|' . fan_slug($baseIdentity);
    $routeCounts[$key] = ($routeCounts[$key] ?? 0) + 1;
}
foreach ($catalog['models'] as $model) {
    $series = $seriesById[$model['seriesId']] ?? null;
    if (!$series) continue;
    $identity = $model['technical']['productCode'] ?? '';
    if ($identity === '') $identity = $model['model'];
    $key = $model['seriesId'] . '|' . fan_slug($identity);
    if ($routeCounts[$key] > 1) $identity = $model['id'];
    add_fan_url($urls, fan_route($site, $series['manufacturer'], $series['code'], $identity), $timestamp);
}

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
