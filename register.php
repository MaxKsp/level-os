<?php
require_once __DIR__ . '/auth.php';

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
                $stmt = $db->prepare('INSERT INTO users (username, password_hash, email, email_verify_token) VALUES (?, ?, ?, ?)');
                $stmt->execute([$username, $hash, $email, $token]);
                $userId = (int)$db->lastInsertId();

                $verifyUrl = (!empty($_SERVER['HTTPS']) ? 'https://' : 'http://') . $_SERVER['HTTP_HOST'] . '/verify-email.php?token=' . $token;
                @mail($email, 'Confirme seu e-mail — Orby', "Clique para confirmar seu e-mail:\n\n$verifyUrl\n\nSe você não criou essa conta, ignore este e-mail.");

                reset_attempts();
                complete_login($userId);
                header('Location: index.php');
                exit;
            }
        }
    }
}
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Orby — Criar conta</title>
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
  <form class="card" method="POST" autocomplete="off">
    <?= csrf_field() ?>
    <h1>Criar sua conta</h1>
    <p class="sub">Leva menos de um minuto. Seus dados ficam só com você.</p>
    <?php if ($error): ?><div class="error"><?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?></div><?php endif; ?>
    <label for="username">Usuário</label>
    <input type="text" id="username" name="username" placeholder="seu.usuario" required autofocus value="<?= htmlspecialchars($_POST['username'] ?? '', ENT_QUOTES, 'UTF-8') ?>">
    <label for="email">E-mail</label>
    <input type="email" id="email" name="email" placeholder="voce@exemplo.com" required value="<?= htmlspecialchars($_POST['email'] ?? '', ENT_QUOTES, 'UTF-8') ?>">
    <label for="password">Senha</label>
    <input type="password" id="password" name="password" placeholder="mínimo 8 caracteres" required minlength="8">
    <label for="confirm">Confirmar senha</label>
    <input type="password" id="confirm" name="confirm" placeholder="repita a senha" required minlength="8">
    <button type="submit">Criar conta</button>
    <div class="footer">Já tem conta? <a href="login.php">Entrar</a></div>
  </form>
</body>
</html>
