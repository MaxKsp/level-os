<?php
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/app/Shared/AuthView.php';

if (current_user_id() !== null) {
    header('Location: index.php');
    exit;
}

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrf_form_ok()) {
        $error = 'Sessão expirada. Tente de novo.';
    } elseif (is_register_locked_out()) {
        $error = 'Muitos cadastros a partir do seu IP. Tente novamente mais tarde.';
    } else {
        $username = trim((string)($_POST['username'] ?? ''));
        $email = trim((string)($_POST['email'] ?? ''));
        $password = (string)($_POST['password'] ?? '');
        $confirm = (string)($_POST['confirm'] ?? '');

        if (!preg_match('/^[a-zA-Z0-9._-]{3,64}$/', $username)) {
            $error = 'Usuário precisa ter de 3 a 64 caracteres: letras, números, ponto, hífen ou underline.';
        } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $error = 'E-mail inválido.';
        } elseif (mb_strlen($password) < 8) {
            $error = 'Senha precisa ter pelo menos 8 caracteres.';
        } elseif ($password !== $confirm) {
            $error = 'As senhas não coincidem.';
        } else {
            $db = get_db();
            $stmt = $db->prepare('SELECT id FROM users WHERE username = ? OR email = ?');
            $stmt->execute([$username, $email]);
            if ($stmt->fetch()) {
                record_register_attempt();
                $error = 'Já existe uma conta com esse usuário ou e-mail.';
            } else {
                $hash = password_hash($password, PASSWORD_DEFAULT);
                $token = bin2hex(random_bytes(32));
                try {
                    $db->beginTransaction();
                    $stmt = $db->prepare('INSERT INTO users (username, password_hash, email, email_verify_token) VALUES (?, ?, ?, ?)');
                    $stmt->execute([$username, $hash, $email, $token]);
                    $userId = (int)$db->lastInsertId();
                    $subscription = $db->prepare("INSERT INTO subscriptions (user_id, plan, status, current_period_end, trial_ends_at) VALUES (?, 'free', 'active', NULL, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 30 DAY))");
                    $subscription->execute([$userId]);
                    $db->commit();
                } catch (Throwable $e) {
                    if ($db->inTransaction()) $db->rollBack();
                    error_log('register: ' . $e->getMessage());
                    $error = 'Não foi possível concluir o cadastro. Tente novamente.';
                    $userId = 0;
                }

                $baseUrl = $userId > 0 ? trusted_app_base_url() : null;
                if ($userId > 0 && $baseUrl !== null) {
                    $verifyUrl = $baseUrl . '/verify-email.php?token=' . rawurlencode($token);
                    send_transactional_email(
                        $email,
                        email_template_verification($verifyUrl),
                        email_idempotency_key('email-verification', $userId . ':' . hash('sha256', $token)),
                    );
                } elseif ($userId > 0) {
                    error_log('Verification e-mail skipped: configure a valid HTTPS APP_URL.');
                }

                if ($userId > 0) {
                    reset_attempts();
                    complete_login($userId);
                    header('Location: index.php');
                    exit;
                }
            }
        }
    }
}
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<?php auth_view_head('Level OS — Criar conta'); ?>
</head>
<body data-auth-page="register">
<?php auth_view_chrome(); ?>
<main class="auth-layout">
  <?php auth_view_intro(
      'Uma base para a vida real',
      'Organize hoje. Enxergue mais longe.',
      'Crie seu espaço Level OS e reúna decisões financeiras, compromissos e evolução pessoal sem perder o contexto.',
      ['Configuração rápida', 'Tema que acompanha você', 'Privacidade por padrão', 'Acesso com 2FA']
  ); ?>
  <section class="auth-form-column" aria-label="Criação de conta">
  <form class="card" method="POST" autocomplete="on" data-supabase-register>
    <?= csrf_field() ?>
    <h1>Criar sua conta</h1>
    <p class="sub">Leva menos de um minuto. Seus dados ficam só com você.</p>
    <?php if ($error): ?><div class="error" role="alert"><?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?></div><?php endif; ?>
    <label for="username">Usuário</label>
    <input type="text" id="username" name="username" placeholder="seu.usuario" autocomplete="username" autocapitalize="none" spellcheck="false" required autofocus value="<?= htmlspecialchars($_POST['username'] ?? '', ENT_QUOTES, 'UTF-8') ?>">
    <label for="email">E-mail</label>
    <input type="email" id="email" name="email" placeholder="voce@exemplo.com" autocomplete="email" autocapitalize="none" spellcheck="false" required value="<?= htmlspecialchars($_POST['email'] ?? '', ENT_QUOTES, 'UTF-8') ?>">
    <label for="password">Senha</label>
    <input type="password" id="password" name="password" placeholder="mínimo 8 caracteres" autocomplete="new-password" required minlength="8">
    <label for="confirm">Confirmar senha</label>
    <input type="password" id="confirm" name="confirm" placeholder="repita a senha" autocomplete="new-password" required minlength="8">
    <button type="submit">Criar conta</button>
    <div class="footer">Já tem conta? <a href="login.php">Entrar</a></div>
  </form>
  </section>
</main>
</body>
</html>
