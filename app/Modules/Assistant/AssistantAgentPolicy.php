<?php
declare(strict_types=1);

require_once __DIR__ . '/AssistantActionCatalog.php';

/**
 * Carrega os contratos versionados dos agentes.
 *
 * Os arquivos XML sao configuracao confiavel do aplicativo, nunca entrada do
 * usuario. Mesmo assim, as acoes declaradas no XML precisam ser exatamente as
 * do catalogo PHP: editar um prompt jamais amplia permissoes no servidor.
 */
final class AssistantAgentPolicy {
    private const MODULES = ['financeiro', 'agenda', 'treinos', 'alimentacao'];

    /** @var array<string,array<string,mixed>> */
    private static array $cache = [];

    public static function isModule(?string $module): bool {
        return is_string($module) && in_array($module, self::MODULES, true);
    }

    /** @return list<string> */
    public static function modules(): array {
        return self::MODULES;
    }

    public static function assertActionAllowed(string $module, string $action): void {
        $policy = self::forModule($module);
        if (!in_array($action, $policy['allowedActions'], true)
            || !assistant_action_allowed_for_module($action, $module)) {
            throw new AssistantRouteException('Acao nao autorizada para este agente.');
        }
    }

    /** @return array<string,mixed> */
    public static function forModule(string $module): array {
        if (!self::isModule($module)) throw new InvalidArgumentException('Modulo de agente invalido.');
        if (isset(self::$cache[$module])) return self::$cache[$module];

        $path = __DIR__ . '/Prompts/' . $module . '.xml';
        $xml = file_get_contents($path, false, null, 0, 32769);
        if (!is_string($xml) || $xml === '' || strlen($xml) > 32768) {
            throw new RuntimeException('Contrato XML do agente indisponivel.');
        }
        if (stripos($xml, '<!DOCTYPE') !== false || stripos($xml, '<!ENTITY') !== false) {
            throw new RuntimeException('Contrato XML do agente inseguro.');
        }
        self::validateSchema($xml);

        $id = self::single($xml, 'id');
        if ($id !== $module) throw new RuntimeException('Contrato XML associado ao modulo incorreto.');

        $allowedActions = self::items($xml, 'allowedActions');
        $serverActions = assistant_action_names_for_module($module);
        $declared = $allowedActions;
        $expected = $serverActions;
        sort($declared);
        sort($expected);
        if ($declared !== $expected) {
            throw new RuntimeException('Contrato XML diverge do catalogo seguro de acoes.');
        }

        $policy = [
            'id' => $id,
            'version' => self::single($xml, 'version'),
            'name' => self::single($xml, 'name'),
            'role' => self::single($xml, 'role'),
            'scope' => self::single($xml, 'scope'),
            'refusal' => self::single($xml, 'refusal'),
            'responseContract' => self::single($xml, 'responseContract'),
            'allowedActions' => $allowedActions,
            'signals' => self::items($xml, 'signals'),
            'allowedTopics' => self::items($xml, 'allowedTopics'),
            'dataAccess' => self::items($xml, 'dataAccess'),
            'guardrails' => self::items($xml, 'guardrails'),
            'prompt' => $xml,
            'hash' => hash('sha256', $xml),
        ];
        foreach (['version','name','role','scope','refusal','responseContract'] as $required) {
            if ($policy[$required] === '') throw new RuntimeException('Contrato XML incompleto: ' . $required . '.');
        }
        if ($policy['signals'] === [] || $policy['allowedTopics'] === [] || $policy['guardrails'] === []) {
            throw new RuntimeException('Contrato XML sem limites de dominio.');
        }

        self::$cache[$module] = $policy;
        return $policy;
    }

    /** @return array<string,array<string,mixed>> */
    public static function all(): array {
        $policies = [];
        foreach (self::MODULES as $module) $policies[$module] = self::forModule($module);
        return $policies;
    }

    private static function validateSchema(string $xml): void {
        if (!class_exists('DOMDocument')) {
            throw new RuntimeException('Extensao DOM obrigatoria para validar os contratos XML dos agentes.');
        }
        $schema = __DIR__ . '/Prompts/assistant-agent.xsd';
        if (!is_file($schema)) throw new RuntimeException('Schema XML dos agentes indisponivel.');

        $previous = libxml_use_internal_errors(true);
        libxml_clear_errors();
        try {
            $document = new DOMDocument();
            $loaded = $document->loadXML($xml, LIBXML_NONET | LIBXML_NOBLANKS | LIBXML_NOCDATA);
            if (!$loaded || !$document->schemaValidate($schema)) {
                throw new RuntimeException('Contrato XML do agente invalido para o schema atual.');
            }
        } finally {
            libxml_clear_errors();
            libxml_use_internal_errors($previous);
        }
    }

    private static function single(string $xml, string $tag): string {
        $quoted = preg_quote($tag, '~');
        if (preg_match('~<' . $quoted . '>\s*(.*?)\s*</' . $quoted . '>~su', $xml, $match) !== 1) return '';
        return trim(html_entity_decode(strip_tags((string)$match[1]), ENT_QUOTES | ENT_XML1, 'UTF-8'));
    }

    /** @return list<string> */
    private static function items(string $xml, string $container): array {
        $quoted = preg_quote($container, '~');
        if (preg_match('~<' . $quoted . '>\s*(.*?)\s*</' . $quoted . '>~su', $xml, $section) !== 1) return [];
        if (preg_match_all('~<item>\s*(.*?)\s*</item>~su', (string)$section[1], $matches) === false) return [];
        $items = [];
        foreach ($matches[1] ?? [] as $value) {
            $item = trim(html_entity_decode(strip_tags((string)$value), ENT_QUOTES | ENT_XML1, 'UTF-8'));
            if ($item !== '' && !in_array($item, $items, true)) $items[] = $item;
        }
        return $items;
    }
}
