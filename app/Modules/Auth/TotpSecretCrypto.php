<?php
declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/Core/TokenCrypto.php';

const TOTP_SECRET_PROVIDER = 'totp';
const TOTP_SECRET_FIELD = 'secret';

function totp_secret_crypto(): TokenCrypto
{
    static $crypto = null;
    if ($crypto instanceof TokenCrypto) return $crypto;

    $dedicated = getenv('LEVELOS_TOTP_KEY');
    if (is_string($dedicated) && $dedicated !== '') {
        return $crypto = new TokenCrypto($dedicated);
    }

    $root = getenv('LEVELOS_GOOGLE_TOKEN_KEY');
    if ($root === false || $root === '') {
        $root = getenv('ORBY_GOOGLE_TOKEN_KEY');
    }
    $decoded = is_string($root) ? base64_decode($root, true) : false;
    if ($decoded === false || strlen($decoded) !== 32) {
        throw new TokenCryptoException('totp encryption key is not configured');
    }

    $derived = hash_hkdf('sha256', $decoded, 32, 'level-os-totp-secret-key-v1');
    if (!is_string($derived) || strlen($derived) !== 32) {
        throw new TokenCryptoException('totp encryption key derivation failed');
    }
    return $crypto = new TokenCrypto(base64_encode($derived));
}

function totp_secret_encrypt(string $secret, int $userId): string
{
    if (!totp_secret_is_legacy_plaintext($secret)) {
        throw new TokenCryptoException('totp secret is invalid');
    }
    return totp_secret_crypto()->encrypt($secret, $userId, TOTP_SECRET_PROVIDER, TOTP_SECRET_FIELD);
}

/** Garante capacidade do envelope em instalações que ainda tinham VARCHAR(64). */
function totp_secret_ensure_storage(PDO $db): void
{
    static $ready = false;
    if ($ready) return;

    $stmt = $db->query("SELECT CHARACTER_MAXIMUM_LENGTH
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'users'
          AND COLUMN_NAME = 'totp_secret'
        LIMIT 1");
    $length = (int)$stmt->fetchColumn();
    if ($length < 255) {
        $db->exec('ALTER TABLE users MODIFY COLUMN totp_secret VARCHAR(255) NULL');
    }
    $ready = true;
}

function totp_secret_decrypt(string $stored, int $userId): string
{
    if (str_starts_with($stored, 'v1:')) {
        return totp_secret_crypto()->decrypt($stored, $userId, TOTP_SECRET_PROVIDER, TOTP_SECRET_FIELD);
    }
    if (!totp_secret_is_legacy_plaintext($stored)) {
        throw new TokenCryptoException('totp secret is invalid');
    }
    return $stored;
}

function totp_secret_is_legacy_plaintext(string $value): bool
{
    return preg_match('/\A[A-Z2-7]{16,128}\z/D', $value) === 1;
}

/** Migra apenas depois de o código ter sido validado com sucesso. */
function totp_secret_migrate_after_verification(PDO $db, int $userId, string $stored, string $plaintext): void
{
    if (str_starts_with($stored, 'v1:')) return;
    totp_secret_ensure_storage($db);
    $encrypted = totp_secret_encrypt($plaintext, $userId);
    $stmt = $db->prepare('UPDATE users SET totp_secret = ? WHERE id = ? AND totp_secret = ?');
    $stmt->execute([$encrypted, $userId, $stored]);
}
