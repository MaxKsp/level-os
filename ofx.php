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

/**
 * TRNAMT -> float, ou null se nao for numero. O ultimo separador e o decimal; os demais sao
 * milhar (1.234,56 e 1,234.56 = 1234.56). Mesma regra de parseOfxAmount() em frontend/src/modules/finance/ofx.ts.
 */
function ofx_amount(string $raw): ?float {
    $s = preg_replace('#[^0-9,.\-]#', '', $raw);
    // Sinal fora do inicio (1234.56-) ou sem digito: descarta em vez de inverter o sinal ou multiplicar o valor.
    if (!preg_match('#^-?[0-9.,]*[0-9][0-9.,]*$#', $s)) return null;
    if (preg_match('#^(.*)([.,])(\d*)$#', $s, $m) && substr_count($s, $m[2]) === 1) {
        return (float)(preg_replace('#[.,]#', '', $m[1]) . '.' . $m[3]);
    }
    return (float)preg_replace('#[.,]#', '', $s);
}

/** YYYYMMDD[HHMMSS][.xxx][tz] -> Y-m-d, ou null se invalido. */
function ofx_date(?string $raw): ?string {
    if (!$raw || !preg_match('#^(\d{4})(\d{2})(\d{2})#', $raw, $m)) return null;
    $y = (int)$m[1]; $mo = (int)$m[2]; $d = (int)$m[3];
    if (!checkdate($mo, $d, $y)) return null;
    return sprintf('%04d-%02d-%02d', $y, $mo, $d);
}

/** @return array{ok:bool, rows?:array, skipped?:int, error?:string} */
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
    $skipped = 0;
    foreach ($chunks as $blk) {
        $value = ofx_amount(ofx_tag($blk, 'TRNAMT') ?? '');
        $date = ofx_date(ofx_tag($blk, 'DTPOSTED'));
        // Sem data valida ou com valor zero o lancamento nao pode ser gravado; conta para avisar o usuario.
        if ($value === null || $date === null || round($value, 2) === 0.0) { $skipped++; continue; }
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
    return ['ok' => true, 'rows' => $rows, 'skipped' => $skipped];
}
