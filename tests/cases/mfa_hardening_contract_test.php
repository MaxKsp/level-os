<?php
declare(strict_types=1);
require_once __DIR__ . '/../bootstrap.php';

return static function (): void {
    $root = test_repo_root();
    $enroll = (string)file_get_contents($root . '/api/totp-enroll.php');
    $confirm = (string)file_get_contents($root . '/api/totp-confirm.php');
    $disable = (string)file_get_contents($root . '/api/totp-disable.php');
    $auth = (string)file_get_contents($root . '/auth.php');
    $register = (string)file_get_contents($root . '/register.php');
    $ui = (string)file_get_contents($root . '/frontend/src/modules/profile/TwoFactorSection.tsx');

    test_assert_true(str_contains($enroll, "AND totp_enabled = 0")
        && str_contains($enroll, 'http_response_code(409)'),
        'Novo QR Code nunca pode derrubar o fator ja ativo.');
    test_assert_true(str_contains($confirm, 'AND totp_secret = ?')
        && str_contains($confirm, 'session_version = session_version + 1')
        && str_contains($confirm, 'rowCount() !== 1'),
        'Ativacao deve usar CAS do segredo e revogar sessoes anteriores.');
    test_assert_true(str_contains($disable, "SELECT password_hash, totp_secret, totp_enabled")
        && str_contains($disable, 'password_verify($password,')
        && str_contains($disable, 'totp_verify_code($secret, $code)')
        && str_contains($disable, 'session_version = session_version + 1'),
        'Desativacao passwordless requer fator atual, e toda desativacao revoga sessoes.');
    test_assert_true(str_contains($ui, 'disableCode') && str_contains($ui, 'Código atual ou de recuperação'),
        'A interface precisa suportar contas sem senha local.');
    test_assert_true(str_contains($auth, 'AND user_id = ? AND used_at IS NULL')
        && str_contains($auth, '$claim->rowCount() !== 1'),
        'Codigo de recuperacao so pode ser consumido uma vez, atomicamente.');
    test_assert_true(str_contains($register, "'register-hour'")
        && str_contains($register, "'register-minute'")
        && str_contains($register, 'http_response_code(429)'),
        'Todo POST de cadastro deve sofrer rate limit, inclusive IDs novos.');
};
