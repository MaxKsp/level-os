CREATE TABLE IF NOT EXISTS web_vitals_daily (
  user_id INT UNSIGNED NOT NULL,
  metric_date DATE NOT NULL,
  metric_name VARCHAR(8) NOT NULL,
  route_path VARCHAR(191) NOT NULL,
  sample_count INT UNSIGNED NOT NULL DEFAULT 0,
  value_total DOUBLE UNSIGNED NOT NULL DEFAULT 0,
  value_max DOUBLE UNSIGNED NOT NULL DEFAULT 0,
  last_rating VARCHAR(16) NOT NULL DEFAULT 'unknown',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, metric_date, metric_name, route_path),
  INDEX idx_web_vitals_date_metric (metric_date, metric_name),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
