<?php
declare(strict_types=1);

/**
 * Persistencia das chaves financeiras auxiliares ainda em kv_store
 * (Fase 9, recorte 1). Extraido de api/data.php sem migrar essas chaves
 * para tabelas e sem mudar o UPSERT atual. api/data.php continua endpoint
 * publico: validacao de payload, limite de tamanho e o caminho generico
 * para chaves nao financeiras ficam la, inalterados.
 *
 * Financeiro, mas ainda em kv (ver FINANCE_BOUNDARIES.md): cofrinhos,
 * transferencias, metas, categorias customizadas, dismiss de anomalia,
 * metadados do simulador, preferencia de visao e favoritos de banco.
 */

const FINANCE_AUX_KV_KEYS = [
    'vaults',
    'transfers',
    'budget_goals',
    'custom_categories',
    'anomaly_dismissed',
    'income_meta',
    'acc_view',
    'bank_favorites',
];

/** Substitui o valor de uma chave financeira auxiliar (mesmo UPSERT do caminho generico). */
function finance_auxiliary_kv_save(PDO $db, int $uid, string $key, $value): void {
    $stmt = $db->prepare('INSERT INTO kv_store (user_id, data_key, data_value) VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE data_value = VALUES(data_value)');
    $stmt->execute([$uid, $key, json_encode($value)]);
}
