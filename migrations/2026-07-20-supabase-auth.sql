-- Ponte de identidade Supabase Auth -> usuario local Level OS.
-- Idempotente e sem remover as credenciais legadas durante a migracao.

SET @has_auth_provider := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'auth_provider');
SET @sql := IF(@has_auth_provider = 0,
  'ALTER TABLE users ADD COLUMN auth_provider VARCHAR(32) NULL AFTER google_id', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_auth_subject := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'auth_subject');
SET @sql := IF(@has_auth_subject = 0,
  'ALTER TABLE users ADD COLUMN auth_subject VARCHAR(128) NULL AFTER auth_provider', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_auth_linked_at := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'auth_linked_at');
SET @sql := IF(@has_auth_linked_at = 0,
  'ALTER TABLE users ADD COLUMN auth_linked_at TIMESTAMP NULL AFTER auth_subject', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_auth_identity_index := (SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND INDEX_NAME = 'uq_users_auth_identity');
SET @sql := IF(@has_auth_identity_index = 0,
  'CREATE UNIQUE INDEX uq_users_auth_identity ON users (auth_provider, auth_subject)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
