<?php
declare(strict_types=1);

header('Cache-Control: public, max-age=86400, stale-while-revalidate=604800');
header('X-Content-Type-Options: nosniff');

const VITLO_DRAWING_SOURCE = 'https://vitlo.com.tr/wp-content/uploads/2025/04/Vitlo-2021-Tr-Eng-Catalog-FZ.pdf';
const VITLO_DRAWING_TTL = 86400;

$families = [
    'axial_duct' => ['page' => 5, 'crop' => [0.50, 0.695, 0.39, 0.19]],
    'axial_wall' => ['page' => 15, 'crop' => [0.50, 0.465, 0.39, 0.20]],
    'axial_mobile' => ['page' => 19, 'crop' => [0.50, 0.335, 0.39, 0.17]],
    'axial_roof_horizontal' => ['page' => 13, 'crop' => [0.50, 0.735, 0.42, 0.17]],
];

$family = isset($_GET['family']) ? (string) $_GET['family'] : '';
if (!isset($families[$family])) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Unknown Vitlo drawing family.';
    exit;
}

function vitlo_valid_pdf(string $bytes): bool
{
    return strlen($bytes) > 1024 && strncmp($bytes, '%PDF', 4) === 0;
}

function vitlo_fetch_catalog(): ?string
{
    if (function_exists('curl_init')) {
        $ch = curl_init(VITLO_DRAWING_SOURCE);
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
        if (is_string($body) && $status >= 200 && $status < 300 && vitlo_valid_pdf($body)) {
            return $body;
        }
    }

    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'timeout' => 25,
            'header' => "User-Agent: Vensis Engineering Suite/1.0\r\nAccept: application/pdf\r\n",
        ],
        'ssl' => ['verify_peer' => true, 'verify_peer_name' => true],
    ]);
    $body = @file_get_contents(VITLO_DRAWING_SOURCE, false, $context);
    return is_string($body) && vitlo_valid_pdf($body) ? $body : null;
}

function vitlo_catalog_path(): ?string
{
    $cache = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'vensis-vitlo-catalog.pdf';
    $fresh = is_file($cache) && (time() - (int) @filemtime($cache)) < VITLO_DRAWING_TTL;
    if (!$fresh) {
        $bytes = vitlo_fetch_catalog();
        if ($bytes !== null) {
            @file_put_contents($cache, $bytes, LOCK_EX);
        }
    }
    return is_file($cache) ? $cache : null;
}

function vitlo_crop_box(int $width, int $height, array $crop): array
{
    $x = max(0, min($width - 1, (int) round($width * (float) $crop[0])));
    $y = max(0, min($height - 1, (int) round($height * (float) $crop[1])));
    $w = max(1, min($width - $x, (int) round($width * (float) $crop[2])));
    $h = max(1, min($height - $y, (int) round($height * (float) $crop[3])));
    return [$x, $y, $w, $h];
}

function vitlo_render_with_imagick(string $pdf, int $page, array $crop, string $output): bool
{
    if (!class_exists('Imagick')) {
        return false;
    }
    try {
        $image = new Imagick();
        $image->setResolution(220, 220);
        $image->readImage($pdf . '[' . max(0, $page - 1) . ']');
        $image->setImageBackgroundColor('white');
        $image = $image->mergeImageLayers(Imagick::LAYERMETHOD_FLATTEN);
        $image->setImageFormat('png');
        [$x, $y, $w, $h] = vitlo_crop_box($image->getImageWidth(), $image->getImageHeight(), $crop);
        $image->cropImage($w, $h, $x, $y);
        $image->setImagePage(0, 0, 0, 0);
        $image->trimImage(12);
        $image->setImageCompressionQuality(92);
        $ok = $image->writeImage($output);
        $image->clear();
        $image->destroy();
        return (bool) $ok && is_file($output);
    } catch (Throwable $e) {
        error_log('Vitlo drawing Imagick render failed: ' . $e->getMessage());
        return false;
    }
}

function vitlo_command_exists(string $command): bool
{
    if (!function_exists('shell_exec')) {
        return false;
    }
    $result = @shell_exec('command -v ' . escapeshellarg($command) . ' 2>/dev/null');
    return is_string($result) && trim($result) !== '';
}

function vitlo_render_with_poppler(string $pdf, int $page, array $crop, string $output): bool
{
    if (!vitlo_command_exists('pdftoppm')) {
        return false;
    }

    $prefix = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'vitlo-page-' . getmypid() . '-' . bin2hex(random_bytes(4));
    $command = sprintf(
        'pdftoppm -f %d -singlefile -png -r 220 %s %s 2>/dev/null',
        $page,
        escapeshellarg($pdf),
        escapeshellarg($prefix)
    );
    @shell_exec($command);
    $pagePng = $prefix . '.png';
    if (!is_file($pagePng)) {
        return false;
    }

    if (!function_exists('imagecreatefrompng') || !function_exists('imagecrop') || !function_exists('imagepng')) {
        @unlink($pagePng);
        return false;
    }

    $source = @imagecreatefrompng($pagePng);
    @unlink($pagePng);
    if (!$source) {
        return false;
    }

    $width = imagesx($source);
    $height = imagesy($source);
    [$x, $y, $w, $h] = vitlo_crop_box($width, $height, $crop);
    $cropped = imagecrop($source, ['x' => $x, 'y' => $y, 'width' => $w, 'height' => $h]);
    imagedestroy($source);
    if (!$cropped) {
        return false;
    }

    $ok = imagepng($cropped, $output, 6);
    imagedestroy($cropped);
    return (bool) $ok && is_file($output);
}

$definition = $families[$family];
$cacheDir = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'vensis-vitlo-drawings';
if (!is_dir($cacheDir)) {
    @mkdir($cacheDir, 0755, true);
}
$output = $cacheDir . DIRECTORY_SEPARATOR . $family . '-v2.png';

if (!is_file($output) || (time() - (int) @filemtime($output)) > VITLO_DRAWING_TTL) {
    $pdf = vitlo_catalog_path();
    if ($pdf !== null) {
        $temporary = $output . '.tmp-' . getmypid();
        @unlink($temporary);
        $rendered = vitlo_render_with_imagick($pdf, (int) $definition['page'], $definition['crop'], $temporary)
            || vitlo_render_with_poppler($pdf, (int) $definition['page'], $definition['crop'], $temporary);
        if ($rendered && is_file($temporary)) {
            @rename($temporary, $output);
        } else {
            @unlink($temporary);
        }
    }
}

if (!is_file($output)) {
    http_response_code(503);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Vitlo original drawing renderer is unavailable on this server.';
    exit;
}

header('Content-Type: image/png');
header('Content-Length: ' . (string) filesize($output));
readfile($output);
