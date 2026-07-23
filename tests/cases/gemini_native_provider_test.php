<?php
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';
require_once dirname(__DIR__, 2) . '/app/Modules/Assistant/GeminiNativeProvider.php';
require_once dirname(__DIR__, 2) . '/app/Modules/Assistant/AssistantActionCatalog.php';

return static function (): void {
    $request = GeminiNativeProvider::buildRequest([
        'messages' => [
            ['role'=>'system','content'=>'Route one action.'],
            ['role'=>'user','content'=>'Criar tarefa pagar conta amanhã às 09:00'],
        ],
        'temperature' => 0,
        'max_tokens' => 420,
        'tools' => assistant_tools('agenda', ['add_task']),
        'preferred_tool' => 'add_task',
    ]);

    test_assert_same('Route one action.', $request['systemInstruction']['parts'][0]['text'], 'Gemini must receive a native system instruction.');
    test_assert_same('user', $request['contents'][0]['role'], 'User content must use Gemini roles.');
    test_assert_same(420, $request['generationConfig']['maxOutputTokens'], 'The action token budget must be preserved.');
    test_assert_same(0, $request['generationConfig']['thinkingConfig']['thinkingBudget'], 'Routing must not spend thinking tokens.');
    $declarations = $request['tools'][0]['functionDeclarations'];
    test_assert_same(1, count($declarations), 'The native request must contain only the focused function.');
    test_assert_same('add_task', $declarations[0]['name'], 'The native function name must be preserved.');
    test_assert_same('OBJECT', $declarations[0]['parameters']['type'], 'JSON schema types must use Gemini native casing.');
    test_assert_true(!isset($declarations[0]['parameters']['properties']['title']['minLength']), 'Unsupported JSON Schema limits must not be sent to Gemini function declarations.');
    test_assert_true(!isset($declarations[0]['parameters']['properties']['date']['pattern']), 'Server-only format patterns must not make Gemini reject the request.');
    test_assert_same('ANY', $request['toolConfig']['functionCallingConfig']['mode'], 'A focused prompt must require its function.');
    test_assert_same(['add_task'], $request['toolConfig']['functionCallingConfig']['allowedFunctionNames'], 'Only the inferred function may be called.');

    $response = GeminiNativeProvider::normalizeResponse([
        'candidates' => [[
            'content' => ['parts' => [[
                'functionCall' => [
                    'name' => 'add_task',
                    'args' => ['title'=>'pagar conta','date'=>'2026-07-19','time'=>'09:00'],
                ],
            ]]],
        ]],
        'usageMetadata' => [
            'promptTokenCount' => 91,
            'candidatesTokenCount' => 17,
            'totalTokenCount' => 108,
        ],
    ]);
    test_assert_same('add_task', $response['choices'][0]['message']['tool_calls'][0]['function']['name'], 'Gemini function calls must normalize to the router contract.');
    test_assert_same(91, $response['usage']['prompt_tokens'], 'Gemini input token usage must be retained.');
    test_assert_same(108, $response['usage']['total_tokens'], 'Gemini total token usage must be retained.');
};
