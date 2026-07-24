<?php
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/app/Shared/AuthView.php';

// Página de login nunca deve ser cacheada pelo browser (garante que ajustes de UI
// apareçam na hora, sem versão velha presa em cache).
header('Cache-Control: no-store, must-revalidate');
header('Pragma: no-cache');

if (current_user_id() !== null) {
    header('Location: index.php');
    exit;
}

if (isset($_GET['cancel'])) {
    unset($_SESSION['pending_2fa_user_id'], $_SESSION['pending_2fa_session_version']);
    header('Location: login.php');
    exit;
}

$error = '';
$linkRequired = isset($_GET['link_required']) && $_GET['link_required'] === '1';
$authStatus = isset($_GET['auth']) ? (string)$_GET['auth'] : '';
$authNotice = match ($authStatus) {
    'expired' => 'O link de acesso expirou, já foi utilizado ou foi aberto em outro navegador. Inicie o processo novamente neste navegador.',
    'failed' => 'Não foi possível concluir o acesso. Tente novamente.',
    'unavailable' => 'O serviço de autenticação está temporariamente indisponível.',
    'invalid_authentication' => 'O Supabase recusou a sessão recebida do Google. Inicie o acesso novamente.',
    'authentication_unavailable' => 'O backend não conseguiu concluir a vinculação da conta. Tente novamente em alguns instantes.',
    'too_many_requests' => 'Muitas tentativas seguidas. Aguarde um minuto e tente novamente.',
    'invalid csrf token' => 'A sessão local expirou durante o acesso. Atualize esta página e tente novamente.',
    default => '',
};
$show2fa = !empty($_SESSION['pending_2fa_user_id'])
    && !empty($_SESSION['pending_2fa_session_version']);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrf_form_ok()) {
        $error = 'Sessão expirada. Tente de novo.';
    } elseif (isset($_POST['code'])) {
        $result = attempt_2fa((string)$_POST['code']);
        if ($result === 'ok') {
            header('Location: index.php');
            exit;
        }
        $error = $result === 'locked'
            ? 'Muitas tentativas erradas. Tente novamente em alguns minutos.'
            : 'Código inválido.';
        $show2fa = !empty($_SESSION['pending_2fa_user_id'])
            && !empty($_SESSION['pending_2fa_session_version']);
    } else {
        $username = trim((string)($_POST['username'] ?? ''));
        $password = (string)($_POST['password'] ?? '');
        $result = attempt_login($username, $password);
        if ($result === 'ok') {
            header('Location: index.php');
            exit;
        } elseif ($result === '2fa_required') {
            $show2fa = true;
        } elseif ($result === 'locked') {
            $error = 'Muitas tentativas erradas. Tente novamente em alguns minutos.';
        } else {
            $error = 'Usuário ou senha inválidos.';
        }
    }
}
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<?php auth_view_head('Level OS — Entrar'); ?>
</head>
<body data-auth-page="login" data-link-required="<?= $linkRequired ? 'true' : 'false' ?>">
<?php auth_view_chrome(); ?>
<main class="auth-layout">
  <?php auth_view_intro(
      'Seu centro de comando pessoal',
      'Tudo o que importa, num só lugar.',
      'Finanças, rotina e evolução pessoal conectadas em uma experiência clara, privada e feita para o dia a dia.',
      ['Visão financeira unificada', 'Rotina sem ruído', 'Treinos e evolução', 'Dados sob seu controle']
  ); ?>
  <section class="auth-form-column" aria-label="Acesso à conta">
<?php if ($show2fa): ?>
  <form class="card" method="POST" autocomplete="on" data-supabase-login>
    <?= csrf_field() ?>
    <h1>Verificação em duas etapas</h1>
    <p class="sub" id="two-factor-help">Sua conta está protegida. Digite o código do app autenticador ou um dos códigos de backup.</p>
    <?php if ($error): ?><div class="error" role="alert"><?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?></div><?php endif; ?>
    <label for="code">Código de verificação</label>
    <input type="text" id="code" name="code" inputmode="numeric" autocomplete="one-time-code" placeholder="000000" required autofocus aria-describedby="two-factor-help">
    <button type="submit">Confirmar e entrar</button>
    <div class="footer"><a href="login.php?cancel=1">Voltar</a></div>
  </form>
<?php else: ?>
  <form class="card" method="POST" autocomplete="on" data-supabase-login>
    <?= csrf_field() ?>
    <h1><?= $linkRequired ? 'Confirme sua conta existente' : 'Bem-vindo de volta' ?></h1>
    <p class="sub"><?= $linkRequired
        ? 'Digite sua senha atual uma única vez para vincular seus dados ao novo acesso seguro.'
        : 'Entre para retomar seu painel exatamente de onde parou.' ?></p>
    <?php if ($linkRequired): ?><div class="notice" role="status">Para proteger seus dados antigos, confirme uma vez com sua senha atual ou com o acesso Google anterior. Depois disso, sua conta ficará vinculada ao Supabase.</div><?php endif; ?>
    <?php if ($authNotice !== ''): ?><div class="error" role="alert"><?= htmlspecialchars($authNotice, ENT_QUOTES, 'UTF-8') ?></div><?php endif; ?>
    <?php if ($error): ?><div class="error" role="alert"><?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?></div><?php endif; ?>
    <label for="username">Usuário ou e-mail</label>
    <input type="text" id="username" name="username" placeholder="seu.usuario ou voce@exemplo.com" autocomplete="username" autocapitalize="none" spellcheck="false" required autofocus>
    <div class="field-meta">
      <label for="password">Senha</label>
      <a class="field-link" href="forgot-password.php">Esqueci minha senha</a>
    </div>
    <input type="password" id="password" name="password" placeholder="••••••••" autocomplete="current-password" required>
    <button type="submit"><?= $linkRequired ? 'Confirmar e vincular' : 'Entrar' ?></button>
    <div class="divider">ou</div>
    <a href="auth-google-start.php" class="btn-google" <?= $linkRequired ? '' : 'data-supabase-google' ?>>
      <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.13-.85 2.09-1.8 2.73v2.27h2.92c1.7-1.57 2.68-3.88 2.68-6.64z"/><path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.17l-2.92-2.27c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.71H.96v2.34C2.44 15.98 5.48 18 9 18z"/><path fill="#FBBC05" d="M3.97 10.71c-.18-.54-.28-1.11-.28-1.71s.1-1.17.28-1.71V4.95H.96A8.996 8.996 0 0 0 0 9c0 1.45.35 2.83.96 4.05l3.01-2.34z"/><path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.59-2.59C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.95l3.01 2.34C4.68 5.16 6.66 3.58 9 3.58z"/></svg>
      <?= $linkRequired ? 'Confirmar com Google' : 'Entrar com Google' ?>
    </a>
    <div class="footer">Primeira vez aqui? <a href="register.php">Criar conta</a></div>
  </form>
  <div class="finePrint">Protegido com criptografia e verificação em duas etapas</div>
<?php endif; ?>
  </section>
</main>
</body>
</html>
