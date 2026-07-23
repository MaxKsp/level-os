-- Trial de 30 dias e cobranças neutras por provedor (Mercado Pago).
-- Idempotente: pode ser executada em uma instalação nova ou sobre o schema legado.
SET @has_trial := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'subscriptions' AND COLUMN_NAME = 'trial_ends_at');
SET @sql := IF(@has_trial = 0, 'ALTER TABLE subscriptions ADD COLUMN trial_ends_at DATETIME NULL AFTER current_period_end', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Contas legadas recebem o mesmo trial de 30 dias contado da criação da conta.
-- Não reduz nem sobrescreve acesso pago já existente.
INSERT INTO subscriptions (user_id, plan, status, current_period_end, trial_ends_at)
SELECT id, 'free', 'active', NULL, DATE_ADD(created_at, INTERVAL 30 DAY)
FROM users
ON DUPLICATE KEY UPDATE
  trial_ends_at = IF(
    subscriptions.plan = 'free'
      AND subscriptions.current_period_end IS NULL
      AND subscriptions.trial_ends_at IS NULL,
    VALUES(trial_ends_at),
    subscriptions.trial_ends_at
  );

SET @has_provider_event_id := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'subscription_events' AND COLUMN_NAME = 'provider_event_id');
SET @sql := IF(@has_provider_event_id = 0, 'ALTER TABLE subscription_events ADD COLUMN provider_event_id VARCHAR(96) NULL AFTER user_id', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @has_provider_payment_id := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'subscription_events' AND COLUMN_NAME = 'provider_payment_id');
SET @sql := IF(@has_provider_payment_id = 0, 'ALTER TABLE subscription_events ADD COLUMN provider_payment_id VARCHAR(96) NULL AFTER provider_event_id', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS subscription_payments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  provider VARCHAR(32) NOT NULL,
  method ENUM('pix','card') NOT NULL,
  resource_type VARCHAR(32) NOT NULL,
  external_id VARCHAR(128) NOT NULL,
  external_reference VARCHAR(96) NOT NULL,
  plan ENUM('individual') NOT NULL,
  amount_cents INT UNSIGNED NOT NULL,
  status ENUM('pending','paid','expired','cancelled') NOT NULL DEFAULT 'pending',
  provider_status VARCHAR(32) NULL,
  checkout_url TEXT NULL,
  payment_code TEXT NULL,
  qr_code_data LONGTEXT NULL,
  expires_at DATETIME NULL,
  paid_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE INDEX uq_subscription_provider_external (provider, resource_type, external_id),
  UNIQUE INDEX uq_subscription_reference (external_reference),
  INDEX idx_subscription_payment_user (user_id, status),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET @has_provider := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'subscription_payments' AND COLUMN_NAME = 'provider');
SET @sql := IF(@has_provider = 0, 'ALTER TABLE subscription_payments ADD COLUMN provider VARCHAR(32) NULL AFTER user_id', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @has_method := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'subscription_payments' AND COLUMN_NAME = 'method');
SET @sql := IF(@has_method = 0, 'ALTER TABLE subscription_payments ADD COLUMN method ENUM(''pix'',''card'') NULL AFTER provider', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @has_resource := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'subscription_payments' AND COLUMN_NAME = 'resource_type');
SET @sql := IF(@has_resource = 0, 'ALTER TABLE subscription_payments ADD COLUMN resource_type VARCHAR(32) NULL AFTER method', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @has_reference := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'subscription_payments' AND COLUMN_NAME = 'external_reference');
SET @sql := IF(@has_reference = 0, 'ALTER TABLE subscription_payments ADD COLUMN external_reference VARCHAR(96) NULL AFTER external_id', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @has_provider_status := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'subscription_payments' AND COLUMN_NAME = 'provider_status');
SET @sql := IF(@has_provider_status = 0, 'ALTER TABLE subscription_payments ADD COLUMN provider_status VARCHAR(32) NULL AFTER status', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @has_checkout_url := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'subscription_payments' AND COLUMN_NAME = 'checkout_url');
SET @sql := IF(@has_checkout_url = 0, 'ALTER TABLE subscription_payments ADD COLUMN checkout_url TEXT NULL AFTER provider_status', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @has_payment_code := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'subscription_payments' AND COLUMN_NAME = 'payment_code');
SET @sql := IF(@has_payment_code = 0, 'ALTER TABLE subscription_payments ADD COLUMN payment_code TEXT NULL AFTER checkout_url', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @has_qr_data := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'subscription_payments' AND COLUMN_NAME = 'qr_code_data');
SET @sql := IF(@has_qr_data = 0, 'ALTER TABLE subscription_payments ADD COLUMN qr_code_data LONGTEXT NULL AFTER payment_code', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @has_amount_cents := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'subscription_payments' AND COLUMN_NAME = 'amount_cents');
SET @sql := IF(@has_amount_cents = 0, 'ALTER TABLE subscription_payments ADD COLUMN amount_cents INT UNSIGNED NULL AFTER plan', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @has_legacy_amount := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'subscription_payments' AND COLUMN_NAME = 'amount');
SET @sql := IF(@has_legacy_amount = 1, 'UPDATE subscription_payments SET amount_cents = ROUND(amount * 100) WHERE amount_cents IS NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_checkout_id := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'subscription_payments' AND COLUMN_NAME = 'checkout_id');
SET @sql := IF(@has_checkout_id = 1, 'UPDATE subscription_payments SET provider = COALESCE(NULLIF(provider, ''''), ''legacy''), method = COALESCE(method, ''pix''), resource_type = COALESCE(NULLIF(resource_type, ''''), ''legacy''), external_reference = COALESCE(NULLIF(external_reference, ''''), external_id), provider_status = COALESCE(provider_status, status)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @has_pix_code := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'subscription_payments' AND COLUMN_NAME = 'pix_code');
SET @sql := IF(@has_pix_code = 1, 'UPDATE subscription_payments SET payment_code = COALESCE(payment_code, pix_code)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @has_qr_legacy := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'subscription_payments' AND COLUMN_NAME = 'qr_code_base64');
SET @sql := IF(@has_qr_legacy = 1, 'UPDATE subscription_payments SET qr_code_data = COALESCE(qr_code_data, qr_code_base64)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE subscription_payments SET provider = 'legacy' WHERE provider IS NULL OR provider = '';
UPDATE subscription_payments SET method = 'pix' WHERE method IS NULL;
UPDATE subscription_payments SET resource_type = 'legacy' WHERE resource_type IS NULL OR resource_type = '';
UPDATE subscription_payments SET external_reference = CONCAT('legacy-', id) WHERE external_reference IS NULL OR external_reference = '';
UPDATE subscription_payments SET provider_status = status WHERE provider_status IS NULL;
UPDATE subscription_payments SET amount_cents = 0 WHERE amount_cents IS NULL;
SET @subscriptions_has_family := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'subscriptions' AND COLUMN_NAME = 'plan' AND COLUMN_TYPE LIKE '%family%');
SET @sql := IF(@subscriptions_has_family = 1, 'UPDATE subscriptions SET plan = ''individual'' WHERE plan = ''family''', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @payments_has_family := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'subscription_payments' AND COLUMN_NAME = 'plan' AND COLUMN_TYPE LIKE '%family%');
SET @sql := IF(@payments_has_family = 1, 'UPDATE subscription_payments SET plan = ''individual'' WHERE plan = ''family''', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_old_checkout_index := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'subscription_payments' AND INDEX_NAME = 'uq_subscription_checkout');
SET @sql := IF(@has_old_checkout_index > 0, 'ALTER TABLE subscription_payments DROP INDEX uq_subscription_checkout', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @has_old_external_index := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'subscription_payments' AND INDEX_NAME = 'uq_subscription_external');
SET @sql := IF(@has_old_external_index > 0, 'ALTER TABLE subscription_payments DROP INDEX uq_subscription_external', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(@has_checkout_id = 1, 'UPDATE subscription_payments SET external_id = checkout_id', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

ALTER TABLE subscription_payments
  MODIFY provider VARCHAR(32) NOT NULL,
  MODIFY method ENUM('pix','card') NOT NULL,
  MODIFY resource_type VARCHAR(32) NOT NULL,
  MODIFY external_id VARCHAR(128) NOT NULL,
  MODIFY external_reference VARCHAR(96) NOT NULL,
  MODIFY plan ENUM('individual') NOT NULL,
  MODIFY amount_cents INT UNSIGNED NOT NULL,
  MODIFY status ENUM('pending','paid','expired','cancelled') NOT NULL DEFAULT 'pending';
ALTER TABLE subscriptions MODIFY plan ENUM('free','individual') NOT NULL DEFAULT 'free';

SET @has_provider_external := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'subscription_payments' AND INDEX_NAME = 'uq_subscription_provider_external');
SET @sql := IF(@has_provider_external = 0, 'CREATE UNIQUE INDEX uq_subscription_provider_external ON subscription_payments (provider, resource_type, external_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @has_reference_index := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'subscription_payments' AND INDEX_NAME = 'uq_subscription_reference');
SET @sql := IF(@has_reference_index = 0, 'CREATE UNIQUE INDEX uq_subscription_reference ON subscription_payments (external_reference)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @has_user_status := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'subscription_payments' AND INDEX_NAME = 'idx_subscription_payment_user');
SET @sql := IF(@has_user_status = 0, 'CREATE INDEX idx_subscription_payment_user ON subscription_payments (user_id, status)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@has_checkout_id = 1, 'ALTER TABLE subscription_payments DROP COLUMN checkout_id', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(@has_pix_code = 1, 'ALTER TABLE subscription_payments DROP COLUMN pix_code', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(@has_qr_legacy = 1, 'ALTER TABLE subscription_payments DROP COLUMN qr_code_base64', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(@has_legacy_amount = 1, 'ALTER TABLE subscription_payments DROP COLUMN amount', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_provider_event_index := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'subscription_events' AND INDEX_NAME = 'uq_subscription_provider_event');
SET @sql := IF(@has_provider_event_index = 0, 'CREATE UNIQUE INDEX uq_subscription_provider_event ON subscription_events (provider_event_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @has_provider_payment_index := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'subscription_events' AND INDEX_NAME = 'uq_subscription_provider_payment');
SET @sql := IF(@has_provider_payment_index = 0, 'CREATE UNIQUE INDEX uq_subscription_provider_payment ON subscription_events (provider_payment_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @has_trial_index := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'subscriptions' AND INDEX_NAME = 'idx_subscriptions_trial_ends');
SET @sql := IF(@has_trial_index = 0, 'CREATE INDEX idx_subscriptions_trial_ends ON subscriptions (trial_ends_at)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
