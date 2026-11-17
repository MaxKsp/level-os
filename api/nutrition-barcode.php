<?php
declare(strict_types=1);
require_once __DIR__ . '/../auth.php';
require_once __DIR__ . '/../app/Modules/Nutrition/NutritionBarcodeService.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: private, no-store');
$uid = require_login();
require_rate_limit('nutrition-barcode', 12, 60);
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') { http_response_code(405); echo json_encode(['error'=>'method_not_allowed']); exit; }
$code = $_GET['code'] ?? null;
if (!nutrition_valid_barcode($code)) { http_response_code(422); echo json_encode(['error'=>'invalid_barcode','message'=>'Código GTIN/EAN inválido.']); exit; }
session_write_close();
if (!function_exists('curl_init')) { http_response_code(503); echo json_encode(['error'=>'barcode_unavailable']); exit; }
$url = 'https://world.openfoodfacts.org/api/v2/product/' . $code . '.json?fields=product_name,brands,quantity,nutriments';
$curl = curl_init($url);
curl_setopt_array($curl, [CURLOPT_RETURNTRANSFER=>true,CURLOPT_CONNECTTIMEOUT=>3,CURLOPT_TIMEOUT=>7,
    CURLOPT_FOLLOWLOCATION=>false,CURLOPT_PROTOCOLS=>CURLPROTO_HTTPS,
    CURLOPT_HTTPHEADER=>['Accept: application/json','User-Agent: LevelOS/1.0 (+https://lvlos.com)']]);
$raw = curl_exec($curl);
$http = (int)curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
curl_close($curl);
if ($raw === false || $http !== 200 || strlen((string)$raw) > 120000) {
    http_response_code(503); echo json_encode(['error'=>'barcode_unavailable','message'=>'Base colaborativa indisponível agora.']); exit;
}
$data = json_decode((string)$raw, true);
if (!is_array($data) || (int)($data['status'] ?? 0) !== 1 || !is_array($data['product'] ?? null)) {
    http_response_code(404); echo json_encode(['error'=>'product_not_found','message'=>'Produto não localizado no Open Food Facts.']); exit;
}
$p = $data['product'];
$nutr = is_array($p['nutriments'] ?? null) ? $p['nutriments'] : [];
$product = [
    'name'=>mb_substr(trim((string)($p['product_name'] ?? 'Produto sem nome cadastrado')),0,150),
    'brands'=>mb_substr(trim((string)($p['brands'] ?? '')),0,100),
    'quantity'=>mb_substr(trim((string)($p['quantity'] ?? '')),0,100),
    'kcal100g'=>nutrition_barcode_numeric($nutr['energy-kcal_100g'] ?? null, 1000),
    'proteins100g'=>nutrition_barcode_numeric($nutr['proteins_100g'] ?? null, 100),
    'source'=>'https://world.openfoodfacts.org/product/' . $code,
];
echo json_encode(['ok'=>true,'product'=>$product,'disclaimer'=>'Base colaborativa, confira o rótulo.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
