<?php
declare(strict_types=1);

require_once __DIR__ . '/SecurityLog.php';

/** Retorna o DSN público do Sentry (vai para o browser via metadata inerte). */
function sentry_public_dsn(): ?string
{
    return defined('SENTRY_DSN') && is_string(SENTRY_DSN) && SENTRY_DSN !== '' ? SENTRY_DSN : null;
}

/** A telemetria recebe somente o path; query/fragment nunca saem do servidor. */
function sentry_safe_request_path(?string $requestUri = null): string
{
    $requestUri ??= (string)($_SERVER['REQUEST_URI'] ?? '/');
    if ($requestUri === '' || preg_match('/[\x00-\x1F\x7F]/', $requestUri) === 1) return '/';
    try {
        $path = parse_url($requestUri, PHP_URL_PATH);
    } catch (ValueError) {
        return '/';
    }
    if (!is_string($path) || $path === '' || $path[0] !== '/') return '/';
    return strlen($path) <= 2048 ? $path : '/';
}

/** Remove paths absolutos da stack antes do envio a terceiro. */
function sentry_safe_frame_filename(mixed $filename): string
{
    if (!is_string($filename) || $filename === '') return '<internal>';
    $normalized = str_replace('\\', '/', $filename);
    $root = str_replace('\\', '/', dirname(__DIR__, 2));
    if (str_starts_with($normalized, $root . '/')) {
        return 'app:///' . ltrim(substr($normalized, strlen($root)), '/');
    }
    $basename = basename($normalized);
    return $basename !== '' ? 'external:///' . $basename : '<external>';
}

/** @return array<string,mixed> */
function sentry_exception_event(Throwable $error): array
{
    $frames = [];
    foreach (array_reverse($error->getTrace()) as $frame) {
        $frames[] = [
            'filename' => sentry_safe_frame_filename($frame['file'] ?? null),
            'lineno' => max(0, (int)($frame['line'] ?? 0)),
            'function' => (string)(($frame['class'] ?? '') . ($frame['type'] ?? '') . ($frame['function'] ?? '')),
        ];
    }
    $frames[] = [
        'filename' => sentry_safe_frame_filename($error->getFile()),
        'lineno' => max(0, $error->getLine()),
        'function' => get_class($error),
    ];

    $method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    if (!in_array($method, ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], true)) $method = 'OTHER';

    return [
        'timestamp' => gmdate('Y-m-d\TH:i:s\Z'),
        'level' => 'error',
        'platform' => 'php',
        'request' => ['url' => sentry_safe_request_path(), 'method' => $method],
        'exception' => ['values' => [[
            'type' => get_class($error),
            'value' => 'Unhandled application error.',
            'stacktrace' => ['frames' => $frames],
        ]]],
    ];
}

/** Envia uma exceção sanitizada ao Sentry via HTTP, em best-effort. */
function sentry_capture_exception(Throwable $error): void
{
    $dsn = sentry_public_dsn();
    if ($dsn === null) return;

    $parts = parse_url($dsn);
    if (!is_array($parts) || empty($parts['user']) || empty($parts['host']) || empty($parts['path'])) return;

    $key = (string)$parts['user'];
    $host = (string)$parts['host'];
    $projectId = ltrim((string)$parts['path'], '/');
    if ($key === '' || $host === '' || $projectId === '') return;

    $event = sentry_exception_event($error);
    $event['event_id'] = bin2hex(random_bytes(16));
    $payload = json_encode($event, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if (!is_string($payload)) return;

    $timestamp = time();
    $context = stream_context_create(['http' => [
        'method' => 'POST',
        'header' => "Content-Type: application/json\r\n"
            . "X-Sentry-Auth: Sentry sentry_version=7, sentry_client=level-os-php/1.1, "
            . "sentry_timestamp={$timestamp}, sentry_key={$key}",
        'content' => $payload,
        'timeout' => 2,
        'ignore_errors' => true,
    ]]);
    @file_get_contents("https://{$host}/api/{$projectId}/store/", false, $context);
}

/** Finaliza uma exceção não tratada sem pedir ao PHP que registre o detalhe bruto. */
function sentry_handle_uncaught_exception(Throwable $error): void
{
    sentry_capture_exception($error);
    security_log_exception('application.uncaught', $error);
    if (!headers_sent()) http_response_code(500);
}

/** Registra handlers globais sem alterar o erro seguro entregue pelo PHP. */
function sentry_bootstrap(): void
{
    if (sentry_public_dsn() === null) return;

    set_exception_handler('sentry_handle_uncaught_exception');

    register_shutdown_function(static function (): void {
        $error = error_get_last();
        if ($error !== null && ($error['type'] & (E_ERROR | E_PARSE | E_CORE_ERROR | E_COMPILE_ERROR))) {
            sentry_capture_exception(new ErrorException(
                'Fatal application error.', 0, $error['type'], $error['file'], $error['line']
            ));
        }
    });
}
