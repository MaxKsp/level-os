<?php
declare(strict_types=1);

require_once __DIR__ . '/AssistantActionCatalog.php';

/**
 * Interpreta lançamentos financeiros cotidianos sem depender de um provedor
 * externo. A IA continua disponível para pedidos complexos, mas renda e gasto
 * com valor e conta conhecidos permanecem funcionais mesmo durante uma falha
 * da OpenAI/Gemini.
 */
final class AssistantFinanceInterpreter {
    /** @return list<string> */
    public static function expenseCategories(): array {
        return ['moradia', 'mercado', 'saude', 'eletronicos', 'transporte', 'lazer', 'educacao', 'assinaturas', 'outros'];
    }

    public static function detectAction(string $text, ?string $module): ?string {
        if ($module !== 'financeiro') return null;

        $normalized = self::ascii($text);
        if ($normalized === '' || preg_match('/\b(?:transferir|transferi|transferencia)\b/', $normalized) === 1) {
            return null;
        }
        if (
            str_contains($text, '?')
            || preg_match('/\A(?:qual|quais|quanto|quantos|como|onde|mostre|resumo|analise)\b/', $normalized) === 1
        ) {
            return null;
        }

        if (preg_match(
            '/\b(?:ganhei|recebi|recebido|entrou|caiu|creditaram|depositaram|renda|receita|salario|freela|freelance|comissao|pro labore|seguro desemprego)\b/',
            $normalized,
        ) === 1) {
            return 'add_income';
        }

        if (
            preg_match('/\b(?:gastei|paguei|comprei|debitaram|descontaram|despesa|gasto)\b/', $normalized) === 1
            || preg_match('/\b(?:lancar|registrar|adicionar)\b.{0,24}\br\$/', $normalized) === 1
        ) {
            return 'add_expense';
        }

        return null;
    }

    /**
     * @param array<string,mixed> $context
     * @return array<string,mixed>|null
     */
    public static function route(string $text, ?string $module, array $context): ?array {
        $action = self::detectAction($text, $module);
        if ($action === null) return null;

        $finance = is_array($context['finance'] ?? null) ? $context['finance'] : [];
        $accounts = is_array($finance['accounts'] ?? null)
            ? array_values(array_filter($finance['accounts'], 'is_array'))
            : [];
        if ($action === 'add_income') {
            $accounts = array_values(array_filter(
                $accounts,
                static fn(array $account): bool => (string)($account['type'] ?? '') !== 'cartao',
            ));
        }

        $value = self::money($text);
        $account = self::resolveAccount($text, $accounts);
        $missing = [];
        if ($value === null) $missing[] = 'valor';
        if ($account === null) $missing[] = 'conta';

        if ($missing !== []) {
            if ($accounts === []) {
                return [
                    'clarification' => $missing,
                    'clarificationMessage' => 'Você ainda não possui uma conta compatível cadastrada. Cadastre uma conta em Finanças > Contas antes de fazer este lançamento.',
                    'clarificationData' => ['availableAccounts' => [], 'requiresAccountSetup' => true],
                ];
            }

            $options = array_map(static fn(array $item): array => [
                'id' => (string)($item['id'] ?? ''),
                'label' => (string)($item['label'] ?? ''),
                'type' => (string)($item['type'] ?? ''),
            ], array_slice($accounts, 0, 20));
            $message = $value === null
                ? 'Informe o valor do lançamento.'
                : 'Escolha a conta. Contas disponíveis: ' . implode(', ', array_column($options, 'label')) . '.';

            return [
                'clarification' => $missing,
                'clarificationMessage' => $message,
                'clarificationData' => ['availableAccounts' => $options, 'requiresAccountSetup' => false],
            ];
        }

        $today = is_string($context['today'] ?? null) ? (string)$context['today'] : date('Y-m-d');
        $date = self::date($text, $today);
        $accountLabel = (string)$account['label'];

        if ($action === 'add_income') {
            return assistant_validate_route('add_income', [
                'value' => $value,
                'date' => $date,
                'type' => self::incomeType($text),
                'account' => $accountLabel,
                'payday' => (int)substr($date, 8, 2),
            ]);
        }

        $category = self::expenseCategory($text);
        return assistant_validate_route('add_expense', [
            'value' => $value,
            'date' => $date,
            'category' => $category,
            'account' => $accountLabel,
            'description' => self::expenseDescription($text, $category),
        ]);
    }

    private static function money(string $text): ?float {
        $patterns = [
            '/r\$\s*([0-9][0-9.\s]*(?:,[0-9]{1,2})?)/iu',
            '/\b([0-9][0-9.\s]*(?:,[0-9]{1,2})?)\s*(?:reais?|brl)\b/iu',
            '/\b(?:gastei|paguei|comprei|ganhei|recebi|entrou|caiu|lancar|registrar|adicionar)\s+(?:r\$\s*)?([0-9]+(?:[.,][0-9]{1,2})?)/iu',
        ];
        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $text, $match) !== 1) continue;
            $raw = preg_replace('/\s+/', '', (string)$match[1]) ?? '';
            if ($raw === '') continue;
            if (str_contains($raw, ',')) {
                $raw = str_replace(['.', ','], ['', '.'], $raw);
            } elseif (substr_count($raw, '.') > 1 || preg_match('/\.\d{3}\z/', $raw) === 1) {
                $raw = str_replace('.', '', $raw);
            }
            $value = (float)$raw;
            if (is_finite($value) && $value > 0 && $value <= 1_000_000_000) return $value;
        }
        return null;
    }

    /** @param list<array<string,mixed>> $accounts @return array<string,mixed>|null */
    private static function resolveAccount(string $text, array $accounts): ?array {
        if (count($accounts) === 1) return $accounts[0];
        if ($accounts === []) return null;

        $normalizedText = self::ascii($text);
        if (str_contains($normalizedText, 'principal')) {
            $principal = array_values(array_filter(
                $accounts,
                static fn(array $account): bool => ($account['principal'] ?? false) === true,
            ));
            if (count($principal) === 1) return $principal[0];
        }

        $scores = [];
        foreach ($accounts as $index => $account) {
            $label = self::ascii((string)($account['label'] ?? ''));
            if ($label !== '' && str_contains($normalizedText, $label)) {
                $scores[$index] = 1000 + strlen($label);
                continue;
            }
            $tokens = preg_split('/[^a-z0-9]+/', $label, -1, PREG_SPLIT_NO_EMPTY) ?: [];
            $tokens = array_values(array_filter($tokens, static fn(string $token): bool =>
                strlen($token) >= 3 && !in_array($token, [
                    'conta', 'corrente', 'poupanca', 'cartao', 'credito', 'debito', 'principal',
                ], true),
            ));
            $scores[$index] = array_sum(array_map(
                static fn(string $token): int => str_contains($normalizedText, $token) ? strlen($token) : 0,
                $tokens,
            ));
        }
        $best = max($scores);
        if ($best <= 0) return null;
        $matches = array_keys(array_filter($scores, static fn(int $score): bool => $score === $best));
        return count($matches) === 1 ? $accounts[$matches[0]] : null;
    }

    private static function date(string $text, string $today): string {
        if (preg_match('/\b(\d{4})-(\d{2})-(\d{2})\b/', $text, $match) === 1) {
            return checkdate((int)$match[2], (int)$match[3], (int)$match[1]) ? $match[0] : $today;
        }
        if (preg_match('/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/', $text, $match) === 1) {
            if (checkdate((int)$match[2], (int)$match[1], (int)$match[3])) {
                return sprintf('%04d-%02d-%02d', (int)$match[3], (int)$match[2], (int)$match[1]);
            }
        }
        $normalized = self::ascii($text);
        $base = DateTimeImmutable::createFromFormat('!Y-m-d', $today) ?: new DateTimeImmutable('today');
        if (str_contains($normalized, 'anteontem')) return $base->modify('-2 days')->format('Y-m-d');
        if (str_contains($normalized, 'ontem')) return $base->modify('-1 day')->format('Y-m-d');
        if (str_contains($normalized, 'amanha')) return $base->modify('+1 day')->format('Y-m-d');
        return $base->format('Y-m-d');
    }

    private static function incomeType(string $text): string {
        $normalized = self::ascii($text);
        if (self::containsAny($normalized, ['salario', 'aluguel recebido', 'renda fixa', 'todo mes', 'mensal'])) return 'fixa';
        if (self::containsAny($normalized, ['comissao', 'renda variavel', 'ifood', 'uber', 'freela recorrente'])) return 'variavel';
        if (self::containsAny($normalized, ['seguro desemprego', 'temporaria', 'momentanea', 'ate o mes'])) return 'momentanea';
        return 'avulso';
    }

    private static function expenseCategory(string $text): string {
        $normalized = self::ascii($text);
        $categories = [
            'moradia' => ['aluguel', 'condominio', 'agua', 'energia', 'luz', 'gas', 'iptu', 'moradia'],
            'mercado' => ['alimentacao', 'comida', 'mercado', 'supermercado', 'restaurante', 'delivery', 'ifood', 'padaria', 'acougue', 'almoco', 'jantar', 'lanche'],
            'saude' => ['saude', 'farmacia', 'medico', 'hospital', 'dentista', 'terapia', 'convenio', 'remedio'],
            'eletronicos' => ['eletronico', 'celular', 'smartphone', 'notebook', 'computador', 'tablet', 'fone'],
            'transporte' => ['transporte', 'uber', '99', 'gasolina', 'combustivel', 'onibus', 'metro', 'estacionamento', 'pedagio'],
            'lazer' => ['lazer', 'cinema', 'bar', 'viagem', 'show', 'jogo', 'passeio'],
            'educacao' => ['educacao', 'curso', 'faculdade', 'escola', 'livro', 'material escolar'],
            'assinaturas' => ['assinatura', 'netflix', 'spotify', 'prime', 'disney', 'hbo', 'youtube premium', 'mensalidade'],
        ];
        foreach ($categories as $category => $needles) {
            if (self::containsAny($normalized, $needles)) return $category;
        }
        return 'outros';
    }

    private static function expenseDescription(string $text, string $category): string {
        $normalized = self::ascii($text);
        $merchantLabels = [
            'ifood' => 'iFood', 'uber' => 'Uber', 'netflix' => 'Netflix', 'spotify' => 'Spotify',
            'supermercado' => 'Supermercado', 'mercado' => 'Mercado', 'farmacia' => 'Farmácia',
            'gasolina' => 'Gasolina', 'combustivel' => 'Combustível', 'aluguel' => 'Aluguel',
            'condominio' => 'Condomínio', 'alimentacao' => 'Alimentação',
        ];
        foreach ($merchantLabels as $needle => $label) {
            if (str_contains($normalized, $needle)) return $label;
        }
        return [
            'moradia' => 'Moradia',
            'mercado' => 'Mercado',
            'saude' => 'Saúde',
            'eletronicos' => 'Eletrônicos',
            'transporte' => 'Transporte',
            'lazer' => 'Lazer',
            'educacao' => 'Educação',
            'assinaturas' => 'Assinatura',
            'outros' => 'Despesa',
        ][$category] ?? 'Despesa';
    }

    /** @param list<string> $needles */
    private static function containsAny(string $value, array $needles): bool {
        foreach ($needles as $needle) if (str_contains($value, $needle)) return true;
        return false;
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
