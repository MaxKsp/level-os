<?php
declare(strict_types=1);

/**
 * Carrega segredos preferencialmente de fora do document root.
 *
 * Produção recomendada:
 *   /home/USUARIO/level-os-config.php
 *   /home/USUARIO/public_html/  (este repositório)
 *
 * O config.php na raiz pública permanece como fallback de migração e continua
 * bloqueado pelo Apache. LEVELOS_CONFIG_PATH permite um caminho absoluto.
 */
function level_os_load_config(string $appRoot): void
{
    static $loaded = false;
    if ($loaded || defined('DB_HOST')) {
        $loaded = true;
        return;
    }

    $root = realpath($appRoot);
    if ($root === false || !is_dir($root)) {
        throw new RuntimeException('Application root is invalid.');
    }

    $candidates = [];
    $configured = getenv('LEVELOS_CONFIG_PATH');
    if (is_string($configured) && trim($configured) !== '') {
        $candidates[] = trim($configured);
    }
    $candidates[] = dirname($root) . DIRECTORY_SEPARATOR . 'level-os-config.php';
    // Compatibilidade temporária com instalações existentes.
    $candidates[] = $root . DIRECTORY_SEPARATOR . 'config.php';

    foreach (array_unique($candidates) as $candidate) {
        if (!is_file($candidate) || !is_readable($candidate)) continue;
        require_once $candidate;
        $loaded = true;
        break;
    }

    if (!$loaded || !defined('DB_HOST') || !defined('DB_NAME') || !defined('DB_USER') || !defined('DB_PASS')) {
        throw new RuntimeException('Level OS configuration is unavailable.');
    }
}
