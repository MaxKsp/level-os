<?php
declare(strict_types=1);

require_once __DIR__ . '/ResendMailer.php';

function email_config_value(string $name, string $default = ''): string {
    if (defined($name)) {
        $value = constant($name);
        return is_string($value) ? trim($value) : $default;
    }
    $value = getenv($name);
    return is_string($value) && trim($value) !== '' ? trim($value) : $default;
}

function email_app_host_is_valid(string $host): bool {
    if ($host === '' || strlen($host) > 253 || str_contains($host, '[') || str_contains($host, ']')) return false;
    if (filter_var($host, FILTER_VALIDATE_IP) !== false) return true;
    if (preg_match('/\A[0-9.]+\z/D', $host) === 1) return false;

    $host = strtolower($host);
    if (str_ends_with($host, '.')) {
        $host = substr($host, 0, -1);
    }
    if ($host === '' || strlen($host) > 253) return false;
    foreach (explode('.', $host) as $label) {
        if ($label === '' || strlen($label) > 63) return false;
        if (preg_match('/\A[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\z/D', $label) !== 1) return false;
    }
    return true;
}

/**
 * Normaliza uma origem publica HTTPS. A autoridade usa uma gramatica fechada:
 * hostname/IPv4 ou IPv6 entre um unico par de colchetes, com porta opcional.
 */
function email_normalize_app_base_url(string $value): ?string {
    $url = rtrim(trim($value), '/');
    if ($url === '' || preg_match('/[\x00-\x20\x7f]/', $url) === 1) return null;
    if (preg_match('/\Ahttps:\/\/(?<authority>[^\/?#]+)\z/iD', $url, $urlParts) !== 1) return null;

    $authority = (string)$urlParts['authority'];
    $port = null;
    if (str_starts_with($authority, '[')) {
        if (preg_match(
            '/\A\[(?<host>[0-9A-Fa-f:.]+)\](?::(?<port>[0-9]{1,5}))?\z/D',
            $authority,
            $authorityParts,
            PREG_UNMATCHED_AS_NULL,
        ) !== 1) return null;
        $host = (string)$authorityParts['host'];
        if (filter_var($host, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6) === false) return null;
        $normalizedAuthority = '[' . strtolower($host) . ']';
        $port = $authorityParts['port'];
    } else {
        if (preg_match(
            '/\A(?<host>[A-Za-z0-9.-]+)(?::(?<port>[0-9]{1,5}))?\z/D',
            $authority,
            $authorityParts,
            PREG_UNMATCHED_AS_NULL,
        ) !== 1) return null;
        $host = (string)$authorityParts['host'];
        if (!email_app_host_is_valid($host)) return null;
        $normalizedAuthority = strtolower(rtrim($host, '.'));
        $port = $authorityParts['port'];
    }

    if ($port !== null) {
        $portNumber = (int)$port;
        if ($portNumber < 1 || $portNumber > 65535) return null;
        $normalizedAuthority .= ':' . $portNumber;
    }

    return 'https://' . $normalizedAuthority;
}

function email_app_base_url(): ?string {
    return email_normalize_app_base_url(email_config_value('APP_URL'));
}

require_once __DIR__ . '/EmailTemplates.php';

function email_is_configured(): bool {
    return email_config_value('RESEND_API_KEY') !== ''
        && email_config_value('RESEND_FROM_EMAIL') !== '';
}

function email_idempotency_key(string $event, string $reference): string {
    $event = strtolower(trim($event));
    if (preg_match('/\A[a-z0-9][a-z0-9-]{2,39}\z/D', $event) !== 1 || $reference === '') {
        throw new InvalidArgumentException('Invalid e-mail event reference.');
    }
    return $event . ':' . hash('sha256', $reference);
}

/**
 * Envio best-effort para fluxos em que uma indisponibilidade do provedor nao
 * deve desfazer a operacao principal. Nenhum segredo ou conteudo vai ao log.
 *
 * @param array{subject:string,text:string,html:string} $message
 * @param array<int,array{filename:string,content:string}> $attachments content em base64
 */
function send_transactional_email(string $to, array $message, string $idempotencyKey, array $attachments = []): bool {
    if (!email_is_configured()) {
        error_log('Transactional e-mail skipped: Resend is not configured.');
        return false;
    }
    try {
        $mailer = new ResendMailer(
            email_config_value('RESEND_API_KEY'),
            email_config_value('RESEND_FROM_EMAIL'),
            email_config_value('RESEND_FROM_NAME', 'Level OS'),
            email_config_value('RESEND_REPLY_TO'),
        );
        $mailer->send(
            $to,
            (string)($message['subject'] ?? ''),
            (string)($message['text'] ?? ''),
            (string)($message['html'] ?? ''),
            $idempotencyKey,
            $attachments,
        );
        return true;
    } catch (Throwable $e) {
        error_log('Transactional e-mail delivery failed: ' . get_class($e) . '.');
        return false;
    }
}
