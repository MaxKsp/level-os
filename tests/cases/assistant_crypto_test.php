<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';
require_once dirname(__DIR__, 2) . '/app/Modules/Assistant/AssistantCrypto.php';

return static function (): void {
    $names = [
        'LEVELOS_ASSISTANT_DATA_KEY',
        'ORBY_ASSISTANT_DATA_KEY',
        'LEVELOS_GOOGLE_TOKEN_KEY',
        'ORBY_GOOGLE_TOKEN_KEY',
    ];
    $previous = [];
    foreach ($names as $name) $previous[$name] = getenv($name);

    try {
        putenv('LEVELOS_ASSISTANT_DATA_KEY');
        putenv('ORBY_ASSISTANT_DATA_KEY');
        putenv('ORBY_GOOGLE_TOKEN_KEY');
        $googleKey = base64_encode(random_bytes(32));
        putenv('LEVELOS_GOOGLE_TOKEN_KEY=' . $googleKey);

        $fallbackWriter = assistant_data_crypto_from_environment();
        $fallbackReader = assistant_data_crypto_from_environment();
        $cipher = $fallbackWriter->encrypt('history', 7, 'assistant', 'history-user');
        test_assert_same(
            'history',
            $fallbackReader->decrypt($cipher, 7, 'assistant', 'history-user'),
            'The derived assistant key must be deterministic for the configured Google key.',
        );

        putenv('LEVELOS_ASSISTANT_DATA_KEY=' . base64_encode(random_bytes(32)));
        $dedicated = assistant_data_crypto_from_environment();
        try {
            $dedicated->decrypt($cipher, 7, 'assistant', 'history-user');
            throw new RuntimeException('A dedicated assistant key must take priority over the fallback.');
        } catch (TokenCryptoException) {
            // expected: a different dedicated key cannot decrypt fallback data
        }
    } finally {
        foreach ($previous as $name => $value) {
            putenv($value === false ? $name : $name . '=' . $value);
        }
    }
};
