-- Rode este script uma vez no phpMyAdmin do banco criado no hPanel da Hostinger.
-- Se as tabelas ja existem de uma instalacao anterior, rode so os blocos
-- "ALTER TABLE" abaixo que ainda nao foram aplicados (o phpMyAdmin avisa
-- se uma coluna ja existir).

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(64) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NULL,
  email VARCHAR(255) NULL UNIQUE,
  email_verified_at TIMESTAMP NULL,
  email_verify_token VARCHAR(64) NULL,
  google_id VARCHAR(64) NULL UNIQUE,
  totp_secret VARCHAR(64) NULL,
  totp_enabled TINYINT(1) NOT NULL DEFAULT 0,
  notify_email TINYINT(1) NOT NULL DEFAULT 0,
  avatar VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Rode isto se a tabela "users" ja existia antes (instalacao anterior sem
-- multiusuario/2FA/Google):
-- ALTER TABLE users MODIFY password_hash VARCHAR(255) NULL;
-- ALTER TABLE users ADD COLUMN email VARCHAR(255) NULL UNIQUE;
-- ALTER TABLE users ADD COLUMN email_verified_at TIMESTAMP NULL;
-- ALTER TABLE users ADD COLUMN email_verify_token VARCHAR(64) NULL;
-- ALTER TABLE users ADD COLUMN google_id VARCHAR(64) NULL UNIQUE;
-- ALTER TABLE users ADD COLUMN totp_secret VARCHAR(64) NULL;
-- ALTER TABLE users ADD COLUMN totp_enabled TINYINT(1) NOT NULL DEFAULT 0;
-- ALTER TABLE users ADD COLUMN notify_email TINYINT(1) NOT NULL DEFAULT 0;
-- ALTER TABLE users ADD COLUMN avatar VARCHAR(255) NULL;

CREATE TABLE IF NOT EXISTS register_attempts (
  ip VARCHAR(45) NOT NULL PRIMARY KEY,
  attempts INT UNSIGNED NOT NULL DEFAULT 0,
  locked_until DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS totp_backup_codes (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  code_hash VARCHAR(255) NOT NULL,
  used_at TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS kv_store (
  user_id INT UNSIGNED NOT NULL,
  data_key VARCHAR(255) NOT NULL,
  data_value LONGTEXT NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, data_key),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS login_attempts (
  ip VARCHAR(45) NOT NULL PRIMARY KEY,
  attempts INT UNSIGNED NOT NULL DEFAULT 0,
  locked_until DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Rate limiting geral por endpoint (ver migrations/2026-07-06-rate-limit.sql)
CREATE TABLE IF NOT EXISTS rate_hits (
  bucket VARCHAR(48) NOT NULL,
  subject VARCHAR(64) NOT NULL,
  window_start INT UNSIGNED NOT NULL,
  hits INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, subject)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Assinatura (ver migrations/2026-07-06-subscriptions.sql)
CREATE TABLE IF NOT EXISTS subscriptions (
  user_id INT UNSIGNED NOT NULL PRIMARY KEY,
  plan ENUM('free','individual','family') NOT NULL DEFAULT 'free',
  status ENUM('active','canceled','past_due') NOT NULL DEFAULT 'active',
  current_period_end DATETIME NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS subscription_events (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  event VARCHAR(48) NOT NULL,
  detail VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Depois de criar as tabelas, gere o hash da sua senha localmente com:
--   php -r "echo password_hash('SUA_SENHA_AQUI', PASSWORD_DEFAULT), PHP_EOL;"
-- e insira o usuário (troque 'admin' e o hash gerado):
-- INSERT INTO users (username, password_hash) VALUES ('admin', '$2y$10$coloque_o_hash_gerado_aqui');
