<?php
declare(strict_types=1);

require_once __DIR__ . '/SupabaseIdentityService.php';

function supabase_auth_config_value(string $name, string $default = ''): string {
    if (defined($name)) {
        $value = constant($name);
        return is_string($value) ? trim($value) : $default;
    }
    $value = getenv($name);
    return is_string($value) && trim($value) !== '' ? trim($value) : $default;
}

function supabase_auth_enabled(): bool {
    $flag = strtolower(supabase_auth_config_value('SUPABASE_AUTH_ENABLED'));
    if (!in_array($flag, ['1', 'true', 'yes', 'on'], true)) return false;
    return SupabaseAuthClient::validProjectUrl(supabase_auth_config_value('SUPABASE_URL'))
        && supabase_auth_config_value('SUPABASE_PUBLISHABLE_KEY') !== '';
}

/** @return array{url:string,publishableKey:string}|null */
function supabase_public_config(): ?array {
    if (!supabase_auth_enabled()) return null;
    return [
        'url' => supabase_auth_config_value('SUPABASE_URL'),
        'publishableKey' => supabase_auth_config_value('SUPABASE_PUBLISHABLE_KEY'),
    ];
}

function supabase_auth_client(): SupabaseAuthClient {
    if (!supabase_auth_enabled()) throw new SupabaseAuthException('Supabase Auth is not enabled.');
    return new SupabaseAuthClient(
        supabase_auth_config_value('SUPABASE_URL'),
        supabase_auth_config_value('SUPABASE_PUBLISHABLE_KEY'),
    );
}

function supabase_bearer_token(): string {
    $header = trim((string)($_SERVER['HTTP_AUTHORIZATION'] ?? ''));
    if (preg_match('/\ABearer ([^\s]+)\z/D', $header, $matches) !== 1) {
        throw new SupabaseAuthException('Missing authentication token.');
    }
    return $matches[1];
}
