<?php
declare(strict_types=1);

return static function (): void {
    $root = dirname(__DIR__, 2);
    $endpoint = (string)file_get_contents($root . '/api/push-devices.php');
    $migration = (string)file_get_contents($root . '/migrations/2026-07-25-native-push.sql');
    $schema = (string)file_get_contents($root . '/schema.sql');

    $assert = static function (bool $condition, string $message): void {
        if (!$condition) throw new RuntimeException($message);
    };

    $assert(str_contains($endpoint, 'require_login()'), 'Push endpoint must require an authenticated user.');
    $assert(str_contains($endpoint, 'require_csrf()'), 'Push endpoint must require CSRF protection.');
    $assert(str_contains($endpoint, "require_rate_limit('push_devices'"), 'Push endpoint must be rate limited.');
    $assert(str_contains($endpoint, '$db->prepare('), 'Push endpoint must use prepared statements.');
    $assert(str_contains($endpoint, 'WHERE user_id = ? AND platform = ?'), 'Unregister must be isolated by user and platform.');
    $assert(str_contains($endpoint, "hash('sha256', \$token)"), 'Push token must have a stable non-plaintext lookup key.');
    $assert(str_contains($migration, 'UNIQUE INDEX uq_push_device_token (token_hash)'), 'Migration must prevent duplicate device tokens.');
    $assert(str_contains($migration, 'FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE'), 'Migration must clean devices on user deletion.');
    $assert(str_contains($schema, 'CREATE TABLE IF NOT EXISTS push_devices'), 'schema.sql must mirror the push migration.');
};
