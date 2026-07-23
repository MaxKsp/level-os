<?php
declare(strict_types=1);

require_once __DIR__ . '/ResendMailer.php';
require_once __DIR__ . '/EmailTemplates.php';

function email_config_value(string $name, string $default = ''): string {
    if (defined($name)) {
        $value = constant($name);
        return is_string($value) ? trim($value) : $default;
    }
    $value = getenv($name);
    return is_string($value) && trim($value) !== '' ? trim($value) : $default;
}

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
