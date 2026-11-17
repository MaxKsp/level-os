<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

$root = dirname(__DIR__);
$runner = $root . '/tests/run.php';
$journey = [
    'email_verification_flow' => 'cadastro e confirmação de e-mail',
    'two_factor_login_flow' => 'login e 2FA',
    'finance_api_save_set' => 'lançamento financeiro',
    'backup_recovery' => 'backup criptografado e restauração real',
    'production_security_contract' => 'expiração, e-mail verificado e logout',
];

foreach ($journey as $filter => $label) {
    fwrite(STDOUT, "\n== {$label} ==\n");
    $process = proc_open([PHP_BINARY, $runner, $filter], [
        0 => STDIN,
        1 => STDOUT,
        2 => STDERR,
    ], $pipes, $root);
    if (!is_resource($process)) {
        fwrite(STDERR, "Não foi possível iniciar o smoke: {$label}.\n");
        exit(1);
    }
    $status = proc_close($process);
    if ($status !== 0) {
        fwrite(STDERR, "Smoke interrompido em: {$label}.\n");
        exit($status > 0 ? $status : 1);
    }
}

fwrite(STDOUT, "\nSmoke crítico concluído com sucesso.\n");
