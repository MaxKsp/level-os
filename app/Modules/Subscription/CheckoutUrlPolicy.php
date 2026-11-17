<?php
declare(strict_types=1);

/** A URL do checkout devolvida pelo gateway nunca pode apontar para terceiros. */
function subscription_checkout_url_is_allowed(string $url): bool {
    if ($url === '' || strlen($url) > 2048 || preg_match('/[\x00-\x20\x7F]/', $url)) return false;
    try {
        $parts = parse_url($url);
    } catch (ValueError) {
        return false;
    }
    if (!is_array($parts) || strtolower((string)($parts['scheme'] ?? '')) !== 'https'
        || !isset($parts['host']) || isset($parts['user']) || isset($parts['pass'])
        || isset($parts['port']) || isset($parts['fragment'])) return false;

    return in_array(strtolower((string)$parts['host']), [
        'mercadopago.com.br', 'www.mercadopago.com.br',
        'mercadopago.com', 'www.mercadopago.com',
    ], true);
}
