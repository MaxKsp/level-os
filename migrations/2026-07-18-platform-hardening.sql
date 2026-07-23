-- Hardening Level OS: centavos inteiros, índices de período e auditoria.
CREATE TABLE IF NOT EXISTS audit_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NULL,
  event_type VARCHAR(64) NOT NULL,
  outcome VARCHAR(16) NOT NULL,
  request_id CHAR(32) NOT NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(255) NULL,
  metadata_json JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_user_created (user_id, created_at),
  INDEX idx_audit_type_created (event_type, created_at),
  INDEX idx_audit_request_id (request_id),
  INDEX idx_audit_created (created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET @has_value_cents := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'transactions' AND COLUMN_NAME = 'value_cents');
SET @sql := IF(@has_value_cents = 0, 'ALTER TABLE transactions ADD COLUMN value_cents BIGINT NOT NULL DEFAULT 0 AFTER value', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_saldo_cents := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'accounts' AND COLUMN_NAME = 'saldo_cents');
SET @sql := IF(@has_saldo_cents = 0, 'ALTER TABLE accounts ADD COLUMN saldo_cents BIGINT NOT NULL DEFAULT 0 AFTER saldo', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @has_cheque_cents := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'accounts' AND COLUMN_NAME = 'cheque_especial_cents');
SET @sql := IF(@has_cheque_cents = 0, 'ALTER TABLE accounts ADD COLUMN cheque_especial_cents BIGINT NOT NULL DEFAULT 0 AFTER cheque_especial', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @has_limite_cents := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'accounts' AND COLUMN_NAME = 'limite_cents');
SET @sql := IF(@has_limite_cents = 0, 'ALTER TABLE accounts ADD COLUMN limite_cents BIGINT NOT NULL DEFAULT 0 AFTER limite', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @has_fatura_cents := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'accounts' AND COLUMN_NAME = 'fatura_cents');
SET @sql := IF(@has_fatura_cents = 0, 'ALTER TABLE accounts ADD COLUMN fatura_cents BIGINT NOT NULL DEFAULT 0 AFTER fatura', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE transactions SET value_cents = ROUND(value * 100) WHERE value_cents = 0 AND value <> 0;
UPDATE accounts SET saldo_cents = ROUND(saldo * 100) WHERE saldo_cents = 0 AND saldo <> 0;
UPDATE accounts SET cheque_especial_cents = ROUND(cheque_especial * 100) WHERE cheque_especial_cents = 0 AND cheque_especial <> 0;
UPDATE accounts SET limite_cents = ROUND(limite * 100) WHERE limite_cents = 0 AND limite <> 0;
UPDATE accounts SET fatura_cents = ROUND(fatura * 100) WHERE fatura_cents = 0 AND fatura <> 0;

-- Esta migration vem antes da migration do gateway em ordem lexicográfica.
-- Garanta a coluna antes de criar o índice para instalações legadas.
SET @has_trial := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'subscriptions' AND COLUMN_NAME = 'trial_ends_at');
SET @sql := IF(@has_trial = 0, 'ALTER TABLE subscriptions ADD COLUMN trial_ends_at DATETIME NULL AFTER current_period_end', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @has_trial_index := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'subscriptions' AND INDEX_NAME = 'idx_subscriptions_trial_ends');
SET @sql := IF(@has_trial_index = 0, 'CREATE INDEX idx_subscriptions_trial_ends ON subscriptions (trial_ends_at)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @has_xp_index := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'xp_events' AND INDEX_NAME = 'idx_xp_events_user_created');
SET @sql := IF(@has_xp_index = 0, 'CREATE INDEX idx_xp_events_user_created ON xp_events (user_id, created_at)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @has_expense_index := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'transactions' AND INDEX_NAME = 'idx_transactions_expense_category_date');
SET @sql := IF(@has_expense_index = 0, 'CREATE INDEX idx_transactions_expense_category_date ON transactions (user_id, kind, category, tx_date)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
