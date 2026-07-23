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
