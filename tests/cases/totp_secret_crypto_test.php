<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';
require_once dirname(__DIR__, 2) . '/app/Modules/Auth/TotpSecretCrypto.php';

return static function (): void {
    putenv('LEVELOS_TOTP_KEY=' . base64_encode(random_bytes(32)));
    $secret = 'JBSWY3DPEHPK3PXP';
    $encrypted = totp_secret_encrypt($secret, 42);

    test_assert_true(str_starts_with($encrypted, 'v1:'), 'TOTP secret must use the authenticated envelope.');
    test_assert_true(!str_contains($encrypted, $secret), 'TOTP plaintext must not appear in the envelope.');
    test_assert_same($secret, totp_secret_decrypt($encrypted, 42), 'TOTP envelope must decrypt in its original context.');
    test_assert_same($secret, totp_secret_decrypt($secret, 42), 'Legacy Base32 secrets must remain readable for migration.');

    $wrongContextRejected = false;
    try {
        totp_secret_decrypt($encrypted, 43);
    } catch (TokenCryptoException) {
        $wrongContextRejected = true;
    }
    test_assert_true($wrongContextRejected, 'A TOTP envelope must be bound to its user.');
};
