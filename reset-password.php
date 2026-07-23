<?php
declare(strict_types=1);

require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/app/Shared/AuthView.php';

header('Referrer-Policy: no-referrer');
header('Cache-Control: no-store');

$error = '';
$success = false;
$token = trim((string)($_POST['token'] ?? $_GET['token'] ?? ''));
$tokenValid = false;
$supabaseReset = supabase_auth_enabled() && (string)($_GET['supabase'] ?? '') === '1';

if (!$supabaseReset && $_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrf_form_ok()) {
        $error = 'Sessão expirada. Abra novamente o link enviado por e-mail.';
    } elseif (!rate_ok_for_subject('password_reset_submit', password_reset_ip_rate_subject(), 10, 15 * 60)) {
        $error = 'Não foi possível concluir a redefinição. Solicite um novo link e tente novamente mais tarde.';
    } elseif (!password_reset_token_is_well_formed($token)) {
        $error = 'Este link é inválido, expirou ou já foi utilizado.';
    } else {
        $password = (string)($_POST['password'] ?? '');
        $confirm = (string)($_POST['confirm'] ?? '');
        if (mb_strlen($password) < 8) {
            $error = 'A nova senha precisa ter pelo menos 8 caracteres.';
        } elseif ($password !== $confirm) {
            $error = 'As senhas não coincidem.';
        } else {
            try {
                $success = consume_password_reset_token($token, $password);
                if ($success) {
                    // A recuperacao nao autentica o usuario nem altera Google/2FA.
                    unset(
                        $_SESSION['user_id'],
                        $_SESSION['session_version'],
                        $_SESSION['pending_2fa_user_id'],
                        $_SESSION['pending_2fa_session_version'],
                        $_SESSION['csrf']
                    );
                    session_regenerate_id(true);
                    $token = '';
                } else {
                    $error = 'Este link é inválido, expirou ou já foi utilizado.';
                }
            } catch (Throwable $e) {
                error_log('Password reset failed: ' . $e->getMessage());
                $error = 'Não foi possível concluir a redefinição. Solicite um novo link.';
            }
        }
    }
}

if (!$supabaseReset && !$success && password_reset_token_is_well_formed($token)) {
    try {
        $canValidate = rate_ok_for_subject('password_reset_validate', password_reset_ip_rate_subject(), 30, 15 * 60);
        $tokenValid = $canValidate && password_reset_token_is_active($token);
    } catch (Throwable $e) {
        error_log('Password reset token validation failed: ' . $e->getMessage());
        $tokenValid = false;
    }
}

if (!$supabaseReset && !$success && !$tokenValid && $error === '') {
    $error = 'Este link é inválido, expirou ou já foi utilizado.';
}
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<?php auth_view_head('Level OS — Redefinir senha'); ?>
</head>
<body<?= $supabaseReset ? ' data-auth-page="reset"' : '' ?>>
<?php auth_view_chrome(); ?>
<main class="auth-layout">
  <?php auth_view_intro(
      'Nova credencial, mesma proteção',
      'Recomece sem perder sua segurança.',
      'Seu novo acesso será criado dentro do fluxo protegido do Level OS. A autenticação em duas etapas permanece ativa.',
      ['Token verificado', 'Alteração atômica', 'Links anteriores invalidados', 'Sem login automático']
  ); ?>
  <section class="auth-form-column" aria-label="Redefinição de senha">
  <div class="card">
    <?php if ($supabaseReset): ?>
      <form method="POST" autocomplete="on" data-supabase-reset>
        <h1>Crie uma nova senha</h1>
        <p class="sub">Use pelo menos 8 caracteres. Sua sessão de recuperação será encerrada após a alteração.</p>
        <label for="password">Nova senha</label>
        <input type="password" id="password" name="password" autocomplete="new-password" placeholder="mínimo 8 caracteres" required minlength="8" autofocus>
        <label for="confirm">Confirmar nova senha</label>
        <input type="password" id="confirm" name="confirm" autocomplete="new-password" placeholder="repita a nova senha" required minlength="8">
        <button type="submit">Redefinir senha</button>
      </form>
    <?php elseif ($success): ?>
      <h1>Senha redefinida</h1>
      <div class="notice" role="status">Sua senha foi atualizada. Entre novamente; a verificação em duas etapas continua protegendo sua conta.</div>
      <div class="footer"><a href="login.php">Entrar com a nova senha</a></div>
    <?php elseif (!$tokenValid): ?>
      <h1>Link indisponível</h1>
      <div class="error" role="alert"><?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?></div>
      <div class="footer"><a href="forgot-password.php">Solicitar outro link</a></div>
    <?php else: ?>
      <form method="POST" autocomplete="on">
        <?= csrf_field() ?>
        <input type="hidden" name="token" value="<?= htmlspecialchars($token, ENT_QUOTES, 'UTF-8') ?>">
        <h1>Crie uma nova senha</h1>
        <p class="sub">Use pelo menos 8 caracteres. O link será invalidado assim que a senha for alterada.</p>
        <?php if ($error): ?><div class="error" role="alert"><?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?></div><?php endif; ?>
        <label for="password">Nova senha</label>
        <input type="password" id="password" name="password" autocomplete="new-password" placeholder="mínimo 8 caracteres" required minlength="8" autofocus>
        <label for="confirm">Confirmar nova senha</label>
        <input type="password" id="confirm" name="confirm" autocomplete="new-password" placeholder="repita a nova senha" required minlength="8">
        <button type="submit">Redefinir senha</button>
      </form>
    <?php endif; ?>
  </div>
  </section>
</main>
</body>
</html>
