<?php
declare(strict_types=1);

/**
 * Roteador exclusivo do servidor embutido do PHP.
 *
 * Arquivos e endpoints existentes continuam sendo servidos pelo PHP. Rotas do
 * React, como /agenda e /financeiro, usam o front controller da aplicacao.
 */
if (PHP_SAPI !== 'cli-server') {
    http_response_code(404);
    exit;
}

$requestPath = parse_url((string) ($_SERVER['REQUEST_URI'] ?? '/'), PHP_URL_PATH);
$requestPath = is_string($requestPath) ? rawurldecode($requestPath) : '/';
$root = realpath(__DIR__);
$candidate = realpath(__DIR__ . DIRECTORY_SEPARATOR . ltrim($requestPath, '/\\'));

if (
    is_string($root)
    && is_string($candidate)
    && is_file($candidate)
    && ($candidate === $root || str_starts_with($candidate, $root . DIRECTORY_SEPARATOR))
) {
    return false;
}

require __DIR__ . '/index.php';
