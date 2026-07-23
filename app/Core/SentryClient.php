<?php
declare(strict_types=1);

/** Retorna o DSN público do Sentry (vai para o browser via window.LEVEL_OS_SENTRY_DSN). */
function sentry_public_dsn(): ?string
{
    return defined('SENTRY_DSN') && is_string(SENTRY_DSN) && SENTRY_DSN !== '' ? SENTRY_DSN : null;
}

/**
 * Envia uma exceção ao Sentry via HTTP (sem composer).
 * Best-effort: timeout 2s, falha silenciosa.
 */
function sentry_capture_exception(Throwable $e): void
{
    $dsn = sentry_public_dsn();
    if ($dsn === null) return;

    $parts = parse_url($dsn);
    if (!is_array($parts) || empty($parts['user']) || empty($parts['host']) || empty($parts['path'])) return;

    $key = (string)$parts['user'];
    $host = (string)$parts['host'];
    $projectId = ltrim((string)$parts['path'], '/');
    if ($key === '' || $host === '' || $projectId === '') return;

    $frames = [];
    foreach (array_reverse($e->getTrace()) as $frame) {
        $frames[] = [
            'filename' => $frame['file'] ?? '<internal>',
            'lineno'   => $frame['line'] ?? 0,
            'function' => ($frame['class'] ?? '') . ($frame['type'] ?? '') . ($frame['function'] ?? ''),
        ];
    }
    $frames[] = ['filename' => $e->getFile(), 'lineno' => $e->getLine(), 'function' => get_class($e)];

    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $url = $scheme . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost') . ($_SERVER['REQUEST_URI'] ?? '/');

    $payload = json_encode([
        'event_id'  => str_replace('-', '', sprintf('%04x%04x%04x%04x%04x%04x%04x%04x',
            random_int(0, 0xffff), random_int(0, 0xffff),
            random_int(0, 0xffff),
            random_int(0, 0x0fff) | 0x4000,
            random_int(0, 0x3fff) | 0x8000,
            random_int(0, 0xffff), random_int(0, 0xffff), random_int(0, 0xffff)
        )),
        'timestamp' => gmdate('Y-m-d\TH:i:s\Z'),
        'level'     => 'error',
        'platform'  => 'php',
        'request'   => ['url' => $url, 'method' => $_SERVER['REQUEST_METHOD'] ?? 'GET'],
        'exception' => ['values' => [[
            'type'       => get_class($e),
            'value'      => $e->getMessage(),
            'stacktrace' => ['frames' => $frames],
        ]]],
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    if (!is_string($payload)) return;

    $ts = time();
    $ctx = stream_context_create(['http' => [
        'method'        => 'POST',
        'header'        => "Content-Type: application/json\r\n"
            . "X-Sentry-Auth: Sentry sentry_version=7, sentry_client=level-os-php/1.0, "
            . "sentry_timestamp={$ts}, sentry_key={$key}",
        'content'       => $payload,
        'timeout'       => 2,
        'ignore_errors' => true,
    ]]);
    @file_get_contents("https://{$host}/api/{$projectId}/store/", false, $ctx);
}

/**
 * Registra handlers de exceção e fatal. Chamar uma vez no bootstrap.
 * Não sobrescreve handlers existentes quando DSN não está configurado.
 */
function sentry_bootstrap(): void
{
    if (sentry_public_dsn() === null) return;

    set_exception_handler(static function (Throwable $e): void {
        sentry_capture_exception($e);
        // Deixa o PHP exibir o erro padrão conforme ini
        throw $e;
    });

    register_shutdown_function(static function (): void {
        $err = error_get_last();
        if ($err !== null && ($err['type'] & (E_ERROR | E_PARSE | E_CORE_ERROR | E_COMPILE_ERROR))) {
            sentry_capture_exception(new ErrorException(
                $err['message'], 0, $err['type'], $err['file'], $err['line']
            ));
        }
    });
}
