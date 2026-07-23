<?php
declare(strict_types=1);

require_once dirname(__DIR__, 3) . '/config.php';
require_once dirname(__DIR__, 2) . '/Core/TokenCrypto.php';
require_once __DIR__ . '/GeminiNativeProvider.php';
require_once __DIR__ . '/OpenAiCompatibleProvider.php';
require_once __DIR__ . '/AssistantService.php';

/** @return list<LlmProvider> */
function assistant_providers(): array {
    if (!defined('ASSISTANT_PROVIDERS') || !is_array(ASSISTANT_PROVIDERS)) {
        throw new AssistantProvidersExhausted('Provedores do assistente não configurados.');
    }
    $providers = [];
    foreach (ASSISTANT_PROVIDERS as $entry) {
        if (!is_array($entry) || ($entry['enabled'] ?? false) !== true) continue;
        $apiKey = is_string($entry['api_key'] ?? null) ? trim($entry['api_key']) : '';
        if ($apiKey === '') continue;
        $name = (string)($entry['name'] ?? '');
        $baseUrl = (string)($entry['base_url'] ?? '');
        $driver = strtolower((string)($entry['driver'] ?? ''));
        $isGemini = $driver === 'gemini'
            || str_contains(strtolower($baseUrl), 'generativelanguage.googleapis.com')
            || str_starts_with(strtolower($name), 'gemini');
        if ($isGemini) {
            $model = (string)($entry['model'] ?? 'gemini-3.1-flash-lite');
            if (($entry['cost_optimized'] ?? true) === true && in_array($model, ['gemini-2.5-flash', 'gemini-2.5-flash-lite'], true)) {
                $model = 'gemini-3.1-flash-lite';
            }
            $providers[] = new GeminiNativeProvider($name, $apiKey, $model);
            continue;
        }
        $providers[] = new OpenAiCompatibleProvider(
            $name,
            $baseUrl,
            $apiKey,
            (string)($entry['model'] ?? ''),
            (bool)($entry['supports_tools'] ?? false),
            is_array($entry['headers'] ?? null) ? $entry['headers'] : [],
        );
    }
    return $providers;
}

function assistant_service(PDO $db): AssistantService {
    $providers = assistant_providers();
    $repository = assistant_repository($db);
    return new AssistantService($db, $repository, new AssistantRouter($providers, $repository), new AssistantActionExecutor($db));
}

function assistant_repository(PDO $db): AssistantRepository {
    return new AssistantRepository($db, TokenCrypto::fromEnvironment('LEVELOS_ASSISTANT_DATA_KEY'));
}
