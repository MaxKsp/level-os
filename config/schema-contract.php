<?php
declare(strict_types=1);

/**
 * Fase 4B - Contrato declarativo minimo do schema critico. Array
 * explicito e deterministico (sem introspeccao/scan aqui) — e comparado
 * contra o banco real por app/Core/SchemaAuditor.php.
 *
 * Fonte canonica: schema.sql, cruzado com o uso real em auth.php,
 * finance.php, app/Modules/Finance/*.php, plan.php, cron-notify.php e
 * api/*.php (ver comentarios de indice abaixo).
 *
 * 'transfers' NAO aparece aqui: nunca foi uma tabela relacional. Vive em
 * kv_store.data_key='transfers' (ver app/Modules/Finance/FinanceAuxiliaryKv.php),
 * coberta pela PRIMARY KEY (user_id, data_key) de kv_store. Declarar uma
 * tabela 'transfers' inexistente produziria um missing_table falso —
 * contrariaria a propria fonte canonica (schema.sql nunca teve essa tabela).
 *
 * Formato de cada tabela:
 * - columns: nome => ['type' => tipo base, 'unsigned' => bool, 'nullable' => bool,
 *   'length' => int|null (varchar/char), 'precision'/'scale' => int|null (decimal)]
 * - primary_key: lista de colunas, em ordem
 * - indexes: lista de ['name' => diagnostico, 'columns' => lista em ordem, 'unique' => bool]
 * - foreign_keys: lista de ['column', 'ref_table', 'ref_column', 'on_delete']
 */

return [
    'users' => [
        'columns' => [
            'id' => ['type' => 'int', 'unsigned' => true, 'nullable' => false],
            'username' => ['type' => 'varchar', 'length' => 64, 'nullable' => false],
            'password_hash' => ['type' => 'varchar', 'length' => 255, 'nullable' => true],
            'email' => ['type' => 'varchar', 'length' => 255, 'nullable' => true],
            'email_verified_at' => ['type' => 'timestamp', 'nullable' => true],
            'email_verify_token' => ['type' => 'varchar', 'length' => 64, 'nullable' => true],
            'google_id' => ['type' => 'varchar', 'length' => 64, 'nullable' => true],
            'totp_secret' => ['type' => 'varchar', 'length' => 64, 'nullable' => true],
            'totp_enabled' => ['type' => 'tinyint', 'nullable' => false],
            'notify_email' => ['type' => 'tinyint', 'nullable' => false],
            'avatar' => ['type' => 'varchar', 'length' => 255, 'nullable' => true],
            'created_at' => ['type' => 'timestamp', 'nullable' => false],
        ],
        'primary_key' => ['id'],
        // auth.php: username OR email (login); google_id (OAuth); email_verify_token
        // (verify-email.php: SELECT id FROM users WHERE email_verify_token = ?).
        // Token vem de bin2hex(random_bytes(32)) e identifica uma unica conta —
        // exige UNIQUE exato, nao so um indice comum (MySQL permite varios NULL
        // em UNIQUE, entao usuarios ja verificados com token=NULL nao colidem).
        'indexes' => [
            ['name' => 'username', 'columns' => ['username'], 'unique' => true],
            ['name' => 'email', 'columns' => ['email'], 'unique' => true],
            ['name' => 'google_id', 'columns' => ['google_id'], 'unique' => true],
            ['name' => 'idx_users_email_verify_token', 'columns' => ['email_verify_token'], 'unique' => true],
        ],
        'foreign_keys' => [],
    ],

    'totp_backup_codes' => [
        'columns' => [
            'id' => ['type' => 'int', 'unsigned' => true, 'nullable' => false],
            'user_id' => ['type' => 'int', 'unsigned' => true, 'nullable' => false],
            'code_hash' => ['type' => 'varchar', 'length' => 255, 'nullable' => false],
            'used_at' => ['type' => 'timestamp', 'nullable' => true],
        ],
        'primary_key' => ['id'],
        // auth.php attempt_2fa(): WHERE user_id = ? AND used_at IS NULL. Satisfeito
        // pelo indice implicito que o InnoDB cria para a FK abaixo.
        'indexes' => [
            ['name' => 'user_id', 'columns' => ['user_id'], 'unique' => false],
        ],
        'foreign_keys' => [
            ['column' => 'user_id', 'ref_table' => 'users', 'ref_column' => 'id', 'on_delete' => 'CASCADE'],
        ],
    ],

    'kv_store' => [
        'columns' => [
            'user_id' => ['type' => 'int', 'unsigned' => true, 'nullable' => false],
            'data_key' => ['type' => 'varchar', 'length' => 255, 'nullable' => false],
            'data_value' => ['type' => 'longtext', 'nullable' => false],
            'updated_at' => ['type' => 'timestamp', 'nullable' => false],
        ],
        // api/data.php, api/export.php, cron-notify.php: WHERE user_id = ? [AND data_key = ?].
        // A PK composta ja cobre ambos os padroes (prefixo esquerdo user_id sozinho,
        // ou user_id+data_key) — nenhum indice adicional e necessario.
        'primary_key' => ['user_id', 'data_key'],
        'indexes' => [],
        'foreign_keys' => [
            ['column' => 'user_id', 'ref_table' => 'users', 'ref_column' => 'id', 'on_delete' => 'CASCADE'],
        ],
    ],

    'login_attempts' => [
        'columns' => [
            'ip' => ['type' => 'varchar', 'length' => 45, 'nullable' => false],
            'attempts' => ['type' => 'int', 'unsigned' => true, 'nullable' => false],
            'locked_until' => ['type' => 'datetime', 'nullable' => true],
        ],
        // auth.php: toda consulta e WHERE ip = ? — a PK ja cobre.
        'primary_key' => ['ip'],
        'indexes' => [],
        'foreign_keys' => [],
    ],

    'register_attempts' => [
        'columns' => [
            'ip' => ['type' => 'varchar', 'length' => 45, 'nullable' => false],
            'attempts' => ['type' => 'int', 'unsigned' => true, 'nullable' => false],
            'locked_until' => ['type' => 'datetime', 'nullable' => true],
        ],
        'primary_key' => ['ip'],
        'indexes' => [],
        'foreign_keys' => [],
    ],

    'rate_hits' => [
        'columns' => [
            'bucket' => ['type' => 'varchar', 'length' => 48, 'nullable' => false],
            'subject' => ['type' => 'varchar', 'length' => 64, 'nullable' => false],
            'window_start' => ['type' => 'int', 'unsigned' => true, 'nullable' => false],
            'hits' => ['type' => 'int', 'unsigned' => true, 'nullable' => false],
        ],
        // auth.php rate_ok(): WHERE bucket = ? AND subject = ? — a PK ja cobre.
        'primary_key' => ['bucket', 'subject'],
        'indexes' => [],
        'foreign_keys' => [],
    ],

    'subscriptions' => [
        'columns' => [
            'user_id' => ['type' => 'int', 'unsigned' => true, 'nullable' => false],
            'plan' => ['type' => 'enum', 'nullable' => false],
            'status' => ['type' => 'enum', 'nullable' => false],
            'current_period_end' => ['type' => 'datetime', 'nullable' => true],
            'updated_at' => ['type' => 'timestamp', 'nullable' => false],
        ],
        // plan.php user_plan(), api/subscription.php: WHERE user_id = ? — a PK ja cobre.
        'primary_key' => ['user_id'],
        'indexes' => [],
        'foreign_keys' => [
            ['column' => 'user_id', 'ref_table' => 'users', 'ref_column' => 'id', 'on_delete' => 'CASCADE'],
        ],
    ],

    'subscription_events' => [
        'columns' => [
            'id' => ['type' => 'int', 'unsigned' => true, 'nullable' => false],
            'user_id' => ['type' => 'int', 'unsigned' => true, 'nullable' => false],
            'event' => ['type' => 'varchar', 'length' => 48, 'nullable' => false],
            'detail' => ['type' => 'varchar', 'length' => 255, 'nullable' => true],
            'created_at' => ['type' => 'timestamp', 'nullable' => false],
        ],
        // Nenhuma consulta real le esta tabela hoje (reservada para o futuro
        // webhook do gateway) — sem requisito de indice alem do implicito da FK.
        'primary_key' => ['id'],
        'indexes' => [],
        'foreign_keys' => [
            ['column' => 'user_id', 'ref_table' => 'users', 'ref_column' => 'id', 'on_delete' => 'CASCADE'],
        ],
    ],

    'transactions' => [
        'columns' => [
            'id' => ['type' => 'bigint', 'unsigned' => true, 'nullable' => false],
            'user_id' => ['type' => 'int', 'unsigned' => true, 'nullable' => false],
            'kind' => ['type' => 'enum', 'nullable' => false],
            'client_id' => ['type' => 'varchar', 'length' => 32, 'nullable' => false],
            'label' => ['type' => 'varchar', 'length' => 255, 'nullable' => true],
            'value' => ['type' => 'decimal', 'precision' => 12, 'scale' => 2, 'nullable' => false],
            'tx_date' => ['type' => 'date', 'nullable' => true],
            'tx_time' => ['type' => 'time', 'nullable' => true],
            'category' => ['type' => 'varchar', 'length' => 48, 'nullable' => true],
            'method' => ['type' => 'varchar', 'length' => 24, 'nullable' => true],
            'bank' => ['type' => 'varchar', 'length' => 48, 'nullable' => true],
            'recurrence' => ['type' => 'varchar', 'length' => 16, 'nullable' => true],
            'income_type' => ['type' => 'varchar', 'length' => 16, 'nullable' => true],
            'end_date' => ['type' => 'date', 'nullable' => true],
            'account_id' => ['type' => 'varchar', 'length' => 32, 'nullable' => true],
            'km' => ['type' => 'int', 'nullable' => true],
            'payday' => ['type' => 'tinyint', 'unsigned' => true, 'nullable' => true],
            'parcelas' => ['type' => 'int', 'nullable' => true],
            'created_at' => ['type' => 'bigint', 'nullable' => true],
        ],
        'primary_key' => ['id'],
        // app/Modules/Finance/FinanceRead.php: WHERE user_id = ? AND kind = ? ORDER BY id;
        // schema.sql tambem usa user_id+tx_date pra futura conciliacao/relatorio por periodo.
        'indexes' => [
            ['name' => 'idx_user_kind', 'columns' => ['user_id', 'kind'], 'unique' => false],
            ['name' => 'idx_user_date', 'columns' => ['user_id', 'tx_date'], 'unique' => false],
        ],
        'foreign_keys' => [
            ['column' => 'user_id', 'ref_table' => 'users', 'ref_column' => 'id', 'on_delete' => 'CASCADE'],
        ],
    ],

    'accounts' => [
        'columns' => [
            'id' => ['type' => 'bigint', 'unsigned' => true, 'nullable' => false],
            'user_id' => ['type' => 'int', 'unsigned' => true, 'nullable' => false],
            'client_id' => ['type' => 'varchar', 'length' => 32, 'nullable' => false],
            'label' => ['type' => 'varchar', 'length' => 255, 'nullable' => true],
            'tipo' => ['type' => 'varchar', 'length' => 16, 'nullable' => true],
            'saldo' => ['type' => 'decimal', 'precision' => 12, 'scale' => 2, 'nullable' => false],
            'cheque_especial' => ['type' => 'decimal', 'precision' => 12, 'scale' => 2, 'nullable' => false],
            'limite' => ['type' => 'decimal', 'precision' => 12, 'scale' => 2, 'nullable' => false],
            'fatura' => ['type' => 'decimal', 'precision' => 12, 'scale' => 2, 'nullable' => false],
            'fechamento' => ['type' => 'tinyint', 'unsigned' => true, 'nullable' => true],
            'vencimento' => ['type' => 'tinyint', 'unsigned' => true, 'nullable' => true],
            'bank' => ['type' => 'varchar', 'length' => 48, 'nullable' => true],
            'principal' => ['type' => 'tinyint', 'nullable' => false],
            'created_at' => ['type' => 'bigint', 'nullable' => true],
        ],
        'primary_key' => ['id'],
        // app/Modules/Finance/FinanceRead.php: WHERE user_id = ? ORDER BY id.
        // client_id nunca e filtro de WHERE (so mapeado pro id publico do front) —
        // nenhum indice user_id+client_id e justificado pelo uso real.
        'indexes' => [
            ['name' => 'idx_user', 'columns' => ['user_id'], 'unique' => false],
        ],
        'foreign_keys' => [
            ['column' => 'user_id', 'ref_table' => 'users', 'ref_column' => 'id', 'on_delete' => 'CASCADE'],
        ],
    ],

    'audit_events' => [
        'columns' => [
            'id' => ['type' => 'bigint', 'unsigned' => true, 'nullable' => false],
            'user_id' => ['type' => 'int', 'unsigned' => true, 'nullable' => true],
            'event_type' => ['type' => 'varchar', 'length' => 64, 'nullable' => false],
            'outcome' => ['type' => 'varchar', 'length' => 16, 'nullable' => false],
            'request_id' => ['type' => 'char', 'length' => 32, 'nullable' => false],
            'ip_address' => ['type' => 'varchar', 'length' => 45, 'nullable' => true],
            'user_agent' => ['type' => 'varchar', 'length' => 255, 'nullable' => true],
            'metadata_json' => ['type' => 'json', 'nullable' => true],
            'created_at' => ['type' => 'timestamp', 'nullable' => false],
        ],
        'primary_key' => ['id'],
        // app/Core/Audit.php e trilha de auditoria: consultas por usuario+tempo,
        // tipo+tempo, request_id (correlacao) e so por created_at (retencao/purge).
        'indexes' => [
            ['name' => 'idx_audit_user_created', 'columns' => ['user_id', 'created_at'], 'unique' => false],
            ['name' => 'idx_audit_type_created', 'columns' => ['event_type', 'created_at'], 'unique' => false],
            ['name' => 'idx_audit_request_id', 'columns' => ['request_id'], 'unique' => false],
            ['name' => 'idx_audit_created', 'columns' => ['created_at'], 'unique' => false],
        ],
        'foreign_keys' => [
            ['column' => 'user_id', 'ref_table' => 'users', 'ref_column' => 'id', 'on_delete' => 'SET NULL'],
        ],
    ],

    'schema_migrations' => [
        'columns' => [
            'migration' => ['type' => 'varchar', 'length' => 191, 'nullable' => false],
            'checksum' => ['type' => 'char', 'length' => 64, 'nullable' => false],
            'status' => ['type' => 'varchar', 'length' => 16, 'nullable' => false],
            'started_at' => ['type' => 'datetime', 'nullable' => false],
            'applied_at' => ['type' => 'datetime', 'nullable' => true],
            'execution_ms' => ['type' => 'int', 'unsigned' => true, 'nullable' => true],
            'error_class' => ['type' => 'varchar', 'length' => 64, 'nullable' => true],
        ],
        // app/Core/MigrationRunner.php: sempre WHERE migration = ? — a PK ja cobre.
        'primary_key' => ['migration'],
        'indexes' => [],
        'foreign_keys' => [],
    ],
];
