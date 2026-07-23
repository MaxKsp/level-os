-- Migra dado financeiro do kv_store (blob JSON) pra tabelas relacionais
-- consultaveis. Rode uma vez no phpMyAdmin. A migracao dos dados
-- existentes acontece sozinha no 1o bootstrap (api/data.php?all=1).
--
-- Contrato preservado: o front continua recebendo/enviando os mesmos
-- arrays. client_id guarda o id string do front (genId), entao os ids
-- nao mudam. value em DECIMAL, datas em DATE/TIME = consultavel por
-- periodo/categoria pra conciliacao/PDF/anomalia depois.

CREATE TABLE IF NOT EXISTS transactions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  kind ENUM('expense','income','income_var') NOT NULL,
  client_id VARCHAR(32) NOT NULL,
  label VARCHAR(255) NULL,
  value DECIMAL(12,2) NOT NULL DEFAULT 0,
  tx_date DATE NULL,
  tx_time TIME NULL,
  category VARCHAR(48) NULL,
  method VARCHAR(24) NULL,
  bank VARCHAR(48) NULL,
  recurrence VARCHAR(16) NULL,     -- expense: none|mensal
  income_type VARCHAR(16) NULL,    -- income: fixa|variavel|temporaria
  end_date DATE NULL,              -- income temporaria
  account_id VARCHAR(32) NULL,     -- conciliacao (client_id da conta)
  km INT NULL,                     -- income_var (ifood)
  created_at BIGINT NULL,          -- epoch ms do front
  INDEX idx_user_kind (user_id, kind),
  INDEX idx_user_date (user_id, tx_date),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS accounts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  client_id VARCHAR(32) NOT NULL,
  label VARCHAR(255) NULL,
  tipo VARCHAR(16) NULL,           -- conta|cartao
  saldo DECIMAL(12,2) NOT NULL DEFAULT 0,
  limite DECIMAL(12,2) NOT NULL DEFAULT 0,
  fatura DECIMAL(12,2) NOT NULL DEFAULT 0,
  bank VARCHAR(48) NULL,
  principal TINYINT(1) NOT NULL DEFAULT 0,
  created_at BIGINT NULL,
  INDEX idx_user (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Marca que a migracao kv->tabelas ja rodou pra um usuario (evita re-migrar).
-- Guardado em kv_store como chave interna _finance_migrated.
