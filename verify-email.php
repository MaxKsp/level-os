<?php
declare(strict_types=1);

require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/app/Shared/AuthView.php';

$token = (string)($_GET['token'] ?? '');
$ok = false;

if ($token !== '') {
    $db = get_db();
    $tokenHash = hash('sha256', $token);
    $stmt = $db->prepare('SELECT id FROM users
        WHERE email_verify_token = ? AND email_verified_at IS NULL LIMIT 1');
    $stmt->execute([$tokenHash]);
    $user = $stmt->fetch();
    if ($user) {
        $expiry = $db->prepare('SELECT data_value FROM kv_store WHERE user_id = ? AND data_key = ? LIMIT 1');
        $expiry->execute([$user['id'], '_email_verify_expires_at']);
        $expiresAt = (int)json_decode((string)($expiry->fetchColumn() ?: '0'), true);
        if ($expiresAt >= time()) {
            try {
                $db->beginTransaction();
                $stmt = $db->prepare('UPDATE users SET email_verified_at = UTC_TIMESTAMP(), email_verify_token = NULL
                    WHERE id = ? AND email_verify_token = ? AND email_verified_at IS NULL');
                $stmt->execute([$user['id'], $tokenHash]);
                $ok = $stmt->rowCount() === 1;
                if ($ok) {
                    $cleanup = $db->prepare('DELETE FROM kv_store WHERE user_id = ? AND data_key = ?');
                    $cleanup->execute([$user['id'], '_email_verify_expires_at']);
                }
                $db->commit();
            } catch (Throwable $e) {
                if ($db->inTransaction()) {
                    $db->rollBack();
                }
                error_log('verify-email: ' . get_class($e) . '.');
                $ok = false;
            }
        }
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
      <p class="sub">Esse link expirou, já foi utilizado ou não é válido.</p>
      <p class="footer"><a href="resend-verification.php">Solicitar um novo link</a></p>
    <?php endif; ?>
    <div class="footer"><a href="login.php">Voltar pro login</a></div>
  </div>
  </section>
</main>
</body>
</html>
