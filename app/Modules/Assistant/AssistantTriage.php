<?php
declare(strict_types=1);

require_once __DIR__ . '/AssistantPromptOptimizer.php';
require_once __DIR__ . '/AssistantAgentPolicy.php';

/**
 * Triagem deterministica do Agente de IA geral.
 *
 * Esta camada nao recebe ferramentas, nao consulta dados do usuario e nao
 * chama provedores externos. Ela apenas identifica o dominio e prepara uma
 * transferencia explicita para um especialista.
 */
final class AssistantTriage {
    /** @return array<string,mixed> */
    public static function analyze(string $text): array {
        if (AssistantPromptOptimizer::isOutOfScope($text, null)) {
            return [
                'status' => 'refused',
                'message' => 'O Agente de IA geral apenas identifica qual especialista do Level OS deve atender o pedido.',
                'module' => null,
                'data' => ['agentChoices' => self::choices()],
            ];
        }

        $module = AssistantPromptOptimizer::detectModule($text);
        if ($module === null) {
            return [
                'status' => 'clarification',
                'message' => 'Qual especialista deve cuidar disso: Financas, Rotina, Treinos ou Alimentacao?',
                'module' => null,
                'data' => ['agentChoices' => self::choices()],
            ];
        }

        $policy = AssistantAgentPolicy::forModule($module);
        return [
            'status' => 'routed',
            'action' => 'route_to_agent',
            'message' => 'Este pedido pertence a ' . self::areaLabel($module) . '. '
                . $policy['name'] . ' e o especialista indicado. Nenhum dado foi consultado e nenhuma acao foi executada.',
            'module' => $module,
            'data' => [
                'handoff' => [
                    'module' => $module,
                    'agent' => $policy['name'],
                    'role' => $policy['role'],
                    'scope' => $policy['scope'],
                    'suggestedPrompt' => mb_substr(trim($text), 0, 500),
                ],
            ],
        ];
    }

    /** @return list<array{module:string,label:string}> */
    private static function choices(): array {
        $choices = [];
        foreach (AssistantAgentPolicy::modules() as $module) {
            $policy = AssistantAgentPolicy::forModule($module);
            $choices[] = ['module' => $module, 'label' => (string)$policy['name']];
        }
        return $choices;
    }

    private static function areaLabel(string $module): string {
        return match ($module) {
            'financeiro' => 'Financas',
            'agenda' => 'Rotina',
            'treinos' => 'Treinos',
            'alimentacao' => 'Alimentacao',
            default => 'um modulo especializado',
        };
    }
}
