<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/../helpers/sqlite_finance_schema.php';
require_once dirname(__DIR__, 2) . '/app/Modules/Assistant/AssistantService.php';

return static function (): void {
    $db = make_sqlite_finance_db();
    $db->exec('CREATE TABLE assistant_actions (
        id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, action_token TEXT NOT NULL,
        request_id TEXT NOT NULL, action_type TEXT NOT NULL, provider TEXT, status TEXT NOT NULL,
        undo_payload TEXT, response_payload TEXT, result_summary TEXT, created_at TEXT NOT NULL,
        undo_expires_at TEXT, undone_at TEXT, UNIQUE(action_token), UNIQUE(user_id, request_id)
    )');
    $db->exec('CREATE TABLE assistant_route_cache (
        user_id INTEGER NOT NULL, cache_key TEXT NOT NULL, provider TEXT NOT NULL,
        route_payload TEXT NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL,
        PRIMARY KEY (user_id, cache_key)
    )');
    $db->exec('CREATE TABLE assistant_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, agent_key TEXT NOT NULL,
        request_id TEXT NOT NULL, user_payload TEXT NOT NULL, response_payload TEXT NOT NULL,
        prompt_tokens INTEGER NOT NULL DEFAULT 0, completion_tokens INTEGER NOT NULL DEFAULT 0,
        total_tokens INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, UNIQUE(user_id, request_id)
    )');
    $db->exec('CREATE TABLE assistant_usage_daily (
        user_id INTEGER NOT NULL, usage_date TEXT NOT NULL, prompt_tokens INTEGER NOT NULL DEFAULT 0,
        completion_tokens INTEGER NOT NULL DEFAULT 0, total_tokens INTEGER NOT NULL DEFAULT 0,
        request_count INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (user_id, usage_date)
    )');
    $db->exec('CREATE TABLE audit_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, event_type TEXT NOT NULL,
        outcome TEXT NOT NULL, request_id TEXT NOT NULL, ip_address TEXT, user_agent TEXT, metadata_json TEXT
    )');
    finance_save_set($db, 7, 'accounts', [
        ['id'=>'account-a', 'label'=>'Conta A', 'tipo'=>'corrente', 'saldo'=>1000, 'principal'=>true],
        ['id'=>'account-b', 'label'=>'Conta B', 'tipo'=>'corrente', 'saldo'=>100, 'principal'=>false],
    ], false);

    $provider = new class implements LlmProvider {
        public int $calls = 0;
        public function name(): string { return 'test-provider'; }
        public function supportsTools(): bool { return true; }
        public function complete(array $payload): array {
            $this->calls++;
            return [
                'choices'=>[['message'=>['tool_calls'=>[['function'=>[
                    'name'=>'add_transfer',
                    'arguments'=>json_encode(['value'=>200, 'from'=>'Conta A', 'to'=>'Conta B', 'date'=>'2026-07-22']),
                ]]]]]],
                'usage'=>['prompt_tokens'=>80, 'completion_tokens'=>20, 'total_tokens'=>100],
            ];
        }
    };
    $repository = new AssistantRepository($db, new TokenCrypto(base64_encode(random_bytes(32))));
    $service = new AssistantService($db, $repository, new AssistantRouter([$provider], $repository), new AssistantActionExecutor($db));

    $expense = $service->handle(
        7,
        'request_local_expense_0001',
        'Lançar R$ 42,90 de alimentação hoje na conta principal',
        'financeiro',
    );
    test_assert_same('applied', $expense['status'] ?? null, 'A complete everyday expense must execute locally.');
    test_assert_same('mercado', $expense['data']['category'] ?? null, 'The saved expense must use a real platform category.');
    test_assert_same(0, $provider->calls, 'A complete everyday expense must not depend on an external provider.');
    test_assert_equals(957.10, finance_load_set($db, 7, 'accounts')[0]['saldo'], 'The local expense must update the selected account balance.');

    finance_save_set($db, 9, 'accounts', [
        ['id'=>'next-cc', 'label'=>'Next - CC', 'tipo'=>'corrente', 'saldo'=>10, 'principal'=>true],
    ], false);
    $income = $service->handle(
        9,
        'request_local_income_00001',
        'Ganhei 40 reais, adicione na conta do Next, só tem ela cadastrada',
        'financeiro',
    );
    test_assert_same('applied', $income['status'] ?? null, 'A received one-off amount must execute locally.');
    test_assert_same('avulso', $income['data']['type'] ?? null, 'A one-off received amount must be categorized as avulso.');
    test_assert_equals(50.0, finance_load_set($db, 9, 'accounts')[0]['saldo'], 'One-off income must increase the selected account balance.');
    $savedVariableIncome = finance_load_set($db, 9, 'income_var');
    test_assert_same(1, count($savedVariableIncome), 'One-off income must appear in the variable-income ledger.');
    test_assert_same('next-cc', $savedVariableIncome[0]['accountId'] ?? null, 'One-off income must retain its destination account.');
    test_assert_same(0, $provider->calls, 'A received one-off amount must not depend on an external provider.');
    $undoneIncome = $service->undo(9, (string)$income['actionToken']);
    test_assert_same('undone', $undoneIncome['status'] ?? null, 'A locally registered one-off income must retain safe undo.');
    test_assert_equals(10.0, finance_load_set($db, 9, 'accounts')[0]['saldo'], 'Undo must restore the income destination balance.');
    test_assert_same([], finance_load_set($db, 9, 'income_var'), 'Undo must remove the one-off income ledger entry.');

    finance_save_set($db, 10, 'accounts', [
        ['id'=>'next-cc', 'label'=>'Next - CC', 'tipo'=>'corrente', 'saldo'=>0, 'principal'=>false],
        ['id'=>'nubank-cc', 'label'=>'Nubank - CC', 'tipo'=>'corrente', 'saldo'=>0, 'principal'=>true],
    ], false);
    $namedIncome = $service->handle(
        10,
        'request_named_income_00001',
        'Recebi R$ 25 na conta do Next hoje',
        'financeiro',
    );
    test_assert_same('Next - CC', $namedIncome['data']['account'] ?? null, 'A unique bank token must resolve safely among multiple accounts.');
    $namedAccounts = finance_load_set($db, 10, 'accounts');
    test_assert_equals(25.0, $namedAccounts[0]['saldo'], 'The explicitly named account must receive the income.');
    test_assert_equals(0.0, $namedAccounts[1]['saldo'], 'Other user accounts must remain unchanged.');

    $preview = $service->handle(7, 'request_confirmation_0001', 'Transfira R$ 200 da Conta A para a Conta B', null);

    test_assert_same('confirmation', $preview['status'], 'Transfers must require explicit confirmation before execution.');
    test_assert_true(($preview['confirmationRequired'] ?? false) === true, 'The preview must identify the pending confirmation.');
    $row = $repository->findByToken(7, (string)$preview['actionToken']);
    test_assert_same('confirmation', $row['status'] ?? null, 'The pending route must remain unexecuted.');
    test_assert_same(100, $repository->dailyTokenUsage(7), 'Confirmation routing tokens must be persisted.');

    $cancelled = $service->resolveConfirmation(7, (string)$preview['actionToken'], 'cancel');
    test_assert_same('cancelled', $cancelled['status'], 'The user must be able to cancel without executing the action.');
    test_assert_same('cancelled', $repository->findByToken(7, (string)$preview['actionToken'])['status'] ?? null, 'Cancellation must close the pending action.');
    test_assert_same('cancelled', $repository->history(7, 'geral')[0]['response']['status'] ?? null, 'History must reflect the final cancellation state.');

    $ungrounded = $service->handle(7, 'request_confirmation_0002', 'Transferi R$ 200', 'financeiro');
    test_assert_same('clarification', $ungrounded['status'], 'An account selected by the provider but absent from the user text must not execute.');
    test_assert_same(
        ['conta de origem', 'conta de destino'],
        $ungrounded['data']['missingFields'] ?? null,
        'The assistant must request both transfer accounts when multiple choices exist.',
    );
    test_assert_same(2, count($ungrounded['data']['availableAccounts'] ?? []), 'Only the current user account choices may be returned.');

    $withoutAccounts = $service->handle(8, 'request_confirmation_0003', 'Transferi R$ 200 da Conta A para a Conta B', 'financeiro');
    test_assert_same('clarification', $withoutAccounts['status'], 'A financial action cannot run before the user creates accounts.');
    test_assert_true(($withoutAccounts['data']['requiresAccountSetup'] ?? false) === true, 'The UI must receive an explicit account setup signal.');

    $ritaRefusal = $service->handle(7, 'request_confirmation_0004', 'Qual é o saldo da minha conta?', 'alimentacao');
    test_assert_same('refused', $ritaRefusal['status'] ?? null, 'Rita must refuse requests from another module.');
    test_assert_true(str_contains((string)($ritaRefusal['message'] ?? ''), 'Chef Rita'), 'The refusal must identify the active agent scope.');
};
