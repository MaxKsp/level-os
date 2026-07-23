<?php
declare(strict_types=1);

require_once __DIR__ . '/LlmProvider.php';

final class OpenAiCompatibleProvider implements LlmProvider {
    private const MAX_RESPONSE_BYTES = 2_097_152;
    private readonly bool $openAiApi;

    /** @param array<string,string> $headers */
    public function __construct(
        private readonly string $providerName,
        private readonly string $baseUrl,
        private readonly string $apiKey,
        private readonly string $model,
        private readonly bool $tools,
        private readonly array $headers = [],
    ) {
        if (preg_match('/\A[a-z][a-z0-9_-]{1,31}\z/D', $providerName) !== 1) throw new InvalidArgumentException('Invalid provider name.');
        $parts = parse_url($baseUrl);
        if (!is_array($parts) || strtolower((string)($parts['scheme'] ?? '')) !== 'https' || empty($parts['host']) || isset($parts['user']) || isset($parts['pass'])) {
            throw new InvalidArgumentException('Invalid provider base URL.');
        }
        if ($apiKey === '' || strlen($apiKey) > 8192 || preg_match('/[\r\n]/', $apiKey)) throw new InvalidArgumentException('Invalid provider API key.');
        if ($model === '' || strlen($model) > 160 || preg_match('/[\r\n]/', $model)) throw new InvalidArgumentException('Invalid provider model.');
        $this->openAiApi = strtolower((string)($parts['host'] ?? '')) === 'api.openai.com';
    }

    public function name(): string { return $this->providerName; }
    public function supportsTools(): bool { return $this->tools; }

    public function complete(array $payload): array {
        if (!function_exists('curl_init')) throw new LlmProviderException('HTTP client unavailable.', $this->providerName, 0, 'transport');
        $payload = self::preparePayload($payload, $this->model, $this->tools, $this->openAiApi);
        $encoded = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
        if (strlen($encoded) > 512 * 1024) throw new LlmProviderException('Provider request too large.', $this->providerName, 0, 'request');
        $url = rtrim($this->baseUrl, '/') . '/chat/completions';
        $response = '';
        $curl = curl_init($url);
        $requestHeaders = ['Authorization: Bearer ' . $this->apiKey, 'Content-Type: application/json', 'Accept: application/json'];
        foreach ($this->headers as $name => $value) {
            if (preg_match('/\A[A-Za-z0-9-]{1,64}\z/D', (string)$name) !== 1 || preg_match('/[\r\n]/', (string)$value)) continue;
            $requestHeaders[] = $name . ': ' . $value;
        }
        curl_setopt_array($curl, [
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => $requestHeaders,
            CURLOPT_POSTFIELDS => $encoded,
            CURLOPT_RETURNTRANSFER => false,
            CURLOPT_CONNECTTIMEOUT => 4,
            CURLOPT_TIMEOUT => 18,
            CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_PROTOCOLS => CURLPROTO_HTTPS,
            CURLOPT_WRITEFUNCTION => static function($handle, string $chunk) use (&$response): int {
                if (strlen($response) + strlen($chunk) > self::MAX_RESPONSE_BYTES) return 0;
                $response .= $chunk;
                return strlen($chunk);
            },
        ]);
        $ok = curl_exec($curl);
        $status = (int)curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
        $errno = curl_errno($curl);
        curl_close($curl);
        if ($ok === false || $errno !== 0) throw new LlmProviderException('Provider transport failed.', $this->providerName, $status, 'transport');
        $decoded = json_decode($response, true);
        if ($status < 200 || $status >= 300 || !is_array($decoded)) {
            $kind = match (true) {
                $status === 429 => 'quota',
                $status === 401 || $status === 403 => 'auth',
                $status === 404 => 'model',
                $status === 408 || $status >= 500 => 'temporary',
                $status === 400 => 'request',
                default => 'provider_error',
            };
            throw new LlmProviderException('Provider request failed.', $this->providerName, $status, $kind);
        }
        return $decoded;
    }

    /** @param array<string,mixed> $payload @return array<string,mixed> */
    public static function preparePayload(array $payload, string $model, bool $tools, bool $openAiApi): array {
        $preferredTool = is_string($payload['preferred_tool'] ?? null) ? trim((string)$payload['preferred_tool']) : '';
        unset($payload['preferred_tool']);
        if ($preferredTool !== '' && $tools) {
            $payload['tool_choice'] = ['type' => 'function', 'function' => ['name' => $preferredTool]];
        }
        $payload['model'] = $model;
        if ($openAiApi && str_starts_with(strtolower($model), 'gpt-5')) {
            if (array_key_exists('max_tokens', $payload)) {
                $payload['max_completion_tokens'] = $payload['max_tokens'];
                unset($payload['max_tokens']);
            }
            unset($payload['temperature']);
            $payload['reasoning_effort'] ??= 'minimal';
        }
        return $payload;
    }
}
