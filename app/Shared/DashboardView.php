<?php
declare(strict_types=1);

/**
 * Adaptador do dashboard para o front controller PHP.
 *
 * Em producao, frontend/dist e publicado na raiz. No servidor local, o build
 * permanece dentro de frontend/dist; por isso o shell e os assets precisam ter
 * os caminhos ajustados antes de serem enviados ao navegador.
 */
function dashboard_asset_version(string $appRoot, string $relativePath): string
{
    $path = $appRoot . '/' . ltrim($relativePath, '/');
    $mtime = is_file($path) ? filemtime($path) : false;

    return $mtime === false ? '0' : (string)$mtime;
}

function dashboard_render_react_shell(string $appRoot, string $csrfToken, int $userId): bool
{
    $shellPath = $appRoot . '/frontend/dist/index.php';
    $html = is_file($shellPath) ? file_get_contents($shellPath) : false;
    if (!is_string($html) || $html === '') {
        return false;
    }

    // O guard PHP do artefato e executado apenas quando frontend/dist e
    // publicado na raiz. Aqui a autenticacao ja foi validada por index.php.
    $html = preg_replace('/\A<\?php\s.*?\?>\s*/s', '', $html, 1);
    if (!is_string($html) || !str_contains($html, '<div id="root"></div>')) {
        return false;
    }

    $jsonFlags = JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT;
    $csrfJson = json_encode($csrfToken, $jsonFlags);
    $userScopeJson = json_encode((string)$userId, $jsonFlags);
    $authConfig = function_exists('supabase_public_config') ? supabase_public_config() : null;
    $authConfigJson = json_encode($authConfig, $jsonFlags);

    if (!is_string($csrfJson) || !is_string($userScopeJson) || !is_string($authConfigJson)) {
        return false;
    }

    $sentryDsn = function_exists('sentry_public_dsn') ? sentry_public_dsn() : null;
    $sentryJson = json_encode($sentryDsn, $jsonFlags);
    if (!is_string($sentryJson)) {
        return false;
    }

    $csrfPattern   = '/<\?=\s*json_encode\(csrf_token\(\),.*?\)\s*\?>/s';
    $scopePattern  = '/<\?=\s*json_encode\(\(string\)\$userId,.*?\)\s*\?>/s';
    $authPattern   = '/<\?=\s*json_encode\(supabase_public_config\(\),.*?\)\s*\?>/s';
    $sentryPattern = '/<\?=\s*json_encode\(sentry_public_dsn\(\),.*?\)\s*\?>/s';
    $html = preg_replace($csrfPattern, $csrfJson, $html, 1);
    $html = is_string($html) ? preg_replace($scopePattern, $userScopeJson, $html, 1) : null;
    $html = is_string($html) ? preg_replace($authPattern, $authConfigJson, $html, 1) : null;
    $html = is_string($html) ? preg_replace($sentryPattern, $sentryJson, $html, 1) : null;
    if (!is_string($html) || str_contains($html, '<?=')) {
        return false;
    }

    // Os caminhos sao absolutos porque no deploy o conteudo de dist fica na
    // raiz. Localmente ele continua em /frontend/dist.
    $html = str_replace(
        [
            '="/frontend-assets/',
            '="/favicon.svg"',
        ],
        [
            '="/frontend/dist/frontend-assets/',
            '="/frontend/dist/favicon.svg"',
        ],
        $html
    );

    echo $html;
    return true;
}

function dashboard_view_render(string $appRoot, string $csrfToken, int $userId): void
{
    if (!dashboard_render_react_shell($appRoot, $csrfToken, $userId)) {
        http_response_code(503);
        echo '<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Level OS</title></head>'
            . '<body style="font-family:sans-serif;padding:2rem"><h1>Build indisponível</h1>'
            . '<p>Execute <code>npm run build</code> dentro de <code>frontend/</code> para gerar o artefato React.</p></body></html>';
    }
}
