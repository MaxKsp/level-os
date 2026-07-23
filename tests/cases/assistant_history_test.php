<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';
require_once dirname(__DIR__, 2) . '/app/Modules/Assistant/AssistantRepository.php';

return static function (): void {
    $db = new PDO('sqlite::memory:');
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $db->exec('CREATE TABLE assistant_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        agent_key TEXT NOT NULL,
        request_id TEXT NOT NULL,
        user_payload TEXT NOT NULL,
        response_payload TEXT NOT NULL,
        prompt_tokens INTEGER NOT NULL DEFAULT 0,
        completion_tokens INTEGER NOT NULL DEFAULT 0,
        total_tokens INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        UNIQUE (user_id, request_id)
    )');
    $db->exec('CREATE TABLE assistant_usage_daily (
        user_id INTEGER NOT NULL, usage_date TEXT NOT NULL, prompt_tokens INTEGER NOT NULL DEFAULT 0,
        completion_tokens INTEGER NOT NULL DEFAULT 0, total_tokens INTEGER NOT NULL DEFAULT 0,
        request_count INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (user_id, usage_date)
    )');
    $repository = new AssistantRepository($db, new TokenCrypto(base64_encode(random_bytes(32))));
    $response = ['ok'=>true, 'status'=>'query', 'message'=>'Saldo resumido.', 'undoAvailable'=>false, 'provider'=>'openai-1'];

    $repository->saveHistory(7, 'financeiro', 'req_history_finance_0001', 'Qual é meu saldo?', $response, [
        'prompt_tokens'=>120, 'completion_tokens'=>20, 'total_tokens'=>140,
    ]);
    $repository->saveHistory(7, 'agenda', 'req_history_agenda_0001', 'Quais tarefas tenho?', [
        'ok'=>true, 'status'=>'query', 'message'=>'Uma tarefa.', 'undoAvailable'=>false,
    ]);
    $repository->saveHistory(8, 'financeiro', 'req_history_other_00001', 'Saldo de outro usuário?', $response);

    $finance = $repository->history(7, 'financeiro');
    test_assert_same(1, count($finance), 'Finance history must contain only the selected user and agent.');
    test_assert_same('Qual é meu saldo?', $finance[0]['userText'], 'The encrypted user message must be restored.');
    test_assert_same('Saldo resumido.', $finance[0]['response']['message'], 'The encrypted response must be restored.');
    test_assert_true(!isset($finance[0]['response']['provider']), 'Provider internals must not be exposed in history.');
    test_assert_same(140, $repository->dailyTokenUsage(7), 'Daily usage must aggregate only the current user tokens.');

    $cipher = (string)$db->query("SELECT user_payload FROM assistant_history WHERE user_id = 7 AND agent_key = 'financeiro'")->fetchColumn();
    test_assert_true(!str_contains($cipher, 'Qual é meu saldo?'), 'Conversation text must never be stored in plaintext.');
    $repository->saveHistory(7, 'financeiro', 'req_history_clarify_0001', 'Lancar despesa de R$ 600', [
        'ok'=>true, 'status'=>'clarification', 'message'=>'Informe a conta.', 'undoAvailable'=>false,
    ], [], 'Lancar despesa de R$ 600');
    $continuation = $repository->continuationText(7, 'financeiro', 'hoje na conta principal');
    test_assert_true(str_contains($continuation, 'Lancar despesa de R$ 600'), 'A clarification must preserve only its unresolved routing chain.');
    test_assert_true(str_contains($continuation, 'hoje na conta principal'), 'A clarification follow-up must be appended to the routing text.');
    test_assert_same('nova tarefa', $repository->continuationText(7, 'agenda', 'nova tarefa'), 'Clarifications must never leak between agents.');
    $repository->updateHistoryResponse(7, 'req_history_clarify_0001', [
        'ok'=>true, 'status'=>'applied', 'message'=>'Despesa registrada.', 'undoAvailable'=>true,
    ]);
    test_assert_same('novo pedido', $repository->continuationText(7, 'financeiro', 'novo pedido'), 'A completed action must close the clarification chain.');

    test_assert_same(2, $repository->clearHistory(7, 'financeiro'), 'Clear must delete only the selected agent history.');
    test_assert_same([], $repository->history(7, 'financeiro'), 'Cleared history must be empty.');
    test_assert_same(140, $repository->dailyTokenUsage(7), 'Clearing history must not reset the daily usage limit.');
    test_assert_same(1, count($repository->history(7, 'agenda')), 'Clearing finance must preserve routine history.');
    test_assert_same(1, count($repository->history(8, 'financeiro')), 'Clearing one user must preserve another user history.');
};
