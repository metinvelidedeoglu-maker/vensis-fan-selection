<?php
// Test-server equivalent of locale and clean-route rewrites in .htaccess.
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path = preg_replace('#^/(en|tr)/#', '/', $path);
if (preg_match('#^/fan/[^/]+(?:/[^/]+){0,2}/(assets|css|js|data|products|api)/(.*)$#', $path, $m)) {
    $path = '/' . $m[1] . '/' . $m[2];
} elseif (preg_match('#^/fan/[^/]+(?:/[^/]+){0,2}/?$#', $path)) {
    $path = '/catalog.html';
}
$file = realpath(__DIR__ . '/..' . $path);
$root = realpath(__DIR__ . '/..') . DIRECTORY_SEPARATOR;
if (!$file || strpos($file, $root) !== 0 || !is_file($file)) { http_response_code(404); return; }
if (pathinfo($file, PATHINFO_EXTENSION) === 'php') { require $file; return; }
$types = ['js'=>'application/javascript','css'=>'text/css','html'=>'text/html','json'=>'application/json','png'=>'image/png','webp'=>'image/webp','svg'=>'image/svg+xml'];
header('Content-Type: ' . ($types[pathinfo($file, PATHINFO_EXTENSION)] ?? 'application/octet-stream'));
readfile($file);
