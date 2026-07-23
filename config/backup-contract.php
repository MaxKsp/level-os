<?php
declare(strict_types=1);

/**
 * Fase 4C - Contrato declarativo minimo do conteudo logico do backup.
 * Array explicito e deterministico, comparado contra
 * config/schema-contract.php por app/Core/DatabaseBackup.php: toda
 * tabela do schema-contract precisa aparecer aqui, classificada como
 * persistente ou efemera — nenhuma tabela nova pode ser ignorada em
 * silencio (validate() falha se faltar).
 *
 * 'transfers' nao aparece: nunca foi tabela relacional, vive dentro de
 * kv_store.data_key='transfers' (ver app/Modules/Finance/FinanceAuxiliaryKv.php)
 * e ja e restaurada junto com o resto de kv_store.
 *
 * table_order e usada tanto pra exportar (determinismo) quanto pra
 * restaurar (ordem compativel com FK: pais antes de filhos). users nao
 * depende de nada; achievements tambem e catalogo independente;
 * subscriptions/subscription_events/totp_backup_codes/kv_store/accounts/
 * transactions/user_progress/xp_events/audit_events referenciam users;
 * user_achievements referencia users e achievements;
 * schema_migrations nao tem FK, fica por ultimo.
 *
 * Cada tabela persistente declara:
 * - columns: exatamente as colunas restauradas (nunca SELECT *, sempre
 *   um subconjunto validado contra config/schema-contract.php);
 * - primary_key: usada pro ORDER BY deterministico na exportacao;
 * - cleanup: estrategia de limpeza antes de inserir na restauracao
 *   ('delete_all' — a unica usada aqui; o alvo ja precisa estar vazio
 *   no preflight, isso e so defesa extra/idempotencia).
 */

return [
    'application' => 'orby',

    'table_order' => [
        'users',
        'achievements',
        'subscriptions',
        'subscription_events',
        'subscription_payments',
        'totp_backup_codes',
        'kv_store',
        'accounts',
        'transactions',
        'body_measurements',
        'training_workouts',
        'training_workout_exercises',
        'training_sessions',
        'training_session_entries',
        'assistant_actions',
        'user_progress',
        'xp_events',
        'user_achievements',
        'audit_events',
        'schema_migrations',
    ],

    'tables' => [
        'users' => [
            'kind' => 'persistent',
            'columns' => [
                'id', 'username', 'password_hash', 'session_version', 'email', 'email_verified_at',
                'email_verify_token', 'google_id', 'auth_provider', 'auth_subject', 'auth_linked_at',
                'totp_secret', 'totp_enabled',
                'notify_email', 'avatar', 'created_at',
            ],
            'primary_key' => ['id'],
            'cleanup' => 'delete_all',
        ],
        'achievements' => [
            'kind' => 'persistent',
            'columns' => ['code', 'title', 'description', 'xp_bonus', 'icon'],
            'primary_key' => ['code'],
            'cleanup' => 'delete_all',
        ],
        'subscriptions' => [
            'kind' => 'persistent',
            'columns' => ['user_id', 'plan', 'status', 'current_period_end', 'trial_ends_at', 'updated_at'],
            'primary_key' => ['user_id'],
            'cleanup' => 'delete_all',
        ],
        'subscription_events' => [
            'kind' => 'persistent',
            'columns' => ['id', 'user_id', 'provider_event_id', 'provider_payment_id', 'event', 'detail', 'created_at'],
            'primary_key' => ['id'],
            'cleanup' => 'delete_all',
        ],
        'subscription_payments' => [
            'kind' => 'persistent',
            'columns' => [
                'id', 'user_id', 'provider', 'method', 'resource_type', 'external_id',
                'external_reference', 'plan', 'amount_cents', 'status', 'provider_status',
                'checkout_url', 'payment_code', 'qr_code_data', 'expires_at', 'paid_at',
                'created_at', 'updated_at',
            ],
            'primary_key' => ['id'],
            'cleanup' => 'delete_all',
        ],
        'totp_backup_codes' => [
            'kind' => 'persistent',
            'columns' => ['id', 'user_id', 'code_hash', 'used_at'],
            'primary_key' => ['id'],
            'cleanup' => 'delete_all',
        ],
        'kv_store' => [
            'kind' => 'persistent',
            'columns' => ['user_id', 'data_key', 'data_value', 'updated_at'],
            'primary_key' => ['user_id', 'data_key'],
            'cleanup' => 'delete_all',
        ],
        'accounts' => [
            'kind' => 'persistent',
            'columns' => [
                'id', 'user_id', 'client_id', 'label', 'tipo', 'saldo', 'saldo_cents',
                'cheque_especial', 'cheque_especial_cents', 'limite', 'limite_cents',
                'fatura', 'fatura_cents', 'fechamento', 'vencimento', 'bank', 'principal', 'created_at',
            ],
            'primary_key' => ['id'],
            'cleanup' => 'delete_all',
        ],
        'transactions' => [
            'kind' => 'persistent',
            'columns' => [
                'id', 'user_id', 'kind', 'client_id', 'label', 'value', 'value_cents', 'tx_date', 'tx_time',
                'category', 'method', 'bank', 'recurrence', 'income_type', 'end_date', 'salary_details',
                'account_id', 'km', 'payday', 'parcelas', 'created_at',
            ],
            'primary_key' => ['id'],
            'cleanup' => 'delete_all',
        ],
        'body_measurements' => [
            'kind'=>'persistent', 'columns'=>['id','user_id','client_id','measurement_type','value','unit','measured_on','source','created_at'],
            'primary_key'=>['id'], 'cleanup'=>'delete_all',
        ],
        'training_workouts' => [
            'kind'=>'persistent', 'columns'=>['id','user_id','client_id','name','focus','created_at','updated_at'],
            'primary_key'=>['id'], 'cleanup'=>'delete_all',
        ],
        'training_workout_exercises' => [
            'kind'=>'persistent', 'columns'=>['id','workout_id','user_id','client_id','position','name','modality','target_sets','target_reps','target_load_kg','rest_sec','progression_level','assisted_kg','weighted_kg','duration_sec'],
            'primary_key'=>['id'], 'cleanup'=>'delete_all',
        ],
        'training_sessions' => [
            'kind'=>'persistent', 'columns'=>['id','user_id','workout_id','client_id','name','modality','session_date','duration_sec','source','created_at'],
            'primary_key'=>['id'], 'cleanup'=>'delete_all',
        ],
        'training_session_entries' => [
            'kind'=>'persistent', 'columns'=>['id','session_id','user_id','client_id','position','exercise_name','modality','sets_count','reps_count','load_kg','rest_sec','distance_km','duration_sec','avg_hr','progression_level','assisted_kg','weighted_kg'],
            'primary_key'=>['id'], 'cleanup'=>'delete_all',
        ],
        'assistant_actions' => [
            'kind'=>'persistent', 'columns'=>['id','user_id','action_token','request_id','action_type','provider','status','undo_payload','response_payload','result_summary','created_at','undo_expires_at','undone_at'],
            'primary_key'=>['id'], 'cleanup'=>'delete_all',
        ],
        'user_progress' => [
            'kind' => 'persistent',
            'columns' => ['user_id', 'level', 'xp', 'updated_at'],
            'primary_key' => ['user_id'],
            'cleanup' => 'delete_all',
        ],
        'xp_events' => [
            'kind' => 'persistent',
            'columns' => ['id', 'user_id', 'type', 'amount', 'ref', 'created_at'],
            'primary_key' => ['id'],
            'cleanup' => 'delete_all',
        ],
        'user_achievements' => [
            'kind' => 'persistent',
            'columns' => ['user_id', 'achievement_code', 'unlocked_at'],
            'primary_key' => ['user_id', 'achievement_code'],
            'cleanup' => 'delete_all',
        ],
        'audit_events' => [
            'kind' => 'persistent',
            'columns' => [
                'id', 'user_id', 'event_type', 'outcome', 'request_id', 'ip_address',
                'user_agent', 'metadata_json', 'created_at',
            ],
            'primary_key' => ['id'],
            'cleanup' => 'delete_all',
        ],
        'schema_migrations' => [
            'kind' => 'persistent',
            'columns' => ['migration', 'checksum', 'status', 'started_at', 'applied_at', 'execution_ms', 'error_class'],
            'primary_key' => ['migration'],
            'cleanup' => 'delete_all',
        ],

        'login_attempts' => ['kind' => 'ephemeral'],
        'register_attempts' => ['kind' => 'ephemeral'],
        'password_reset_tokens' => ['kind' => 'ephemeral'],
        'rate_hits' => ['kind' => 'ephemeral'],
        // Credenciais e espelho derivados do Google não entram no backup
        // portátil; após restore, o usuário conecta a conta novamente.
        'google_calendar_tokens' => ['kind' => 'ephemeral'],
        'google_calendar_events' => ['kind' => 'ephemeral'],
        'assistant_route_cache' => ['kind' => 'ephemeral'],
    ],
];
