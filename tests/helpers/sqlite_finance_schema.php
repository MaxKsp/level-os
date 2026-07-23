<?php
declare(strict_types=1);

final class CompatibleSqlitePdo extends PDO {
    public function prepare($query, $options = []): PDOStatement|false {
        if (
            str_contains($query, 'INSERT INTO kv_store (user_id, data_key, data_value) VALUES (?, ?, ?)') &&
            str_contains($query, 'ON DUPLICATE KEY UPDATE data_value = VALUES(data_value)')
        ) {
            $query = 'INSERT INTO kv_store (user_id, data_key, data_value) VALUES (?, ?, ?)
                ON CONFLICT(user_id, data_key) DO UPDATE SET data_value = excluded.data_value';
        }
        return parent::prepare($query, $options);
    }
}

function make_sqlite_finance_db(): PDO {
    $db = new CompatibleSqlitePdo('sqlite::memory:');
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

    $db->exec(
        'CREATE TABLE transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            kind TEXT NOT NULL,
            client_id TEXT NOT NULL,
            label TEXT NULL,
            value REAL NOT NULL DEFAULT 0,
            value_cents INTEGER NOT NULL DEFAULT 0,
            tx_date TEXT NULL,
            tx_time TEXT NULL,
            category TEXT NULL,
            method TEXT NULL,
            bank TEXT NULL,
            recurrence TEXT NULL,
            income_type TEXT NULL,
            end_date TEXT NULL,
            salary_details TEXT NULL,
            account_id TEXT NULL,
            km INTEGER NULL,
            payday INTEGER NULL,
            parcelas INTEGER NULL,
            created_at INTEGER NULL
        )'
    );

    $db->exec(
        'CREATE TABLE accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            client_id TEXT NOT NULL,
            label TEXT NULL,
            tipo TEXT NULL,
            saldo REAL NOT NULL DEFAULT 0,
            saldo_cents INTEGER NOT NULL DEFAULT 0,
            cheque_especial REAL NOT NULL DEFAULT 0,
            cheque_especial_cents INTEGER NOT NULL DEFAULT 0,
            limite REAL NOT NULL DEFAULT 0,
            limite_cents INTEGER NOT NULL DEFAULT 0,
            fatura REAL NOT NULL DEFAULT 0,
            fatura_cents INTEGER NOT NULL DEFAULT 0,
            fechamento INTEGER NULL,
            vencimento INTEGER NULL,
            bank TEXT NULL,
            principal INTEGER NOT NULL DEFAULT 0,
            created_at INTEGER NULL
        )'
    );

    $db->exec(
        'CREATE TABLE kv_store (
            user_id INTEGER NOT NULL,
            data_key TEXT NOT NULL,
            data_value TEXT NOT NULL,
            PRIMARY KEY (user_id, data_key)
        )'
    );

    // Espelho sqlite das tabelas de progressão: o hook de XP roda dentro de
    // finance_save_set e, sem elas, falhava silencioso nos testes de finanças.
    $db->exec(
        'CREATE TABLE user_progress (
            user_id INTEGER PRIMARY KEY,
            level INTEGER NOT NULL DEFAULT 1,
            xp INTEGER NOT NULL DEFAULT 0,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )'
    );

    $db->exec(
        'CREATE TABLE xp_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            type TEXT NOT NULL,
            amount INTEGER NOT NULL,
            ref TEXT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (user_id, ref)
        )'
    );

    $db->exec(
        'CREATE TABLE achievements (
            code TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            xp_bonus INTEGER NOT NULL DEFAULT 0,
            icon TEXT NOT NULL
        )'
    );

    $db->exec(
        'CREATE TABLE user_achievements (
            user_id INTEGER NOT NULL,
            achievement_code TEXT NOT NULL,
            unlocked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, achievement_code)
        )'
    );

    return $db;
}
