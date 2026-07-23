<?php
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/app/Shared/AuthView.php';

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
<?php auth_view_head('Level OS — Confirmação de e-mail'); ?>
</head>
<body>
<?php auth_view_chrome(); ?>
<main class="auth-layout">
  <?php auth_view_intro(
      'Identidade verificada',
      'Seu próximo nível começa com confiança.',
      'A confirmação protege sua conta e libera os recursos de comunicação e recuperação com segurança.',
      ['E-mail confirmado', 'Recuperação protegida', 'Acesso pessoal', 'Controle de identidade']
  ); ?>
  <section class="auth-form-column" aria-label="Resultado da confirmação">
  <div class="card" style="text-align:center;">
    <?php if ($ok): ?>
      <h1 class="ok-badge">E-mail confirmado!</h1>
      <p class="sub">Sua conta já pode usar o e-mail para recuperação segura.</p>
    <?php else: ?>
      <h1 class="fail-badge">Link inválido ou já usado</h1>
      <p class="sub">Esse link de confirmação não é mais válido.</p>
    <?php endif; ?>
    <div class="footer"><a href="login.php">Voltar pro login</a></div>
  </div>
  </section>
</main>
</body>
</html>
