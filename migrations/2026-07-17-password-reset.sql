-- Recuperacao segura de senha por e-mail.
-- O token bruto nunca e persistido: somente SHA-256 hexadecimal (64 chars).
-- Rode uma vez no phpMyAdmin antes de disponibilizar forgot-password.php.

-- Versao persistida na sessao. Incrementar este valor invalida todas as
-- sessoes e logins 2FA pendentes emitidos antes da troca de credencial.
SET @orby_sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'session_version'
  ),
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN session_version INT UNSIGNED NOT NULL DEFAULT 1 AFTER password_hash'
);
PREPARE orby_stmt FROM @orby_sql;
EXECUTE orby_stmt;
DEALLOCATE PREPARE orby_stmt;

-- Necessario para que o expurgo probabilistico do rate limit nao faca table scan.
SET @orby_sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'rate_hits' AND INDEX_NAME = 'idx_rate_hits_window_start'
  ),
  'SELECT 1',
  'ALTER TABLE rate_hits ADD INDEX idx_rate_hits_window_start (window_start)'
);
PREPARE orby_stmt FROM @orby_sql;
EXECUTE orby_stmt;
DEALLOCATE PREPARE orby_stmt;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE INDEX uq_password_reset_user (user_id),
  INDEX idx_password_reset_expiry (expires_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Compatibilidade com a primeira versao desta migracao, que criava apenas um
-- indice comum por usuario. Mantem o token mais novo antes de tornar a regra
-- de um unico token ativo por conta estruturalmente obrigatoria.
DELETE older
FROM password_reset_tokens AS older
INNER JOIN password_reset_tokens AS newer
  ON newer.user_id = older.user_id AND newer.id > older.id;

SET @orby_has_unique_user = (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'password_reset_tokens'
    AND INDEX_NAME = 'uq_password_reset_user'
    AND NON_UNIQUE = 0
);
SET @orby_has_legacy_user = (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'password_reset_tokens'
    AND INDEX_NAME = 'idx_password_reset_user'
);
SET @orby_sql = IF(
  @orby_has_unique_user > 0,
  'SELECT 1',
  IF(
    @orby_has_legacy_user > 0,
    'ALTER TABLE password_reset_tokens DROP INDEX idx_password_reset_user, ADD UNIQUE INDEX uq_password_reset_user (user_id)',
    'ALTER TABLE password_reset_tokens ADD UNIQUE INDEX uq_password_reset_user (user_id)'
  )
);
PREPARE orby_stmt FROM @orby_sql;
EXECUTE orby_stmt;
DEALLOCATE PREPARE orby_stmt;
