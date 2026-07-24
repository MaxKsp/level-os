<?php
declare(strict_types=1);

function security_csp_nonce(): string
{
    static $nonce = null;
    if (!is_string($nonce)) {
        $nonce = base64_encode(random_bytes(18));
    }
    return $nonce;
}

function security_csp_nonce_attribute(): string
{
    return htmlspecialchars(security_csp_nonce(), ENT_QUOTES, 'UTF-8');
}

/**
 * Política dinâmica: scripts inline só executam quando receberam o nonce
 * desta resposta. style-src ainda aceita inline porque React usa style props.
 */
function security_apply_headers(): void
{
    if (headers_sent()) return;

    $nonce = security_csp_nonce();
    $policy = implode('; ', [
        "default-src 'self'",
        "script-src 'self' 'nonce-{$nonce}' https://cdn.jsdelivr.net",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: blob: https://lh3.googleusercontent.com https://avatars.githubusercontent.com",
        "connect-src 'self' https://*.supabase.co https://*.ingest.us.sentry.io",
        "worker-src 'self' blob:",
        "manifest-src 'self'",
        "object-src 'none'",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self' https://accounts.google.com https://*.supabase.co",
        'upgrade-insecure-requests',
    ]);

    header('Content-Security-Policy: ' . $policy);
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('Referrer-Policy: strict-origin-when-cross-origin');
    header('Permissions-Policy: camera=(), microphone=(), geolocation=()');
    if (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') {
        header('Strict-Transport-Security: max-age=31536000');
    }
}
