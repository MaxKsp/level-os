<?php
declare(strict_types=1);

require_once __DIR__ . '/AssistantActionCatalog.php';
require_once __DIR__ . '/AssistantFinanceInterpreter.php';
require_once __DIR__ . '/AssistantAgentPolicy.php';

final class AssistantPromptOptimizer {
    /**
     * O agente global apenas identifica o modulo. Empates e pedidos genericos
     * falham fechados para que nenhum agente receba contexto de outro dominio.
     */
    public static function detectModule(string $text): ?string {
        $normalized = self::ascii($text);
        if ($normalized === '' || self::isOutOfScope($text, null)) return null;

        $explicit = self::explicitDomainIntents($normalized);
        if (count($explicit) > 1) return null;
        if (count($explicit) === 1) return $explicit[0];

        $matches = [];
        foreach (self::domainSignals() as $module => $signals) {
            if (self::containsAny($normalized, $signals)) $matches[] = $module;
        }
        if (count($matches) > 1) return null;
        return count($matches) === 1 ? $matches[0] : null;
    }

    /**
     * Guardrail local de baixo custo. Bloqueia injecao de prompt e pedidos
     * claramente pertencentes a outro agente antes de consumir quota externa.
     */
    public static function isOutOfScope(string $text, ?string $module): bool {
        $normalized = self::ascii($text);
        if ($normalized === '') return false;

        if (self::containsAny($normalized, [
            'ignore as instrucoes', 'ignore instrucoes', 'revele o prompt', 'mostre o prompt',
            'prompt do sistema', 'system prompt', 'jailbreak', 'modo desenvolvedor',
            'finja que nao tem regras', 'ignore as regras', 'ignore regras', 'ignore todas as regras', 'desconsidere as instrucoes',
            'desconsidere instrucoes', 'developer message', 'bypass', 'mostre a chave', 'revele a chave',
            'api key', 'token secreto', 'credenciais internas', 'senha do banco', 'execute sql',
        ])) {
            return true;
        }

        $explicitDomains = self::explicitDomainIntents($normalized);
        if (count($explicitDomains) > 1) return true;
        if ($module !== null && $explicitDomains !== [] && $explicitDomains[0] !== $module) return true;

        // Uma ação inequívoca do módulo tem precedência sobre palavras usadas
        // apenas como categoria ou descrição. Ex.: "lançar gasto de alimentação"
        // continua financeiro, e "criar tarefa de treinar" continua agenda.
        if (self::preferredAction($text, $module) !== null) return false;

        $signals = self::domainSignals();
        if ($module !== null && isset($signals[$module])) {
            $explicitDomain = self::explicitDomainIntent($normalized);
            if ($explicitDomain !== null) return $explicitDomain !== $module;

            $foreignSignal = false;
            foreach ($signals as $domain => $needles) {
                if ($domain !== $module && self::containsAny($normalized, $needles)) {
                    $foreignSignal = true;
                    break;
                }
            }
            // Falha fechada: sinais simultâneos do agente atual e de outro
            // agente nunca autorizam uma resposta cruzada.
            if ($foreignSignal) return true;
            if (self::containsAny($normalized, $signals[$module])) return false;
        } elseif ($module === null) {
            foreach ($signals as $needles) {
                if (self::containsAny($normalized, $needles)) return false;
            }
        }

        return self::containsAny($normalized, [
            'escreva um poema', 'conte uma piada', 'previsao do tempo', 'noticias de hoje',
            'eleicao', 'politica', 'presidente', 'traduzir texto', 'traducao',
            'programar em', 'codigo fonte', 'sql injection', 'hackear', 'malware',
        ]);
    }

    /**
     * Consultas suportadas pelo executor nao precisam de um LLM para descobrir
     * que sao consultas. Os dados continuam sendo lidos somente no servidor.
     *
     * @return array{action:string,arguments:array<string,mixed>}|null
     */
    public static function localRoute(string $text, ?string $module): ?array {
        $trimmed = trim($text);
        if ($trimmed === '' || mb_strlen($trimmed) > 500) return null;
        $normalized = mb_strtolower($trimmed, 'UTF-8');
        if (self::containsAny($normalized, ['registrar','adicionar','criar','lançar','lancar','transferir','montar'])) {
            return null;
        }
        $question = str_contains($trimmed, '?')
            || preg_match('/\A(?:qual|quais|quanto|quantos|como|onde|mostre|resumo|analise)\b/u', $normalized) === 1;
        if (!$question) return null;

        $supported = match ($module) {
            'financeiro' => self::containsAny($normalized, ['saldo','patrim','gasto','gastei','gastando','despesa','categoria','dinheiro','renda','receita','ganhei','recebi']),
            'agenda' => self::containsAny($normalized, ['produtividade','tarefa','rotina']),
            'treinos' => self::containsAny($normalized, ['treino','cardio','imc','peso','medida']),
            'alimentacao' => self::containsAny($normalized, ['alimentacao','alimentação','dieta','plano alimentar','cardapio','cardápio','refeicao','refeição']),
            default => self::containsAny($normalized, [
                'saldo','patrim','gasto','gastei','gastando','despesa','categoria','dinheiro',
                'produtividade','tarefa','rotina','treino','cardio','imc','peso','medida',
                'alimentacao','alimentação','dieta','plano alimentar','cardapio','cardápio','refeicao','refeição',
            ]),
        };
        return $supported ? assistant_validate_route('query', ['question' => $trimmed]) : null;
    }

    /** Retorna uma ferramenta apenas quando o proprio texto torna a intencao inequivoca. */
    public static function preferredAction(string $text, ?string $module): ?string {
        $normalized = self::ascii($text);
        return match ($module) {
            'alimentacao' => str_starts_with($normalized, 'monte um plano alimentar') ? 'create_diet_plan' : null,
            'agenda' => preg_match('/\b(?:criar|adicionar|registrar) (?:uma )?tarefa\b/', $normalized) === 1 ? 'add_task' : null,
            'financeiro' => match (true) {
                preg_match('/\b(?:transferir|transferi|transferencia)\b/', $normalized) === 1 => 'add_transfer',
                AssistantFinanceInterpreter::detectAction($text, $module) !== null
                    => AssistantFinanceInterpreter::detectAction($text, $module),
                default => null,
            },
            'treinos' => match (true) {
                str_starts_with($normalized, 'monte um programa de treino') => 'create_workout_program',
                str_starts_with($normalized, 'registrar peso '), str_starts_with($normalized, 'registrar medida ') => 'log_measurement',
                default => null,
            },
            default => null,
        };
    }

    public static function maxOutputTokens(?string $module, ?string $preferredAction): int {
        return match ($preferredAction) {
            'create_diet_plan' => 4600,
            'create_workout_program' => 3200,
            'create_workout' => 1800,
            'query' => 192,
            'add_expense','add_income','add_transfer','add_task','log_measurement','log_cardio','log_workout_session' => 420,
            default => match ($module) {
                'financeiro','agenda' => 520,
                'treinos' => 2400,
                'alimentacao' => 4600,
                default => 1600,
            },
        };
    }

    /** @param list<string> $needles */
    private static function containsAny(string $value, array $needles): bool {
        foreach ($needles as $needle) if (str_contains($value, $needle)) return true;
        return false;
    }

    /** @return array<string,list<string>> */
    private static function domainSignals(): array {
        $signals = [];
        foreach (AssistantAgentPolicy::all() as $module => $policy) {
            $signals[$module] = array_values(array_map(
                static fn(string $signal): string => self::ascii($signal),
                $policy['signals'],
            ));
        }
        return $signals;
    }

    /**
     * Detecta intenções explícitas antes dos sinais genéricos. Isso evita que
     * termos como "alimentação" (categoria financeira) ou "treino" (texto de
     * uma tarefa) façam um agente responder pelo domínio errado.
     */
    private static function explicitDomainIntent(string $normalized): ?string {
        return self::explicitDomainIntents($normalized)[0] ?? null;
    }

    /** @return list<string> */
    private static function explicitDomainIntents(string $normalized): array {
        $patterns = [
            'financeiro' => [
                '/\b(?:quanto|onde|como).{0,32}\b(?:gastei|gasto|despesa|saldo|fatura|patrimonio)\b/',
                '/\b(?:saldo|patrimonio|fatura|conta bancaria|cartao de credito)\b/',
                '/\b(?:lancar|registrar|adicionar)\b.{0,24}\b(?:despesa|gasto|renda|receita)\b/',
                '/\b(?:lancar|registrar|adicionar)\b.{0,32}(?:r\$|\b\d+(?:[.,]\d{1,2})?\s*reais?\b)/',
                '/\b(?:ganhei|recebi)\b.{0,32}\b(?:reais|r\$|conta|renda|receita)\b/',
                '/\b(?:transferir|transfira|transfiro|transferi|transferencia)\b.{0,32}\b(?:conta|banco|reais|r\$)\b/',
            ],
            'agenda' => [
                '/\b(?:criar|adicionar|registrar|concluir)\b.{0,24}\b(?:tarefa|compromisso|lembrete)\b/',
                '/\b(?:minhas|mostrar|mostre|ver|quais)\b.{0,24}\b(?:tarefas|compromissos|lembretes)\b/',
                '/\b(?:agenda|tarefas pendentes|produtividade|compromissos|calendario)\b/',
            ],
            'alimentacao' => [
                '/\b(?:montar|criar|sugerir|preparar)\b.{0,32}\b(?:dieta|cardapio|refeicao|receita|plano alimentar)\b/',
                '/\b(?:dieta|cardapio|plano alimentar|refeicao|receita culinaria|nutricao|calorias|macronutrientes)\b/',
            ],
            'treinos' => [
                '/\b(?:montar|criar|registrar|fazer)\b.{0,24}\b(?:treino|exercicio|cardio|corrida)\b/',
                '/\b(?:treino|exercicio|academia|cardio|musculacao|series|repeticoes|medida corporal|peso corporal)\b/',
            ],
        ];
        $matches = [];
        foreach ($patterns as $domain => $domainPatterns) {
            foreach ($domainPatterns as $pattern) {
                if (preg_match($pattern, $normalized) === 1) {
                    $matches[] = $domain;
                    break;
                }
            }
        }
        return $matches;
    }

    private static function ascii(string $value): string {
        $value = mb_strtolower(trim($value), 'UTF-8');
        $value = strtr($value, [
            'á'=>'a', 'à'=>'a', 'â'=>'a', 'ã'=>'a', 'ä'=>'a',
            'é'=>'e', 'è'=>'e', 'ê'=>'e', 'ë'=>'e',
            'í'=>'i', 'ì'=>'i', 'î'=>'i', 'ï'=>'i',
            'ó'=>'o', 'ò'=>'o', 'ô'=>'o', 'õ'=>'o', 'ö'=>'o',
            'ú'=>'u', 'ù'=>'u', 'û'=>'u', 'ü'=>'u', 'ç'=>'c',
        ]);
        $ascii = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value);
        return preg_replace('/\s+/', ' ', is_string($ascii) ? $ascii : $value) ?? $value;
    }
}
