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
    $model = trim((string)($row['model'] ?? $row['productCode'] ?? ''));
    if ($brand === '' || $series === '') return;
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
    preg_match_all("/key:'[^']+'[\\s\\S]*?model:'([^']+)'[\\s\\S]*?brand:'([^']+)'[\\s\\S]*?series:'([^']+)'/", $source, $matches, PREG_SET_ORDER);
    foreach ($matches as $match) {
        $rows[] = [
            'model' => stripcslashes($match[1]),
            'brand' => stripcslashes($match[2]),
            'series' => stripcslashes($match[3])
        ];
    }
    return $rows;
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

ksort($urls);
echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
foreach ($urls as $loc => $timestamp) {
    echo '  <url><loc>' . xml_escape_fan($loc) . '</loc><lastmod>' . gmdate('Y-m-d', $timestamp) . '</lastmod></url>' . "\n";
}
echo '</urlset>' . "\n";
