<?php
declare(strict_types=1);

/**
 * Bootstrap financeiro do GET api/data.php?all=1 (Fase 7, recorte 1).
 * Extraido de api/data.php sem mudar comportamento: migracao best-effort
 * (mesmo try/catch e mensagem de log) e os quatro sets relacionais no shape
 * atual. api/data.php continua responsavel por login, rate limit, sessao,
 * leitura do kv_store e merge final.
 */

/**
 * Roda a migracao kv -> tabelas em modo best-effort (nao derruba o bootstrap
 * se falhar) e devolve apenas os quatro sets financeiros relacionais, prontos
 * para sobrescrever as chaves equivalentes vindas do kv_store.
 */
function finance_data_bootstrap(PDO $db, int $uid): array {
    try {
        finance_migrate_if_needed($db, $uid);
    } catch (Throwable $e) {
        error_log('migrate: ' . $e->getMessage());
    }

    return finance_load_all_sets($db, $uid);
}
