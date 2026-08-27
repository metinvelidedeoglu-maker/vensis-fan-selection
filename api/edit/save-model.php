<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
http_response_code(403);
echo json_encode(['ok'=>false,'error'=>'Product editing is disabled.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
