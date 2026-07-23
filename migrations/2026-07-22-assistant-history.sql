-- Historico cifrado e consumo do Agente de IA.
-- A tabela e independente de assistant_actions para permitir que o usuario
-- limpe conversas sem remover a trilha de auditoria nem invalidar o desfazer.
CREATE TABLE IF NOT EXISTS assistant_history (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  agent_key VARCHAR(16) NOT NULL,
  request_id VARCHAR(64) NOT NULL,
  user_payload LONGTEXT NOT NULL,
  response_payload LONGTEXT NOT NULL,
  prompt_tokens INT UNSIGNED NOT NULL DEFAULT 0,
  completion_tokens INT UNSIGNED NOT NULL DEFAULT 0,
  total_tokens INT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  UNIQUE INDEX uq_assistant_history_user_request (user_id, request_id),
  INDEX idx_assistant_history_user_agent_created (user_id, agent_key, created_at),
  INDEX idx_assistant_history_user_created (user_id, created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS assistant_usage_daily (
  user_id INT UNSIGNED NOT NULL,
  usage_date DATE NOT NULL,
  prompt_tokens BIGINT UNSIGNED NOT NULL DEFAULT 0,
  completion_tokens BIGINT UNSIGNED NOT NULL DEFAULT 0,
  total_tokens BIGINT UNSIGNED NOT NULL DEFAULT 0,
  request_count INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, usage_date),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
