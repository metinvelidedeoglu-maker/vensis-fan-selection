<?php
declare(strict_types=1);
require __DIR__ . '/bootstrap.php';
require_admin($config);
$data = body_json();
$products = $data['products'] ?? [];
if (!is_array($products) || !$products) {
    http_response_code(400);
    echo json_encode(['ok'=>false,'error'=>'No products supplied']);
    exit;
}
$brandName = trim((string)($data['brand'] ?? 'VITLO'));
$slug = strtolower(preg_replace('/[^a-z0-9]+/i', '-', $brandName));
$pdo->beginTransaction();
try {
    $stmt = $pdo->prepare('INSERT INTO brands(name,slug) VALUES(?,?) ON DUPLICATE KEY UPDATE name=VALUES(name), id=LAST_INSERT_ID(id)');
    $stmt->execute([$brandName,$slug]);
    $brandId = (int)$pdo->lastInsertId();
    $seriesStmt = $pdo->prepare('INSERT INTO product_series(brand_id,code,name,product_type) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name),product_type=VALUES(product_type),id=LAST_INSERT_ID(id)');
    $productStmt = $pdo->prepare('INSERT INTO products(brand_id,series_id,model,product_type,mounting_type,motor_power_kw,rpm,poles,voltage,current_a,noise_dba,price_eur,is_atex,fire_class,source_catalog,source_page,general_info,motor_info,application_info,tags) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),product_type=VALUES(product_type),mounting_type=VALUES(mounting_type),motor_power_kw=VALUES(motor_power_kw),rpm=VALUES(rpm),poles=VALUES(poles),voltage=VALUES(voltage),current_a=VALUES(current_a),noise_dba=VALUES(noise_dba),price_eur=VALUES(price_eur),is_atex=VALUES(is_atex),fire_class=VALUES(fire_class),source_catalog=VALUES(source_catalog),source_page=VALUES(source_page),general_info=VALUES(general_info),motor_info=VALUES(motor_info),application_info=VALUES(application_info),tags=VALUES(tags),id=LAST_INSERT_ID(id)');
    $deletePoints = $pdo->prepare('DELETE FROM performance_points WHERE product_id=?');
    $pointStmt = $pdo->prepare('INSERT INTO performance_points(product_id,pressure_pa,flow_m3h,sort_order) VALUES(?,?,?,?)');
    $count = 0;
    foreach ($products as $p) {
        if (!is_array($p) || empty($p['model'])) continue;
        $series = trim((string)($p['series'] ?? 'UNSPECIFIED')) ?: 'UNSPECIFIED';
        $seriesStmt->execute([$brandId,$series,$series,(string)($p['productType'] ?? '')]);
        $seriesId = (int)$pdo->lastInsertId();
        $ci = is_array($p['catalogueInfo'] ?? null) ? $p['catalogueInfo'] : [];
        $productStmt->execute([
            $brandId,$seriesId,(string)$p['model'],(string)($p['productType'] ?? ''),(string)($p['mountType'] ?? ''),
            $p['kw'] ?? null,$p['rpm'] ?? null,$p['poles'] ?? null,(string)($p['voltage'] ?? ''),$p['amps'] ?? null,
            $p['spl'] ?? null,$p['price'] ?? null,!empty($p['atex']) ? 1 : 0,(string)($p['fire'] ?? ''),
            (string)($p['catalogName'] ?? ''),(string)($p['sourcePage'] ?? ''),
            json_encode($ci['general'] ?? [],JSON_UNESCAPED_UNICODE),json_encode($ci['motor'] ?? [],JSON_UNESCAPED_UNICODE),
            json_encode($ci['applications'] ?? [],JSON_UNESCAPED_UNICODE),json_encode($p['tags'] ?? [],JSON_UNESCAPED_UNICODE)
        ]);
        $productId = (int)$pdo->lastInsertId();
        $deletePoints->execute([$productId]);
        foreach (($p['points'] ?? []) as $i => $point) {
            if (!is_array($point) || count($point) < 2) continue;
            $pointStmt->execute([$productId,$point[0],$point[1],$i]);
        }
        $count++;
    }
    $pdo->commit();
    echo json_encode(['ok'=>true,'imported'=>$count]);
} catch (Throwable $e) {
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['ok'=>false,'error'=>'Import failed']);
}
