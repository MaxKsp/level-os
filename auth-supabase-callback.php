<?php
declare(strict_types=1);

require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/app/Shared/AuthView.php';

header('Cache-Control: no-store');
header('Referrer-Policy: no-referrer');
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head><?php auth_view_head('Level OS — Confirmando acesso'); ?></head>
<body data-auth-page="callback">
<?php auth_view_chrome(); ?>
<main class="auth-layout">
  <?php auth_view_intro(
      'Identidade protegida',
      'Confirmando seu acesso.',
      'Estamos validando sua identidade antes de liberar os dados do Level OS.',
      ['Sessão verificada', 'Token de curta duração', 'Dados isolados', 'Acesso seguro']
  ); ?>
  <section class="auth-form-column" aria-label="Confirmação de acesso">
    <div class="card" aria-live="polite">
      <h1>Quase pronto</h1>
      <p class="sub">Aguarde enquanto concluímos seu acesso.</p>
      <div class="notice" role="status">Validando sessão…</div>
    </div>
  </section>
</main>
</body>
</html>
