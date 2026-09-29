<?php
declare(strict_types=1);

/**
 * Logging operacional sem mensagem da exceção, parâmetros, tokens ou PII.
 * O evento deve ser estável e pesquisável; detalhes sensíveis ficam fora do log.
 */
function security_log_line(string $event, Throwable $error): string
{
    $event = strtolower(trim($event));
    if (preg_match('/\A[a-z0-9][a-z0-9_.-]{0,63}\z/D', $event) !== 1) {
        $event = 'application.error';
    }

    $type = get_class($error);
    $separator = strrpos($type, '\\');
    if ($separator !== false) $type = substr($type, $separator + 1);
    if (preg_match('/\A[A-Za-z_][A-Za-z0-9_]{0,127}\z/D', $type) !== 1) {
        $type = 'Throwable';
    }

    return '[level-os] event=' . $event . ' exception=' . $type;
}

function security_log_exception(string $event, Throwable $error): void
{
    error_log(security_log_line($event, $error));
}
