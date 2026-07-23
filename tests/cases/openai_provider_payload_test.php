<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';
require_once dirname(__DIR__, 2) . '/app/Modules/Assistant/OpenAiCompatibleProvider.php';

return static function (): void {
    $payload = OpenAiCompatibleProvider::preparePayload([
        'messages' => [['role'=>'user','content'=>'Criar tarefa']],
        'temperature' => 0,
        'max_tokens' => 420,
        'tools' => [],
        'preferred_tool' => 'add_task',
    ], 'gpt-5-nano', true, true);

    test_assert_same('gpt-5-nano', $payload['model'], 'The configured OpenAI model must be preserved.');
    test_assert_same(420, $payload['max_completion_tokens'], 'GPT-5 must use max_completion_tokens.');
    test_assert_true(!array_key_exists('max_tokens', $payload), 'GPT-5 must not receive the unsupported max_tokens field.');
    test_assert_true(!array_key_exists('temperature', $payload), 'GPT-5 nano must use its supported default temperature.');
    test_assert_same('minimal', $payload['reasoning_effort'], 'Simple action routing must minimize reasoning cost.');
    test_assert_same('add_task', $payload['tool_choice']['function']['name'], 'The inferred function must remain focused.');
    test_assert_true(!array_key_exists('preferred_tool', $payload), 'Internal routing metadata must not be sent to OpenAI.');

    $compatible = OpenAiCompatibleProvider::preparePayload([
        'temperature'=>0,
        'max_tokens'=>100,
    ], 'another-model', false, false);
    test_assert_same(0, $compatible['temperature'], 'Non-OpenAI-compatible providers must retain their parameters.');
    test_assert_same(100, $compatible['max_tokens'], 'Non-OpenAI-compatible providers must retain max_tokens.');
};
