<?php
declare(strict_types=1);

/**
 * Criptografia autenticada para credenciais externas armazenadas no banco.
 *
 * O envelope contem somente versao, nonce e ciphertext autenticado. O contexto
 * (usuario, provedor e campo) entra como AAD e, portanto, nao pode ser trocado
 * sem invalidar a autenticacao. Nenhum fallback de chave ou algoritmo e aceito.
 */
final class TokenCryptoException extends RuntimeException {
}

final class TokenCrypto {
    private const ENVELOPE_PREFIX = 'v1:';
    private const AAD_PREFIX = "level-os-token\0v1\0";
    private const MAX_PLAINTEXT_BYTES = 32768;

    private string $key;

    /** Recebe uma chave base64 estrita que decodifica para exatamente 32 bytes. */
    public function __construct(string $base64Key) {
        self::requireSodium();

        $decoded = base64_decode($base64Key, true);
        if (
            $base64Key === ''
            || $decoded === false
            || base64_encode($decoded) !== $base64Key
            || strlen($decoded) !== SODIUM_CRYPTO_AEAD_XCHACHA20POLY1305_IETF_KEYBYTES
        ) {
            throw new TokenCryptoException('token encryption key is invalid');
        }

        $this->key = $decoded;
    }

    public static function fromEnvironment(string $name = 'LEVELOS_GOOGLE_TOKEN_KEY'): self {
        if (preg_match('/\A[A-Z][A-Z0-9_]{0,127}\z/D', $name) !== 1) {
            throw new TokenCryptoException('token encryption environment name is invalid');
        }

        $raw = getenv($name);
        // Compatibilidade com instalações antigas: nomes LEVELOS_* aceitam o
        // equivalente legado ORBY_* até a variável ser renomeada no servidor.
        if (($raw === false || $raw === '') && str_starts_with($name, 'LEVELOS_')) {
            $raw = getenv('ORBY_' . substr($name, 8));
        }
        if ($raw === false || $raw === '') {
            throw new TokenCryptoException('token encryption key is not configured');
        }

        return new self($raw);
    }

    public function encrypt(string $plaintext, int $userId, string $provider, string $field): string {
        $length = strlen($plaintext);
        if ($length < 1 || $length > self::MAX_PLAINTEXT_BYTES) {
            throw new TokenCryptoException('token plaintext is invalid');
        }

        $nonce = random_bytes(SODIUM_CRYPTO_AEAD_XCHACHA20POLY1305_IETF_NPUBBYTES);
        try {
            $ciphertext = sodium_crypto_aead_xchacha20poly1305_ietf_encrypt(
                $plaintext,
                self::aad($userId, $provider, $field),
                $nonce,
                $this->key
            );
        } catch (SodiumException) {
            throw new TokenCryptoException('token encryption failed');
        }

        return self::ENVELOPE_PREFIX . base64_encode($nonce . $ciphertext);
    }

    public function decrypt(string $envelope, int $userId, string $provider, string $field): string {
        if (!str_starts_with($envelope, self::ENVELOPE_PREFIX)) {
            throw new TokenCryptoException('token envelope is invalid');
        }

        $encoded = substr($envelope, strlen(self::ENVELOPE_PREFIX));
        $payload = base64_decode($encoded, true);
        $minimumLength = SODIUM_CRYPTO_AEAD_XCHACHA20POLY1305_IETF_NPUBBYTES
            + SODIUM_CRYPTO_AEAD_XCHACHA20POLY1305_IETF_ABYTES;
        if (
            $encoded === ''
            || $payload === false
            || base64_encode($payload) !== $encoded
            || strlen($payload) < $minimumLength
            || strlen($payload) > self::MAX_PLAINTEXT_BYTES + $minimumLength
        ) {
            throw new TokenCryptoException('token envelope is invalid');
        }

        $nonceLength = SODIUM_CRYPTO_AEAD_XCHACHA20POLY1305_IETF_NPUBBYTES;
        $nonce = substr($payload, 0, $nonceLength);
        $ciphertext = substr($payload, $nonceLength);
        try {
            $plaintext = sodium_crypto_aead_xchacha20poly1305_ietf_decrypt(
                $ciphertext,
                self::aad($userId, $provider, $field),
                $nonce,
                $this->key
            );
        } catch (SodiumException) {
            throw new TokenCryptoException('token envelope authentication failed');
        }

        if ($plaintext === false || $plaintext === '') {
            throw new TokenCryptoException('token envelope authentication failed');
        }
        return $plaintext;
    }

    public function __destruct() {
        if (function_exists('sodium_memzero') && isset($this->key)) {
            sodium_memzero($this->key);
        }
    }

    private static function requireSodium(): void {
        if (
            !extension_loaded('sodium')
            || !function_exists('sodium_crypto_aead_xchacha20poly1305_ietf_encrypt')
            || !function_exists('sodium_crypto_aead_xchacha20poly1305_ietf_decrypt')
        ) {
            throw new TokenCryptoException('token encryption is unavailable');
        }
    }

    private static function aad(int $userId, string $provider, string $field): string {
        if (
            $userId < 1
            || preg_match('/\A[a-z][a-z0-9_-]{0,63}\z/D', $provider) !== 1
            || preg_match('/\A[a-z][a-z0-9_-]{0,63}\z/D', $field) !== 1
        ) {
            throw new TokenCryptoException('token encryption context is invalid');
        }

        return self::AAD_PREFIX
            . pack('J', $userId)
            . pack('n', strlen($provider)) . $provider
            . pack('n', strlen($field)) . $field;
    }
}
