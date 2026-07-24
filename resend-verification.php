<?php
declare(strict_types=1);

require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/app/Shared/AuthView.php';

if (current_user_id() !== null) {
    header('Location: index.php');
    exit;
}

$error = '';
$sent = false;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrf_form_ok()) {
        $error = 'Sessão expirada. Atualize a página e tente novamente.';
    } elseif (is_register_locked_out()) {
        $error = 'Muitas solicitações. Aguarde alguns minutos antes de tentar novamente.';
    } else {
        $email = trim((string)($_POST['email'] ?? ''));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $error = 'Informe um e-mail válido.';
        } else {
            record_register_attempt();
            $db = get_db();
            $stmt = $db->prepare('SELECT id FROM users WHERE email = ? AND email_verified_at IS NULL LIMIT 1');
            $stmt->execute([$email]);
            $userId = $stmt->fetchColumn();

            if ($userId !== false) {
                $token = bin2hex(random_bytes(32));
                $tokenHash = hash('sha256', $token);
                try {
                    $db->beginTransaction();
                    $update = $db->prepare('UPDATE users SET email_verify_token = ?
                        WHERE id = ? AND email_verified_at IS NULL');
                    $update->execute([$tokenHash, $userId]);
                    $expiry = $db->prepare('INSERT INTO kv_store (user_id, data_key, data_value) VALUES (?, ?, ?)
                        ON DUPLICATE KEY UPDATE data_value = VALUES(data_value)');
                    $expiry->execute([$userId, '_email_verify_expires_at', json_encode(time() + 172800)]);
                    $db->commit();

                    $baseUrl = trusted_app_base_url();
                    if ($baseUrl !== null) {
                        $verifyUrl = $baseUrl . '/verify-email.php?token=' . rawurlencode($token);
                        send_transactional_email(
                            $email,
                            email_template_verification($verifyUrl),
                            email_idempotency_key('email-verification-resend', $userId . ':' . hash('sha256', $token)),
                        );
                    }
                } catch (Throwable $e) {
                    if ($db->inTransaction()) {
                        $db->rollBack();
                    }
                    error_log('resend-verification: ' . get_class($e) . '.');
                }
            }
            $sent = true;
        }
    }
}
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<?php auth_view_head('Level OS — Reenviar confirmação'); ?>
</head>
<body data-auth-page="resend-verification">
<?php auth_view_chrome(); ?>
<main class="auth-layout">
  <?php auth_view_intro(
      'Acesso protegido',
      'Confirme que o e-mail é realmente seu.',
      'O link de confirmação expira para impedir que códigos antigos sejam reutilizados.',
      ['Link de uso único', 'Validade de 48 horas', 'Resposta sem expor contas', 'Acesso protegido']
  ); ?>
  <section class="auth-form-column" aria-label="Reenvio da confirmação">
    <form class="card" method="POST" autocomplete="on">
      <?= csrf_field() ?>
      <h1>Reenviar confirmação</h1>
      <p class="sub">Informe o e-mail usado no cadastro.</p>
      <?php if ($error): ?><div class="error" role="alert"><?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?></div><?php endif; ?>
      <?php if ($sent): ?><div class="notice" role="status">Se a conta estiver pendente, enviaremos um novo link.</div><?php endif; ?>
      <label for="email">E-mail</label>
      <input type="email" id="email" name="email" autocomplete="email" autocapitalize="none" spellcheck="false" required value="<?= htmlspecialchars($_POST['email'] ?? '', ENT_QUOTES, 'UTF-8') ?>">
      <button type="submit">Enviar novo link</button>
      <div class="footer"><a href="login.php">Voltar para entrar</a></div>
    </form>
  </section>
</main>
</body>
</html>
