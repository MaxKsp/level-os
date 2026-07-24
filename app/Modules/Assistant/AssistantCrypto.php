<?php
declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/Core/TokenCrypto.php';

/**
 * Usa a chave dedicada quando disponível. Em instalações que já configuraram
 * somente o Google Calendar, deriva uma chave distinta com HKDF e contexto
 * próprio, evitando indisponibilidade sem reutilizar a chave bruta.
 */
function assistant_data_crypto_from_environment(): TokenCrypto {
    $dedicated = assistant_environment_secret('LEVELOS_ASSISTANT_DATA_KEY', 'ORBY_ASSISTANT_DATA_KEY');
    if ($dedicated !== null) return new TokenCrypto($dedicated);

    $google = assistant_environment_secret('LEVELOS_GOOGLE_TOKEN_KEY', 'ORBY_GOOGLE_TOKEN_KEY');
    if ($google === null) throw new TokenCryptoException('assistant encryption key is not configured');

    $decoded = base64_decode($google, true);
    if ($decoded === false || base64_encode($decoded) !== $google || strlen($decoded) !== 32) {
        throw new TokenCryptoException('assistant encryption source key is invalid');
    }
    $derived = hash_hkdf('sha256', $decoded, 32, 'level-os-assistant-data-key-v1');
    if (!is_string($derived) || strlen($derived) !== 32) {
        throw new TokenCryptoException('assistant encryption key derivation failed');
    }
    if (function_exists('sodium_memzero')) sodium_memzero($decoded);
    return new TokenCrypto(base64_encode($derived));
}

function assistant_environment_secret(string $primary, string $legacy): ?string {
    foreach ([$primary, $legacy] as $name) {
        $value = getenv($name);
        if (is_string($value) && trim($value) !== '') return trim($value);
    }
    return null;
}
