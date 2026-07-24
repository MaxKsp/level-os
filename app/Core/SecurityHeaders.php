<?php
declare(strict_types=1);

/**
 * A aplicação não usa JavaScript inline. Isso permite bloquear inline scripts
 * com uma política estática, inclusive em hospedagens que reescrevem headers.
 */
function security_content_security_policy(): string
{
    return implode('; ', [
        "default-src 'self'",
        "script-src 'self'",
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
}

function security_apply_headers(): void
{
    if (headers_sent()) return;

    header('Content-Security-Policy: ' . security_content_security_policy());
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('Referrer-Policy: strict-origin-when-cross-origin');
    header('Permissions-Policy: camera=(), microphone=(), geolocation=()');
    if (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') {
        header('Strict-Transport-Security: max-age=31536000');
    }
}
