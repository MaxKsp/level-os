<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require_once dirname(__DIR__) . '/app/Modules/Assistant/AssistantBootstrap.php';

if (in_array('--nutrition', $argv, true)) {
    $db = new PDO('sqlite::memory:');
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $db->exec('CREATE TABLE assistant_route_cache (
        user_id INTEGER NOT NULL, cache_key TEXT NOT NULL, provider TEXT NOT NULL,
        route_payload TEXT NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL,
        PRIMARY KEY (user_id, cache_key)
    )');
    $repository = new AssistantRepository($db, new TokenCrypto(base64_encode(random_bytes(32))));
    $router = new AssistantRouter(assistant_providers(), $repository);
    try {
        $result = $router->route(
            1,
            'Monte um plano alimentar para emagrecimento por 1 dia com orçamento de R$ 50.',
            ['today' => gmdate('Y-m-d')],
            'alimentacao',
        );
        $route = is_array($result['route'] ?? null) ? $result['route'] : [];
        echo json_encode([
            'scenario' => 'nutrition_route',
            'status' => ($route['action'] ?? null) === 'create_diet_plan' ? 'available' : 'invalid_route',
            'provider' => $result['provider'] ?? null,
            'action' => $route['action'] ?? null,
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . PHP_EOL;
    } catch (AssistantProvidersExhausted $exception) {
        echo json_encode([
            'scenario' => 'nutrition_route',
            'status' => 'unavailable',
            'failure_kinds' => $exception->failureKinds(),
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . PHP_EOL;
    }
    exit;
}

if (in_array('--routes', $argv, true)) {
    $providers = assistant_providers();
    $provider = $providers[0] ?? null;
    if (!$provider instanceof LlmProvider) {
        echo json_encode(['scenario'=>'agent_routes','status'=>'unavailable','reason'=>'no_provider']) . PHP_EOL;
        exit(1);
    }
    $db = new PDO('sqlite::memory:');
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $db->exec('CREATE TABLE assistant_route_cache (
        user_id INTEGER NOT NULL, cache_key TEXT NOT NULL, provider TEXT NOT NULL,
        route_payload TEXT NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL,
        PRIMARY KEY (user_id, cache_key)
    )');
    $repository = new AssistantRepository($db, new TokenCrypto(base64_encode(random_bytes(32))));
    $router = new AssistantRouter([$provider], $repository);
    $today = gmdate('Y-m-d');
    $scenarios = [
        'financeiro' => ['Lançar despesa de R$ 10 hoje na conta principal, categoria outros, descrição teste.', 'add_expense'],
        'agenda' => ['Criar tarefa revisar agenda hoje às 18:00.', 'add_task'],
        'treinos' => ['Registrar peso de 80 kg hoje.', 'log_measurement'],
        'alimentacao' => ['Monte um plano alimentar para emagrecimento por 1 dia com orçamento de R$ 50.', 'create_diet_plan'],
    ];
    foreach ($scenarios as $module => [$text, $expected]) {
        try {
            $result = $router->route(1, $text, ['today'=>$today], $module);
            $actual = $result['route']['action'] ?? null;
            echo json_encode([
                'scenario'=>'agent_route', 'module'=>$module,
                'status'=>$actual === $expected ? 'available' : 'invalid_route',
                'action'=>$actual,
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . PHP_EOL;
        } catch (AssistantProvidersExhausted $exception) {
            echo json_encode([
                'scenario'=>'agent_route', 'module'=>$module, 'status'=>'unavailable',
                'failure_kinds'=>$exception->failureKinds(),
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . PHP_EOL;
        }
    }
    exit;
}

$payload = [
    'messages' => [
        ['role' => 'system', 'content' => 'Responda somente com a palavra OK.'],
        ['role' => 'user', 'content' => 'Verificação de disponibilidade.'],
    ],
    'temperature' => 0,
    'max_tokens' => 64,
    'stream' => false,
];

foreach (assistant_providers() as $provider) {
    $startedAt = microtime(true);
    try {
        $provider->complete($payload);
        $result = [
            'provider' => $provider->name(),
            'status' => 'available',
            'latency_ms' => (int) round((microtime(true) - $startedAt) * 1000),
        ];
    } catch (LlmProviderException $exception) {
        $result = [
            'provider' => $provider->name(),
            'status' => 'unavailable',
            'http_status' => $exception->httpStatus,
            'kind' => $exception->kind,
            'latency_ms' => (int) round((microtime(true) - $startedAt) * 1000),
        ];
    } catch (Throwable $exception) {
        $result = [
            'provider' => $provider->name(),
            'status' => 'invalid_response',
            'error_type' => get_class($exception),
            'latency_ms' => (int) round((microtime(true) - $startedAt) * 1000),
        ];
    }

    echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . PHP_EOL;
}
