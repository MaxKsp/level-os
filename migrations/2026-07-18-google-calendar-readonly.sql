-- Google Calendar Fase 1: tokens criptografados e espelho somente leitura.
-- Idempotente: ambas as tabelas podem ser criadas novamente sem perda de dados.
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
