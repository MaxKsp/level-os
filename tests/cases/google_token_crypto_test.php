<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';
require_once dirname(__DIR__, 2) . '/app/Core/TokenCrypto.php';

return static function (): void {
    $key = base64_encode(random_bytes(SODIUM_CRYPTO_AEAD_XCHACHA20POLY1305_IETF_KEYBYTES));
    $crypto = new TokenCrypto($key);
    $plaintext = 'refresh-token-sensitive-value';

    $expectFailure = static function (callable $operation, string $label) use ($plaintext): void {
        try {
            $operation();
        } catch (TokenCryptoException $e) {
            test_assert_true(
                !str_contains($e->getMessage(), $plaintext),
                $label . ' must not expose plaintext in the exception.'
            );
            return;
        }
        throw new RuntimeException($label . ' must fail closed.');
    };

    $first = $crypto->encrypt($plaintext, 42, 'google', 'refresh_token');
    test_assert_same(
        $plaintext,
        $crypto->decrypt($first, 42, 'google', 'refresh_token'),
        'A valid token envelope must round-trip.'
    );
    test_assert_true(str_starts_with($first, 'v1:'), 'The token envelope must declare its version.');
    test_assert_true(!str_contains($first, $plaintext), 'The token envelope must not contain plaintext.');

    $second = $crypto->encrypt($plaintext, 42, 'google', 'refresh_token');
    test_assert_true($first !== $second, 'Encrypting the same token twice must use distinct nonces.');

    $encoded = substr($first, 3);
    $tamperedPayload = base64_decode($encoded, true);
    test_assert_true(is_string($tamperedPayload), 'The generated envelope payload must be valid base64.');
    $last = strlen($tamperedPayload) - 1;
    $tamperedPayload[$last] = chr(ord($tamperedPayload[$last]) ^ 1);
    $tampered = 'v1:' . base64_encode($tamperedPayload);
    $expectFailure(
        static fn() => $crypto->decrypt($tampered, 42, 'google', 'refresh_token'),
        'A tampered ciphertext'
    );

    $expectFailure(
        static fn() => $crypto->decrypt($first, 43, 'google', 'refresh_token'),
        'A different user id'
    );
    $expectFailure(
        static fn() => $crypto->decrypt($first, 42, 'other_provider', 'refresh_token'),
        'A different provider'
    );
    $expectFailure(
        static fn() => $crypto->decrypt($first, 42, 'google', 'access_token'),
        'A different token field'
    );

    $otherCrypto = new TokenCrypto(
        base64_encode(random_bytes(SODIUM_CRYPTO_AEAD_XCHACHA20POLY1305_IETF_KEYBYTES))
    );
    $expectFailure(
        static fn() => $otherCrypto->decrypt($first, 42, 'google', 'refresh_token'),
        'A different encryption key'
    );

    foreach (['', 'v2:' . $encoded, 'v1:not-base64!', 'v1:' . base64_encode('short')] as $invalidEnvelope) {
        $expectFailure(
            static fn() => $crypto->decrypt($invalidEnvelope, 42, 'google', 'refresh_token'),
            'An invalid envelope'
        );
    }

    foreach ([
        '',
        'not-base64!',
        base64_encode(random_bytes(SODIUM_CRYPTO_AEAD_XCHACHA20POLY1305_IETF_KEYBYTES - 1)),
        base64_encode(random_bytes(SODIUM_CRYPTO_AEAD_XCHACHA20POLY1305_IETF_KEYBYTES + 1)),
    ] as $invalidKey) {
        $expectFailure(static fn() => new TokenCrypto($invalidKey), 'An invalid encryption key');
    }

    $expectFailure(
        static fn() => $crypto->encrypt($plaintext, 0, 'google', 'refresh_token'),
        'An invalid encryption context'
    );

    $environmentName = 'ORBY_GOOGLE_TOKEN_KEY';
    $previous = getenv($environmentName);
    try {
        putenv($environmentName . '=' . $key);
        $fromEnvironment = TokenCrypto::fromEnvironment($environmentName);
        $environmentEnvelope = $fromEnvironment->encrypt($plaintext, 42, 'google', 'access_token');
        test_assert_same(
            $plaintext,
            $fromEnvironment->decrypt($environmentEnvelope, 42, 'google', 'access_token'),
            'The environment factory must use the configured base64 key.'
        );

        putenv($environmentName);
        $expectFailure(
            static fn() => TokenCrypto::fromEnvironment($environmentName),
            'A missing environment key'
        );
    } finally {
        if ($previous === false) {
            putenv($environmentName);
        } else {
            putenv($environmentName . '=' . $previous);
        }
    }

    $source = (string)file_get_contents(dirname(__DIR__, 2) . '/app/Core/TokenCrypto.php');
    test_assert_true(!str_contains($source, 'error_log'), 'TokenCrypto must never log token material.');
    test_assert_true(!str_contains($source, 'GOOGLE_CLIENT_SECRET'), 'TokenCrypto must not reuse the OAuth client secret.');
};
