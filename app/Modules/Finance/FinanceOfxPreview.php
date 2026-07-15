<?php
declare(strict_types=1);

/**
 * Orquestracao do preview de POST api/import-ofx.php (Fase 8, recorte 1).
 * Extraido de api/import-ofx.php sem mudar parsing, marcacao de duplicidade
 * ou shape de resposta. api/import-ofx.php continua fachada publica:
 * bootstrap, autenticacao, CSRF, rate limit, gate de plano, validacao de
 * upload (presenca/erro/tamanho) e resposta HTTP ficam la.
 *
 * Nunca escreve no banco: so le finance_load_set() pra marcar duplicidade
 * provavel. A gravacao final continua no cliente, via storeSet().
 */

/**
 * Faz o parsing do conteudo OFX e marca duplicidade provavel por
 * (date, value) contra despesas e rendas ja persistidas.
 * Retorna ['status' => int, 'body' => array] para o adapter responder.
 */
function finance_ofx_preview(PDO $db, int $uid, string $content): array {
    $parsed = parse_ofx($content);
    if (!$parsed['ok']) {
        return ['status' => 400, 'body' => ['error' => $parsed['error']]];
    }

    $existing = [];
    foreach (['expense', 'income'] as $set) {
        foreach (finance_load_set($db, $uid, $set) as $r) {
            $existing[($r['date'] ?? '') . '|' . number_format((float)($r['value'] ?? 0), 2, '.', '')] = true;
        }
    }

    $rows = [];
    foreach ($parsed['rows'] as $r) {
        $key = ($r['date'] ?? '') . '|' . number_format($r['value'], 2, '.', '');
        $r['dup'] = isset($existing[$key]);
        $rows[] = $r;
    }

    return ['status' => 200, 'body' => ['ok' => true, 'rows' => $rows]];
}
