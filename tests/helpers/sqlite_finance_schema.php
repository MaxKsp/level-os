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
            tx_date TEXT NULL,
            tx_time TEXT NULL,
            category TEXT NULL,
            method TEXT NULL,
            bank TEXT NULL,
            recurrence TEXT NULL,
            income_type TEXT NULL,
            end_date TEXT NULL,
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
            cheque_especial REAL NOT NULL DEFAULT 0,
            limite REAL NOT NULL DEFAULT 0,
            fatura REAL NOT NULL DEFAULT 0,
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

    return $db;
}
