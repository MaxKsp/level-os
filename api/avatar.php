<?php
declare(strict_types=1);

require_once __DIR__ . '/../auth.php';

header('Content-Type: application/json; charset=utf-8');
$uid = require_login();
require_rate_limit('avatar', 10, 60);
require_csrf();

if (empty($_FILES['avatar']) || $_FILES['avatar']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['error' => 'nenhuma imagem enviada']);
    exit;
}
if ($_FILES['avatar']['size'] > 4 * 1024 * 1024) {
    http_response_code(413);
    echo json_encode(['error' => 'imagem muito grande (máx 4MB)']);
    exit;
}

$info = @getimagesize($_FILES['avatar']['tmp_name']);
$allowed = [IMAGETYPE_JPEG => 'jpeg', IMAGETYPE_PNG => 'png', IMAGETYPE_WEBP => 'webp'];
if (!$info || !isset($allowed[$info[2]])) {
    http_response_code(400);
    echo json_encode(['error' => 'formato inválido (use JPG, PNG ou WebP)']);
    exit;
}

$create = 'imagecreatefrom' . $allowed[$info[2]];
$src = @$create($_FILES['avatar']['tmp_name']);
if (!$src) {
    http_response_code(400);
    echo json_encode(['error' => 'não consegui ler a imagem']);
    exit;
}

// recorte central quadrado + resize 256x256; re-encodar remove EXIF e
// qualquer payload escondido no arquivo original
$w = imagesx($src); $h = imagesy($src);
$side = min($w, $h);
$sx = (int)(($w - $side) / 2);
$sy = (int)(($h - $side) / 2);
$dst = imagecreatetruecolor(256, 256);
imagecopyresampled($dst, $src, 0, 0, $sx, $sy, 256, 256, $side, $side);
imagedestroy($src);

try {
$dir = __DIR__ . '/../uploads/avatars';
if (!is_dir($dir)) mkdir($dir, 0755, true);
// o deploy não versiona uploads/, então o .htaccess de proteção é garantido aqui
if (!is_file($dir . '/.htaccess')) {
    file_put_contents($dir . '/.htaccess',
        "php_flag engine off\nRemoveHandler .php .phtml .php3 .php4 .php5 .php7 .phps\n"
        . "<FilesMatch \"\\.(?!(jpg|jpeg|png|webp|gif)$)[^.]+$\">\n  Require all denied\n</FilesMatch>\n");
}

$db = get_db();
$stmt = $db->prepare('SELECT avatar FROM users WHERE id = ?');
$stmt->execute([$uid]);
$old = $stmt->fetch()['avatar'] ?? null;

$name = 'u' . $uid . '_' . bin2hex(random_bytes(8)) . '.jpg';
$path = 'uploads/avatars/' . $name;
imagejpeg($dst, $dir . '/' . $name, 88);
imagedestroy($dst);

$db->prepare('UPDATE users SET avatar = ? WHERE id = ?')->execute([$path, $uid]);

// apaga o arquivo antigo se era um upload local
if ($old && str_starts_with($old, 'uploads/avatars/')) {
    $oldFile = __DIR__ . '/../' . $old;
    if (is_file($oldFile)) @unlink($oldFile);
}

echo json_encode(['ok' => true, 'avatar' => $path]);
} catch (Throwable $e) {
    error_log('avatar.php: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'erro no servidor — o banco de dados está atualizado? (ver schema.sql)']);
}
