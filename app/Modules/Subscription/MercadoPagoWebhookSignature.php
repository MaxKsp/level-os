<?php
declare(strict_types=1);

/**
 * Valida o manifesto documentado pelo Mercado Pago:
 * id:{data.id};request-id:{x-request-id};ts:{ts};
 */
function mercadopago_verify_webhook_signature(
    string $signatureHeader,
    string $requestId,
    string $dataId,
    string $secret,
    ?int $now = null,
    int $toleranceSeconds = 600
): bool {
    if ($secret === '' || strlen($secret) > 512 || preg_match('/[\r\n]/', $secret)) return false;
    if (!preg_match('/\A[a-zA-Z0-9._:-]{1,128}\z/D', $requestId)) return false;
    if (!preg_match('/\A[a-zA-Z0-9._:-]{1,128}\z/D', $dataId)) return false;

    $parts = [];
    foreach (explode(',', $signatureHeader) as $part) {
        $pair = preg_split('/\s*[:=]\s*/', trim($part), 2);
        if (is_array($pair) && count($pair) === 2) {
            $parts[strtolower($pair[0])] = trim($pair[1]);
        }
    }
    $timestampRaw = $parts['ts'] ?? '';
    $sentHash = strtolower($parts['v1'] ?? '');
    if (!preg_match('/\A\d{10,13}\z/D', $timestampRaw) || !preg_match('/\A[a-f0-9]{64}\z/D', $sentHash)) {
        return false;
    }
    $timestamp = (int)$timestampRaw;
    if ($timestamp > 9999999999) $timestamp = intdiv($timestamp, 1000);
    if ($toleranceSeconds > 0 && abs(($now ?? time()) - $timestamp) > $toleranceSeconds) {
        return false;
    }

    $manifest = 'id:' . strtolower($dataId) . ';request-id:' . $requestId . ';ts:' . $timestampRaw . ';';
    $expected = hash_hmac('sha256', $manifest, $secret);
    return hash_equals($expected, $sentHash);
}

/** PHP normaliza pontos de query params; por isso lemos QUERY_STRING também. */
function mercadopago_webhook_data_id(array $query, string $queryString, ?array $payload = null): string {
    foreach (explode('&', $queryString) as $part) {
        if ($part === '') continue;
        [$key, $value] = array_pad(explode('=', $part, 2), 2, '');
        $decodedKey = rawurldecode($key);
        if ($decodedKey === 'data.id' || $decodedKey === 'data_id') {
            return rawurldecode($value);
        }
    }
    foreach (['data.id', 'data_id'] as $key) {
        if (isset($query[$key]) && is_scalar($query[$key])) return (string)$query[$key];
    }
    if (is_array($payload) && isset($payload['data']) && is_array($payload['data']) && is_scalar($payload['data']['id'] ?? null)) {
        return (string)$payload['data']['id'];
    }
    return '';
}
