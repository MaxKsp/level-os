<?php
declare(strict_types=1);

const LEVEL_OS_MOBILE_SESSION_PREFIX = 'losm_';
const LEVEL_OS_MOBILE_SESSION_TTL_SECONDS = 2592000; // 30 dias

function level_os_mobile_session_request_token(): string
{
    $token = trim((string)($_SERVER['HTTP_X_LEVEL_MOBILE_SESSION'] ?? ''));
    return preg_match('/\Alosm_[A-Za-z0-9_-]{43}\z/D', $token) === 1 ? $token : '';
}

function level_os_mobile_session_hash(string $token): string
{
    return hash('sha256', $token);
}

function level_os_mobile_session_ensure_schema(PDO $db): void
{
    // Bootstrap idempotente para instalações self-hosted sem migration runner.
    // A migration e o schema.sql continuam sendo a fonte de verdade.
    $db->exec(
        'CREATE TABLE IF NOT EXISTS mobile_sessions (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            user_id INT UNSIGNED NOT NULL,
            session_version INT UNSIGNED NOT NULL,
            token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
            expires_at DATETIME NOT NULL,
            last_used_at DATETIME NOT NULL,
            revoked_at DATETIME NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE INDEX uq_mobile_session_token (token_hash),
            INDEX idx_mobile_session_user_active (user_id, revoked_at, expires_at),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
    );
}

/**
 * @return array{user_id:int,session_version:int}|null
 */
function level_os_mobile_session_resolve(PDO $db, string $token): ?array
{
    if ($token === '') {
        return null;
    }

    $stmt = $db->prepare(
        'SELECT ms.id, ms.user_id, ms.session_version
         FROM mobile_sessions ms
         INNER JOIN users u ON u.id = ms.user_id
         WHERE ms.token_hash = ?
           AND ms.revoked_at IS NULL
           AND ms.expires_at > UTC_TIMESTAMP()
           AND u.session_version = ms.session_version
         LIMIT 1'
    );
    $stmt->execute([level_os_mobile_session_hash($token)]);
    $row = $stmt->fetch();
    if (!is_array($row)) {
        return null;
    }

    $touch = $db->prepare(
        'UPDATE mobile_sessions
         SET last_used_at = UTC_TIMESTAMP()
         WHERE id = ? AND last_used_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 10 MINUTE)'
    );
    $touch->execute([(int)$row['id']]);

    return [
        'user_id' => (int)$row['user_id'],
        'session_version' => (int)$row['session_version'],
    ];
}

/**
 * @return array{user_id:int,session_version:int}|null
 */
function level_os_mobile_session_current(PDO $db): ?array
{
    static $resolved = false;
    static $current = null;

    if ($resolved) {
        return $current;
    }
    $resolved = true;

    $token = level_os_mobile_session_request_token();
    if ($token === '') {
        return null;
    }

    try {
        $current = level_os_mobile_session_resolve($db, $token);
    } catch (Throwable $e) {
        error_log('Mobile session validation failed (' . get_class($e) . ').');
        $current = null;
    }

    return $current;
}

function level_os_mobile_session_issue(PDO $db, int $userId, int $sessionVersion): string
{
    if ($userId < 1 || $sessionVersion < 1) {
        throw new InvalidArgumentException('Invalid mobile session identity.');
    }

    level_os_mobile_session_ensure_schema($db);

    $token = LEVEL_OS_MOBILE_SESSION_PREFIX
        . rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '=');

    $stmt = $db->prepare(
        'INSERT INTO mobile_sessions
            (user_id, session_version, token_hash, expires_at, last_used_at)
         VALUES
            (?, ?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? SECOND), UTC_TIMESTAMP())'
    );
    $stmt->execute([
        $userId,
        $sessionVersion,
        level_os_mobile_session_hash($token),
        LEVEL_OS_MOBILE_SESSION_TTL_SECONDS,
    ]);

    $cleanup = $db->prepare(
        'DELETE FROM mobile_sessions
         WHERE user_id = ?
           AND (revoked_at IS NOT NULL OR expires_at <= UTC_TIMESTAMP())'
    );
    $cleanup->execute([$userId]);

    return $token;
}

function level_os_mobile_session_revoke(PDO $db, string $token, int $userId): void
{
    if ($token === '' || $userId < 1) {
        return;
    }

    $stmt = $db->prepare(
        'UPDATE mobile_sessions
         SET revoked_at = UTC_TIMESTAMP()
         WHERE token_hash = ? AND user_id = ? AND revoked_at IS NULL'
    );
    $stmt->execute([level_os_mobile_session_hash($token), $userId]);
}
