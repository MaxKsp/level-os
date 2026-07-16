<?php
declare(strict_types=1);

/**
 * Fase 4C - Backup autenticado e restauracao isolada. Cobre a
 * criptografia (BackupCrypto.php), o backup logico (DatabaseBackup.php),
 * a restauracao isolada de duas passagens (DatabaseRestore.php) e os
 * parsers das CLIs — tudo com SQLite, arquivos temporarios FORA do
 * repositorio (sys_get_temp_dir()) e dependencias injetaveis. Nunca
 * MySQL real, nunca shell_exec/Git/PowerShell/mysqldump.
 *
 * Requer ext-sodium habilitada (ex: `php -d extension=sodium tests/run.php`
 * se nao estiver habilitada por padrao no php.ini local).
 */

require_once __DIR__ . '/../bootstrap.php';
require_once dirname(__DIR__, 2) . '/app/Core/DatabaseRestore.php';

if (!extension_loaded('sodium')) {
    throw new RuntimeException('This test requires the sodium extension to be enabled (php -d extension=sodium).');
}

/** Introspector fake, guiado por array — mesma forma usada em schema_auditor_test.php. */
final class BkFakeSchemaIntrospector implements SchemaIntrospector {
    public function __construct(private array $tables) {
    }
    public function tableExists(string $table): bool {
        return isset($this->tables[$table]);
    }
    public function columns(string $table): array {
        return $this->tables[$table]['columns'] ?? [];
    }
    public function primaryKey(string $table): array {
        return $this->tables[$table]['primary_key'] ?? [];
    }
    public function indexes(string $table): array {
        return $this->tables[$table]['indexes'] ?? [];
    }
    public function foreignKeys(string $table): array {
        return $this->tables[$table]['foreign_keys'] ?? [];
    }
}

/** PDO espiao: grava toda chamada query/exec/prepare, mas ainda delega pro SQLite real por baixo. */
final class BkSpyPdo extends PDO {
    public array $calls = [];

    public function query(string $query, ?int $fetchMode = null, mixed ...$fetchModeArgs): PDOStatement|false {
        $this->calls[] = 'query:' . $query;
        return $fetchMode === null ? parent::query($query) : parent::query($query, $fetchMode, ...$fetchModeArgs);
    }

    public function exec(string $statement): int|false {
        $this->calls[] = 'exec:' . $statement;
        return parent::exec($statement);
    }

    public function prepare(string $query, array $options = []): PDOStatement|false {
        $this->calls[] = 'prepare:' . $query;
        return parent::prepare($query, $options);
    }
}

function bkt_make_key(): string {
    return random_bytes(SODIUM_CRYPTO_SECRETSTREAM_XCHACHA20POLY1305_KEYBYTES);
}

function bkt_scratch_dir(): string {
    $dir = sys_get_temp_dir() . '/backup_recovery_test_' . bin2hex(random_bytes(6));
    if (!mkdir($dir, 0777, true) && !is_dir($dir)) {
        throw new RuntimeException('Test setup: could not create scratch dir.');
    }
    return $dir;
}

function bkt_remove_dir(string $dir): void {
    $files = glob($dir . '/*') ?: [];
    foreach ($files as $file) {
        @unlink($file);
    }
    @rmdir($dir);
}

/** Schema-contract sintetico e pequeno (users -> accounts, users -> login_attempts efemera). */
function bkt_schema_contract(): array {
    return [
        'users' => [
            'columns' => [
                'id' => ['type' => 'int', 'unsigned' => true, 'nullable' => false],
                'name' => ['type' => 'varchar', 'length' => 64, 'nullable' => false],
                'email' => ['type' => 'varchar', 'length' => 128, 'nullable' => true],
            ],
            'primary_key' => ['id'],
            'indexes' => [],
            'foreign_keys' => [],
        ],
        'accounts' => [
            'columns' => [
                'id' => ['type' => 'int', 'unsigned' => true, 'nullable' => false],
                'user_id' => ['type' => 'int', 'unsigned' => true, 'nullable' => false],
                'balance' => ['type' => 'decimal', 'precision' => 10, 'scale' => 2, 'nullable' => false],
            ],
            'primary_key' => ['id'],
            'indexes' => [],
            'foreign_keys' => [
                ['column' => 'user_id', 'ref_table' => 'users', 'ref_column' => 'id', 'on_delete' => 'CASCADE'],
            ],
        ],
        'login_attempts' => [
            'columns' => ['ip' => ['type' => 'varchar', 'length' => 45, 'nullable' => false]],
            'primary_key' => ['ip'],
            'indexes' => [],
            'foreign_keys' => [],
        ],
    ];
}

function bkt_backup_contract(): array {
    return [
        'application' => 'orby-test',
        'table_order' => ['users', 'accounts'],
        'tables' => [
            'users' => ['kind' => 'persistent', 'columns' => ['id', 'name', 'email'], 'primary_key' => ['id'], 'cleanup' => 'delete_all'],
            'accounts' => ['kind' => 'persistent', 'columns' => ['id', 'user_id', 'balance'], 'primary_key' => ['id'], 'cleanup' => 'delete_all'],
            'login_attempts' => ['kind' => 'ephemeral'],
        ],
    ];
}

/** Introspector fake que reporta o alvo como batendo EXATAMENTE com bkt_schema_contract(). */
function bkt_matching_introspector(): SchemaIntrospector {
    return new BkFakeSchemaIntrospector([
        'users' => [
            'columns' => [
                'id' => ['type' => 'int', 'unsigned' => true, 'nullable' => false],
                'name' => ['type' => 'varchar', 'length' => 64, 'nullable' => false],
                'email' => ['type' => 'varchar', 'length' => 128, 'nullable' => true],
            ],
            'primary_key' => ['id'],
            'indexes' => [],
            'foreign_keys' => [],
        ],
        'accounts' => [
            'columns' => [
                'id' => ['type' => 'int', 'unsigned' => true, 'nullable' => false],
                'user_id' => ['type' => 'int', 'unsigned' => true, 'nullable' => false],
                'balance' => ['type' => 'decimal', 'precision' => 10, 'scale' => 2, 'nullable' => false],
            ],
            'primary_key' => ['id'],
            'indexes' => [],
            'foreign_keys' => [['column' => 'user_id', 'ref_table' => 'users', 'ref_column' => 'id', 'on_delete' => 'CASCADE']],
        ],
        'login_attempts' => [
            'columns' => ['ip' => ['type' => 'varchar', 'length' => 45, 'nullable' => false]],
            'primary_key' => ['ip'],
            'indexes' => [],
            'foreign_keys' => [],
        ],
    ]);
}

function bkt_make_sqlite(): PDO {
    $db = new PDO('sqlite::memory:');
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    $db->exec('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT NULL)');
    $db->exec('CREATE TABLE accounts (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, balance TEXT NOT NULL)');
    $db->exec('CREATE TABLE login_attempts (ip TEXT PRIMARY KEY, attempts INTEGER, locked_until TEXT)');
    return $db;
}

function bkt_add_isolation_marker(PDO $db): void {
    $db->exec('CREATE TABLE orby_restore_target (purpose TEXT NOT NULL)');
    $db->exec("INSERT INTO orby_restore_target (purpose) VALUES ('isolated_restore')");
}

/** Escreve um artefato de backup real, via DatabaseBackup, a partir de um PDO SQLite fonte ja populado. */
function bkt_write_real_artifact(string $path, string $key, PDO $sourceDb): array {
    $handle = fopen($path, 'wb');
    $writer = new BackupArtifactWriter($handle, $key);
    $backup = new DatabaseBackup($sourceDb, bkt_backup_contract(), bkt_schema_contract(), $writer);
    $result = $backup->run();
    fclose($handle);
    return $result;
}

/** Escreve um artefato "cru" (frames arbitrarias) — pra testes de corrupcao/estrutura invalida. */
function bkt_write_raw_frames(string $path, string $key, array $frames): void {
    $handle = fopen($path, 'wb');
    $writer = new BackupArtifactWriter($handle, $key);
    foreach ($frames as $frame) {
        $writer->writeFrame(json_encode($frame['data'], JSON_THROW_ON_ERROR), $frame['final'] ?? false);
    }
    fclose($handle);
}

return function (): void {
    $repoRoot = test_repo_root();

    // ==== A: contratos reais sao mutuamente consistentes ====

    $realSchemaContract = require $repoRoot . '/config/schema-contract.php';
    $realBackupContract = require $repoRoot . '/config/backup-contract.php';
    $validatedRealSchema = schema_auditor_validate_contract($realSchemaContract);
    $validatedRealBackup = backup_contract_validate($realBackupContract, $validatedRealSchema);

    test_assert_true(!in_array('transfers', array_keys($validatedRealBackup['tables']), true), 'transfers must never be classified as a table (it lives inside kv_store).');
    test_assert_same(9, count($validatedRealBackup['table_order']), 'The real backup contract must declare exactly 9 persistent tables.');
    foreach (['login_attempts', 'register_attempts', 'rate_hits'] as $ephemeral) {
        test_assert_same('ephemeral', $validatedRealBackup['tables'][$ephemeral]['kind'], "$ephemeral must be classified as ephemeral.");
        test_assert_true(!in_array($ephemeral, $validatedRealBackup['table_order'], true), "$ephemeral must never appear in table_order.");
    }

    // Tabela do schema real ausente do backup-contract deve lancar (nunca ignorar em silencio).
    $incompleteBackupContract = $realBackupContract;
    unset($incompleteBackupContract['tables']['audit_events']);
    $caught = false;
    try {
        backup_contract_validate($incompleteBackupContract, $validatedRealSchema);
    } catch (InvalidArgumentException) {
        $caught = true;
    }
    test_assert_true($caught, 'backup_contract_validate() must reject a backup contract missing the classification of a real schema table.');

    // ==== B: criptografia (BackupCrypto.php) ====

    $cryptoScratch = bkt_scratch_dir();
    try {
        $key = bkt_make_key();

        // Round-trip de varios chunks.
        $multiPath = $cryptoScratch . '/multi.bin';
        $fh = fopen($multiPath, 'wb');
        $w = new BackupArtifactWriter($fh, $key);
        $chunks = ['first chunk', 'segundo pedaço com acentuação', str_repeat('x', 5000), ''];
        foreach ($chunks as $i => $chunk) {
            $w->writeFrame($chunk, $i === count($chunks) - 1);
        }
        fclose($fh);

        $fh2 = fopen($multiPath, 'rb');
        $r = new BackupArtifactReader($fh2, $key);
        $readBack = [];
        while (($f = $r->readFrame()) !== null) {
            $readBack[] = $f['plaintext'];
        }
        fclose($fh2);
        test_assert_same($chunks, $readBack, 'Multi-chunk round-trip must reproduce every plaintext chunk exactly, including an empty final chunk.');
        test_assert_true($r->sawFinal(), 'Reader must report sawFinal() = true after a well-formed artifact.');

        // "Arquivo vazio logico valido": manifesto + trailer, zero linhas.
        $emptyPath = $cryptoScratch . '/empty-logical.bin';
        $fh = fopen($emptyPath, 'wb');
        $w = new BackupArtifactWriter($fh, $key);
        $w->writeFrame(json_encode(['type' => 'manifest', 'tables' => []], JSON_THROW_ON_ERROR));
        $w->writeFrame(json_encode(['type' => 'trailer', 'tables' => 0, 'total_rows' => 0], JSON_THROW_ON_ERROR), true);
        fclose($fh);
        $fh2 = fopen($emptyPath, 'rb');
        $r = new BackupArtifactReader($fh2, $key);
        $frame1 = $r->readFrame();
        $frame2 = $r->readFrame();
        $frame3 = $r->readFrame();
        fclose($fh2);
        test_assert_true($frame1 !== null && $frame2 !== null && $frame3 === null, 'A logically empty artifact (manifest + trailer only) must be a valid, fully readable artifact.');

        // Chave errada falha.
        $fh2 = fopen($multiPath, 'rb');
        $wrongKeyCaught = false;
        try {
            $rWrong = new BackupArtifactReader($fh2, bkt_make_key());
            $rWrong->readFrame();
        } catch (BackupCryptoException) {
            $wrongKeyCaught = true;
        }
        fclose($fh2);
        test_assert_true($wrongKeyCaught, 'Reading with the wrong key must fail authentication.');

        // Bit alterado falha.
        $bytes = file_get_contents($multiPath);
        $tamperOffset = (int)(strlen($bytes) * 0.6);
        $tampered = $bytes;
        $tampered[$tamperOffset] = chr(ord($tampered[$tamperOffset]) ^ 0xFF);
        $tamperedPath = $cryptoScratch . '/tampered-bit.bin';
        file_put_contents($tamperedPath, $tampered);
        $fh2 = fopen($tamperedPath, 'rb');
        $bitTamperCaught = false;
        try {
            $rt = new BackupArtifactReader($fh2, $key);
            while ($rt->readFrame() !== null) {
            }
        } catch (BackupCryptoException) {
            $bitTamperCaught = true;
        }
        fclose($fh2);
        test_assert_true($bitTamperCaught, 'A single altered bit anywhere in the artifact must be detected as a corruption/authentication failure.');

        // Header alterado falha.
        $headerTampered = $bytes;
        $headerOffset = strlen(BACKUP_ARTIFACT_MAGIC) + 2; // dentro do header secretstream
        $headerTampered[$headerOffset] = chr(ord($headerTampered[$headerOffset]) ^ 0xFF);
        $headerTamperedPath = $cryptoScratch . '/tampered-header.bin';
        file_put_contents($headerTamperedPath, $headerTampered);
        $fh2 = fopen($headerTamperedPath, 'rb');
        $headerTamperCaught = false;
        try {
            $rh = new BackupArtifactReader($fh2, $key);
            while ($rh->readFrame() !== null) {
            }
        } catch (BackupCryptoException) {
            $headerTamperCaught = true;
        }
        fclose($fh2);
        test_assert_true($headerTamperCaught, 'An altered secretstream header must be detected (auth failure on the first frame).');

        // Frame truncado falha.
        $truncatedPath = $cryptoScratch . '/truncated.bin';
        file_put_contents($truncatedPath, substr($bytes, 0, (int)(strlen($bytes) * 0.7)));
        $fh2 = fopen($truncatedPath, 'rb');
        $truncatedCaught = false;
        try {
            $rtr = new BackupArtifactReader($fh2, $key);
            while ($rtr->readFrame() !== null) {
            }
        } catch (BackupCryptoException) {
            $truncatedCaught = true;
        }
        fclose($fh2);
        test_assert_true($truncatedCaught, 'A truncated artifact (cut mid-frame, before TAG_FINAL) must be rejected.');

        // Frame gigante falha (length prefix mentindo um tamanho acima do limite).
        $giantPath = $cryptoScratch . '/giant.bin';
        $fh = fopen($giantPath, 'wb');
        $w2 = new BackupArtifactWriter($fh, $key);
        fclose($fh);
        // injeta um length prefix absurdo logo apos o cabecalho do container.
        $header = file_get_contents($giantPath);
        $giantLenPrefix = pack('N', BACKUP_CRYPTO_MAX_FRAME_BYTES + 1);
        file_put_contents($giantPath, $header . $giantLenPrefix . str_repeat('a', 32));
        $fh2 = fopen($giantPath, 'rb');
        $giantCaught = false;
        try {
            $rg = new BackupArtifactReader($fh2, $key);
            $rg->readFrame();
        } catch (BackupCryptoException) {
            $giantCaught = true;
        }
        fclose($fh2);
        test_assert_true($giantCaught, 'A frame length prefix above the configured maximum must be rejected before reading its body.');

        // TAG_FINAL ausente falha (EOF logo depois de frames normais, nenhuma marcada final).
        $noFinalPath = $cryptoScratch . '/no-final.bin';
        $fh = fopen($noFinalPath, 'wb');
        $wnf = new BackupArtifactWriter($fh, $key);
        $wnf->writeFrame('a', false);
        $wnf->writeFrame('b', false);
        fclose($fh);
        $fh2 = fopen($noFinalPath, 'rb');
        $noFinalCaught = false;
        try {
            $rnf = new BackupArtifactReader($fh2, $key);
            while ($rnf->readFrame() !== null) {
            }
        } catch (BackupCryptoException) {
            $noFinalCaught = true;
        }
        fclose($fh2);
        test_assert_true($noFinalCaught, 'An artifact that ends without ever writing TAG_FINAL must be rejected as a premature EOF.');

        // Bytes apos TAG_FINAL falham.
        $trailingPath = $cryptoScratch . '/trailing.bin';
        file_put_contents($trailingPath, $bytes . 'EXTRA_GARBAGE_AFTER_FINAL');
        $fh2 = fopen($trailingPath, 'rb');
        $trailingCaught = false;
        try {
            $rtg = new BackupArtifactReader($fh2, $key);
            while ($rtg->readFrame() !== null) {
            }
        } catch (BackupCryptoException) {
            $trailingCaught = true;
        }
        fclose($fh2);
        test_assert_true($trailingCaught, 'Any byte appended after the TAG_FINAL frame must be rejected.');

        // Versao desconhecida falha.
        $unknownVersionPath = $cryptoScratch . '/unknown-version.bin';
        $mutatedVersion = $bytes;
        $mutatedVersion[strlen(BACKUP_ARTIFACT_MAGIC)] = chr(99);
        file_put_contents($unknownVersionPath, $mutatedVersion);
        $fh2 = fopen($unknownVersionPath, 'rb');
        $unknownVersionCaught = false;
        try {
            new BackupArtifactReader($fh2, $key);
        } catch (BackupCryptoException) {
            $unknownVersionCaught = true;
        }
        fclose($fh2);
        test_assert_true($unknownVersionCaught, 'An unknown format version must be rejected before any frame is read.');

        // Nenhum plaintext conhecido aparece no artefato.
        $sensitivePath = $cryptoScratch . '/sensitive.bin';
        $fh = fopen($sensitivePath, 'wb');
        $ws = new BackupArtifactWriter($fh, $key);
        $ws->writeFrame('correct horse battery staple SECRET_MARKER_XYZ', true);
        fclose($fh);
        $rawArtifactBytes = (string)file_get_contents($sensitivePath);
        test_assert_true(!str_contains($rawArtifactBytes, 'SECRET_MARKER_XYZ'), 'The known plaintext must never appear verbatim in the encrypted artifact bytes.');

        // Chave invalida / base64 invalido falha, sem fallback.
        putenv('ORBY_BACKUP_KEY_TEST=not-valid-base64-!!!');
        $badKeyCaught = false;
        try {
            backup_crypto_read_key('ORBY_BACKUP_KEY_TEST');
        } catch (BackupCryptoException) {
            $badKeyCaught = true;
        }
        test_assert_true($badKeyCaught, 'An invalid base64 key must be rejected.');
        putenv('ORBY_BACKUP_KEY_TEST=' . base64_encode('too short'));
        $shortKeyCaught = false;
        try {
            backup_crypto_read_key('ORBY_BACKUP_KEY_TEST');
        } catch (BackupCryptoException) {
            $shortKeyCaught = true;
        }
        test_assert_true($shortKeyCaught, 'A key shorter than KEYBYTES after decoding must be rejected.');
        putenv('ORBY_BACKUP_KEY_TEST');
        $missingKeyCaught = false;
        try {
            backup_crypto_read_key('ORBY_BACKUP_KEY_TEST');
        } catch (BackupCryptoException) {
            $missingKeyCaught = true;
        }
        test_assert_true($missingKeyCaught, 'A missing key environment variable must be rejected, never fall back to anything.');

        // Nenhuma exception inclui a chave ou plaintext.
        try {
            backup_crypto_read_key('ORBY_BACKUP_KEY_TEST');
        } catch (Throwable $e) {
            test_assert_true(!str_contains($e->getMessage(), 'ORBY_BACKUP_KEY_TEST') && strlen($e->getMessage()) < 100, 'Key-related exception messages must be short and fixed, never echo the env var name/value.');
        }
    } finally {
        bkt_remove_dir($cryptoScratch);
    }

    // ==== C: backup logico (DatabaseBackup.php) ====

    $backupScratch = bkt_scratch_dir();
    try {
        $key = bkt_make_key();
        $sourceDb = bkt_make_sqlite();
        $sourceDb->exec("INSERT INTO users (id, name, email) VALUES (1, 'Ana', 'ana@example.com')");
        $sourceDb->exec("INSERT INTO users (id, name, email) VALUES (2, 'Bea çãü ☺', NULL)");
        $sourceDb->exec("INSERT INTO accounts (id, user_id, balance) VALUES (10, 1, '123.45')");
        $sourceDb->exec("INSERT INTO accounts (id, user_id, balance) VALUES (11, 2, '-0.01')");
        $sourceDb->exec("INSERT INTO login_attempts (ip, attempts) VALUES ('1.2.3.4', 3)");

        $artifactPath = $backupScratch . '/backup-1.bin';
        $result = bkt_write_real_artifact($artifactPath, $key, $sourceDb);
        test_assert_same(['users' => 2, 'accounts' => 2], $result['tables'], 'Backup must count exactly the persistent tables declared in table_order, in order.');
        test_assert_same(4, $result['total_rows'], 'total_rows must be the sum of all persistent table rows.');
        test_assert_true($result['bytes_written'] > 0, 'bytes_written must be reported.');

        // Ordem deterministica + tabela efemera excluida + colunas explicitas: le o artefato cru.
        $fh = fopen($artifactPath, 'rb');
        $reader = new BackupArtifactReader($fh, $key);
        $seenTypes = [];
        $sawLoginAttempts = false;
        $sawEmailNull = false;
        $sawUnicodeName = false;
        $sawDecimalAsString = false;
        while (($f = $reader->readFrame()) !== null) {
            $rec = json_decode($f['plaintext'], true, 512, JSON_THROW_ON_ERROR);
            $seenTypes[] = $rec['type'] . (isset($rec['table']) ? (':' . $rec['table']) : '');
            if (($rec['table'] ?? null) === 'login_attempts') {
                $sawLoginAttempts = true;
            }
            if ($rec['type'] === 'row' && $rec['table'] === 'users') {
                test_assert_same(['id', 'name', 'email'], array_keys($rec['values']), 'Exported user row must contain exactly the contracted columns, no SELECT * leakage.');
                if ($rec['values']['id'] === 2) {
                    test_assert_same(null, $rec['values']['email'], 'NULL must round-trip as JSON null, not an empty string or missing key.');
                    test_assert_same('Bea çãü ☺', $rec['values']['name'], 'Unicode must be preserved exactly.');
                    $sawEmailNull = true;
                    $sawUnicodeName = true;
                }
            }
            if ($rec['type'] === 'row' && $rec['table'] === 'accounts' && $rec['values']['id'] === 11) {
                test_assert_same('-0.01', $rec['values']['balance'], 'Decimal values must be preserved exactly as returned by PDO (no float rounding/casting).');
                $sawDecimalAsString = true;
            }
        }
        fclose($fh);
        test_assert_true(!$sawLoginAttempts, 'An ephemeral table (login_attempts) must never appear in the backup artifact.');
        test_assert_true($sawEmailNull && $sawUnicodeName && $sawDecimalAsString, 'Test setup sanity: expected rows must have been observed.');
        test_assert_same(
            ['manifest', 'table_start:users', 'row:users', 'row:users', 'table_end:users', 'table_start:accounts', 'row:accounts', 'row:accounts', 'table_end:accounts', 'trailer'],
            $seenTypes,
            'Backup record order must be deterministic: manifest, then each table (start/rows/end) in table_order, then trailer.'
        );

        // Destino existente sem --force falha; com --force funciona.
        $overwriteTarget = $backupScratch . '/existing.bin';
        file_put_contents($overwriteTarget, 'not a real backup');
        $noForceCaught = false;
        try {
            backup_resolve_destination($overwriteTarget, $repoRoot, false);
        } catch (InvalidArgumentException) {
            $noForceCaught = true;
        }
        test_assert_true($noForceCaught, 'An existing destination without --force must be rejected.');
        [$finalPath, $tmpPath] = backup_resolve_destination($overwriteTarget, $repoRoot, true);
        test_assert_true(str_ends_with($finalPath, 'existing.bin'), 'With --force, the destination must resolve normally.');

        // Falha durante a escrita nao deixa arquivo final, e remove o temporario.
        $failDestDir = $backupScratch;
        $failDest = $failDestDir . '/should-not-exist-after-failure.bin';
        [$failFinal, $failTmp] = backup_resolve_destination($failDest, $repoRoot, false);
        $fh = fopen($failTmp, 'xb');
        $failingWriter = new BackupArtifactWriter($fh, $key);
        $failingBackupContract = bkt_backup_contract();
        // Referencia uma tabela que nao existe no PDO fonte -> exportTable() lanca.
        $failingBackupContract['table_order'] = ['users', 'accounts', 'does_not_exist'];
        $failingBackupContract['tables']['does_not_exist'] = ['kind' => 'persistent', 'columns' => ['id'], 'primary_key' => ['id'], 'cleanup' => 'delete_all'];
        $failingSchemaContract = bkt_schema_contract();
        $failingSchemaContract['does_not_exist'] = ['columns' => ['id' => ['type' => 'int', 'nullable' => false]], 'primary_key' => ['id'], 'indexes' => [], 'foreign_keys' => []];
        $writeFailed = false;
        try {
            $failingBackup = new DatabaseBackup($sourceDb, $failingBackupContract, $failingSchemaContract, $failingWriter);
            $failingBackup->run();
        } catch (Throwable) {
            $writeFailed = true;
        } finally {
            fclose($fh);
            @unlink($failTmp);
        }
        test_assert_true($writeFailed, 'Test setup: exporting a non-existent table must fail.');
        test_assert_true(!file_exists($failFinal), 'A failed backup must never leave a final artifact file behind.');
        test_assert_true(!file_exists($failTmp), 'A failed backup must leave no temporary file behind either.');

        // Destino dentro do repositorio e bloqueado.
        $insideRepoCaught = false;
        try {
            backup_resolve_destination($repoRoot . '/should-not-write-here.orbybak', $repoRoot, true);
        } catch (InvalidArgumentException) {
            $insideRepoCaught = true;
        }
        test_assert_true($insideRepoCaught, 'A destination directory inside the application repository must always be rejected.');

        // Symlink apontando pro repo (dentro do webroot) tambem e bloqueado, quando suportado.
        $symlinkOutsideDir = bkt_scratch_dir();
        $symlinkPath = $symlinkOutsideDir . '/points-into-repo';
        $symlinkCreated = @symlink($repoRoot, $symlinkPath);
        if ($symlinkCreated) {
            $symlinkCaught = false;
            try {
                backup_resolve_destination($symlinkPath . '/via-symlink.orbybak', $repoRoot, true);
            } catch (InvalidArgumentException) {
                $symlinkCaught = true;
            }
            test_assert_true($symlinkCaught, 'A symlink resolving into the application repository must be rejected, not just the literal path text.');
        }
        bkt_remove_dir($symlinkOutsideDir);
    } finally {
        bkt_remove_dir($backupScratch);
    }

    // ==== D: restauracao isolada (DatabaseRestore.php) ====

    $restoreScratch = bkt_scratch_dir();
    try {
        $key = bkt_make_key();
        $sourceDb = bkt_make_sqlite();
        $sourceDb->exec("INSERT INTO users (id, name, email) VALUES (1, 'Ana', 'ana@example.com')");
        $sourceDb->exec("INSERT INTO users (id, name, email) VALUES (2, \"Robert'); DROP TABLE users; --\", NULL)");
        $sourceDb->exec("INSERT INTO accounts (id, user_id, balance) VALUES (10, 1, '123.45')");
        $sourceDb->exec("INSERT INTO login_attempts (ip, attempts) VALUES ('9.9.9.9', 1)");

        $artifactPath = $restoreScratch . '/backup-for-restore.bin';
        bkt_write_real_artifact($artifactPath, $key, $sourceDb);

        // ---- nome do alvo: isolamento checado sem tocar banco ----
        $nameCaught = [];
        foreach ([
            ['app', '', 'app', 'empty target name'],
            ['app', 'app', 'app', 'target equal to application db'],
            ['app', 'validname', 'wrongconfirm', 'confirm name mismatch'],
            ['app', '%wildcard%', '%wildcard%', 'wildcard/invalid identifier'],
        ] as [$appName, $targetName, $confirmName, $label]) {
            $caught = false;
            try {
                database_restore_check_target_name($appName, $targetName, $confirmName);
            } catch (InvalidArgumentException) {
                $caught = true;
            }
            test_assert_true($caught, "database_restore_check_target_name() must reject: $label.");
        }
        database_restore_check_target_name('orby_app', 'orby_restore_isolated', 'orby_restore_isolated'); // nao deve lancar

        // ---- marcador ausente recusa ----
        $targetNoMarker = bkt_make_sqlite();
        $restoreNoMarker = new DatabaseRestore($targetNoMarker, bkt_backup_contract(), bkt_schema_contract(), $key, $artifactPath, static fn(PDO $db) => bkt_matching_introspector());
        $noMarkerCaught = false;
        try {
            $restoreNoMarker->verifyIsolationMarker();
        } catch (InvalidArgumentException) {
            $noMarkerCaught = true;
        }
        test_assert_true($noMarkerCaught, 'A target without the orby_restore_target marker must be rejected.');

        // ---- alvo nao vazio recusa (preflight) ----
        $targetNotEmpty = bkt_make_sqlite();
        bkt_add_isolation_marker($targetNotEmpty);
        $targetNotEmpty->exec("INSERT INTO users (id, name) VALUES (99, 'preexisting')");
        $restoreNotEmpty = new DatabaseRestore($targetNotEmpty, bkt_backup_contract(), bkt_schema_contract(), $key, $artifactPath, static fn(PDO $db) => bkt_matching_introspector());
        $validatedForPreflight = $restoreNotEmpty->validateArtifact();
        $notEmptyCaught = false;
        try {
            $restoreNotEmpty->preflight($validatedForPreflight);
        } catch (InvalidArgumentException) {
            $notEmptyCaught = true;
        }
        test_assert_true($notEmptyCaught, 'A target with any pre-existing persistent-table data must be rejected by preflight.');

        // ---- schema incompativel recusa ----
        $targetSchemaMismatch = bkt_make_sqlite();
        bkt_add_isolation_marker($targetSchemaMismatch);
        $mismatchIntrospector = static fn(PDO $db) => new BkFakeSchemaIntrospector([]); // nenhuma tabela "existe"
        $restoreSchemaMismatch = new DatabaseRestore($targetSchemaMismatch, bkt_backup_contract(), bkt_schema_contract(), $key, $artifactPath, $mismatchIntrospector);
        $schemaMismatchCaught = false;
        try {
            $restoreSchemaMismatch->preflight($validatedForPreflight);
        } catch (InvalidArgumentException) {
            $schemaMismatchCaught = true;
        }
        test_assert_true($schemaMismatchCaught, 'An incompatible target schema must be rejected by preflight (schema audit does not pass).');

        // ---- tabela/coluna desconhecida no artefato recusa (pass 1) ----
        $unknownColumnPath = $restoreScratch . '/unknown-column.bin';
        bkt_write_raw_frames($unknownColumnPath, $key, [
            ['data' => ['type' => 'manifest', 'format_version' => BACKUP_ARTIFACT_VERSION, 'schema_contract_sha256' => backup_schema_contract_hash(schema_auditor_validate_contract(bkt_schema_contract())), 'tables' => ['users', 'accounts']]],
            ['data' => ['type' => 'table_start', 'table' => 'users', 'expected_count' => 1]],
            ['data' => ['type' => 'row', 'table' => 'users', 'values' => ['id' => 1, 'name' => 'x', 'email' => null, 'not_a_real_column' => 'evil']]],
            ['data' => ['type' => 'table_end', 'table' => 'users', 'count' => 1]],
            ['data' => ['type' => 'table_start', 'table' => 'accounts', 'expected_count' => 0]],
            ['data' => ['type' => 'table_end', 'table' => 'accounts', 'count' => 0]],
            ['data' => ['type' => 'trailer', 'tables' => 2, 'total_rows' => 1], 'final' => true],
        ]);
        $restoreUnknownColumn = new DatabaseRestore(bkt_make_sqlite(), bkt_backup_contract(), bkt_schema_contract(), $key, $unknownColumnPath, static fn(PDO $db) => bkt_matching_introspector());
        $unknownColumnCaught = false;
        try {
            $restoreUnknownColumn->validateArtifact();
        } catch (BackupCryptoException) {
            $unknownColumnCaught = true;
        }
        test_assert_true($unknownColumnCaught, 'An artifact row referencing a column outside the backup contract allowlist must be rejected in pass 1.');

        // ---- primeira passagem invalida nunca toca o banco ----
        $corruptedPath = $restoreScratch . '/corrupted-for-pass1.bin';
        $originalBytes = (string)file_get_contents($artifactPath);
        $corruptOffset = (int)(strlen($originalBytes) * 0.5);
        $corrupted = $originalBytes;
        $corrupted[$corruptOffset] = chr(ord($corrupted[$corruptOffset]) ^ 0xFF);
        file_put_contents($corruptedPath, $corrupted);

        $spyForCorrupted = new BkSpyPdo('sqlite::memory:');
        $restoreCorrupted = new DatabaseRestore($spyForCorrupted, bkt_backup_contract(), bkt_schema_contract(), $key, $corruptedPath, static fn(PDO $db) => bkt_matching_introspector());
        $corruptedRejected = false;
        try {
            $restoreCorrupted->validateArtifact();
        } catch (BackupCryptoException) {
            $corruptedRejected = true;
        }
        test_assert_true($corruptedRejected, 'A corrupted artifact must be rejected by validateArtifact().');
        test_assert_same([], $spyForCorrupted->calls, 'validateArtifact() must NEVER touch the target PDO, even (especially) when the artifact is invalid.');

        // ---- chave errada nunca toca o banco ----
        $spyForWrongKey = new BkSpyPdo('sqlite::memory:');
        $restoreWrongKey = new DatabaseRestore($spyForWrongKey, bkt_backup_contract(), bkt_schema_contract(), bkt_make_key(), $artifactPath, static fn(PDO $db) => bkt_matching_introspector());
        $wrongKeyRejected = false;
        try {
            $restoreWrongKey->validateArtifact();
        } catch (BackupCryptoException) {
            $wrongKeyRejected = true;
        }
        test_assert_true($wrongKeyRejected, 'The wrong key must cause validateArtifact() to fail.');
        test_assert_same([], $spyForWrongKey->calls, 'A wrong decryption key must never result in any target database access.');

        // ---- restauracao completa preserva dados; SQL em valor e tratado como dado; tabela efemera fica vazia ----
        $targetFull = bkt_make_sqlite();
        bkt_add_isolation_marker($targetFull);
        $restoreFull = new DatabaseRestore($targetFull, bkt_backup_contract(), bkt_schema_contract(), $key, $artifactPath, static fn(PDO $db) => bkt_matching_introspector());
        $fullResult = $restoreFull->run();

        test_assert_same(['users' => 2, 'accounts' => 1], $fullResult['tables'], 'A full restore must report the exact row counts per table.');
        test_assert_true($fullResult['post_validation_passed'], 'Post-restore schema audit must pass.');

        $restoredRow = $targetFull->query("SELECT name FROM users WHERE id = 2")->fetch();
        test_assert_same("Robert'); DROP TABLE users; --", $restoredRow['name'], 'A malicious-looking string value must round-trip byte-for-byte as inert data — never executed as SQL.');
        $usersStillExists = $targetFull->query("SELECT COUNT(*) FROM users")->fetchColumn();
        test_assert_same(2, (int)$usersStillExists, 'The users table must still exist with exactly 2 rows — the embedded DROP TABLE must never have executed.');

        $loginAttemptsCount = (int)$targetFull->query('SELECT COUNT(*) FROM login_attempts')->fetchColumn();
        test_assert_same(0, $loginAttemptsCount, 'An ephemeral table must remain empty after restore — it is never populated from the backup.');

        // ---- falha no meio da restauracao faz rollback integral ----
        $targetMidFailure = bkt_make_sqlite();
        // CHECK constraint no SQLite simula uma falha real de insercao no meio do lote,
        // sem precisar de um artefato malformado (que a validacao de pass 1 ja pegaria antes).
        $targetMidFailure->exec('DROP TABLE accounts');
        $targetMidFailure->exec("CREATE TABLE accounts (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, balance TEXT NOT NULL, CHECK (id != 10))");
        bkt_add_isolation_marker($targetMidFailure);
        $restoreMidFailure = new DatabaseRestore($targetMidFailure, bkt_backup_contract(), bkt_schema_contract(), $key, $artifactPath, static fn(PDO $db) => bkt_matching_introspector());
        $midFailureValidated = $restoreMidFailure->validateArtifact();
        $midFailureCaught = false;
        try {
            $restoreMidFailure->restore($midFailureValidated);
        } catch (Throwable) {
            $midFailureCaught = true;
        }
        test_assert_true($midFailureCaught, 'A database-level failure partway through restore (users OK, accounts fails) must propagate.');
        $usersAfterRollback = (int)$targetMidFailure->query('SELECT COUNT(*) FROM users')->fetchColumn();
        test_assert_same(0, $usersAfterRollback, 'A failure while restoring accounts (the second table) must roll back the users table too — one single transaction, all or nothing.');

        // ---- contagem divergente faz rollback (defesa em profundidade dentro de restore(), mesmo sem pass 1) ----
        $divergentPath = $restoreScratch . '/divergent-count.bin';
        bkt_write_raw_frames($divergentPath, $key, [
            ['data' => ['type' => 'manifest', 'format_version' => BACKUP_ARTIFACT_VERSION, 'schema_contract_sha256' => backup_schema_contract_hash(schema_auditor_validate_contract(bkt_schema_contract())), 'tables' => ['users', 'accounts']]],
            ['data' => ['type' => 'table_start', 'table' => 'users', 'expected_count' => 5]], // mentira: so vem 1 linha
            ['data' => ['type' => 'row', 'table' => 'users', 'values' => ['id' => 1, 'name' => 'x', 'email' => null]]],
            ['data' => ['type' => 'table_end', 'table' => 'users', 'count' => 1]],
            ['data' => ['type' => 'table_start', 'table' => 'accounts', 'expected_count' => 0]],
            ['data' => ['type' => 'table_end', 'table' => 'accounts', 'count' => 0]],
            ['data' => ['type' => 'trailer', 'tables' => 2, 'total_rows' => 1], 'final' => true],
        ]);
        $targetDivergent = bkt_make_sqlite();
        bkt_add_isolation_marker($targetDivergent);
        $restoreDivergent = new DatabaseRestore($targetDivergent, bkt_backup_contract(), bkt_schema_contract(), $key, $divergentPath, static fn(PDO $db) => bkt_matching_introspector());
        // Chama restore() DIRETO, sem validateArtifact() antes — prova que restore() tem sua
        // PROPRIA checagem de contagem, nao depende cegamente da pass 1 ja ter rodado.
        $fakeValidatedManifest = ['schema_contract_sha256' => backup_schema_contract_hash(schema_auditor_validate_contract(bkt_schema_contract()))];
        $divergentCaught = false;
        try {
            $restoreDivergent->restore($fakeValidatedManifest);
        } catch (BackupCryptoException) {
            $divergentCaught = true;
        }
        test_assert_true($divergentCaught, 'restore() must detect a row-count divergence (expected_count vs actual rows) on its own and reject.');
        $usersAfterDivergentRollback = (int)$targetDivergent->query('SELECT COUNT(*) FROM users')->fetchColumn();
        test_assert_same(0, $usersAfterDivergentRollback, 'A row-count divergence must roll back everything inserted so far in that transaction.');

        // ---- nenhum arquivo temporario em texto claro e criado pela restauracao ----
        $restoreSrc = (string)file_get_contents($repoRoot . '/app/Core/DatabaseRestore.php');
        foreach (['tempnam(', "fopen(sys_get_temp_dir", 'file_put_contents('] as $forbidden) {
            test_assert_true(!str_contains($restoreSrc, $forbidden), "DatabaseRestore.php must never write a plaintext temp file (found suspicious call: $forbidden).");
        }
    } finally {
        bkt_remove_dir($restoreScratch);
    }

    // ==== E: CLI — parsers puros, sem tocar banco/env real ====

    if (!defined('BACKUP_CLI_NO_AUTOEXEC')) {
        define('BACKUP_CLI_NO_AUTOEXEC', true);
    }
    require_once $repoRoot . '/scripts/backup.php';
    if (!defined('RESTORE_CLI_NO_AUTOEXEC')) {
        define('RESTORE_CLI_NO_AUTOEXEC', true);
    }
    require_once $repoRoot . '/scripts/restore.php';

    test_assert_same(['output' => '/tmp/x.orbybak', 'force' => false], backup_cli_parse_args(['--output=/tmp/x.orbybak']), 'backup CLI must parse --output.');
    test_assert_same(['output' => '/tmp/x.orbybak', 'force' => true], backup_cli_parse_args(['--output=/tmp/x.orbybak', '--force']), 'backup CLI must parse --force.');
    foreach ([[], ['--bogus'], ['--output=x', '--extra']] as $badArgs) {
        $caught = false;
        try {
            backup_cli_parse_args($badArgs);
        } catch (InvalidArgumentException) {
            $caught = true;
        }
        test_assert_true($caught, 'backup CLI must reject: ' . implode(' ', $badArgs));
    }

    test_assert_same(['input' => '/tmp/x.orbybak', 'confirm' => true], restore_cli_parse_args(['--input=/tmp/x.orbybak', '--confirm']), 'restore CLI must parse --input and --confirm.');
    foreach ([[], ['--input=/tmp/x.orbybak'], ['--confirm'], ['--input=/tmp/x.orbybak', '--confirm', '--extra']] as $badArgs) {
        $caught = false;
        try {
            restore_cli_parse_args($badArgs);
        } catch (InvalidArgumentException) {
            $caught = true;
        }
        test_assert_true($caught, 'restore CLI must reject (missing --confirm or unknown arg): ' . implode(' ', $badArgs));
    }

    // Segredo proposital em excecao nunca aparece na saida segura da CLI.
    $secretException = new RuntimeException('ORBY_BACKUP_KEY=abcdEFGH1234 DSN=mysql://root:hunter2@host/db');
    $safeClass = backup_exception_class($secretException);
    test_assert_same('RuntimeException', $safeClass, 'backup_exception_class() must return only the allowlisted class name.');
    test_assert_true(!str_contains($safeClass, 'hunter2') && !str_contains($safeClass, 'ORBY_BACKUP_KEY'), 'The safe class string must never contain the secret embedded in the exception message.');
};
