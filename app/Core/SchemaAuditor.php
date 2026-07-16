<?php
declare(strict_types=1);

/**
 * Fase 4B - Auditoria de compatibilidade de schema e indices. Compara um
 * contrato declarativo minimo (config/schema-contract.php) contra o banco
 * real via um introspector injetavel, sem nunca executar DDL/DML nem ler
 * dados das tabelas. Sem framework, sem carregar config.php — so recebe
 * um SchemaIntrospector ja construido (o CLI e quem monta o real com
 * get_db()).
 */

/** Catalogo fechado de codigos de issue. */
const SCHEMA_AUDITOR_ISSUE_CODES = [
    'missing_table',
    'missing_column',
    'incompatible_type',
    'incompatible_unsigned',
    'incompatible_nullability',
    'missing_primary_key',
    'missing_index',
    'incompatible_index_order',
    'incompatible_index_uniqueness',
    'missing_foreign_key',
    'incompatible_foreign_key_delete_rule',
    'unexpected_critical_structure',
];

const SCHEMA_AUDITOR_SEVERITIES = ['error', 'warning'];

const SCHEMA_AUDITOR_ON_DELETE_RULES = ['CASCADE', 'SET NULL', 'RESTRICT', 'NO ACTION', 'SET DEFAULT'];

/** Tipos-base cujo tamanho (length/precision+scale) e semanticamente relevante. */
const SCHEMA_AUDITOR_SIZED_TYPES = ['varchar', 'char', 'decimal'];

/** Tipos-base que suportam unsigned (comparado so para estes). */
const SCHEMA_AUDITOR_UNSIGNED_TYPES = ['int', 'bigint', 'tinyint', 'smallint', 'mediumint'];

/** Alias de tipo -> forma base normalizada. Ignora casing (chamador ja faz strtolower). */
const SCHEMA_AUDITOR_TYPE_ALIASES = [
    'int' => 'int',
    'integer' => 'int',
    'bigint' => 'bigint',
    'smallint' => 'smallint',
    'mediumint' => 'mediumint',
    'tinyint' => 'tinyint',
    'varchar' => 'varchar',
    'character varying' => 'varchar',
    'char' => 'char',
    'character' => 'char',
    'text' => 'text',
    'tinytext' => 'text',
    'mediumtext' => 'mediumtext',
    'longtext' => 'longtext',
    'decimal' => 'decimal',
    'numeric' => 'decimal',
    'datetime' => 'datetime',
    'timestamp' => 'timestamp',
    'date' => 'date',
    'time' => 'time',
    'json' => 'json',
    'enum' => 'enum',
];

/** Contrato de introspeccao: cada metodo devolve metadata ja normalizavel, nunca dado de linha. */
interface SchemaIntrospector {
    public function tableExists(string $table): bool;

    /** @return array<string, array{type: string, unsigned?: bool, nullable: bool, length?: ?int, precision?: ?int, scale?: ?int}> */
    public function columns(string $table): array;

    /** @return list<string> colunas da PRIMARY KEY, em ordem. Lista vazia = sem PK. */
    public function primaryKey(string $table): array;

    /** @return array<string, array{columns: list<string>, unique: bool}> indices nao-PRIMARY, por nome. */
    public function indexes(string $table): array;

    /** @return list<array{column: string, ref_table: string, ref_column: string, on_delete: string}> */
    public function foreignKeys(string $table): array;
}

/**
 * Introspector real via information_schema do MySQL. Nunca executado
 * pelos testes (que sempre injetam um fake) — so pelo CLI real, contra o
 * banco de producao.
 */
final class MysqlInformationSchemaIntrospector implements SchemaIntrospector {
    public function __construct(private PDO $db) {
    }

    public function tableExists(string $table): bool {
        $stmt = $this->db->prepare(
            'SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1'
        );
        $stmt->execute([$table]);
        return $stmt->fetch() !== false;
    }

    public function columns(string $table): array {
        $stmt = $this->db->prepare(
            'SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, IS_NULLABLE,
                    CHARACTER_MAXIMUM_LENGTH, NUMERIC_PRECISION, NUMERIC_SCALE
             FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
             ORDER BY ORDINAL_POSITION'
        );
        $stmt->execute([$table]);

        $columns = [];
        foreach ($stmt->fetchAll() as $row) {
            $columns[$row['COLUMN_NAME']] = [
                'type' => (string)$row['DATA_TYPE'],
                'unsigned' => str_contains(strtolower((string)$row['COLUMN_TYPE']), 'unsigned'),
                'nullable' => strtoupper((string)$row['IS_NULLABLE']) === 'YES',
                'length' => $row['CHARACTER_MAXIMUM_LENGTH'] !== null ? (int)$row['CHARACTER_MAXIMUM_LENGTH'] : null,
                'precision' => $row['NUMERIC_PRECISION'] !== null ? (int)$row['NUMERIC_PRECISION'] : null,
                'scale' => $row['NUMERIC_SCALE'] !== null ? (int)$row['NUMERIC_SCALE'] : null,
            ];
        }
        return $columns;
    }

    public function primaryKey(string $table): array {
        $stmt = $this->db->prepare(
            "SELECT COLUMN_NAME FROM information_schema.STATISTICS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = 'PRIMARY'
             ORDER BY SEQ_IN_INDEX"
        );
        $stmt->execute([$table]);
        return array_column($stmt->fetchAll(), 'COLUMN_NAME');
    }

    public function indexes(string $table): array {
        $stmt = $this->db->prepare(
            "SELECT INDEX_NAME, COLUMN_NAME, NON_UNIQUE FROM information_schema.STATISTICS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME <> 'PRIMARY'
             ORDER BY INDEX_NAME, SEQ_IN_INDEX"
        );
        $stmt->execute([$table]);

        $indexes = [];
        foreach ($stmt->fetchAll() as $row) {
            $name = (string)$row['INDEX_NAME'];
            $indexes[$name]['columns'][] = (string)$row['COLUMN_NAME'];
            $indexes[$name]['unique'] = ((int)$row['NON_UNIQUE']) === 0;
        }
        return $indexes;
    }

    public function foreignKeys(string $table): array {
        $stmt = $this->db->prepare(
            'SELECT kcu.COLUMN_NAME, kcu.REFERENCED_TABLE_NAME, kcu.REFERENCED_COLUMN_NAME, rc.DELETE_RULE
             FROM information_schema.KEY_COLUMN_USAGE kcu
             JOIN information_schema.REFERENTIAL_CONSTRAINTS rc
               ON rc.CONSTRAINT_SCHEMA = kcu.CONSTRAINT_SCHEMA AND rc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
             WHERE kcu.TABLE_SCHEMA = DATABASE() AND kcu.TABLE_NAME = ? AND kcu.REFERENCED_TABLE_NAME IS NOT NULL'
        );
        $stmt->execute([$table]);

        $foreignKeys = [];
        foreach ($stmt->fetchAll() as $row) {
            $foreignKeys[] = [
                'column' => (string)$row['COLUMN_NAME'],
                'ref_table' => (string)$row['REFERENCED_TABLE_NAME'],
                'ref_column' => (string)$row['REFERENCED_COLUMN_NAME'],
                'on_delete' => (string)$row['DELETE_RULE'],
            ];
        }
        return $foreignKeys;
    }
}

/** Identificador seguro: minusculo, comeca com letra, so [a-z0-9_]. Mesmo padrao usado no restante do Core. */
function schema_auditor_identifier_is_valid(string $name): bool {
    return (bool)preg_match('/^[a-z][a-z0-9_]*$/', $name);
}

/**
 * Valida a forma do contrato declarativo (retornado por
 * config/schema-contract.php): nomes de tabela/coluna/indice seguros,
 * PK/indices/FKs referenciando so colunas declaradas, on_delete na
 * allowlist fechada, severity valida quando informada. Nunca muta nada —
 * so lanca InvalidArgumentException numa entrada invalida.
 */
function schema_auditor_validate_contract(array $contract): array {
    $validated = [];

    foreach ($contract as $table => $spec) {
        if (!is_string($table) || !schema_auditor_identifier_is_valid($table)) {
            throw new InvalidArgumentException('schema contract has an invalid table name');
        }
        if (!is_array($spec) || !isset($spec['columns']) || !is_array($spec['columns'])) {
            throw new InvalidArgumentException('schema contract table is missing columns');
        }

        $columns = [];
        foreach ($spec['columns'] as $columnName => $columnSpec) {
            if (!is_string($columnName) || !schema_auditor_identifier_is_valid($columnName)) {
                throw new InvalidArgumentException('schema contract has an invalid column name');
            }
            if (!is_array($columnSpec) || !isset($columnSpec['type']) || !is_string($columnSpec['type'])) {
                throw new InvalidArgumentException('schema contract column is missing a type');
            }
            $severity = $columnSpec['severity'] ?? 'error';
            if (!in_array($severity, SCHEMA_AUDITOR_SEVERITIES, true)) {
                throw new InvalidArgumentException('schema contract column has an invalid severity');
            }
            $columns[$columnName] = [
                'type' => $columnSpec['type'],
                'unsigned' => (bool)($columnSpec['unsigned'] ?? false),
                'nullable' => (bool)($columnSpec['nullable'] ?? false),
                'length' => isset($columnSpec['length']) ? (int)$columnSpec['length'] : null,
                'precision' => isset($columnSpec['precision']) ? (int)$columnSpec['precision'] : null,
                'scale' => isset($columnSpec['scale']) ? (int)$columnSpec['scale'] : null,
                'severity' => $severity,
            ];
        }

        $primaryKey = $spec['primary_key'] ?? [];
        if (!is_array($primaryKey)) {
            throw new InvalidArgumentException('schema contract primary_key must be an array');
        }
        foreach ($primaryKey as $pkColumn) {
            if (!is_string($pkColumn) || !isset($columns[$pkColumn])) {
                throw new InvalidArgumentException('schema contract primary_key references an undeclared column');
            }
        }

        $indexes = [];
        foreach ($spec['indexes'] ?? [] as $indexSpec) {
            if (!is_array($indexSpec) || !isset($indexSpec['name'], $indexSpec['columns']) || !is_array($indexSpec['columns'])) {
                throw new InvalidArgumentException('schema contract has an invalid index entry');
            }
            if (!is_string($indexSpec['name']) || !schema_auditor_identifier_is_valid($indexSpec['name'])) {
                throw new InvalidArgumentException('schema contract index has an invalid name');
            }
            if ($indexSpec['columns'] === []) {
                throw new InvalidArgumentException('schema contract index must declare at least one column');
            }
            foreach ($indexSpec['columns'] as $indexColumn) {
                if (!is_string($indexColumn) || !isset($columns[$indexColumn])) {
                    throw new InvalidArgumentException('schema contract index references an undeclared column');
                }
            }
            $severity = $indexSpec['severity'] ?? 'error';
            if (!in_array($severity, SCHEMA_AUDITOR_SEVERITIES, true)) {
                throw new InvalidArgumentException('schema contract index has an invalid severity');
            }
            $indexes[] = [
                'name' => $indexSpec['name'],
                'columns' => array_values($indexSpec['columns']),
                'unique' => (bool)($indexSpec['unique'] ?? false),
                'severity' => $severity,
            ];
        }

        $foreignKeys = [];
        foreach ($spec['foreign_keys'] ?? [] as $fkSpec) {
            if (!is_array($fkSpec) || !isset($fkSpec['column'], $fkSpec['ref_table'], $fkSpec['ref_column'], $fkSpec['on_delete'])) {
                throw new InvalidArgumentException('schema contract has an invalid foreign key entry');
            }
            if (!is_string($fkSpec['column']) || !isset($columns[$fkSpec['column']])) {
                throw new InvalidArgumentException('schema contract foreign key references an undeclared column');
            }
            if (!is_string($fkSpec['ref_table']) || !schema_auditor_identifier_is_valid($fkSpec['ref_table'])) {
                throw new InvalidArgumentException('schema contract foreign key has an invalid ref_table');
            }
            if (!is_string($fkSpec['ref_column']) || !schema_auditor_identifier_is_valid($fkSpec['ref_column'])) {
                throw new InvalidArgumentException('schema contract foreign key has an invalid ref_column');
            }
            if (!in_array($fkSpec['on_delete'], SCHEMA_AUDITOR_ON_DELETE_RULES, true)) {
                throw new InvalidArgumentException('schema contract foreign key has an invalid on_delete rule');
            }
            $severity = $fkSpec['severity'] ?? 'error';
            if (!in_array($severity, SCHEMA_AUDITOR_SEVERITIES, true)) {
                throw new InvalidArgumentException('schema contract foreign key has an invalid severity');
            }
            $foreignKeys[] = [
                'column' => $fkSpec['column'],
                'ref_table' => $fkSpec['ref_table'],
                'ref_column' => $fkSpec['ref_column'],
                'on_delete' => $fkSpec['on_delete'],
                'severity' => $severity,
            ];
        }

        $validated[$table] = [
            'columns' => $columns,
            'primary_key' => array_values($primaryKey),
            'indexes' => $indexes,
            'foreign_keys' => $foreignKeys,
        ];
    }

    return $validated;
}

/** Normaliza um tipo bruto (de contrato ou introspector) pra forma base comparavel. Ignora casing. */
function schema_auditor_normalize_type(string $rawType): string {
    $key = strtolower(trim($rawType));
    return SCHEMA_AUDITOR_TYPE_ALIASES[$key] ?? $key;
}

/** true se o tamanho (length ou precision+scale) importa pra este tipo-base normalizado. */
function schema_auditor_type_size_matters(string $normalizedType): bool {
    return in_array($normalizedType, SCHEMA_AUDITOR_SIZED_TYPES, true);
}

/** true se unsigned e comparavel pra este tipo-base normalizado. */
function schema_auditor_type_supports_unsigned(string $normalizedType): bool {
    return in_array($normalizedType, SCHEMA_AUDITOR_UNSIGNED_TYPES, true);
}

/** Monta uma issue no formato fechado, sem nenhum dado sensivel (so metadata de schema). */
function schema_auditor_make_issue(
    string $code,
    string $table,
    ?string $object,
    mixed $expected,
    mixed $actual,
    string $severity
): array {
    return [
        'code' => $code,
        'table' => $table,
        'object' => $object,
        'expected' => $expected,
        'actual' => $actual,
        'severity' => $severity,
    ];
}

/** true se $indexColumns cobre $requiredPrefix como prefixo esquerdo, na mesma ordem. */
function schema_auditor_index_covers_prefix(array $indexColumns, array $requiredPrefix): bool {
    if (count($requiredPrefix) > count($indexColumns)) {
        return false;
    }
    foreach ($requiredPrefix as $position => $column) {
        if (($indexColumns[$position] ?? null) !== $column) {
            return false;
        }
    }
    return true;
}

/**
 * Procura, entre os indices reais (e a PK), um com o MESMO CONJUNTO de
 * colunas exigido, mas em ordem que nao satisfaz o prefixo esquerdo (ou,
 * pra requisitos unique=true, que nao bate exatamente). So chamada
 * depois que a checagem principal (prefixo, ou igualdade exata pra
 * unique=true) ja falhou pra tudo — diferencia "faltando de verdade" de
 * "existe, ordem errada". Nunca considera unique aqui: ordem errada e
 * ordem errada independente de o indice real ser UNIQUE ou comum.
 */
function schema_auditor_find_same_column_set(array $actualIndexes, array $actualPrimaryKey, array $requiredColumns): ?array {
    $requiredSet = $requiredColumns;
    sort($requiredSet);

    foreach ($actualIndexes as $indexSpec) {
        $actualSet = $indexSpec['columns'];
        sort($actualSet);
        if ($actualSet === $requiredSet) {
            return $indexSpec['columns'];
        }
    }

    if ($actualPrimaryKey !== []) {
        $pkSet = $actualPrimaryKey;
        sort($pkSet);
        if ($pkSet === $requiredSet) {
            return $actualPrimaryKey;
        }
    }

    return null;
}

/**
 * Procura, entre TODOS os indices reais (e a PK), os que tem EXATAMENTE
 * as mesmas colunas, na mesma ordem, do requisito (nunca prefixo, nunca
 * superset — um UNIQUE(a,b) real NAO garante unicidade de (a) sozinho).
 * PK entra na busca porque PK e sempre unique por definicao. Retorna a
 * lista COMPLETA de matches exatos (pode haver mais de um: ex. um indice
 * comum e um UNIQUE, ambos exatamente sobre as mesmas colunas) — nunca
 * so o primeiro encontrado, porque decidir se o requisito unique=true
 * esta satisfeito exige olhar TODOS eles, nao parar no primeiro (que
 * pode nao ser o UNIQUE). Ordem de iteracao do introspector e irrelevante:
 * a lista e varrida por inteiro, sem early-return.
 */
function schema_auditor_find_exact_column_matches(array $actualIndexes, array $actualPrimaryKey, array $requiredColumns): array {
    $matches = [];

    if ($actualPrimaryKey === $requiredColumns) {
        $matches[] = ['columns' => $actualPrimaryKey, 'unique' => true];
    }

    foreach ($actualIndexes as $indexSpec) {
        if ($indexSpec['columns'] === $requiredColumns) {
            $matches[] = $indexSpec;
        }
    }

    return $matches;
}

/**
 * Compara o contrato declarativo (ja validado por
 * schema_auditor_validate_contract()) contra o banco real, via
 * $introspector. So leitura de metadata — nunca DDL/DML, nunca dado de
 * tabela. Excecoes do introspector (ex: falha real de leitura do
 * information_schema) sao propagadas cruas pro chamador: uma falha de
 * introspeccao NUNCA vira silenciosamente "tabela ausente" nem "schema
 * vazio" — quem decide o boundary seguro e o CLI.
 */
function schema_auditor_audit(array $contract, SchemaIntrospector $introspector): array {
    $validatedContract = schema_auditor_validate_contract($contract);
    $issues = [];
    $tablesChecked = 0;

    foreach ($validatedContract as $table => $tableSpec) {
        $tablesChecked++;

        if (!$introspector->tableExists($table)) {
            $issues[] = schema_auditor_make_issue('missing_table', $table, null, true, false, 'error');
            continue;
        }

        $actualColumns = $introspector->columns($table);

        foreach ($tableSpec['columns'] as $columnName => $expected) {
            if (!isset($actualColumns[$columnName])) {
                $issues[] = schema_auditor_make_issue(
                    'missing_column',
                    $table,
                    $columnName,
                    ['type' => $expected['type']],
                    null,
                    $expected['severity']
                );
                continue;
            }

            $actual = $actualColumns[$columnName];
            $expectedType = schema_auditor_normalize_type($expected['type']);
            $actualType = schema_auditor_normalize_type($actual['type']);

            if ($expectedType !== $actualType) {
                $issues[] = schema_auditor_make_issue(
                    'incompatible_type',
                    $table,
                    $columnName,
                    $expectedType,
                    $actualType,
                    $expected['severity']
                );
            } elseif (schema_auditor_type_size_matters($expectedType)) {
                $expectedSize = $expectedType === 'decimal'
                    ? ['precision' => $expected['precision'], 'scale' => $expected['scale']]
                    : ['length' => $expected['length']];
                $actualSize = $expectedType === 'decimal'
                    ? ['precision' => $actual['precision'] ?? null, 'scale' => $actual['scale'] ?? null]
                    : ['length' => $actual['length'] ?? null];
                if ($expectedSize !== $actualSize) {
                    $issues[] = schema_auditor_make_issue(
                        'incompatible_type',
                        $table,
                        $columnName,
                        $expectedSize,
                        $actualSize,
                        $expected['severity']
                    );
                }
            }

            if (schema_auditor_type_supports_unsigned($expectedType)) {
                $actualUnsigned = (bool)($actual['unsigned'] ?? false);
                if ($expected['unsigned'] !== $actualUnsigned) {
                    $issues[] = schema_auditor_make_issue(
                        'incompatible_unsigned',
                        $table,
                        $columnName,
                        $expected['unsigned'],
                        $actualUnsigned,
                        $expected['severity']
                    );
                }
            }

            $actualNullable = (bool)($actual['nullable'] ?? false);
            if ($expected['nullable'] !== $actualNullable) {
                $issues[] = schema_auditor_make_issue(
                    'incompatible_nullability',
                    $table,
                    $columnName,
                    $expected['nullable'],
                    $actualNullable,
                    $expected['severity']
                );
            }
        }

        $actualPrimaryKey = $introspector->primaryKey($table);
        if ($tableSpec['primary_key'] !== [] && $actualPrimaryKey !== $tableSpec['primary_key']) {
            $issues[] = schema_auditor_make_issue(
                'missing_primary_key',
                $table,
                implode(',', $tableSpec['primary_key']),
                $tableSpec['primary_key'],
                $actualPrimaryKey,
                'error'
            );
        }

        $actualIndexes = $introspector->indexes($table);
        foreach ($tableSpec['indexes'] as $indexSpec) {
            $expectedDescriptor = ['columns' => $indexSpec['columns'], 'unique' => $indexSpec['unique']];

            if ($indexSpec['unique']) {
                // unique=true exige colunas EXATAS, na mesma ordem — prefixo/superset
                // nunca garante a unicidade do subconjunto exigido (UNIQUE(a,b) nao
                // prova que (a) sozinho e unico). Olha TODOS os matches exatos (pode
                // haver mais de um: um indice comum e um UNIQUE, ambos exatos) — o
                // requisito esta satisfeito se QUALQUER um deles for UNIQUE, nunca so
                // o primeiro encontrado. Nunca depende de nome ou ordem do introspector.
                $exactMatches = schema_auditor_find_exact_column_matches($actualIndexes, $actualPrimaryKey, $indexSpec['columns']);

                if ($exactMatches !== []) {
                    $satisfiedByUnique = false;
                    foreach ($exactMatches as $exactMatch) {
                        if ($exactMatch['unique']) {
                            $satisfiedByUnique = true;
                            break;
                        }
                    }
                    if (!$satisfiedByUnique) {
                        $issues[] = schema_auditor_make_issue(
                            'incompatible_index_uniqueness',
                            $table,
                            $indexSpec['name'],
                            $expectedDescriptor,
                            ['columns' => $indexSpec['columns'], 'unique' => false],
                            $indexSpec['severity']
                        );
                    }
                    continue;
                }

                $sameSet = schema_auditor_find_same_column_set($actualIndexes, $actualPrimaryKey, $indexSpec['columns']);
                if ($sameSet !== null) {
                    $issues[] = schema_auditor_make_issue(
                        'incompatible_index_order',
                        $table,
                        $indexSpec['name'],
                        $expectedDescriptor,
                        $sameSet,
                        $indexSpec['severity']
                    );
                } else {
                    $issues[] = schema_auditor_make_issue(
                        'missing_index',
                        $table,
                        $indexSpec['name'],
                        $expectedDescriptor,
                        null,
                        $indexSpec['severity']
                    );
                }
                continue;
            }

            // unique=false: cobertura por prefixo esquerdo satisfaz, venha de PK,
            // indice comum ou UNIQUE (a flag unique do indice real e irrelevante
            // aqui — so a cobertura de colunas/ordem importa).
            $covered = schema_auditor_index_covers_prefix($actualPrimaryKey, $indexSpec['columns']);
            if (!$covered) {
                foreach ($actualIndexes as $actualIndexSpec) {
                    if (schema_auditor_index_covers_prefix($actualIndexSpec['columns'], $indexSpec['columns'])) {
                        $covered = true;
                        break;
                    }
                }
            }

            if ($covered) {
                continue;
            }

            $sameSet = schema_auditor_find_same_column_set($actualIndexes, $actualPrimaryKey, $indexSpec['columns']);
            if ($sameSet !== null) {
                $issues[] = schema_auditor_make_issue(
                    'incompatible_index_order',
                    $table,
                    $indexSpec['name'],
                    $expectedDescriptor,
                    $sameSet,
                    $indexSpec['severity']
                );
            } else {
                $issues[] = schema_auditor_make_issue(
                    'missing_index',
                    $table,
                    $indexSpec['name'],
                    $expectedDescriptor,
                    null,
                    $indexSpec['severity']
                );
            }
        }

        $actualForeignKeys = $introspector->foreignKeys($table);
        foreach ($tableSpec['foreign_keys'] as $fkSpec) {
            $match = null;
            foreach ($actualForeignKeys as $actualFk) {
                if (
                    $actualFk['column'] === $fkSpec['column']
                    && $actualFk['ref_table'] === $fkSpec['ref_table']
                    && $actualFk['ref_column'] === $fkSpec['ref_column']
                ) {
                    $match = $actualFk;
                    break;
                }
            }

            if ($match === null) {
                $issues[] = schema_auditor_make_issue(
                    'missing_foreign_key',
                    $table,
                    $fkSpec['column'],
                    ['ref_table' => $fkSpec['ref_table'], 'ref_column' => $fkSpec['ref_column'], 'on_delete' => $fkSpec['on_delete']],
                    null,
                    $fkSpec['severity']
                );
                continue;
            }

            if ($match['on_delete'] !== $fkSpec['on_delete']) {
                $issues[] = schema_auditor_make_issue(
                    'incompatible_foreign_key_delete_rule',
                    $table,
                    $fkSpec['column'],
                    $fkSpec['on_delete'],
                    $match['on_delete'],
                    $fkSpec['severity']
                );
            }
        }
    }

    usort($issues, static function (array $a, array $b): int {
        return [$a['table'], $a['code'], (string)$a['object']] <=> [$b['table'], $b['code'], (string)$b['object']];
    });

    $hasError = false;
    foreach ($issues as $issue) {
        if ($issue['severity'] === 'error') {
            $hasError = true;
            break;
        }
    }

    return [
        'passed' => !$hasError,
        'issues' => $issues,
        'summary' => [
            'tables_checked' => $tablesChecked,
            'issues' => count($issues),
        ],
    ];
}
