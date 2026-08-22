CREATE TABLE IF NOT EXISTS marketing_events_daily (
  event_date DATE NOT NULL,
  event_name VARCHAR(32) NOT NULL,
  source_path VARCHAR(160) NOT NULL,
  event_count INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (event_date, event_name, source_path),
  INDEX idx_marketing_events_name_date (event_name, event_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
