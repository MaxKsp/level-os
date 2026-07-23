<?php
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/app/Shared/AuthView.php';

$_logoutUid = current_user_id();
if ($_logoutUid !== null) {
    try { audit_record(get_db(), $_logoutUid, 'auth.logout', 'success'); } catch (Throwable) {}
}
$_SESSION = [];
session_destroy();
if (supabase_auth_enabled()) {
    ?>
<!DOCTYPE html>
<html lang="pt-BR">
<head><?php auth_view_head('Level OS — Saindo'); ?></head>
<body data-auth-page="logout">
  <main class="auth-layout"><section class="auth-form-column"><div class="card"><p class="sub">Encerrando sua sessão…</p></div></section></main>
</body>
</html>
    <?php
    exit;
}
header('Location: login.php');
exit;
