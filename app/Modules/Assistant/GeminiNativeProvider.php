<?php
declare(strict_types=1);

require_once __DIR__ . '/LlmProvider.php';

/**
 * Cliente REST nativo do Gemini. Mantem o contrato interno OpenAI-like para
 * que o roteador continue independente do provedor, mas usa function calling
 * e usageMetadata nativos para reduzir respostas invalidas e medir consumo.
 */
final class GeminiNativeProvider implements LlmProvider {
    private const MAX_RESPONSE_BYTES = 2_097_152;

    public function __construct(
        private readonly string $providerName,
        private readonly string $apiKey,
        private readonly string $model = 'gemini-3.1-flash-lite',
    ) {
        if (preg_match('/\A[a-z][a-z0-9_-]{1,31}\z/D', $providerName) !== 1) {
            throw new InvalidArgumentException('Invalid provider name.');
        }
        if ($apiKey === '' || strlen($apiKey) > 8192 || preg_match('/[\r\n]/', $apiKey)) {
            throw new InvalidArgumentException('Invalid provider API key.');
        }
        if (preg_match('/\A[a-zA-Z0-9._-]{1,160}\z/D', $model) !== 1) {
            throw new InvalidArgumentException('Invalid Gemini model.');
        }
    }

    public function name(): string { return $this->providerName; }
    public function supportsTools(): bool { return true; }

    /** @param array<string,mixed> $payload @return array<string,mixed> */
    public function complete(array $payload): array {
        if (!function_exists('curl_init')) {
            throw new LlmProviderException('HTTP client unavailable.', $this->providerName, 0, 'transport');
        }
        $request = self::buildRequest($payload, $this->model);
        $encoded = json_encode($request, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
        if (strlen($encoded) > 512 * 1024) {
            throw new LlmProviderException('Provider request too large.', $this->providerName, 0, 'request');
        }

        $url = 'https://generativelanguage.googleapis.com/v1beta/models/' . rawurlencode($this->model) . ':generateContent';
        $response = '';
        $curl = curl_init($url);
        curl_setopt_array($curl, [
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => [
                'x-goog-api-key: ' . $this->apiKey,
                'Content-Type: application/json',
                'Accept: application/json',
            ],
            CURLOPT_POSTFIELDS => $encoded,
            CURLOPT_RETURNTRANSFER => false,
            CURLOPT_CONNECTTIMEOUT => 4,
            CURLOPT_TIMEOUT => 24,
            CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_PROTOCOLS => CURLPROTO_HTTPS,
            CURLOPT_WRITEFUNCTION => static function ($handle, string $chunk) use (&$response): int {
                if (strlen($response) + strlen($chunk) > self::MAX_RESPONSE_BYTES) return 0;
                $response .= $chunk;
                return strlen($chunk);
            },
        ]);
        $ok = curl_exec($curl);
        $status = (int)curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
        $errno = curl_errno($curl);
        curl_close($curl);

        if ($ok === false || $errno !== 0) {
            throw new LlmProviderException('Provider transport failed.', $this->providerName, $status, 'transport');
        }
        $decoded = json_decode($response, true);
        if ($status < 200 || $status >= 300 || !is_array($decoded)) {
            self::logProviderError($decoded, $this->providerName, $status);
            throw new LlmProviderException(
                'Provider request failed.',
                $this->providerName,
                $status,
                self::failureKind($status),
            );
        }
        return self::normalizeResponse($decoded, $this->providerName);
    }

    /** @param array<string,mixed> $payload @return array<string,mixed> */
    public static function buildRequest(array $payload, string $model = 'gemini-3.1-flash-lite'): array {
        $system = [];
        $contents = [];
        foreach ((array)($payload['messages'] ?? []) as $message) {
            if (!is_array($message) || !is_string($message['content'] ?? null)) continue;
            $content = trim((string)$message['content']);
            if ($content === '') continue;
            $role = (string)($message['role'] ?? 'user');
            if ($role === 'system') {
                $system[] = $content;
                continue;
            }
            $contents[] = [
                'role' => $role === 'assistant' ? 'model' : 'user',
                'parts' => [['text' => $content]],
            ];
        }
        if ($contents === []) throw new InvalidArgumentException('Gemini request requires user content.');

        $maxOutput = max(64, min(8192, (int)($payload['max_tokens'] ?? 512)));
        $request = [
            'contents' => $contents,
            'generationConfig' => [
                'temperature' => max(0.0, min(1.0, (float)($payload['temperature'] ?? 0))),
                'maxOutputTokens' => $maxOutput,
                // Flash-Lite permite budget zero: roteamento nao precisa raciocinio oculto.
                'thinkingConfig' => ['thinkingBudget' => 0],
            ],
        ];
        if ($system !== []) $request['systemInstruction'] = ['parts' => [['text' => implode("\n", $system)]]];

        $declarations = [];
        foreach ((array)($payload['tools'] ?? []) as $tool) {
            $function = is_array($tool) && is_array($tool['function'] ?? null) ? $tool['function'] : null;
            if ($function === null || !is_string($function['name'] ?? null)) continue;
            $declarations[] = [
                'name' => $function['name'],
                'description' => (string)($function['description'] ?? ''),
                'parameters' => self::normalizeSchema((array)($function['parameters'] ?? [])),
            ];
        }
        if ($declarations !== []) {
            $request['tools'] = [['functionDeclarations' => $declarations]];
            $preferred = is_string($payload['preferred_tool'] ?? null) ? (string)$payload['preferred_tool'] : '';
            $calling = ['mode' => $preferred !== '' ? 'ANY' : 'AUTO'];
            if ($preferred !== '') $calling['allowedFunctionNames'] = [$preferred];
            $request['toolConfig'] = ['functionCallingConfig' => $calling];
        }
        return $request;
    }

    /** @param array<string,mixed> $decoded @return array<string,mixed> */
    public static function normalizeResponse(array $decoded, string $provider = 'gemini'): array {
        $parts = $decoded['candidates'][0]['content']['parts'] ?? null;
        if (!is_array($parts)) {
            throw new LlmProviderException('Gemini response has no candidate.', $provider, 200, 'response');
        }
        $textParts = [];
        foreach ($parts as $part) {
            if (!is_array($part)) continue;
            if (is_array($part['functionCall'] ?? null)) {
                $call = $part['functionCall'];
                $name = is_string($call['name'] ?? null) ? (string)$call['name'] : '';
                $arguments = is_array($call['args'] ?? null) ? $call['args'] : [];
                if ($name === '') throw new LlmProviderException('Gemini function call is invalid.', $provider, 200, 'response');
                return [
                    'choices' => [['message' => ['tool_calls' => [[
                        'function' => [
                            'name' => $name,
                            'arguments' => json_encode($arguments, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR),
                        ],
                    ]]]]],
                    'usage' => self::usage($decoded),
                ];
            }
            if (is_string($part['text'] ?? null)) $textParts[] = (string)$part['text'];
        }
        $text = trim(implode("\n", $textParts));
        if ($text === '') throw new LlmProviderException('Gemini response is empty.', $provider, 200, 'response');
        return ['choices' => [['message' => ['content' => $text]]], 'usage' => self::usage($decoded)];
    }

    /** @param array<string,mixed> $schema @return array<string,mixed> */
    private static function normalizeSchema(array $schema): array {
        $result = [];
        $rawTypes = is_array($schema['type'] ?? null) ? $schema['type'] : [$schema['type'] ?? null];
        $types = array_values(array_filter($rawTypes, static fn($type): bool => is_string($type) && $type !== 'null'));
        if ($types !== []) $result['type'] = strtoupper((string)$types[0]);
        if (in_array('null', $rawTypes, true)) $result['nullable'] = true;

        // Function declarations aceitam apenas um subconjunto do OpenAPI.
        // Limites detalhados continuam sendo validados no servidor depois da
        // resposta, mas nao sao enviados ao Gemini para evitar HTTP 400.
        foreach (['description','format'] as $key) {
            if (array_key_exists($key, $schema)) $result[$key] = $schema[$key];
        }
        if (is_array($schema['enum'] ?? null)) $result['enum'] = array_values($schema['enum']);
        if (is_array($schema['required'] ?? null)) $result['required'] = array_values($schema['required']);
        if (is_array($schema['properties'] ?? null)) {
            $result['properties'] = [];
            foreach ($schema['properties'] as $name => $property) {
                if (is_string($name) && is_array($property)) $result['properties'][$name] = self::normalizeSchema($property);
            }
        }
        if (is_array($schema['items'] ?? null)) $result['items'] = self::normalizeSchema($schema['items']);
        return $result;
    }

    /** @param array<string,mixed> $decoded @return array{prompt_tokens:int,completion_tokens:int,total_tokens:int} */
    private static function usage(array $decoded): array {
        $metadata = is_array($decoded['usageMetadata'] ?? null) ? $decoded['usageMetadata'] : [];
        $prompt = max(0, (int)($metadata['promptTokenCount'] ?? 0));
        $completion = max(0, (int)($metadata['candidatesTokenCount'] ?? 0))
            + max(0, (int)($metadata['thoughtsTokenCount'] ?? 0));
        return [
            'prompt_tokens' => $prompt,
            'completion_tokens' => $completion,
            'total_tokens' => max($prompt + $completion, (int)($metadata['totalTokenCount'] ?? 0)),
        ];
    }

    private static function failureKind(int $status): string {
        return match (true) {
            $status === 429 => 'quota',
            $status === 401 || $status === 403 => 'auth',
            $status === 404 => 'model',
            $status === 408 || $status >= 500 => 'temporary',
            $status === 400 => 'request',
            default => 'provider_error',
        };
    }

    /** @param array<string,mixed>|null $decoded */
    private static function logProviderError(?array $decoded, string $provider, int $status): void {
        $error = is_array($decoded['error'] ?? null) ? $decoded['error'] : [];
        $code = is_string($error['status'] ?? null) ? (string)$error['status'] : 'unknown';
        $message = is_string($error['message'] ?? null) ? (string)$error['message'] : '';
        $message = preg_replace('/[\x00-\x1F\x7F]+/', ' ', $message) ?? '';
        error_log(sprintf(
            'gemini provider rejected request: provider=%s http=%d code=%s detail=%s',
            $provider,
            $status,
            mb_substr($code, 0, 64),
            mb_substr($message, 0, 320),
        ));
    }
}
