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