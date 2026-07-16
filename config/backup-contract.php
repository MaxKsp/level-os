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
 * depende de nada; subscriptions/subscription_events/totp_backup_codes/
 * kv_store/accounts/transactions/audit_events referenciam users;
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
        'subscriptions',
        'subscription_events',
        'totp_backup_codes',
        'kv_store',
        'accounts',
        'transactions',
        'audit_events',
        'schema_migrations',
    ],

    'tables' => [
        'users' => [
            'kind' => 'persistent',
            'columns' => [
                'id', 'username', 'password_hash', 'email', 'email_verified_at',
                'email_verify_token', 'google_id', 'totp_secret', 'totp_enabled',
                'notify_email', 'avatar', 'created_at',
            ],
            'primary_key' => ['id'],
            'cleanup' => 'delete_all',
        ],
        'subscriptions' => [
            'kind' => 'persistent',
            'columns' => ['user_id', 'plan', 'status', 'current_period_end', 'updated_at'],
            'primary_key' => ['user_id'],
            'cleanup' => 'delete_all',
        ],
        'subscription_events' => [
            'kind' => 'persistent',
            'columns' => ['id', 'user_id', 'event', 'detail', 'created_at'],
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
                'id', 'user_id', 'client_id', 'label', 'tipo', 'saldo', 'cheque_especial',
                'limite', 'fatura', 'fechamento', 'vencimento', 'bank', 'principal', 'created_at',
            ],
            'primary_key' => ['id'],
            'cleanup' => 'delete_all',
        ],
        'transactions' => [
            'kind' => 'persistent',
            'columns' => [
                'id', 'user_id', 'kind', 'client_id', 'label', 'value', 'tx_date', 'tx_time',
                'category', 'method', 'bank', 'recurrence', 'income_type', 'end_date',
                'account_id', 'km', 'payday', 'parcelas', 'created_at',
            ],
            'primary_key' => ['id'],
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
        'rate_hits' => ['kind' => 'ephemeral'],
    ],
];
