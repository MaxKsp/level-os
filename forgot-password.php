<?php
declare(strict_types=1);

require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/app/Shared/AuthView.php';

header('Cache-Control: no-store');

$error = '';
$submitted = false;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrf_form_ok()) {
        $error = 'Sessão expirada. Tente de novo.';
    } else {
        $startedAt = microtime(true);
        $email = trim((string)($_POST['email'] ?? ''));

        try {
            $ipAllowed = rate_ok_for_subject(
                'password_reset_ip',
                password_reset_ip_rate_subject(),
                5,
                60 * 60
            );
            $accountAllowed = $ipAllowed && rate_ok_for_subject(
                'password_reset_account',
                password_reset_rate_subject($email),
                3,
                60 * 60
            );
            if ($ipAllowed && $accountAllowed) {
                issue_password_reset_if_account_exists($email);
            }
        } catch (Throwable $e) {
            // A resposta continua generica para nao revelar conta nem estado interno.
            error_log('Password reset request failed: ' . $e->getMessage());
        }

        // Reduz diferencas de tempo entre contas existentes e inexistentes.
        $minimumSeconds = 0.9 + (random_int(0, 150) / 1000);
        $remainingMicros = (int)(($minimumSeconds - (microtime(true) - $startedAt)) * 1000000);
        if ($remainingMicros > 0) usleep($remainingMicros);
        $submitted = true;
    }
}
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<?php auth_view_head('Level OS — Recuperar senha'); ?>
</head>
<body data-auth-page="forgot">
<?php auth_view_chrome(); ?>
<main class="auth-layout">
  <?php auth_view_intro(
      'Recuperação sem atalhos',
      'Volte ao controle com segurança.',
      'O Level OS protege este processo sem revelar contas, expor tokens ou enfraquecer sua verificação em duas etapas.',
      ['Link de uso único', 'Expiração em 60 minutos', 'Resposta anti-enumeração', '2FA preservado']
  ); ?>
  <section class="auth-form-column" aria-label="Recuperação de senha">
  <form class="card" method="POST" autocomplete="on" data-supabase-forgot>
    <?= csrf_field() ?>
    <h1>Recuperar senha</h1>
    <?php if ($submitted): ?>
      <div class="notice" role="status">Se existir uma conta com esse e-mail, enviaremos um link para redefinir a senha. Verifique também a pasta de spam.</div>
      <div class="footer"><a href="login.php">Voltar para entrar</a></div>
    <?php else: ?>
      <p class="sub">Informe o e-mail da conta. O link enviado poderá ser usado uma única vez e expira em 60 minutos.</p>
      <?php if ($error): ?><div class="error" role="alert"><?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?></div><?php endif; ?>
      <label for="email">E-mail</label>
      <input type="email" id="email" name="email" autocomplete="email" autocapitalize="none" spellcheck="false" placeholder="voce@exemplo.com" required autofocus value="<?= htmlspecialchars($_POST['email'] ?? '', ENT_QUOTES, 'UTF-8') ?>">
      <button type="submit">Enviar link seguro</button>
      <div class="footer"><a href="login.php">Voltar para entrar</a></div>
    <?php endif; ?>
  </form>
  <div class="finePrint">Por segurança, nunca confirmamos se um e-mail está cadastrado</div>
  </section>
</main>
</body>
</html>
