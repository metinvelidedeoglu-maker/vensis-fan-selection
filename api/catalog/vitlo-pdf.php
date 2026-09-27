<?php
declare(strict_types=1);

const VITLO_CATALOG_URL = 'https://vitlo.com.tr/wp-content/uploads/2025/04/Vitlo-2021-Tr-Eng-Catalog-FZ.pdf';
const VITLO_CACHE_TTL = 86400;

$cache = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'vensis-vitlo-catalog.pdf';

function validPdf(string $bytes): bool {
    return strlen($bytes) > 1024 && strncmp($bytes, '%PDF', 4) === 0;
}

function fetchCatalog(): ?string {
    if (function_exists('curl_init')) {
        $ch = curl_init(VITLO_CATALOG_URL);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_CONNECTTIMEOUT => 8,
            CURLOPT_TIMEOUT => 25,
            CURLOPT_USERAGENT => 'Vensis Engineering Suite/1.0',
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_HTTPHEADER => ['Accept: application/pdf'],
        ]);
        $body = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if (is_string($body) && $status >= 200 && $status < 300 && validPdf($body)) {
            return $body;
        }
    }

    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'timeout' => 25,
            'header' => "User-Agent: Vensis Engineering Suite/1.0\r\nAccept: application/pdf\r\n",
        ],
        'ssl' => [
            'verify_peer' => true,
            'verify_peer_name' => true,
        ],
    ]);
    $body = @file_get_contents(VITLO_CATALOG_URL, false, $context);
    return is_string($body) && validPdf($body) ? $body : null;
}

$isFresh = is_file($cache) && (time() - (int) filemtime($cache)) < VITLO_CACHE_TTL;
if (!$isFresh) {
    $fresh = fetchCatalog();
    if ($fresh !== null) {
        @file_put_contents($cache, $fresh, LOCK_EX);
    }
}

if (!is_file($cache)) {
    http_response_code(502);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Vitlo catalogue is temporarily unavailable.'], JSON_UNESCAPED_SLASHES);
    exit;
}

$size = (int) filesize($cache);
header('Content-Type: application/pdf');
header('Content-Length: ' . $size);
header('Cache-Control: public, max-age=3600');
header('X-Content-Type-Options: nosniff');
readfile($cache);
