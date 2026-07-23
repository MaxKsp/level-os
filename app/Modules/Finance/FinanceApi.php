<?php
declare(strict_types=1);

/**
 * Orquestracao do endpoint POST api/finance.php (Fase 6, recorte 1).
 * Extraido de api/finance.php sem mudar validacao, status code ou shape de
 * resposta. api/finance.php continua fachada publica: bootstrap,
 * autenticacao, CSRF, leitura do request e resposta HTTP ficam la.
 */

/**
 * Valida e persiste o payload de POST api/finance.php.
 * Retorna ['status' => int, 'body' => array] para o adapter responder.
 */
function finance_api_save_set(PDO $db, int $uid, string $raw): array {
    $body = json_decode($raw, true);
    $key = is_array($body) ? (string)($body['key'] ?? '') : '';
    $set = FINANCE_SETS[$key] ?? null;
    if ($set === null || !is_array($body) || !array_key_exists('value', $body) || !is_array($body['value'])) {
        return ['status' => 400, 'body' => ['error' => 'invalid finance payload']];
    }
    if (count($body['value']) > 5000) {
        return ['status' => 400, 'body' => ['error' => 'too many rows']];
    }

    try {
        finance_save_set($db, $uid, $set, $body['value'], true);
        return ['status' => 200, 'body' => ['ok' => true]];
    } catch (Throwable $e) {
        error_log('finance.php: ' . $e->getMessage());
        return ['status' => 500, 'body' => ['error' => 'Não foi possível salvar os dados financeiros.']];
    }
}
