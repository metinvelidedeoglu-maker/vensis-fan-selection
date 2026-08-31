<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: public, max-age=300, stale-while-revalidate=3600');

$root = dirname(__DIR__, 2);
$files = [
    $root . '/data/fans-09.js',
    $root . '/data/fans-10.js',
    $root . '/data/fans-11.js',
    $root . '/data/fans-12.js',
    $root . '/data/fans-13.js',
    $root . '/data/fans-14.js',
];

$counts = [];

foreach ($files as $file) {
    $text = @file_get_contents($file);
    if ($text === false) {
        continue;
    }

    if (!preg_match_all('/"series"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/u', $text, $matches)) {
        continue;
    }

    foreach ($matches[1] as $encodedSeries) {
        $series = json_decode('"' . $encodedSeries . '"', true);
        if (!is_string($series) || $series === '') {
            continue;
        }
        $counts[$series] = ($counts[$series] ?? 0) + 1;
    }
}

ksort($counts, SORT_NATURAL | SORT_FLAG_CASE);
echo json_encode($counts, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
