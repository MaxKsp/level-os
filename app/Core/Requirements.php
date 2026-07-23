<?php
declare(strict_types=1);

/**
 * Checagem de requisitos do servidor para recursos que dependem de extensões.
 *
 * Hoje o único requisito opcional é a extensão sodium (libsodium), usada por:
 *  - backup cifrado (BackupCrypto / api/export.php / api/import.php)
 *  - tokens do Google Calendar (TokenCrypto)
 *  - dados cifrados do Agente de IA (AssistantRepository)
 *
 * A hospedagem compartilhada pode vir sem a extensão. Falhar cedo, com
 * mensagem acionável, evita erro genérico 500 em produção.
 */

function level_os_sodium_available(): bool {
    return extension_loaded('sodium')
        && function_exists('sodium_crypto_aead_xchacha20poly1305_ietf_encrypt')
        && function_exists('sodium_crypto_secretstream_xchacha20poly1305_init_push');
}

/**
 * Encerra a requisição com JSON 503 e mensagem clara quando sodium falta.
 * Chamar no início de endpoints que dependem de criptografia.
 */
function level_os_require_sodium_endpoint(string $feature): void {
    if (level_os_sodium_available()) {
        return;
    }
    error_log(sprintf(
        'level-os requirements: extensão sodium ausente (recurso: %s). Habilite extension=sodium no php.ini do servidor.',
        $feature
    ));
    http_response_code(503);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'error' => 'server_requirement_missing',
        'message' => 'Recurso indisponível: o servidor está sem a extensão de criptografia (sodium). Contate o administrador.',
    ], JSON_UNESCAPED_UNICODE);
    exit;
}
