<?php
declare(strict_types=1);

/**
 * Cliente HTTP minimo para smoke tests que sobem `php -S` embutido contra
 * um endpoint real (api/finance.php, api/data.php), sem nenhum router de
 * teste e sem tocar em db.php/auth.php.
 *
 * fapi_run_isolated_request() sobe um processo NOVO do servidor embutido
 * por chamada, faz UMA requisicao HTTP de verdade e derruba o processo
 * antes de devolver o resultado. Nao ha servidor persistente entre
 * cenarios, nao ha cookie jar, e cada chamada monta seus proprios headers
 * do zero — nenhum estado (sessao, cookie, env) atravessa de um cenario
 * para o outro.
 *
 * Sem sessao pre-fabricada, so da pra exercitar via HTTP real o que o
 * endpoint resolve ANTES de tocar no banco: o guard de autenticacao. Fluxos
 * que dependem de get_db() (rate limit, persistencia) sao cobertos pelos
 * testes unitarios dos modulos de Finance, que injetam um PDO sqlite
 * diretamente na funcao, sem passar por auth.php/db.php.
 */

/** @return array{status:int, body:string, contentType:string} */
function fapi_run_isolated_request(string $repoRoot, string $path, string $method, string $body, array $headers): array {
    $port = 9200 + random_int(0, 5000);
    // O formato em array evita um shell intermediário. Além de eliminar
    // problemas de escaping, permite que proc_terminate() encerre o servidor
    // diretamente também no Windows.
    $cmd = [PHP_BINARY, '-S', '127.0.0.1:' . $port, '-t', $repoRoot];
    $descriptors = [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']];
    $process = proc_open($cmd, $descriptors, $pipes, $repoRoot);
    if (!is_resource($process)) {
        throw new RuntimeException('Could not start the built-in PHP server for the adapter smoke test.');
    }
    foreach ($pipes as $pipe) {
        stream_set_blocking($pipe, false);
    }

    try {
        $url = "http://127.0.0.1:$port$path";
        fapi_wait_ready($url);
        return fapi_http_call($url, $method, $body, $headers);
    } finally {
        foreach ($pipes as $pipe) {
            if (is_resource($pipe)) fclose($pipe);
        }
        proc_terminate($process);
        proc_close($process);
    }
}

function fapi_wait_ready(string $url, int $attempts = 40): void {
    for ($i = 0; $i < $attempts; $i++) {
        $ctx = stream_context_create(['http' => ['method' => 'GET', 'ignore_errors' => true, 'timeout' => 2]]);
        $body = @file_get_contents($url, false, $ctx);
        if ($body !== false) return;
        usleep(100_000);
    }
    throw new RuntimeException('Built-in PHP server did not become ready for the adapter smoke test.');
}

/** @return array{status:int, body:string, contentType:string} */
function fapi_http_call(string $url, string $method, string $body, array $headers): array {
    $headers[] = 'Content-Type: application/json';
    $ctx = stream_context_create(['http' => [
        'method' => $method,
        'header' => implode("\r\n", $headers),
        'content' => $body,
        'ignore_errors' => true,
        'timeout' => 5,
    ]]);
    $responseBody = file_get_contents($url, false, $ctx);
    $status = 0;
    $contentType = '';
    foreach ($http_response_header ?? [] as $line) {
        if (preg_match('#^HTTP/\S+\s+(\d+)#', $line, $m)) {
            $status = (int)$m[1];
        } elseif (stripos($line, 'Content-Type:') === 0) {
            $contentType = trim(substr($line, strlen('Content-Type:')));
        }
    }
    return ['status' => $status, 'body' => (string)$responseBody, 'contentType' => $contentType];
}
