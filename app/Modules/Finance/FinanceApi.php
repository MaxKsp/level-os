<?php
declare(strict_types=1);

/**
 * Orquestracao do endpoint POST api/finance.php.
 * Aceita o contrato legado de um set e o contrato em lote usado para manter
 * mutacoes que atravessam contas/lancamentos na mesma transacao.
 */

/**
 * Valida e persiste um ou mais sets financeiros.
 * Retorna ['status' => int, 'body' => array] para o adapter responder.
 */
function finance_api_save_set(PDO $db, int $uid, string $raw): array {
    $body = json_decode($raw, true);
    if (!is_array($body)) {
        return ['status' => 400, 'body' => ['error' => 'invalid finance payload']];
    }

    $requested = [];
    if (array_key_exists('sets', $body)) {
        if (!is_array($body['sets']) || $body['sets'] === [] || count($body['sets']) > count(FINANCE_SETS)) {
            return ['status' => 400, 'body' => ['error' => 'invalid finance payload']];
        }
        $requested = $body['sets'];
    } else {
        $key = (string)($body['key'] ?? '');
        if (!array_key_exists('value', $body)) {
            return ['status' => 400, 'body' => ['error' => 'invalid finance payload']];
        }
        $requested[$key] = $body['value'];
    }

    $validated = [];
    foreach ($requested as $key => $rows) {
        $set = FINANCE_SETS[(string)$key] ?? null;
        if ($set === null || !is_array($rows)) {
            return ['status' => 400, 'body' => ['error' => 'invalid finance payload']];
        }
        if (count($rows) > 5000) {
            return ['status' => 400, 'body' => ['error' => 'too many rows']];
        }
        $validated[] = ['set' => $set, 'rows' => $rows];
    }

    $ownTxn = !$db->inTransaction();
    try {
        if ($ownTxn) $db->beginTransaction();
        foreach ($validated as $entry) {
            finance_save_set($db, $uid, $entry['set'], $entry['rows'], true);
        }
        if ($ownTxn) $db->commit();
        return ['status' => 200, 'body' => ['ok' => true]];
    } catch (Throwable $e) {
        if ($ownTxn && $db->inTransaction()) $db->rollBack();
        error_log('finance.php: ' . $e->getMessage());
        return ['status' => 500, 'body' => ['error' => 'Não foi possível salvar os dados financeiros.']];
    }
}
