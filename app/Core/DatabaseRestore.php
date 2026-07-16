<?php
declare(strict_types=1);

/**
 * Fase 4C - Restauracao isolada do backup logico. So faz sentido chamado
 * por CLI (o guard de SAPI fica no script, nao aqui). Duas passagens
 * sobre o arquivo: a primeira autentica e valida o artefato inteiro
 * (formato, manifesto, contrato, contagens) SEM tocar o banco alvo; so
 * depois do preflight passar e que a segunda passagem decifra de novo e
 * grava, dentro de uma unica transacao. Nunca cria arquivo temporario
 * em texto claro — cada passagem le e decifra frame a frame, direto do
 * arquivo criptografado.
 */

require_once __DIR__ . '/DatabaseBackup.php';

/**
 * Meta inicial de RTO (Recovery Time Objective), em segundos: quanto
 * tempo uma restauracao completa deveria levar no maximo. Meta inicial,
 * nao garantia — so rto_met quando uma restauracao real, medida, tiver
 * terminado (nunca afirmado antecipadamente).
 */
const RTO_TARGET_SECONDS = 3600;

/** Identificador seguro de nome de banco: letra/underscore inicial, so [A-Za-z0-9_] depois. */
function database_restore_identifier_is_valid(string $name): bool {
    return (bool)preg_match('/^[A-Za-z_][A-Za-z0-9_]*$/', $name);
}

/**
 * Valida (sem tocar banco) que o alvo de restauracao e seguro: nome
 * nao-vazio e com formato de identificador valido (rejeita vazio,
 * curinga, caracteres invalidos), diferente do banco da aplicacao, e
 * com confirmacao exata (ORBY_RESTORE_CONFIRM_NAME) batendo com o nome
 * alvo. Lanca InvalidArgumentException numa falha — nunca conecta em
 * lugar nenhum, e chamada ANTES de qualquer PDO ser criado pro alvo.
 */
function database_restore_check_target_name(string $appDbName, string $targetDbName, string $confirmName): void {
    if ($targetDbName === '' || !database_restore_identifier_is_valid($targetDbName)) {
        throw new InvalidArgumentException('restore target database name is invalid');
    }
    if ($appDbName !== '' && $targetDbName === $appDbName) {
        throw new InvalidArgumentException('restore target database must not be the application database');
    }
    if ($confirmName !== $targetDbName) {
        throw new InvalidArgumentException('restore target confirmation name does not match');
    }
}

/** Desfaz backup_encode_value(): so reconhece a representacao binaria explicita, mais nada. */
function database_restore_decode_value(mixed $value): mixed {
    if (is_array($value) && count($value) === 1 && array_key_exists('__bin__', $value)) {
        $decoded = base64_decode((string)$value['__bin__'], true);
        if ($decoded === false) {
            throw new BackupCryptoException('backup artifact contains an invalid binary value');
        }
        return $decoded;
    }
    return $value;
}

/**
 * Restaura um artefato de backup num banco alvo ISOLADO. O isolamento
 * (nome do banco, marcador dedicado) e checado antes de qualquer coisa;
 * a autenticacao/validacao do artefato (validateArtifact) nunca toca o
 * PDO do alvo; so depois do preflight (schema + tabelas vazias +
 * contrato batendo) e que restore() muta o banco, numa unica transacao.
 */
final class DatabaseRestore {
    private PDO $targetDb;
    private array $backupContract;
    private array $schemaContract;
    private string $key;
    private string $artifactPath;
    /** @var (callable(PDO): SchemaIntrospector)|null */
    private $introspectorFactory;

    public function __construct(
        PDO $targetDb,
        array $backupContract,
        array $schemaContract,
        string $key,
        string $artifactPath,
        ?callable $introspectorFactory = null
    ) {
        $this->targetDb = $targetDb;
        $this->schemaContract = schema_auditor_validate_contract($schemaContract);
        $this->backupContract = backup_contract_validate($backupContract, $this->schemaContract);
        $this->key = $key;
        $this->artifactPath = $artifactPath;
        $this->introspectorFactory = $introspectorFactory;
    }

    private function introspector(): SchemaIntrospector {
        $factory = $this->introspectorFactory ?? static fn(PDO $db): SchemaIntrospector => new MysqlInformationSchemaIntrospector($db);
        return $factory($this->targetDb);
    }

    /**
     * Confere o marcador dedicado de isolamento (orby_restore_target com
     * uma unica linha purpose='isolated_restore'). Nunca cria o marcador
     * — so leitura. Lanca se a tabela nao existir ou o conteudo nao bater.
     */
    public function verifyIsolationMarker(): void {
        try {
            $stmt = $this->targetDb->query('SELECT purpose FROM orby_restore_target');
        } catch (PDOException) {
            throw new InvalidArgumentException('restore target is missing the isolation marker');
        }
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        if (count($rows) !== 1 || ($rows[0]['purpose'] ?? null) !== 'isolated_restore') {
            throw new InvalidArgumentException('restore target isolation marker is missing or invalid');
        }
    }

    /**
     * PRIMEIRA PASSAGEM: autentica e valida o artefato inteiro (formato,
     * manifesto, ordem/contagem por tabela, allowlist de tabela/coluna,
     * trailer, TAG_FINAL, ausencia de bytes extras) — NUNCA referencia
     * $this->targetDb. Qualquer falha lanca antes de qualquer escrita
     * poder acontecer.
     */
    public function validateArtifact(): array {
        $handle = @fopen($this->artifactPath, 'rb');
        if ($handle === false) {
            throw new InvalidArgumentException('backup artifact could not be opened');
        }

        try {
            $reader = new BackupArtifactReader($handle, $this->key);

            $manifestFrame = $reader->readFrame();
            if ($manifestFrame === null) {
                throw new BackupCryptoException('backup artifact is empty');
            }
            $manifest = json_decode($manifestFrame['plaintext'], true, 512, JSON_THROW_ON_ERROR);
            if (!is_array($manifest) || ($manifest['type'] ?? null) !== 'manifest') {
                throw new BackupCryptoException('backup artifact manifest is invalid');
            }
            if (($manifest['format_version'] ?? null) !== BACKUP_ARTIFACT_VERSION) {
                throw new BackupCryptoException('backup artifact has an unsupported manifest version');
            }

            $localSchemaHash = backup_schema_contract_hash($this->schemaContract);
            if (($manifest['schema_contract_sha256'] ?? null) !== $localSchemaHash) {
                throw new BackupCryptoException('backup artifact schema contract does not match');
            }

            $expectedTables = $this->backupContract['table_order'];
            if (($manifest['tables'] ?? null) !== $expectedTables) {
                throw new BackupCryptoException('backup artifact table list does not match the backup contract');
            }

            $tableCounts = [];
            $totalRows = 0;

            foreach ($expectedTables as $table) {
                $allowedColumns = $this->backupContract['tables'][$table]['columns'];

                $startFrame = $reader->readFrame();
                $start = $startFrame !== null ? json_decode($startFrame['plaintext'], true, 512, JSON_THROW_ON_ERROR) : null;
                if (!is_array($start) || ($start['type'] ?? null) !== 'table_start' || ($start['table'] ?? null) !== $table) {
                    throw new BackupCryptoException('backup artifact table order does not match the backup contract');
                }
                $expectedCount = $start['expected_count'] ?? null;
                if (!is_int($expectedCount) || $expectedCount < 0) {
                    throw new BackupCryptoException('backup artifact table_start is invalid');
                }

                $count = 0;
                while (true) {
                    $frame = $reader->readFrame();
                    if ($frame === null) {
                        throw new BackupCryptoException('backup artifact ended before the table finished');
                    }
                    $rec = json_decode($frame['plaintext'], true, 512, JSON_THROW_ON_ERROR);
                    if (!is_array($rec) || !isset($rec['type'])) {
                        throw new BackupCryptoException('backup artifact contains an invalid record');
                    }
                    if ($rec['type'] === 'table_end') {
                        if (($rec['table'] ?? null) !== $table || ($rec['count'] ?? null) !== $count) {
                            throw new BackupCryptoException('backup artifact table_end does not match its rows');
                        }
                        break;
                    }
                    if ($rec['type'] !== 'row' || ($rec['table'] ?? null) !== $table || !isset($rec['values']) || !is_array($rec['values'])) {
                        throw new BackupCryptoException('backup artifact contains an unexpected record');
                    }
                    foreach (array_keys($rec['values']) as $column) {
                        if (!in_array($column, $allowedColumns, true)) {
                            throw new BackupCryptoException('backup artifact row references a column outside the backup contract');
                        }
                    }
                    foreach ($allowedColumns as $column) {
                        if (!array_key_exists($column, $rec['values'])) {
                            throw new BackupCryptoException('backup artifact row is missing an expected column');
                        }
                    }
                    $count++;
                }

                if ($count !== $expectedCount) {
                    throw new BackupCryptoException('backup artifact table row count does not match expected_count');
                }

                $tableCounts[$table] = $count;
                $totalRows += $count;
            }

            $trailerFrame = $reader->readFrame();
            if ($trailerFrame === null) {
                throw new BackupCryptoException('backup artifact is missing its trailer');
            }
            $trailer = json_decode($trailerFrame['plaintext'], true, 512, JSON_THROW_ON_ERROR);
            if (!$trailerFrame['final'] || !$reader->sawFinal() || !is_array($trailer) || ($trailer['type'] ?? null) !== 'trailer') {
                throw new BackupCryptoException('backup artifact trailer is missing or invalid');
            }
            if (($trailer['tables'] ?? null) !== count($expectedTables) || ($trailer['total_rows'] ?? null) !== $totalRows) {
                throw new BackupCryptoException('backup artifact trailer does not match its contents');
            }

            $endFrame = $reader->readFrame();
            if ($endFrame !== null) {
                throw new BackupCryptoException('backup artifact has data after the trailer');
            }

            return [
                'schema_contract_sha256' => $localSchemaHash,
                'created_at' => is_string($manifest['created_at'] ?? null) ? $manifest['created_at'] : null,
                'migration_state' => is_array($manifest['migration_state'] ?? null) ? $manifest['migration_state'] : [],
                'tables' => $tableCounts,
                'total_rows' => $totalRows,
            ];
        } finally {
            fclose($handle);
        }
    }

    /**
     * Preflight: schema-audit do alvo precisa passar, o checksum do
     * contrato precisa bater com o do artefato ja validado, e toda
     * tabela persistente do alvo precisa estar vazia. Nunca muta nada.
     */
    public function preflight(array $validatedManifest): void {
        $auditResult = schema_auditor_audit($this->schemaContract, $this->introspector());
        if (!$auditResult['passed']) {
            throw new InvalidArgumentException('restore target schema audit did not pass');
        }

        if ($validatedManifest['schema_contract_sha256'] !== backup_schema_contract_hash($this->schemaContract)) {
            throw new InvalidArgumentException('backup schema contract does not match the target schema contract');
        }

        foreach ($this->backupContract['table_order'] as $table) {
            $count = (int)$this->targetDb->query('SELECT COUNT(*) FROM ' . $table)->fetchColumn();
            if ($count !== 0) {
                throw new InvalidArgumentException('restore target table is not empty: ' . $table);
            }
        }
    }

    /**
     * SEGUNDA PASSAGEM: reabre o arquivo do zero (o stream secretstream
     * nao pode ser rebobinado), decifra de novo, e desta vez restaura de
     * verdade — DELETE + INSERT por tabela, numa unica transacao real,
     * na ordem compativel com FK (sem desabilitar checks). Contagem
     * conferida a cada tabela e no trailer antes do commit. Qualquer
     * falha faz rollback integral.
     */
    public function restore(array $validatedManifest): array {
        $handle = @fopen($this->artifactPath, 'rb');
        if ($handle === false) {
            throw new InvalidArgumentException('backup artifact could not be opened');
        }

        try {
            $reader = new BackupArtifactReader($handle, $this->key);

            $manifestFrame = $reader->readFrame();
            $manifest = $manifestFrame !== null ? json_decode($manifestFrame['plaintext'], true, 512, JSON_THROW_ON_ERROR) : null;
            if (!is_array($manifest) || ($manifest['schema_contract_sha256'] ?? null) !== $validatedManifest['schema_contract_sha256']) {
                throw new BackupCryptoException('backup artifact changed between validation passes');
            }

            $this->targetDb->beginTransaction();
            try {
                $tableCounts = [];
                $totalRows = 0;

                foreach ($this->backupContract['table_order'] as $table) {
                    $spec = $this->backupContract['tables'][$table];

                    $startFrame = $reader->readFrame();
                    $start = $startFrame !== null ? json_decode($startFrame['plaintext'], true, 512, JSON_THROW_ON_ERROR) : null;
                    if (!is_array($start) || ($start['type'] ?? null) !== 'table_start' || ($start['table'] ?? null) !== $table) {
                        throw new BackupCryptoException('backup artifact table order does not match the backup contract');
                    }
                    $expectedCount = $start['expected_count'];

                    $this->targetDb->exec('DELETE FROM ' . $table);

                    $columns = $spec['columns'];
                    $columnList = implode(', ', $columns);
                    $placeholders = implode(', ', array_fill(0, count($columns), '?'));
                    $insert = $this->targetDb->prepare("INSERT INTO {$table} ({$columnList}) VALUES ({$placeholders})");

                    $count = 0;
                    while (true) {
                        $frame = $reader->readFrame();
                        $rec = $frame !== null ? json_decode($frame['plaintext'], true, 512, JSON_THROW_ON_ERROR) : null;
                        if (!is_array($rec) || !isset($rec['type'])) {
                            throw new BackupCryptoException('backup artifact contains an invalid record');
                        }
                        if ($rec['type'] === 'table_end') {
                            if (($rec['count'] ?? null) !== $count) {
                                throw new BackupCryptoException('row count mismatch while restoring a table');
                            }
                            break;
                        }

                        $values = [];
                        foreach ($columns as $column) {
                            $values[] = database_restore_decode_value($rec['values'][$column]);
                        }
                        $insert->execute($values);
                        $count++;
                    }

                    if ($count !== $expectedCount) {
                        throw new BackupCryptoException('row count mismatch while restoring a table');
                    }

                    $tableCounts[$table] = $count;
                    $totalRows += $count;
                }

                $trailerFrame = $reader->readFrame();
                $trailer = $trailerFrame !== null ? json_decode($trailerFrame['plaintext'], true, 512, JSON_THROW_ON_ERROR) : null;
                if (
                    !$reader->sawFinal()
                    || !is_array($trailer)
                    || ($trailer['total_rows'] ?? null) !== $totalRows
                    || ($trailer['tables'] ?? null) !== count($this->backupContract['table_order'])
                ) {
                    throw new BackupCryptoException('backup artifact trailer does not match the restored data');
                }

                $this->targetDb->commit();
            } catch (Throwable $e) {
                if ($this->targetDb->inTransaction()) {
                    try {
                        $this->targetDb->rollBack();
                    } catch (Throwable) {
                        // Falha no rollback nunca pode mascarar a excecao original.
                    }
                }
                throw $e;
            }

            return [
                'tables' => $tableCounts,
                'total_rows' => $totalRows,
                'bytes_read' => $reader->bytesRead(),
            ];
        } finally {
            fclose($handle);
        }
    }

    /**
     * Depois do commit: confere contagem por tabela restaurada, confere
     * que toda tabela efemera continua vazia (nunca restaurada), e roda
     * o schema auditor de novo no alvo.
     */
    public function postValidate(array $expectedTableCounts): array {
        foreach ($expectedTableCounts as $table => $expected) {
            $actual = (int)$this->targetDb->query('SELECT COUNT(*) FROM ' . $table)->fetchColumn();
            if ($actual !== $expected) {
                throw new BackupCryptoException('post-restore row count mismatch for table: ' . $table);
            }
        }

        foreach ($this->backupContract['tables'] as $table => $spec) {
            if ($spec['kind'] !== 'ephemeral') {
                continue;
            }
            try {
                $count = (int)$this->targetDb->query('SELECT COUNT(*) FROM ' . $table)->fetchColumn();
            } catch (PDOException) {
                continue;
            }
            if ($count !== 0) {
                throw new BackupCryptoException('ephemeral table unexpectedly contains data after restore: ' . $table);
            }
        }

        $auditResult = schema_auditor_audit($this->schemaContract, $this->introspector());

        return ['passed' => $auditResult['passed'], 'issues_count' => count($auditResult['issues'])];
    }

    /** Orquestra a sequencia completa: isolamento -> validacao -> preflight -> restauracao -> pos-validacao. */
    public function run(): array {
        $this->verifyIsolationMarker();
        $validatedManifest = $this->validateArtifact();
        $this->preflight($validatedManifest);
        $restoreResult = $this->restore($validatedManifest);
        $postValidation = $this->postValidate($restoreResult['tables']);

        return [
            'tables' => $restoreResult['tables'],
            'total_rows' => $restoreResult['total_rows'],
            'bytes_read' => $restoreResult['bytes_read'],
            'backup_created_at' => $validatedManifest['created_at'],
            'post_validation_passed' => $postValidation['passed'],
        ];
    }
}
