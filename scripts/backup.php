<?php
declare(strict_types=1);

/**
 * Fase 4C - CLI de backup logico criptografado. So roda por linha de
 * comando. Saida nunca inclui path completo, chave, DSN, SQL ou
 * mensagem de excecao — so classe allowlisted + operacao curta em
 * sucesso, classe + mensagem fixa em falha.
 *
 * Uso:
 *   php scripts/backup.php --output=/caminho/fora/do/repo/orby-2026-07-16.orbybak
 *   php scripts/backup.php --output=... --force
 *
 * O parser e extraido em funcao pura, testavel sem tocar get_db()/config.php
 * — o teste define BACKUP_CLI_NO_AUTOEXEC antes de dar require neste
 * arquivo pra pular a execucao real.
 */

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, 'this script must run from the CLI' . PHP_EOL);
    exit(1);
}

/** Parser puro: --output=PATH obrigatorio, --force opcional. Rejeita qualquer outro argumento. */
function backup_cli_parse_args(array $args): array {
    $output = null;
    $force = false;

    foreach ($args as $arg) {
        if (str_starts_with($arg, '--output=')) {
            $output = substr($arg, strlen('--output='));
            continue;
        }
        if ($arg === '--force') {
            $force = true;
            continue;
        }
        throw new InvalidArgumentException('unknown argument');
    }

    if ($output === null || $output === '') {
        throw new InvalidArgumentException('--output is required');
    }

    return ['output' => $output, 'force' => $force];
}

/** Linha curta de sucesso: nunca inclui o path completo, so as metricas. */
function backup_cli_format_success(array $report): string {
    return implode(PHP_EOL, [
        'operation=backup',
        'format_version=' . $report['format_version'],
        'tables=' . count($report['tables']),
        'total_rows=' . $report['total_rows'],
        'bytes_written=' . $report['bytes_written'],
        'duration_ms=' . $report['duration_ms'],
        'rpo_target_seconds=' . $report['rpo_target_seconds'],
    ]) . PHP_EOL;
}

/**
 * Executa o backup completo: resolve destino seguro, escreve no
 * temporario, so faz rename atomico pro destino final depois do
 * TAG_FINAL. Falha remove so o temporario. Retorna o relatorio de
 * metricas (sem dado de usuario).
 */
function backup_cli_run(PDO $db, array $backupContract, array $schemaContract, string $key, string $destPath, bool $force, string $repoRoot): array {
    [$finalPath, $tmpPath] = backup_resolve_destination($destPath, $repoRoot, $force);

    $started = microtime(true);
    $handle = @fopen($tmpPath, 'xb');
    if ($handle === false) {
        throw new InvalidArgumentException('could not create the temporary backup file');
    }
    @chmod($tmpPath, 0600);

    try {
        $writer = new BackupArtifactWriter($handle, $key);
        $backup = new DatabaseBackup($db, $backupContract, $schemaContract, $writer);
        $result = $backup->run();

        if (!$writer->finalWritten()) {
            throw new BackupCryptoException('backup did not reach its final frame');
        }

        fflush($handle);
        fclose($handle);
        $handle = null;

        if (!rename($tmpPath, $finalPath)) {
            throw new BackupCryptoException('could not finalize the backup file');
        }
    } catch (Throwable $e) {
        if ($handle !== null) {
            fclose($handle);
        }
        @unlink($tmpPath);
        throw $e;
    }

    return [
        'format_version' => BACKUP_ARTIFACT_VERSION,
        'tables' => $result['tables'],
        'total_rows' => $result['total_rows'],
        'bytes_written' => $result['bytes_written'],
        'duration_ms' => (int)round((microtime(true) - $started) * 1000),
        'rpo_target_seconds' => RPO_TARGET_SECONDS,
    ];
}

/** Unico ponto que toca get_db()/config.php. So chamado pela execucao real, nunca por teste. */
function backup_cli_main(array $argv): int {
    try {
        $parsed = backup_cli_parse_args(array_slice($argv, 1));
    } catch (Throwable) {
        fwrite(STDERR, 'invalid arguments' . PHP_EOL);
        return 2;
    }

    $repoRoot = dirname(__DIR__);
    require_once $repoRoot . '/db.php';
    require_once $repoRoot . '/app/Core/DatabaseBackup.php';

    // Configuracao (chave, destino, contratos): falha aqui e "argumentos/
    // configuracao invalida" (exit 2) — nada foi executado ainda.
    try {
        $key = backup_crypto_read_key();
        $backupContract = require $repoRoot . '/config/backup-contract.php';
        $schemaContract = require $repoRoot . '/config/schema-contract.php';
    } catch (Throwable $e) {
        fwrite(STDERR, 'backup configuration invalid: ' . backup_exception_class($e) . PHP_EOL);
        return 2;
    }

    // Execucao real (leitura do banco, criptografia, escrita em disco): falha
    // aqui e "operacional/validacao" (exit 1).
    try {
        $report = backup_cli_run(get_db(), $backupContract, $schemaContract, $key, $parsed['output'], $parsed['force'], $repoRoot);
        echo backup_cli_format_success($report);
        return 0;
    } catch (Throwable $e) {
        fwrite(STDERR, 'backup failed: ' . backup_exception_class($e) . PHP_EOL);
        return 1;
    }
}

if (!defined('BACKUP_CLI_NO_AUTOEXEC')) {
    exit(backup_cli_main($argv));
}
