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

/** Mesmo limite do app (toggleFavoriteBank/loadFinanceBootstrap). */
const FINANCE_BANK_FAVORITES_MAX = 5;
/** Maior nome do catalogo BancosBrasileiros tem 147 caracteres; folga pequena. */
const FINANCE_BANK_FAVORITE_MAX_CHARS = 160;

/**
 * Valida bank_favorites antes de gravar: lista de ate cinco nomes de banco,
 * sem controle, sem vazio, com trim e sem duplicata (ignora caixa).
 * Retorna a lista a persistir ou null quando o formato e invalido.
 */
function finance_bank_favorites_normalize($value): ?array {
    if (!is_array($value) || !array_is_list($value) || count($value) > FINANCE_BANK_FAVORITES_MAX) return null;
    $out = [];
    $seen = [];
    foreach ($value as $item) {
        if (!is_string($item) || !mb_check_encoding($item, 'UTF-8')) return null;
        $name = preg_replace('/^\s+|\s+$/u', '', $item);
        if (!is_string($name) || $name === '' || mb_strlen($name, 'UTF-8') > FINANCE_BANK_FAVORITE_MAX_CHARS) return null;
        if (preg_match('/\p{Cc}/u', $name) === 1) return null;
        $folded = mb_strtolower($name, 'UTF-8');
        if (isset($seen[$folded])) continue;
        $seen[$folded] = true;
        $out[] = $name;
    }
    return $out;
}

/** Substitui o valor de uma chave financeira auxiliar (mesmo UPSERT do caminho generico). */
function finance_auxiliary_kv_save(PDO $db, int $uid, string $key, $value): void {
    $stmt = $db->prepare('INSERT INTO kv_store (user_id, data_key, data_value) VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE data_value = VALUES(data_value)');
    $stmt->execute([$uid, $key, json_encode($value)]);
}
