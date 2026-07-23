-- Assistente roteador de ações + treino expandido.
-- Idempotente para instalações que ainda não possuem estas tabelas.

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
