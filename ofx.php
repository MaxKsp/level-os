<?php
declare(strict_types=1);

/**
 * Parser de extrato OFX. OFX e SGML: tags podem vir fechadas
 * (<TRNAMT>-50.00</TRNAMT>) ou nao (<TRNAMT>-50.00\n). O regex para no
 * primeiro < ou quebra de linha, cobrindo os dois casos.
 * Retorna lancamentos normalizados: valor<0 = saida (expense), >0 = entrada.
 */

function ofx_tag(string $blk, string $tag): ?string {
    if (preg_match('#<' . $tag . '>([^<\r\n]*)#i', $blk, $m)) {
        return trim($m[1]);
    }
    return null;
}

/** YYYYMMDD[HHMMSS][.xxx][tz] -> Y-m-d, ou null se invalido. */
function ofx_date(?string $raw): ?string {
    if (!$raw || !preg_match('#^(\d{4})(\d{2})(\d{2})#', $raw, $m)) return null;
    $y = (int)$m[1]; $mo = (int)$m[2]; $d = (int)$m[3];
    if (!checkdate($mo, $d, $y)) return null;
    return sprintf('%04d-%02d-%02d', $y, $mo, $d);
}

/** @return array{ok:bool, rows?:array, error?:string} */
function parse_ofx(string $content): array {
    if (stripos($content, '<OFX') === false && stripos($content, '<STMTTRN') === false) {
        return ['ok' => false, 'error' => 'arquivo não parece ser OFX'];
    }
    // sempre quebra pela abertura <STMTTRN> (cobre tags fechadas e nao;
    // ofx_tag le so a 1a ocorrencia, entao o </STMTTRN> no meio nao atrapalha)
    $chunks = preg_split('#<STMTTRN>#i', $content);
    array_shift($chunks); // header antes do 1o lancamento
    if (!$chunks) return ['ok' => false, 'error' => 'nenhum lançamento encontrado no arquivo'];

    $rows = [];
    foreach ($chunks as $blk) {
        $amtRaw = ofx_tag($blk, 'TRNAMT');
        if ($amtRaw === null) continue;
        $value = (float)str_replace(',', '.', preg_replace('#[^0-9,.\-]#', '', $amtRaw));
        $date = ofx_date(ofx_tag($blk, 'DTPOSTED'));
        $desc = ofx_tag($blk, 'NAME') ?? ofx_tag($blk, 'MEMO') ?? '';
        $desc = trim(preg_replace('#\s+#', ' ', $desc));
        $fitid = ofx_tag($blk, 'FITID');
        $rows[] = [
            'date' => $date,
            'value' => round(abs($value), 2),
            'kind' => $value < 0 ? 'expense' : 'income',
            'desc' => mb_substr($desc, 0, 120),
            'fitid' => $fitid,
        ];
    }
    if (!$rows) return ['ok' => false, 'error' => 'nenhum lançamento válido no arquivo'];
    return ['ok' => true, 'rows' => $rows];
}
