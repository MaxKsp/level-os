<?php
declare(strict_types=1);

/**
 * Fase 4C - CLI de restauracao isolada. So roda por linha de comando.
 * Conexao com o banco alvo e SEPARADA da aplicacao (variaveis
 * ORBY_RESTORE_DB_*, nunca db.php/get_db()). Nome do alvo precisa ser
 * confirmado explicitamente e nunca pode ser o banco da aplicacao —
 * essa checagem roda ANTES de qualquer PDO ser criado pro alvo. Saida
 * nunca inclui path completo, chave, DSN, SQL ou mensagem de excecao.
 *
 * Uso:
 *   php scripts/restore.php --input=/caminho/fora/do/repo/orby-2026-07-16.orbybak --confirm
 *
 * Variaveis de ambiente exigidas:
 *   ORBY_RESTORE_DB_HOST, ORBY_RESTORE_DB_NAME, ORBY_RESTORE_DB_USER,
 *   ORBY_RESTORE_DB_PASS, ORBY_RESTORE_CONFIRM_NAME (== ORBY_RESTORE_DB_NAME)
 *
 * O parser e extraido em funcao pura, testavel sem tocar banco/config.php
 * — o teste define RESTORE_CLI_NO_AUTOEXEC antes de dar require neste
 * arquivo pra pular a execucao real.
 */

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, 'this script must run from the CLI' . PHP_EOL);
    exit(1);
}

/** Parser puro: --input=PATH obrigatorio, --confirm obrigatorio. Rejeita qualquer outro argumento. */
function restore_cli_parse_args(array $args): array {
    $input = null;
    $confirm = false;

    foreach ($args as $arg) {
        if (str_starts_with($arg, '--input=')) {
            $input = substr($arg, strlen('--input='));
            continue;
        }
        if ($arg === '--confirm') {
            $confirm = true;
            continue;
        }
        throw new InvalidArgumentException('unknown argument');
    }

    if ($input === null || $input === '') {
        throw new InvalidArgumentException('--input is required');
    }
    if (!$confirm) {
        throw new InvalidArgumentException('restore requires --confirm');
    }

    return ['input' => $input, 'confirm' => $confirm];
}

/** Linha curta de sucesso: so metricas estruturais, nunca dado/path completo. */
function restore_cli_format_success(array $report): string {
    $durationSeconds = $report['duration_ms'] / 1000;
    $rtoMet = $durationSeconds <= RTO_TARGET_SECONDS;

    return implode(PHP_EOL, [
        'operation=restore',
        'tables=' . count($report['tables']),
        'total_rows=' . $report['total_rows'],
        'bytes_read=' . $report['bytes_read'],
        'duration_ms=' . $report['duration_ms'],
        'rto_target_seconds=' . RTO_TARGET_SECONDS,
        'rto_met=' . ($rtoMet ? 'true' : 'false'),
        'post_validation_passed=' . ($report['post_validation_passed'] ? 'true' : 'false'),
    ]) . PHP_EOL;
}

/** Unico ponto que toca as variaveis ORBY_RESTORE_DB_ e config.php. So chamado pela execucao real. */
function restore_cli_main(array $argv): int {
    try {
        $parsed = restore_cli_parse_args(array_slice($argv, 1));
    } catch (Throwable) {
        fwrite(STDERR, 'invalid arguments' . PHP_EOL);
        return 2;
    }

    $repoRoot = dirname(__DIR__);
    require_once $repoRoot . '/app/Core/DatabaseRestore.php';

    // Isolamento de nome: checado ANTES de qualquer PDO ser criado pro alvo.
    try {
        require_once $repoRoot . '/config.php';
        $appDbName = defined('DB_NAME') ? (string)DB_NAME : '';

        $targetDbName = (string)(getenv('ORBY_RESTORE_DB_NAME') ?: '');
        $confirmName = (string)(getenv('ORBY_RESTORE_CONFIRM_NAME') ?: '');
        database_restore_check_target_name($appDbName, $targetDbName, $confirmName);

        $targetHost = (string)(getenv('ORBY_RESTORE_DB_HOST') ?: '');
        $targetUser = (string)(getenv('ORBY_RESTORE_DB_USER') ?: '');
        $targetPass = (string)(getenv('ORBY_RESTORE_DB_PASS') ?: '');
        if ($targetHost === '' || $targetUser === '') {
            throw new InvalidArgumentException('restore target connection is not fully configured');
        }

        $key = backup_crypto_read_key();
        $backupContract = require $repoRoot . '/config/backup-contract.php';
        $schemaContract = require $repoRoot . '/config/schema-contract.php';
    } catch (Throwable $e) {
        fwrite(STDERR, 'restore configuration invalid: ' . backup_exception_class($e) . PHP_EOL);
        return 2;
    }

    try {
        $targetDb = new PDO(
            'mysql:host=' . $targetHost . ';dbname=' . $targetDbName . ';charset=utf8mb4',
            $targetUser,
            $targetPass,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]
        );

        $started = microtime(true);
        $restore = new DatabaseRestore($targetDb, $backupContract, $schemaContract, $key, $parsed['input']);
        $result = $restore->run();
        $durationMs = (int)round((microtime(true) - $started) * 1000);

        echo restore_cli_format_success([
            'tables' => $result['tables'],
            'total_rows' => $result['total_rows'],
            'bytes_read' => $result['bytes_read'],
            'duration_ms' => $durationMs,
            'post_validation_passed' => $result['post_validation_passed'],
        ]);
        return 0;
    } catch (Throwable $e) {
        fwrite(STDERR, 'restore failed: ' . backup_exception_class($e) . PHP_EOL);
        return 1;
    }
}

if (!defined('RESTORE_CLI_NO_AUTOEXEC')) {
    exit(restore_cli_main($argv));
}
