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
            'session_version' => ['type' => 'int', 'unsigned' => true, 'nullable' => false],
            'email' => ['type' => 'varchar', 'length' => 255, 'nullable' => true],
            'email_verified_at' => ['type' => 'timestamp', 'nullable' => true],
            'email_verify_token' => ['type' => 'varchar', 'length' => 64, 'nullable' => true],
            'google_id' => ['type' => 'varchar', 'length' => 64, 'nullable' => true],
            'auth_provider' => ['type' => 'varchar', 'length' => 32, 'nullable' => true],
            'auth_subject' => ['type' => 'varchar', 'length' => 128, 'nullable' => true],
            'auth_linked_at' => ['type' => 'timestamp', 'nullable' => true],
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
            ['name' => 'uq_users_auth_identity', 'columns' => ['auth_provider', 'auth_subject'], 'unique' => true],
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

    'password_reset_tokens' => [
        'columns' => [
            'id' => ['type' => 'bigint', 'unsigned' => true, 'nullable' => false],
            'user_id' => ['type' => 'int', 'unsigned' => true, 'nullable' => false],
            'token_hash' => ['type' => 'char', 'length' => 64, 'nullable' => false],
            'expires_at' => ['type' => 'datetime', 'nullable' => false],
            'used_at' => ['type' => 'datetime', 'nullable' => true],
            'created_at' => ['type' => 'timestamp', 'nullable' => false],
        ],
        'primary_key' => ['id'],
        'indexes' => [
            ['name' => 'token_hash', 'columns' => ['token_hash'], 'unique' => true],
            ['name' => 'uq_password_reset_user', 'columns' => ['user_id'], 'unique' => true],
            ['name' => 'idx_password_reset_expiry', 'columns' => ['expires_at'], 'unique' => false],
        ],
        'foreign_keys' => [
            ['column' => 'user_id', 'ref_table' => 'users', 'ref_column' => 'id', 'on_delete' => 'CASCADE'],
        ],
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
        'indexes' => [
            ['name' => 'idx_rate_hits_window_start', 'columns' => ['window_start'], 'unique' => false],
        ],
        'foreign_keys' => [],
    ],

    'subscriptions' => [
        'columns' => [
            'user_id' => ['type' => 'int', 'unsigned' => true, 'nullable' => false],
            'plan' => ['type' => 'enum', 'nullable' => false],
            'status' => ['type' => 'enum', 'nullable' => false],
            'current_period_end' => ['type' => 'datetime', 'nullable' => true],
            'trial_ends_at' => ['type' => 'datetime', 'nullable' => true],
            'updated_at' => ['type' => 'timestamp', 'nullable' => false],
        ],
        // plan.php user_plan(), api/subscription.php: WHERE user_id = ? — a PK ja cobre.
        'primary_key' => ['user_id'],
        'indexes' => [
            ['name' => 'idx_subscriptions_trial_ends', 'columns' => ['trial_ends_at'], 'unique' => false],
        ],
        'foreign_keys' => [
            ['column' => 'user_id', 'ref_table' => 'users', 'ref_column' => 'id', 'on_delete' => 'CASCADE'],
        ],
    ],

    'subscription_events' => [
        'columns' => [
            'id' => ['type' => 'int', 'unsigned' => true, 'nullable' => false],
            'user_id' => ['type' => 'int', 'unsigned' => true, 'nullable' => false],
            'provider_event_id' => ['type' => 'varchar', 'length' => 96, 'nullable' => true],
            'provider_payment_id' => ['type' => 'varchar', 'length' => 96, 'nullable' => true],
            'event' => ['type' => 'varchar', 'length' => 48, 'nullable' => false],
            'detail' => ['type' => 'varchar', 'length' => 255, 'nullable' => true],
            'created_at' => ['type' => 'timestamp', 'nullable' => false],
        ],
        // O webhook usa provider_event_id para rejeitar reprocessamento.
        'primary_key' => ['id'],
        'indexes' => [
            ['name' => 'uq_subscription_provider_event', 'columns' => ['provider_event_id'], 'unique' => true],
            ['name' => 'uq_subscription_provider_payment', 'columns' => ['provider_payment_id'], 'unique' => true],
        ],
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
            'value_cents' => ['type' => 'bigint', 'nullable' => false],
            'tx_date' => ['type' => 'date', 'nullable' => true],
            'tx_time' => ['type' => 'time', 'nullable' => true],
            'category' => ['type' => 'varchar', 'length' => 48, 'nullable' => true],
            'method' => ['type' => 'varchar', 'length' => 24, 'nullable' => true],
            'bank' => ['type' => 'varchar', 'length' => 48, 'nullable' => true],
            'recurrence' => ['type' => 'varchar', 'length' => 16, 'nullable' => true],
            'income_type' => ['type' => 'varchar', 'length' => 16, 'nullable' => true],
            'end_date' => ['type' => 'date', 'nullable' => true],
            'salary_details' => ['type' => 'longtext', 'nullable' => true],
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
            ['name' => 'idx_transactions_expense_category_date', 'columns' => ['user_id', 'kind', 'category', 'tx_date'], 'unique' => false],
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
            'saldo_cents' => ['type' => 'bigint', 'nullable' => false],
            'cheque_especial' => ['type' => 'decimal', 'precision' => 12, 'scale' => 2, 'nullable' => false],
            'cheque_especial_cents' => ['type' => 'bigint', 'nullable' => false],
            'limite' => ['type' => 'decimal', 'precision' => 12, 'scale' => 2, 'nullable' => false],
            'limite_cents' => ['type' => 'bigint', 'nullable' => false],
            'fatura' => ['type' => 'decimal', 'precision' => 12, 'scale' => 2, 'nullable' => false],
            'fatura_cents' => ['type' => 'bigint', 'nullable' => false],
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

    'user_progress' => [
        'columns' => [
            'user_id' => ['type' => 'int', 'unsigned' => true, 'nullable' => false],
            'level' => ['type' => 'int', 'unsigned' => true, 'nullable' => false],
            'xp' => ['type' => 'int', 'unsigned' => true, 'nullable' => false],
            'updated_at' => ['type' => 'timestamp', 'nullable' => false],
        ],
        'primary_key' => ['user_id'],
        'indexes' => [],
        'foreign_keys' => [
            ['column' => 'user_id', 'ref_table' => 'users', 'ref_column' => 'id', 'on_delete' => 'CASCADE'],
        ],
    ],

    'subscription_payments' => [
        'columns' => [
            'id' => ['type' => 'bigint', 'unsigned' => true, 'nullable' => false],
            'user_id' => ['type' => 'int', 'unsigned' => true, 'nullable' => false],
            'provider' => ['type' => 'varchar', 'length' => 32, 'nullable' => false],
            'method' => ['type' => 'enum', 'nullable' => false],
            'resource_type' => ['type' => 'varchar', 'length' => 32, 'nullable' => false],
            'external_id' => ['type' => 'varchar', 'length' => 128, 'nullable' => false],
            'external_reference' => ['type' => 'varchar', 'length' => 96, 'nullable' => false],
            'plan' => ['type' => 'enum', 'nullable' => false],
            'amount_cents' => ['type' => 'int', 'unsigned' => true, 'nullable' => false],
            'status' => ['type' => 'enum', 'nullable' => false],
            'provider_status' => ['type' => 'varchar', 'length' => 32, 'nullable' => true],
            'checkout_url' => ['type' => 'text', 'nullable' => true],
            'payment_code' => ['type' => 'text', 'nullable' => true],
            'qr_code_data' => ['type' => 'longtext', 'nullable' => true],
            'expires_at' => ['type' => 'datetime', 'nullable' => true],
            'paid_at' => ['type' => 'datetime', 'nullable' => true],
            'created_at' => ['type' => 'timestamp', 'nullable' => false],
            'updated_at' => ['type' => 'timestamp', 'nullable' => false],
        ],
        'primary_key' => ['id'],
        'indexes' => [
            ['name' => 'uq_subscription_provider_external', 'columns' => ['provider', 'resource_type', 'external_id'], 'unique' => true],
            ['name' => 'uq_subscription_reference', 'columns' => ['external_reference'], 'unique' => true],
            ['name' => 'idx_subscription_payment_user', 'columns' => ['user_id', 'status'], 'unique' => false],
        ],
        'foreign_keys' => [
            ['column' => 'user_id', 'ref_table' => 'users', 'ref_column' => 'id', 'on_delete' => 'CASCADE'],
        ],
    ],

    'google_calendar_tokens' => [
        'columns' => [
            'user_id' => ['type' => 'int', 'unsigned' => true, 'nullable' => false],
            'access_token' => ['type' => 'longtext', 'nullable' => false],
            'refresh_token' => ['type' => 'longtext', 'nullable' => false],
            'expiry' => ['type' => 'datetime', 'nullable' => false],
            'scope' => ['type' => 'text', 'nullable' => false],
            'sync_token' => ['type' => 'longtext', 'nullable' => true],
            'google_subject' => ['type' => 'varchar', 'length' => 255, 'nullable' => false],
            'account_email' => ['type' => 'varchar', 'length' => 255, 'nullable' => false],
            'sync_start' => ['type' => 'datetime', 'nullable' => true],
            'sync_end' => ['type' => 'datetime', 'nullable' => true],
            'cache_expires_at' => ['type' => 'datetime', 'nullable' => true],
            'sync_lease_token' => ['type' => 'char', 'length' => 32, 'nullable' => true],
            'sync_lease_until' => ['type' => 'datetime', 'nullable' => true],
            'connected_at' => ['type' => 'datetime', 'nullable' => false],
            'last_synced_at' => ['type' => 'datetime', 'nullable' => true],
            'updated_at' => ['type' => 'datetime', 'nullable' => false],
        ],
        'primary_key' => ['user_id'],
        'indexes' => [],
        'foreign_keys' => [
            ['column' => 'user_id', 'ref_table' => 'users', 'ref_column' => 'id', 'on_delete' => 'CASCADE'],
        ],
    ],

    'google_calendar_events' => [
        'columns' => [
            'user_id' => ['type' => 'int', 'unsigned' => true, 'nullable' => false],
            'event_hash' => ['type' => 'char', 'length' => 64, 'nullable' => false],
            'google_event_id' => ['type' => 'longtext', 'nullable' => false],
            'title' => ['type' => 'longtext', 'nullable' => false],
            'start_value' => ['type' => 'varchar', 'length' => 64, 'nullable' => false],
            'end_value' => ['type' => 'varchar', 'length' => 64, 'nullable' => false],
            'starts_at' => ['type' => 'datetime', 'nullable' => false],
            'ends_at' => ['type' => 'datetime', 'nullable' => false],
            'all_day' => ['type' => 'tinyint', 'nullable' => false],
            'location' => ['type' => 'longtext', 'nullable' => true],
            'html_link' => ['type' => 'longtext', 'nullable' => true],
            'provider_updated_at' => ['type' => 'datetime', 'nullable' => true],
            'mirrored_at' => ['type' => 'datetime', 'nullable' => false],
        ],
        'primary_key' => ['user_id', 'event_hash'],
        'indexes' => [
            ['name' => 'idx_google_calendar_events_user_start', 'columns' => ['user_id', 'starts_at'], 'unique' => false],
        ],
        'foreign_keys' => [
            ['column' => 'user_id', 'ref_table' => 'google_calendar_tokens', 'ref_column' => 'user_id', 'on_delete' => 'CASCADE'],
        ],
    ],

    'xp_events' => [
        'columns' => [
            'id' => ['type' => 'bigint', 'unsigned' => true, 'nullable' => false],
            'user_id' => ['type' => 'int', 'unsigned' => true, 'nullable' => false],
            'type' => ['type' => 'enum', 'nullable' => false],
            'amount' => ['type' => 'int', 'unsigned' => true, 'nullable' => false],
            'ref' => ['type' => 'varchar', 'length' => 191, 'nullable' => true],
            'created_at' => ['type' => 'timestamp', 'nullable' => false],
        ],
        'primary_key' => ['id'],
        'indexes' => [
            ['name' => 'uq_xp_events_user_ref', 'columns' => ['user_id', 'ref'], 'unique' => true],
            ['name' => 'idx_xp_events_user_created', 'columns' => ['user_id', 'created_at'], 'unique' => false],
        ],
        'foreign_keys' => [
            ['column' => 'user_id', 'ref_table' => 'users', 'ref_column' => 'id', 'on_delete' => 'CASCADE'],
        ],
    ],

    'achievements' => [
        'columns' => [
            'code' => ['type' => 'varchar', 'length' => 64, 'nullable' => false],
            'title' => ['type' => 'varchar', 'length' => 96, 'nullable' => false],
            'description' => ['type' => 'varchar', 'length' => 255, 'nullable' => false],
            'xp_bonus' => ['type' => 'int', 'unsigned' => true, 'nullable' => false],
            'icon' => ['type' => 'varchar', 'length' => 48, 'nullable' => false],
        ],
        'primary_key' => ['code'],
        'indexes' => [],
        'foreign_keys' => [],
    ],

    'user_achievements' => [
        'columns' => [
            'user_id' => ['type' => 'int', 'unsigned' => true, 'nullable' => false],
            'achievement_code' => ['type' => 'varchar', 'length' => 64, 'nullable' => false],
            'unlocked_at' => ['type' => 'timestamp', 'nullable' => false],
        ],
        'primary_key' => ['user_id', 'achievement_code'],
        'indexes' => [
            ['name' => 'idx_user_achievements_unlocked', 'columns' => ['user_id', 'unlocked_at'], 'unique' => false],
        ],
        'foreign_keys' => [
            ['column' => 'user_id', 'ref_table' => 'users', 'ref_column' => 'id', 'on_delete' => 'CASCADE'],
            ['column' => 'achievement_code', 'ref_table' => 'achievements', 'ref_column' => 'code', 'on_delete' => 'CASCADE'],
        ],
    ],

    'body_measurements' => [
        'columns' => [
            'id'=>['type'=>'bigint','unsigned'=>true,'nullable'=>false], 'user_id'=>['type'=>'int','unsigned'=>true,'nullable'=>false],
            'client_id'=>['type'=>'char','length'=>32,'nullable'=>false], 'measurement_type'=>['type'=>'varchar','length'=>32,'nullable'=>false],
            'value'=>['type'=>'decimal','precision'=>10,'scale'=>3,'nullable'=>false], 'unit'=>['type'=>'varchar','length'=>16,'nullable'=>false],
            'measured_on'=>['type'=>'date','nullable'=>false], 'source'=>['type'=>'varchar','length'=>16,'nullable'=>false], 'created_at'=>['type'=>'datetime','nullable'=>false],
        ],
        'primary_key'=>['id'],
        'indexes'=>[
            ['name'=>'uq_body_measurements_user_client','columns'=>['user_id','client_id'],'unique'=>true],
            ['name'=>'idx_body_measurements_user_type_date','columns'=>['user_id','measurement_type','measured_on'],'unique'=>false],
        ],
        'foreign_keys'=>[['column'=>'user_id','ref_table'=>'users','ref_column'=>'id','on_delete'=>'CASCADE']],
    ],
    'training_workouts' => [
        'columns'=>[
            'id'=>['type'=>'bigint','unsigned'=>true,'nullable'=>false], 'user_id'=>['type'=>'int','unsigned'=>true,'nullable'=>false],
            'client_id'=>['type'=>'char','length'=>32,'nullable'=>false], 'name'=>['type'=>'varchar','length'=>96,'nullable'=>false],
            'focus'=>['type'=>'varchar','length'=>255,'nullable'=>true], 'created_at'=>['type'=>'datetime','nullable'=>false], 'updated_at'=>['type'=>'datetime','nullable'=>false],
        ],
        'primary_key'=>['id'],
        'indexes'=>[
            ['name'=>'uq_training_workouts_user_client','columns'=>['user_id','client_id'],'unique'=>true],
            ['name'=>'idx_training_workouts_user_updated','columns'=>['user_id','updated_at'],'unique'=>false],
        ],
        'foreign_keys'=>[['column'=>'user_id','ref_table'=>'users','ref_column'=>'id','on_delete'=>'CASCADE']],
    ],
    'training_workout_exercises' => [
        'columns'=>[
            'id'=>['type'=>'bigint','unsigned'=>true,'nullable'=>false], 'workout_id'=>['type'=>'bigint','unsigned'=>true,'nullable'=>false], 'user_id'=>['type'=>'int','unsigned'=>true,'nullable'=>false],
            'client_id'=>['type'=>'char','length'=>32,'nullable'=>false], 'position'=>['type'=>'smallint','unsigned'=>true,'nullable'=>false], 'name'=>['type'=>'varchar','length'=>96,'nullable'=>false],
            'modality'=>['type'=>'varchar','length'=>24,'nullable'=>false], 'target_sets'=>['type'=>'smallint','unsigned'=>true,'nullable'=>true], 'target_reps'=>['type'=>'int','unsigned'=>true,'nullable'=>true],
            'target_load_kg'=>['type'=>'decimal','precision'=>8,'scale'=>3,'nullable'=>true], 'rest_sec'=>['type'=>'int','unsigned'=>true,'nullable'=>true],
            'progression_level'=>['type'=>'varchar','length'=>64,'nullable'=>true], 'assisted_kg'=>['type'=>'decimal','precision'=>8,'scale'=>3,'nullable'=>true],
            'weighted_kg'=>['type'=>'decimal','precision'=>8,'scale'=>3,'nullable'=>true], 'duration_sec'=>['type'=>'int','unsigned'=>true,'nullable'=>true],
        ],
        'primary_key'=>['id'],
        'indexes'=>[
            ['name'=>'uq_training_exercises_workout_client','columns'=>['workout_id','client_id'],'unique'=>true],
            ['name'=>'idx_training_exercises_user','columns'=>['user_id','workout_id'],'unique'=>false],
        ],
        'foreign_keys'=>[
            ['column'=>'workout_id','ref_table'=>'training_workouts','ref_column'=>'id','on_delete'=>'CASCADE'],
            ['column'=>'user_id','ref_table'=>'users','ref_column'=>'id','on_delete'=>'CASCADE'],
        ],
    ],
    'training_sessions' => [
        'columns'=>[
            'id'=>['type'=>'bigint','unsigned'=>true,'nullable'=>false], 'user_id'=>['type'=>'int','unsigned'=>true,'nullable'=>false], 'workout_id'=>['type'=>'bigint','unsigned'=>true,'nullable'=>true],
            'client_id'=>['type'=>'char','length'=>32,'nullable'=>false], 'name'=>['type'=>'varchar','length'=>96,'nullable'=>false], 'modality'=>['type'=>'varchar','length'=>24,'nullable'=>false],
            'session_date'=>['type'=>'date','nullable'=>false], 'duration_sec'=>['type'=>'int','unsigned'=>true,'nullable'=>true], 'source'=>['type'=>'varchar','length'=>16,'nullable'=>false], 'created_at'=>['type'=>'datetime','nullable'=>false],
        ],
        'primary_key'=>['id'],
        'indexes'=>[
            ['name'=>'uq_training_sessions_user_client','columns'=>['user_id','client_id'],'unique'=>true],
            ['name'=>'idx_training_sessions_user_date','columns'=>['user_id','session_date'],'unique'=>false],
        ],
        'foreign_keys'=>[
            ['column'=>'user_id','ref_table'=>'users','ref_column'=>'id','on_delete'=>'CASCADE'],
            ['column'=>'workout_id','ref_table'=>'training_workouts','ref_column'=>'id','on_delete'=>'SET NULL'],
        ],
    ],
    'training_session_entries' => [
        'columns'=>[
            'id'=>['type'=>'bigint','unsigned'=>true,'nullable'=>false], 'session_id'=>['type'=>'bigint','unsigned'=>true,'nullable'=>false], 'user_id'=>['type'=>'int','unsigned'=>true,'nullable'=>false],
            'client_id'=>['type'=>'char','length'=>32,'nullable'=>false], 'position'=>['type'=>'smallint','unsigned'=>true,'nullable'=>false], 'exercise_name'=>['type'=>'varchar','length'=>96,'nullable'=>false],
            'modality'=>['type'=>'varchar','length'=>24,'nullable'=>false], 'sets_count'=>['type'=>'smallint','unsigned'=>true,'nullable'=>true], 'reps_count'=>['type'=>'int','unsigned'=>true,'nullable'=>true],
            'load_kg'=>['type'=>'decimal','precision'=>8,'scale'=>3,'nullable'=>true], 'rest_sec'=>['type'=>'int','unsigned'=>true,'nullable'=>true], 'distance_km'=>['type'=>'decimal','precision'=>10,'scale'=>3,'nullable'=>true],
            'duration_sec'=>['type'=>'int','unsigned'=>true,'nullable'=>true], 'avg_hr'=>['type'=>'smallint','unsigned'=>true,'nullable'=>true], 'progression_level'=>['type'=>'varchar','length'=>64,'nullable'=>true],
            'assisted_kg'=>['type'=>'decimal','precision'=>8,'scale'=>3,'nullable'=>true], 'weighted_kg'=>['type'=>'decimal','precision'=>8,'scale'=>3,'nullable'=>true],
        ],
        'primary_key'=>['id'],
        'indexes'=>[
            ['name'=>'uq_training_session_entries_client','columns'=>['session_id','client_id'],'unique'=>true],
            ['name'=>'idx_training_entries_user_modality','columns'=>['user_id','modality'],'unique'=>false],
        ],
        'foreign_keys'=>[
            ['column'=>'session_id','ref_table'=>'training_sessions','ref_column'=>'id','on_delete'=>'CASCADE'],
            ['column'=>'user_id','ref_table'=>'users','ref_column'=>'id','on_delete'=>'CASCADE'],
        ],
    ],
    'assistant_actions' => [
        'columns'=>[
            'id'=>['type'=>'bigint','unsigned'=>true,'nullable'=>false], 'user_id'=>['type'=>'int','unsigned'=>true,'nullable'=>false], 'action_token'=>['type'=>'char','length'=>32,'nullable'=>false],
            'request_id'=>['type'=>'varchar','length'=>64,'nullable'=>false], 'action_type'=>['type'=>'varchar','length'=>32,'nullable'=>false], 'provider'=>['type'=>'varchar','length'=>32,'nullable'=>true],
            'status'=>['type'=>'varchar','length'=>16,'nullable'=>false], 'undo_payload'=>['type'=>'longtext','nullable'=>true], 'response_payload'=>['type'=>'longtext','nullable'=>true],
            'result_summary'=>['type'=>'varchar','length'=>255,'nullable'=>true], 'created_at'=>['type'=>'datetime','nullable'=>false], 'undo_expires_at'=>['type'=>'datetime','nullable'=>true], 'undone_at'=>['type'=>'datetime','nullable'=>true],
        ],
        'primary_key'=>['id'],
        'indexes'=>[
            ['name'=>'uq_assistant_actions_token','columns'=>['action_token'],'unique'=>true],
            ['name'=>'uq_assistant_actions_user_request','columns'=>['user_id','request_id'],'unique'=>true],
            ['name'=>'idx_assistant_actions_user_created','columns'=>['user_id','created_at'],'unique'=>false],
        ],
        'foreign_keys'=>[['column'=>'user_id','ref_table'=>'users','ref_column'=>'id','on_delete'=>'CASCADE']],
    ],
    'assistant_route_cache' => [
        'columns'=>[
            'user_id'=>['type'=>'int','unsigned'=>true,'nullable'=>false], 'cache_key'=>['type'=>'char','length'=>64,'nullable'=>false], 'provider'=>['type'=>'varchar','length'=>32,'nullable'=>false],
            'route_payload'=>['type'=>'longtext','nullable'=>false], 'expires_at'=>['type'=>'datetime','nullable'=>false], 'created_at'=>['type'=>'datetime','nullable'=>false],
        ],
        'primary_key'=>['user_id','cache_key'],
        'indexes'=>[['name'=>'idx_assistant_route_cache_expiry','columns'=>['expires_at'],'unique'=>false]],
        'foreign_keys'=>[['column'=>'user_id','ref_table'=>'users','ref_column'=>'id','on_delete'=>'CASCADE']],
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
