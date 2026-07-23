-- Rode este script uma vez no phpMyAdmin do banco criado no hPanel da Hostinger.
-- Se as tabelas ja existem de uma instalacao anterior, rode so os blocos
-- "ALTER TABLE" abaixo que ainda nao foram aplicados (o phpMyAdmin avisa
-- se uma coluna ja existir).

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(64) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NULL,
  session_version INT UNSIGNED NOT NULL DEFAULT 1,
  email VARCHAR(255) NULL UNIQUE,
  email_verified_at TIMESTAMP NULL,
  email_verify_token VARCHAR(64) NULL,
  google_id VARCHAR(64) NULL UNIQUE,
  auth_provider VARCHAR(32) NULL,
  auth_subject VARCHAR(128) NULL,
  auth_linked_at TIMESTAMP NULL,
  totp_secret VARCHAR(64) NULL,
  totp_enabled TINYINT(1) NOT NULL DEFAULT 0,
  notify_email TINYINT(1) NOT NULL DEFAULT 0,
  avatar VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE INDEX uq_users_auth_identity (auth_provider, auth_subject)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Rode isto se a tabela "users" ja existia antes (instalacao anterior sem
-- multiusuario/2FA/Google):
-- ALTER TABLE users MODIFY password_hash VARCHAR(255) NULL;
-- ALTER TABLE users ADD COLUMN session_version INT UNSIGNED NOT NULL DEFAULT 1 AFTER password_hash;
-- ALTER TABLE users ADD COLUMN email VARCHAR(255) NULL UNIQUE;
-- ALTER TABLE users ADD COLUMN email_verified_at TIMESTAMP NULL;
-- ALTER TABLE users ADD COLUMN email_verify_token VARCHAR(64) NULL;
-- ALTER TABLE users ADD COLUMN google_id VARCHAR(64) NULL UNIQUE;
-- Aplique migrations/2026-07-20-supabase-auth.sql para as colunas de identidade gerenciada.
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

-- Recuperacao de senha por link de uso unico (ver migrations/2026-07-17-password-reset.sql)
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

-- Rate limiting geral por endpoint (ver migrations/2026-07-06-rate-limit.sql)
CREATE TABLE IF NOT EXISTS rate_hits (
  bucket VARCHAR(48) NOT NULL,
  subject VARCHAR(64) NOT NULL,
  window_start INT UNSIGNED NOT NULL,
  hits INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, subject),
  INDEX idx_rate_hits_window_start (window_start)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Auditoria de ações sensíveis (plano, restore e operações administrativas).
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

-- Assinatura (ver migrations/2026-07-06-subscriptions.sql)
CREATE TABLE IF NOT EXISTS subscriptions (
  user_id INT UNSIGNED NOT NULL PRIMARY KEY,
  plan ENUM('free','individual') NOT NULL DEFAULT 'free',
  status ENUM('active','canceled','past_due') NOT NULL DEFAULT 'active',
  current_period_end DATETIME NULL,
  trial_ends_at DATETIME NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_subscriptions_trial_ends (trial_ends_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS subscription_events (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  provider_event_id VARCHAR(96) NULL,
  provider_payment_id VARCHAR(96) NULL,
  event VARCHAR(48) NOT NULL,
  detail VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE INDEX uq_subscription_provider_event (provider_event_id),
  UNIQUE INDEX uq_subscription_provider_payment (provider_payment_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Financeiro relacional (ver migrations/2026-07-06-transactions.sql)
CREATE TABLE IF NOT EXISTS transactions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  kind ENUM('expense','income','income_var') NOT NULL,
  client_id VARCHAR(32) NOT NULL,
  label VARCHAR(255) NULL,
  value DECIMAL(12,2) NOT NULL DEFAULT 0,
  value_cents BIGINT NOT NULL DEFAULT 0,
  tx_date DATE NULL,
  tx_time TIME NULL,
  category VARCHAR(48) NULL,
  method VARCHAR(24) NULL,
  bank VARCHAR(48) NULL,
  recurrence VARCHAR(16) NULL,
  income_type VARCHAR(16) NULL,
  end_date DATE NULL,
  salary_details LONGTEXT NULL,
  account_id VARCHAR(32) NULL,
  km INT NULL,
  payday TINYINT UNSIGNED NULL,
  parcelas INT NULL,
  created_at BIGINT NULL,
  INDEX idx_user_kind (user_id, kind),
  INDEX idx_user_date (user_id, tx_date),
  INDEX idx_transactions_expense_category_date (user_id, kind, category, tx_date),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS accounts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  client_id VARCHAR(32) NOT NULL,
  label VARCHAR(255) NULL,
  tipo VARCHAR(16) NULL,
  saldo DECIMAL(12,2) NOT NULL DEFAULT 0,
  saldo_cents BIGINT NOT NULL DEFAULT 0,
  cheque_especial DECIMAL(12,2) NOT NULL DEFAULT 0,
  cheque_especial_cents BIGINT NOT NULL DEFAULT 0,
  limite DECIMAL(12,2) NOT NULL DEFAULT 0,
  limite_cents BIGINT NOT NULL DEFAULT 0,
  fatura DECIMAL(12,2) NOT NULL DEFAULT 0,
  fatura_cents BIGINT NOT NULL DEFAULT 0,
  fechamento TINYINT UNSIGNED NULL,
  vencimento TINYINT UNSIGNED NULL,
  bank VARCHAR(48) NULL,
  principal TINYINT(1) NOT NULL DEFAULT 0,
  created_at BIGINT NULL,
  INDEX idx_user (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Level OS: progressão server-side (ver migrations/2026-07-17-level-os-progress.sql)
CREATE TABLE IF NOT EXISTS user_progress (
  user_id INT UNSIGNED NOT NULL PRIMARY KEY,
  level INT UNSIGNED NOT NULL DEFAULT 1,
  xp INT UNSIGNED NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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

-- Google Calendar Fase 1 (somente leitura). access_token, refresh_token e
-- sync_token guardam envelopes AEAD, nunca o token em texto puro.
CREATE TABLE IF NOT EXISTS google_calendar_tokens (
  user_id INT UNSIGNED NOT NULL PRIMARY KEY,
  access_token LONGTEXT NOT NULL,
  refresh_token LONGTEXT NOT NULL,
  expiry DATETIME NOT NULL,
  scope TEXT NOT NULL,
  sync_token LONGTEXT NULL,
  google_subject VARCHAR(255) NOT NULL,
  account_email VARCHAR(255) NOT NULL,
  sync_start DATETIME NULL,
  sync_end DATETIME NULL,
  cache_expires_at DATETIME NULL,
  sync_lease_token CHAR(32) NULL,
  sync_lease_until DATETIME NULL,
  connected_at DATETIME NOT NULL,
  last_synced_at DATETIME NULL,
  updated_at DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS google_calendar_events (
  user_id INT UNSIGNED NOT NULL,
  event_hash CHAR(64) NOT NULL,
  google_event_id LONGTEXT NOT NULL,
  title LONGTEXT NOT NULL,
  start_value VARCHAR(64) NOT NULL,
  end_value VARCHAR(64) NOT NULL,
  starts_at DATETIME NOT NULL,
  ends_at DATETIME NOT NULL,
  all_day TINYINT(1) NOT NULL DEFAULT 0,
  location LONGTEXT NULL,
  html_link LONGTEXT NULL,
  provider_updated_at DATETIME NULL,
  mirrored_at DATETIME NOT NULL,
  PRIMARY KEY (user_id, event_hash),
  INDEX idx_google_calendar_events_user_start (user_id, starts_at),
  FOREIGN KEY (user_id) REFERENCES google_calendar_tokens(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Assistente de ações e treino expandido.
CREATE TABLE IF NOT EXISTS nutrition_plans (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  client_id CHAR(32) NOT NULL,
  version_no INT UNSIGNED NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  goal VARCHAR(32) NOT NULL,
  period_days SMALLINT UNSIGNED NOT NULL,
  budget_cents BIGINT UNSIGNED NOT NULL,
  estimated_cost_cents BIGINT UNSIGNED NOT NULL,
  payload_json LONGTEXT NOT NULL,
  source VARCHAR(16) NOT NULL DEFAULT 'assistant',
  replaces_id BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL,
  activated_at DATETIME NULL,
  archived_at DATETIME NULL,
  UNIQUE INDEX uq_nutrition_plan_user_client (user_id, client_id),
  UNIQUE INDEX uq_nutrition_plan_user_version (user_id, version_no),
  INDEX idx_nutrition_plan_user_status (user_id, status, version_no),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (replaces_id) REFERENCES nutrition_plans(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS body_measurements (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  client_id CHAR(32) NOT NULL,
  measurement_type VARCHAR(32) NOT NULL,
  value DECIMAL(10,3) NOT NULL,
  unit VARCHAR(16) NOT NULL,
  measured_on DATE NOT NULL,
  source VARCHAR(16) NOT NULL DEFAULT 'manual',
  created_at DATETIME NOT NULL,
  UNIQUE INDEX uq_body_measurements_user_client (user_id, client_id),
  INDEX idx_body_measurements_user_type_date (user_id, measurement_type, measured_on),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS training_workouts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  client_id CHAR(32) NOT NULL,
  name VARCHAR(96) NOT NULL,
  focus VARCHAR(255) NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  UNIQUE INDEX uq_training_workouts_user_client (user_id, client_id),
  INDEX idx_training_workouts_user_updated (user_id, updated_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS training_workout_exercises (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  workout_id BIGINT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  client_id CHAR(32) NOT NULL,
  position SMALLINT UNSIGNED NOT NULL,
  name VARCHAR(96) NOT NULL,
  modality VARCHAR(24) NOT NULL,
  target_sets SMALLINT UNSIGNED NULL,
  target_reps INT UNSIGNED NULL,
  target_load_kg DECIMAL(8,3) NULL,
  rest_sec INT UNSIGNED NULL,
  progression_level VARCHAR(64) NULL,
  assisted_kg DECIMAL(8,3) NULL,
  weighted_kg DECIMAL(8,3) NULL,
  duration_sec INT UNSIGNED NULL,
  UNIQUE INDEX uq_training_exercises_workout_client (workout_id, client_id),
  INDEX idx_training_exercises_user (user_id, workout_id),
  FOREIGN KEY (workout_id) REFERENCES training_workouts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS training_programs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  client_id CHAR(32) NOT NULL,
  version_no INT UNSIGNED NOT NULL,
  name VARCHAR(96) NOT NULL,
  focus VARCHAR(255) NOT NULL,
  days_per_week SMALLINT UNSIGNED NOT NULL,
  location VARCHAR(16) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  source VARCHAR(16) NOT NULL DEFAULT 'assistant',
  created_at DATETIME NOT NULL,
  activated_at DATETIME NULL,
  archived_at DATETIME NULL,
  UNIQUE INDEX uq_training_program_user_client (user_id, client_id),
  UNIQUE INDEX uq_training_program_user_version (user_id, version_no),
  INDEX idx_training_program_user_status (user_id, status, version_no),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS training_program_workouts (
  program_id BIGINT UNSIGNED NOT NULL,
  workout_id BIGINT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  position SMALLINT UNSIGNED NOT NULL,
  PRIMARY KEY (program_id, workout_id),
  INDEX idx_training_program_workouts_user (user_id, program_id, position),
  FOREIGN KEY (program_id) REFERENCES training_programs(id) ON DELETE CASCADE,
  FOREIGN KEY (workout_id) REFERENCES training_workouts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS training_sessions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  workout_id BIGINT UNSIGNED NULL,
  client_id CHAR(32) NOT NULL,
  name VARCHAR(96) NOT NULL,
  modality VARCHAR(24) NOT NULL,
  session_date DATE NOT NULL,
  duration_sec INT UNSIGNED NULL,
  source VARCHAR(16) NOT NULL DEFAULT 'manual',
  created_at DATETIME NOT NULL,
  UNIQUE INDEX uq_training_sessions_user_client (user_id, client_id),
  INDEX idx_training_sessions_user_date (user_id, session_date),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (workout_id) REFERENCES training_workouts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS training_session_entries (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  session_id BIGINT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  client_id CHAR(32) NOT NULL,
  position SMALLINT UNSIGNED NOT NULL,
  exercise_name VARCHAR(96) NOT NULL,
  modality VARCHAR(24) NOT NULL,
  sets_count SMALLINT UNSIGNED NULL,
  reps_count INT UNSIGNED NULL,
  load_kg DECIMAL(8,3) NULL,
  rest_sec INT UNSIGNED NULL,
  distance_km DECIMAL(10,3) NULL,
  duration_sec INT UNSIGNED NULL,
  avg_hr SMALLINT UNSIGNED NULL,
  progression_level VARCHAR(64) NULL,
  assisted_kg DECIMAL(8,3) NULL,
  weighted_kg DECIMAL(8,3) NULL,
  UNIQUE INDEX uq_training_session_entries_client (session_id, client_id),
  INDEX idx_training_entries_user_modality (user_id, modality),
  FOREIGN KEY (session_id) REFERENCES training_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS assistant_actions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  action_token CHAR(32) NOT NULL,
  request_id VARCHAR(64) NOT NULL,
  action_type VARCHAR(32) NOT NULL,
  provider VARCHAR(32) NULL,
  status VARCHAR(16) NOT NULL,
  undo_payload LONGTEXT NULL,
  response_payload LONGTEXT NULL,
  result_summary VARCHAR(255) NULL,
  created_at DATETIME NOT NULL,
  undo_expires_at DATETIME NULL,
  undone_at DATETIME NULL,
  UNIQUE INDEX uq_assistant_actions_token (action_token),
  UNIQUE INDEX uq_assistant_actions_user_request (user_id, request_id),
  INDEX idx_assistant_actions_user_created (user_id, created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS assistant_route_cache (
  user_id INT UNSIGNED NOT NULL,
  cache_key CHAR(64) NOT NULL,
  provider VARCHAR(32) NOT NULL,
  route_payload LONGTEXT NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL,
  PRIMARY KEY (user_id, cache_key),
  INDEX idx_assistant_route_cache_expiry (expires_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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

CREATE TABLE IF NOT EXISTS xp_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  type ENUM('rotina','treino','financeiro','streak','conquista') NOT NULL,
  amount INT UNSIGNED NOT NULL,
  ref VARCHAR(191) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE INDEX uq_xp_events_user_ref (user_id, ref),
  INDEX idx_xp_events_user_created (user_id, created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS achievements (
  code VARCHAR(64) NOT NULL PRIMARY KEY,
  title VARCHAR(96) NOT NULL,
  description VARCHAR(255) NOT NULL,
  xp_bonus INT UNSIGNED NOT NULL DEFAULT 0,
  icon VARCHAR(48) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_achievements (
  user_id INT UNSIGNED NOT NULL,
  achievement_code VARCHAR(64) NOT NULL,
  unlocked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, achievement_code),
  INDEX idx_user_achievements_unlocked (user_id, unlocked_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (achievement_code) REFERENCES achievements(code) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO achievements (code, title, description, xp_bonus, icon) VALUES
  ('primeiro_passo', 'Primeiro passo', 'Conclua sua primeira tarefa.', 40, 'task_alt'),
  ('rotina_10', 'Dez em dia', 'Conclua 10 tarefas da rotina.', 80, 'checklist'),
  ('rotina_50', 'Ritmo próprio', 'Conclua 50 tarefas da rotina.', 180, 'event_available'),
  ('rotina_100', 'Disciplina diária', 'Conclua 100 tarefas da rotina.', 300, 'verified'),
  ('primeiro_treino', 'Corpo em movimento', 'Conclua seu primeiro treino.', 80, 'fitness_center'),
  ('treinos_5', 'Série completa', 'Conclua 5 treinos.', 120, 'exercise'),
  ('treinos_20', 'Base atlética', 'Conclua 20 treinos.', 250, 'sports_gymnastics'),
  ('treinos_50', 'Constância física', 'Conclua 50 treinos.', 400, 'monitor_heart'),
  ('controle_financeiro', 'No controle', 'Registre seu primeiro lançamento financeiro.', 30, 'payments'),
  ('financeiro_10', 'Mapa financeiro', 'Registre 10 lançamentos financeiros.', 70, 'account_balance_wallet'),
  ('financeiro_50', 'Visão de longo prazo', 'Registre 50 lançamentos financeiros.', 180, 'insights'),
  ('financeiro_100', 'Controle total', 'Registre 100 lançamentos financeiros.', 300, 'finance'),
  ('sequencia_3', 'Ritmo de três', 'Mantenha uma sequência de três dias.', 90, 'local_fire_department'),
  ('sequencia_7', 'Semana consistente', 'Mantenha uma sequência de sete dias.', 160, 'date_range'),
  ('sequencia_30', 'Mês de constância', 'Mantenha uma sequência de 30 dias.', 500, 'calendar_month'),
  ('nivel_5', 'Em evolução', 'Alcance o nível 5.', 150, 'military_tech'),
  ('nivel_10', 'Ascendente', 'Alcance o nível 10.', 300, 'rocket_launch'),
  ('nivel_25', 'Alta performance', 'Alcance o nível 25.', 700, 'trophy'),
  ('xp_1000', 'Quatro dígitos', 'Acumule 1.000 XP.', 200, 'workspace_premium'),
  ('xp_5000', 'Trajetória sólida', 'Acumule 5.000 XP.', 400, 'stars'),
  ('xp_10000', 'Marco de dez mil', 'Acumule 10.000 XP.', 800, 'diamond'),
  ('rotina_250', 'Ritual consolidado', 'Conclua 250 tarefas da rotina.', 600, 'calendar_month'),
  ('treinos_100', 'Centena ativa', 'Conclua 100 treinos.', 750, 'military_tech'),
  ('financeiro_250', 'Precisão financeira', 'Registre 250 lançamentos financeiros.', 600, 'receipt_long'),
  ('sequencia_60', 'Ritmo inabalável', 'Mantenha uma sequência de 60 dias.', 850, 'local_fire_department'),
  ('sequencia_100', 'Cem dias presentes', 'Mantenha uma sequência de 100 dias.', 1200, 'trophy'),
  ('nivel_50', 'Meio século', 'Alcance o nível 50.', 1500, 'diamond'),
  ('xp_25000', 'Trajetória rara', 'Acumule 25.000 XP.', 1400, 'stars'),
  ('xp_50000', 'Legado em construção', 'Acumule 50.000 XP.', 2200, 'workspace_premium'),
  ('equilibrio_10', 'Tríade em equilíbrio', 'Conclua 10 ações em rotina, finanças e treinos.', 500, 'target')
ON DUPLICATE KEY UPDATE
  title = VALUES(title), description = VALUES(description), xp_bonus = VALUES(xp_bonus), icon = VALUES(icon);

-- Depois de criar as tabelas, gere o hash da sua senha localmente com:
--   php -r "echo password_hash('SUA_SENHA_AQUI', PASSWORD_DEFAULT), PHP_EOL;"
-- e insira o usuário (troque 'admin' e o hash gerado):
-- INSERT INTO users (username, password_hash) VALUES ('admin', '$2y$10$coloque_o_hash_gerado_aqui');
