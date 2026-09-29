<?php
declare(strict_types=1);

header('Cache-Control: public, max-age=86400, stale-while-revalidate=604800');
header('X-Content-Type-Options: nosniff');

const VITLO_DRAWING_TTL = 86400;
const VITLO_RAW_BASE = 'https://raw.githubusercontent.com/metinvelidedeoglu-maker/vensis-fan-selection/main/';

$families = [
    'axial_duct' => 'assets/technical-drawings/vitlo/axial-duct.png',
    'axial_wall' => 'assets/technical-drawings/vitlo/axial-wall.png',
    'axial_mobile' => 'assets/technical-drawings/vitlo/axial-mobile.png',
    'axial_roof_horizontal' => 'assets/technical-drawings/vitlo/axial-roof-horizontal.png',
];

$family = isset($_GET['family']) ? (string) $_GET['family'] : '';
if (!isset($families[$family])) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Unknown Vitlo drawing family.';
    exit;
}

function vitlo_valid_png(string $bytes): bool
{
    return strlen($bytes) > 256 && substr($bytes, 0, 8) === "\x89PNG\r\n\x1a\n";
}

function vitlo_fetch_png(string $url): ?string
{
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_CONNECTTIMEOUT => 8,
            CURLOPT_TIMEOUT => 20,
            CURLOPT_USERAGENT => 'Vensis Engineering Suite/1.0',
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_HTTPHEADER => ['Accept: image/png,image/*;q=0.8'],
        ]);
        $body = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if (is_string($body) && $status >= 200 && $status < 300 && vitlo_valid_png($body)) {
            return $body;
        }
    }

    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'timeout' => 20,
            'header' => "User-Agent: Vensis Engineering Suite/1.0\r\nAccept: image/png,image/*;q=0.8\r\n",
        ],
        'ssl' => ['verify_peer' => true, 'verify_peer_name' => true],
    ]);
    $body = @file_get_contents($url, false, $context);
    return is_string($body) && vitlo_valid_png($body) ? $body : null;
}

$relative = $families[$family];
$local = dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relative);

if (is_file($local) && filesize($local) > 256) {
    $bytes = @file_get_contents($local);
    if (is_string($bytes) && vitlo_valid_png($bytes)) {
        header('Content-Type: image/png');
        header('Content-Length: ' . (string) strlen($bytes));
        echo $bytes;
        exit;
    }
}

$cacheDir = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'vensis-vitlo-drawings-static';
if (!is_dir($cacheDir)) {
    @mkdir($cacheDir, 0755, true);
}
$cache = $cacheDir . DIRECTORY_SEPARATOR . $family . '-static-v1.png';

$fresh = is_file($cache) && (time() - (int) @filemtime($cache)) < VITLO_DRAWING_TTL;
if (!$fresh) {
    $bytes = vitlo_fetch_png(VITLO_RAW_BASE . $relative);
    if ($bytes !== null) {
        @file_put_contents($cache, $bytes, LOCK_EX);
    }
}

if (!is_file($cache)) {
    http_response_code(503);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Vitlo static drawing is unavailable.';
    exit;
}

$bytes = @file_get_contents($cache);
if (!is_string($bytes) || !vitlo_valid_png($bytes)) {
    http_response_code(503);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Vitlo static drawing cache is invalid.';
    exit;
}

header('Content-Type: image/png');
header('Content-Length: ' . (string) strlen($bytes));
echo $bytes;
