<?php
require_once __DIR__ . '/auth.php';

$token = (string)($_GET['token'] ?? '');
$ok = false;

if ($token !== '') {
    $db = get_db();
    $stmt = $db->prepare('SELECT id FROM users WHERE email_verify_token = ?');
    $stmt->execute([$token]);
    $user = $stmt->fetch();
    if ($user) {
        $stmt = $db->prepare('UPDATE users SET email_verified_at = NOW(), email_verify_token = NULL WHERE id = ?');
        $stmt->execute([$user['id']]);
        $ok = true;
    }
}
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Orby — Confirmação de e-mail</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/auth.css">
</head>
<body>
  <div class="brand">
    <svg class="orbymark" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="obg" x1="0" y1="48" x2="48" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="var(--accent)"/><stop offset="1" stop-color="var(--accent-2)"/></linearGradient></defs>
      <g transform="rotate(-18 24 24)"><path d="M3 24a21 7.5 0 0 1 42 0" stroke="url(#obg)" stroke-width="3.4" stroke-linecap="round"/></g>
      <circle cx="24" cy="24" r="12.5" stroke="var(--text)" stroke-width="7"/>
      <g transform="rotate(-18 24 24)"><path d="M45 24a21 7.5 0 0 1 -42 0" stroke="url(#obg)" stroke-width="3.4" stroke-linecap="round"/></g>
      <circle cx="40" cy="7.5" r="3.1" fill="#2DD4BF"/>
    </svg>
    <div class="brandname">Orby</div>
  </div>
  <div class="card" style="text-align:center;">
    <?php if ($ok): ?>
      <h1 class="ok-badge">E-mail confirmado!</h1>
      <p class="sub">Sua conta já pode usar o e-mail pra recuperação futura.</p>
    <?php else: ?>
      <h1 class="fail-badge">Link inválido ou já usado</h1>
      <p class="sub">Esse link de confirmação não é mais válido.</p>
    <?php endif; ?>
    <div class="footer"><a href="login.php">Voltar pro login</a></div>
  </div>
</body>
</html>
