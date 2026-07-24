<?php
declare(strict_types=1);

/**
 * Elementos visuais compartilhados pelas páginas reais de autenticação.
 * A marca usa a identidade aqua fixa do Level OS.
 */
function auth_view_head(string $title, bool $noReferrer = true): void
{
    $safeTitle = htmlspecialchars($title, ENT_QUOTES, 'UTF-8');
    ?>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<?php if ($noReferrer): ?><meta name="referrer" content="no-referrer"><?php endif; ?>
<meta name="theme-color" content="#080b10">
<title><?= $safeTitle ?></title>
<?php
    $iconRoot = __DIR__ . '/../../assets/';
    $svgIconVersion = @filemtime($iconRoot . 'level-os-icon.svg') ?: 1;
    $pngIconVersion = @filemtime($iconRoot . 'icon-192.png') ?: 1;
?>
<link rel="icon" href="/assets/level-os-icon.svg?v=<?= $svgIconVersion ?>" type="image/svg+xml">
<link rel="alternate icon" href="/assets/icon-192.png?v=<?= $pngIconVersion ?>" type="image/png">
<link rel="apple-touch-icon" href="/assets/icon-192.png?v=<?= $pngIconVersion ?>">
<link rel="manifest" href="/manifest.json">
<script src="assets/auth-page.js?v=<?= @filemtime(__DIR__ . '/../../assets/auth-page.js') ?: '1' ?>"></script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&amp;family=Space+Grotesk:wght@300;400;500;600;700&amp;display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/auth.css?v=<?= @filemtime(__DIR__ . '/../../assets/auth.css') ?: '1' ?>">
<script src="assets/auth-password.js?v=<?= @filemtime(__DIR__ . '/../../assets/auth-password.js') ?: '1' ?>" defer></script>
<?php if (function_exists('supabase_auth_enabled') && supabase_auth_enabled()):
    $authConfig = supabase_public_config();
    $authCsrf = session_status() === PHP_SESSION_ACTIVE ? csrf_token() : '';
    $rootAsset = __DIR__ . '/../../auth-client.js';
    $devAsset = __DIR__ . '/../../frontend/dist/auth-client.js';
    $authAssetFile = is_file($rootAsset) ? $rootAsset : $devAsset;
    $authAsset = is_file($rootAsset) ? '/auth-client.js' : (is_file($devAsset) ? '/frontend/dist/auth-client.js' : '/auth-client.js');
    $authAssetVersion = is_file($authAssetFile) ? (string)filemtime($authAssetFile) : '1';
?>
<meta name="level-os-csrf" content="<?= htmlspecialchars($authCsrf, ENT_QUOTES, 'UTF-8') ?>">
<meta name="level-os-auth-config" content="<?= htmlspecialchars((string)json_encode($authConfig, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT), ENT_QUOTES, 'UTF-8') ?>">
<script type="module" src="<?= htmlspecialchars($authAsset, ENT_QUOTES, 'UTF-8') ?>?v=<?= rawurlencode($authAssetVersion) ?>" defer></script>
<?php endif; ?>
    <?php
}

function auth_view_brand(string $href = 'login.php'): void
{
    $safeHref = htmlspecialchars($href, ENT_QUOTES, 'UTF-8');
    ?>
<a class="brand" href="<?= $safeHref ?>" aria-label="Level OS — ir para o login">
  <svg class="level-mark" viewBox="0 0 48 48" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M7 33.5 24 8l17 25.5h-8.4L24 20.6l-8.6 12.9H7Z"/>
    <path class="levelmark-secondary" d="m15 41 9-13.5L33 41h-7l-2-3-2 3h-7Z" opacity=".55"/>
  </svg>
  <span class="brandname">LEVEL OS</span>
</a>
    <?php
}

/** @param list<string> $signals */
function auth_view_intro(string $eyebrow, string $title, string $description, array $signals): void
{
    ?>
<section class="auth-intro" aria-labelledby="auth-intro-title">
  <?php auth_view_brand(); ?>
  <div class="auth-intro-copy">
    <p class="eyebrow"><?= htmlspecialchars($eyebrow, ENT_QUOTES, 'UTF-8') ?></p>
    <h2 id="auth-intro-title"><?= htmlspecialchars($title, ENT_QUOTES, 'UTF-8') ?></h2>
    <p><?= htmlspecialchars($description, ENT_QUOTES, 'UTF-8') ?></p>
  </div>
  <?php if ($signals): ?>
    <ul class="auth-signals" aria-label="Recursos do Level OS">
      <?php foreach ($signals as $signal): ?>
        <li><span aria-hidden="true"></span><?= htmlspecialchars($signal, ENT_QUOTES, 'UTF-8') ?></li>
      <?php endforeach; ?>
    </ul>
  <?php endif; ?>
  <p class="auth-system"><span aria-hidden="true"></span>Sistema protegido e pronto para sincronizar</p>
</section>
    <?php
}

function auth_view_chrome(): void
{
    ?>
<canvas id="auth-shader" class="auth-shader" aria-hidden="true"></canvas>
<div class="auth-ambient" aria-hidden="true">
  <?php for ($i = 0; $i < 10; $i++): ?><i></i><?php endfor; ?>
</div>
<script src="assets/auth-shader.js?v=<?= @filemtime(__DIR__ . '/../../assets/auth-shader.js') ?: '1' ?>" defer></script>
    <?php
}
