<?php
declare(strict_types=1);

const TOTP_BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function totp_generate_secret(int $bytes = 20): string {
    return totp_base32_encode(random_bytes($bytes));
}

function totp_base32_encode(string $data): string {
    $bits = '';
    foreach (str_split($data) as $char) {
        $bits .= str_pad(decbin(ord($char)), 8, '0', STR_PAD_LEFT);
    }
    $bits = str_pad($bits, (int)(ceil(strlen($bits) / 5) * 5), '0', STR_PAD_RIGHT);
    $output = '';
    foreach (str_split($bits, 5) as $chunk) {
        $output .= TOTP_BASE32_ALPHABET[bindec($chunk)];
    }
    return $output;
}

function totp_base32_decode(string $secret): string {
    $secret = strtoupper(preg_replace('/[^A-Z2-7]/', '', $secret));
    $bits = '';
    foreach (str_split($secret) as $char) {
        $pos = strpos(TOTP_BASE32_ALPHABET, $char);
        if ($pos === false) continue;
        $bits .= str_pad(decbin($pos), 5, '0', STR_PAD_LEFT);
    }
    $bytes = '';
    foreach (str_split($bits, 8) as $chunk) {
        if (strlen($chunk) < 8) continue;
        $bytes .= chr((int)bindec($chunk));
    }
    return $bytes;
}

function totp_code_at(string $secret, int $timeSlice): string {
    $key = totp_base32_decode($secret);
    $binTime = pack('N', 0) . pack('N', $timeSlice);
    $hash = hash_hmac('sha1', $binTime, $key, true);
    $offset = ord($hash[19]) & 0x0F;
    $truncated = ((ord($hash[$offset]) & 0x7F) << 24)
        | ((ord($hash[$offset + 1]) & 0xFF) << 16)
        | ((ord($hash[$offset + 2]) & 0xFF) << 8)
        | (ord($hash[$offset + 3]) & 0xFF);
    return str_pad((string)($truncated % 1000000), 6, '0', STR_PAD_LEFT);
}

function totp_verify_code(string $secret, string $code, int $window = 1): bool {
    $code = preg_replace('/\D/', '', $code);
    if (strlen($code) !== 6) return false;
    $slice = (int)floor(time() / 30);
    for ($i = -$window; $i <= $window; $i++) {
        if (hash_equals(totp_code_at($secret, $slice + $i), $code)) {
            return true;
        }
    }
    return false;
}

function totp_provisioning_uri(string $secret, string $username, string $issuer = 'Level OS'): string {
    return 'otpauth://totp/' . rawurlencode($issuer) . ':' . rawurlencode($username)
        . '?secret=' . $secret
        . '&issuer=' . rawurlencode($issuer)
        . '&algorithm=SHA1&digits=6&period=30';
}

function totp_generate_backup_codes(int $count = 8): array {
    $codes = [];
    for ($i = 0; $i < $count; $i++) {
        $codes[] = strtolower(bin2hex(random_bytes(4)));
    }
    return $codes;
}
