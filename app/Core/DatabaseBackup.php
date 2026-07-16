<?php
declare(strict_types=1);

/**
 * Fase 4C - Backup logico, autenticado e versionado do banco. So
 * leitura (SELECT); nunca DDL/DML, nunca conteudo em error_log. Sem
 * framework, sem config.php — recebe PDO, contratos ja carregados e um
 * BackupArtifactWriter ja aberto.
 */

require_once __DIR__ . '/BackupCrypto.php';
require_once __DIR__ . '/SchemaAuditor.php';

const BACKUP_CONTRACT_CLEANUP_STRATEGIES = ['delete_all'];

/**
 * Meta inicial de RPO (Recovery Point Objective), em segundos: quanto
 * dado (em tempo) e aceitavel perder entre o ultimo backup e um
 * incidente. Meta inicial, nao garantia — nao inventa numero de
 * producao real.
 */
const RPO_TARGET_SECONDS = 86400;

/** Identificador seguro: minusculo, comeca com letra, so [a-z0-9_]. Mesmo padrao usado no restante do Core. */
function backup_identifier_is_valid(string $name): bool {
    return (bool)preg_match('/^[a-z][a-z0-9_]*$/', $name);
}

/**
 * Valida config/backup-contract.php contra config/schema-contract.php
 * (ja validado por schema_auditor_validate_contract()): toda tabela do
 * schema precisa estar classificada aqui como persistente ou efemera —
 * uma tabela nova no schema que nao apareca aqui faz isto lancar, nunca
 * ignora em silencio. Colunas persistentes precisam ser subconjunto das
 * colunas reais da tabela; primary_key precisa bater exatamente com a
 * do schema-contract (e o que garante ORDER BY deterministico valido).
 * table_order precisa conter exatamente as tabelas persistentes, uma
 * vez cada. Retorna uma copia normalizada.
 */
function backup_contract_validate(array $backupContract, array $validatedSchemaContract): array {
    if (!isset($backupContract['application']) || !is_string($backupContract['application']) || $backupContract['application'] === '') {
        throw new InvalidArgumentException('backup contract is missing a valid application identifier');
    }
    if (!isset($backupContract['tables']) || !is_array($backupContract['tables'])) {
        throw new InvalidArgumentException('backup contract is missing tables');
    }
    if (!isset($backupContract['table_order']) || !is_array($backupContract['table_order'])) {
        throw new InvalidArgumentException('backup contract is missing table_order');
    }

    $tables = [];
    foreach ($backupContract['tables'] as $table => $spec) {
        if (!is_string($table) || !backup_identifier_is_valid($table)) {
            throw new InvalidArgumentException('backup contract has an invalid table name');
        }
        if (!is_array($spec) || !isset($spec['kind']) || !in_array($spec['kind'], ['persistent', 'ephemeral'], true)) {
            throw new InvalidArgumentException('backup contract table has an invalid kind');
        }

        if ($spec['kind'] === 'ephemeral') {
            $tables[$table] = ['kind' => 'ephemeral'];
            continue;
        }

        if (!isset($validatedSchemaContract[$table])) {
            throw new InvalidArgumentException('backup contract references a table absent from the schema contract');
        }

        if (!isset($spec['columns']) || !is_array($spec['columns']) || $spec['columns'] === []) {
            throw new InvalidArgumentException('backup contract persistent table is missing columns');
        }
        $schemaColumns = array_keys($validatedSchemaContract[$table]['columns']);
        foreach ($spec['columns'] as $column) {
            if (!is_string($column) || !in_array($column, $schemaColumns, true)) {
                throw new InvalidArgumentException('backup contract references a column absent from the schema contract');
            }
        }

        if (!isset($spec['primary_key']) || !is_array($spec['primary_key']) || $spec['primary_key'] === []) {
            throw new InvalidArgumentException('backup contract persistent table is missing a primary_key');
        }
        if ($spec['primary_key'] !== $validatedSchemaContract[$table]['primary_key']) {
            throw new InvalidArgumentException('backup contract primary_key does not match the schema contract');
        }

        if (!isset($spec['cleanup']) || !in_array($spec['cleanup'], BACKUP_CONTRACT_CLEANUP_STRATEGIES, true)) {
            throw new InvalidArgumentException('backup contract has an invalid cleanup strategy');
        }

        $tables[$table] = [
            'kind' => 'persistent',
            'columns' => array_values($spec['columns']),
            'primary_key' => array_values($spec['primary_key']),
            'cleanup' => $spec['cleanup'],
        ];
    }

    // Toda tabela do schema real precisa estar classificada — nunca ignorada em silencio.
    foreach (array_keys($validatedSchemaContract) as $schemaTable) {
        if (!isset($tables[$schemaTable])) {
            throw new InvalidArgumentException('a table in the schema contract is not classified in the backup contract');
        }
    }

    $persistentTables = array_keys(array_filter($tables, static fn(array $t): bool => $t['kind'] === 'persistent'));
    sort($persistentTables);
    $orderList = array_values($backupContract['table_order']);
    $orderSorted = $orderList;
    sort($orderSorted);
    if ($orderSorted !== $persistentTables || count($orderList) !== count(array_unique($orderList))) {
        throw new InvalidArgumentException('backup contract table_order must list every persistent table exactly once');
    }

    return [
        'application' => $backupContract['application'],
        'table_order' => $orderList,
        'tables' => $tables,
    ];
}

/** Hash deterministico do schema-contract validado — usado no manifesto e reconferido na restauracao. */
function backup_schema_contract_hash(array $validatedSchemaContract): string {
    return hash('sha256', json_encode($validatedSchemaContract, JSON_THROW_ON_ERROR));
}

/**
 * Codifica um valor de coluna pro registro JSON do backup, sem
 * transformar tipo (null/int/float/string passam como vieram do PDO).
 * String que nao for UTF-8 valido (unico jeito de existir "binario" no
 * schema atual, que nao tem BLOB) ganha representacao explicita.
 */
function backup_encode_value(mixed $value): mixed {
    if ($value === null || is_int($value) || is_float($value) || is_bool($value)) {
        return $value;
    }
    if (is_string($value)) {
        return mb_check_encoding($value, 'UTF-8') ? $value : ['__bin__' => base64_encode($value)];
    }
    throw new BackupCryptoException('unexpected value type encountered while exporting a row');
}

/**
 * Resolve um destino de escrita seguro: o diretorio precisa existir
 * (nunca cria arvore), o caminho real (apos resolver symlink) nunca
 * pode estar dentro do repositorio, e o destino final so pode ser
 * sobrescrito com $force. Retorna [caminho final resolvido, caminho do
 * temporario a usar].
 */
function backup_resolve_destination(string $destPath, string $repoRoot, bool $force): array {
    if (trim($destPath) === '') {
        throw new InvalidArgumentException('backup destination path is invalid');
    }

    $dir = dirname($destPath);
    $realDir = realpath($dir);
    if ($realDir === false || !is_dir($realDir)) {
        throw new InvalidArgumentException('backup destination directory does not exist');
    }

    $realRepoRoot = realpath($repoRoot);
    if ($realRepoRoot === false) {
        throw new InvalidArgumentException('could not resolve the repository root');
    }

    if ($realDir === $realRepoRoot || str_starts_with($realDir . DIRECTORY_SEPARATOR, $realRepoRoot . DIRECTORY_SEPARATOR)) {
        throw new InvalidArgumentException('backup destination must be outside the application repository');
    }

    $basename = basename($destPath);
    if ($basename === '' || $basename === '.' || $basename === '..') {
        throw new InvalidArgumentException('backup destination path is invalid');
    }

    $finalPath = $realDir . DIRECTORY_SEPARATOR . $basename;
    if (file_exists($finalPath) && !$force) {
        throw new InvalidArgumentException('backup destination already exists (use --force to overwrite)');
    }

    $tmpPath = $realDir . DIRECTORY_SEPARATOR . '.' . $basename . '.tmp-' . bin2hex(random_bytes(8));

    return [$finalPath, $tmpPath];
}

/**
 * Backup logico de todas as tabelas persistentes, streamado direto pro
 * BackupArtifactWriter — nunca fetchAll() da tabela inteira, sempre
 * SELECT com colunas explicitas e ORDER BY pela primary key. Cada linha
 * vira uma frame propria; contagem de inicio/fim por tabela e conferida
 * contra o real antes de seguir. O trailer (com TAG_FINAL) fecha o
 * artefato.
 */
final class DatabaseBackup {
    private PDO $db;
    private array $backupContract;
    private array $schemaContract;
    private BackupArtifactWriter $writer;
    /** @var callable(): string */
    private $clock;

    public function __construct(
        PDO $db,
        array $backupContract,
        array $schemaContract,
        BackupArtifactWriter $writer,
        ?callable $clock = null
    ) {
        $this->db = $db;
        $this->schemaContract = schema_auditor_validate_contract($schemaContract);
        $this->backupContract = backup_contract_validate($backupContract, $this->schemaContract);
        $this->writer = $writer;
        $this->clock = $clock ?? static fn(): string => gmdate('Y-m-d\TH:i:s\Z');
    }

    /** @return array{tables: array<string,int>, total_rows: int, bytes_written: int} */
    public function run(): array {
        $createdAt = ($this->clock)();
        $migrationState = $this->summarizeMigrationState();

        $this->writer->writeFrame(json_encode([
            'type' => 'manifest',
            'format_version' => BACKUP_ARTIFACT_VERSION,
            'created_at' => $createdAt,
            'application' => $this->backupContract['application'],
            'schema_contract_sha256' => backup_schema_contract_hash($this->schemaContract),
            'migration_state' => $migrationState,
            'tables' => $this->backupContract['table_order'],
        ], JSON_THROW_ON_ERROR));

        $tableCounts = [];
        $totalRows = 0;
        $tableOrder = $this->backupContract['table_order'];
        $lastIndex = count($tableOrder) - 1;

        foreach ($tableOrder as $index => $table) {
            $spec = $this->backupContract['tables'][$table];
            $count = $this->exportTable($table, $spec);
            $tableCounts[$table] = $count;
            $totalRows += $count;

            if ($index === $lastIndex) {
                $this->writer->writeFrame(json_encode([
                    'type' => 'trailer',
                    'tables' => count($tableOrder),
                    'total_rows' => $totalRows,
                ], JSON_THROW_ON_ERROR), true);
            }
        }

        return [
            'tables' => $tableCounts,
            'total_rows' => $totalRows,
            'bytes_written' => $this->writer->bytesWritten(),
        ];
    }

    private function summarizeMigrationState(): array {
        try {
            $stmt = $this->db->prepare('SELECT migration, status FROM schema_migrations ORDER BY migration');
            $stmt->execute();
            $rows = [];
            while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                $rows[] = ['id' => $row['migration'], 'status' => $row['status']];
            }
            return $rows;
        } catch (PDOException) {
            return [];
        }
    }

    private function exportTable(string $table, array $spec): int {
        $columnList = implode(', ', $spec['columns']);
        $orderList = implode(', ', $spec['primary_key']);
        $expectedCount = (int)$this->db->query('SELECT COUNT(*) FROM ' . $table)->fetchColumn();

        $this->writer->writeFrame(json_encode([
            'type' => 'table_start',
            'table' => $table,
            'expected_count' => $expectedCount,
        ], JSON_THROW_ON_ERROR));

        $stmt = $this->db->prepare("SELECT {$columnList} FROM {$table} ORDER BY {$orderList}");
        $stmt->execute();

        $count = 0;
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $values = [];
            foreach ($row as $column => $value) {
                $values[$column] = backup_encode_value($value);
            }
            $this->writer->writeFrame(json_encode([
                'type' => 'row',
                'table' => $table,
                'values' => $values,
            ], JSON_THROW_ON_ERROR));
            $count++;
        }

        if ($count !== $expectedCount) {
            throw new BackupCryptoException('table row count changed while it was being exported');
        }

        $this->writer->writeFrame(json_encode([
            'type' => 'table_end',
            'table' => $table,
            'count' => $count,
        ], JSON_THROW_ON_ERROR));

        return $count;
    }
}
