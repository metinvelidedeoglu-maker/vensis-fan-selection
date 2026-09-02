<?php
header('Content-Type: application/xml; charset=UTF-8');
header('Cache-Control: public, max-age=3600');

$site = 'https://select.vensis.com.tr';
$sourcePath = __DIR__ . '/electrical/data-zonex.js';
$urls = [];

function add_url(&$urls, $loc, $lastmod = null) {
    if (!$loc || isset($urls[$loc])) return;
    $urls[$loc] = $lastmod;
}

function xml_escape($value) {
    return htmlspecialchars($value, ENT_XML1 | ENT_QUOTES, 'UTF-8');
}

function electrical_lang_url($loc, $lang) {
    return $loc . (strpos($loc, '?') === false ? '?' : '&') . 'lang=' . rawurlencode($lang);
}

$lastmod = is_file($sourcePath) ? gmdate('Y-m-d', filemtime($sourcePath)) : null;

if (is_file($sourcePath)) {
    $source = file_get_contents($sourcePath);
    if ($source !== false) {
        preg_match_all("/\\{modelName:'((?:\\\\'|[^'])+)'[\\s\\S]*?submodels:\\[(.*?)\\]\\}/", $source, $seriesMatches, PREG_SET_ORDER);
        foreach ($seriesMatches as $seriesMatch) {
            $seriesName = stripcslashes($seriesMatch[1]);
            $seriesUrl = $site . '/electrical/index.html?series=' . rawurlencode($seriesName);
            add_url($urls, $seriesUrl, $lastmod);

            $submodelsBlock = $seriesMatch[2];
            preg_match_all("/\\{model:'((?:\\\\'|[^'])+)'[^}]*?orderCode:'((?:\\\\'|[^'])*)'\\}/", $submodelsBlock, $modelMatches, PREG_SET_ORDER);
            foreach ($modelMatches as $modelMatch) {
                $modelName = stripcslashes($modelMatch[1]);
                $orderCode = stripcslashes($modelMatch[2]);
                $identity = $orderCode !== '' ? $orderCode : $modelName;
                $modelUrl = $seriesUrl . '&model=' . rawurlencode($identity);
                add_url($urls, $modelUrl, $lastmod);
            }
        }
    }
}

echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">' . "\n";
foreach ($urls as $loc => $modified) {
    $en = electrical_lang_url($loc, 'en');
    $tr = electrical_lang_url($loc, 'tr');
    foreach ([$en, $tr] as $localized) {
        echo '  <url><loc>' . xml_escape($localized) . '</loc>';
        if ($modified) echo '<lastmod>' . xml_escape($modified) . '</lastmod>';
        echo '<xhtml:link rel="alternate" hreflang="en" href="' . xml_escape($en) . '" />';
        echo '<xhtml:link rel="alternate" hreflang="tr" href="' . xml_escape($tr) . '" />';
        echo '</url>' . "\n";
    }
}
echo '</urlset>' . "\n";
