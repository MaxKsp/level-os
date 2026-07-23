-- Rate limiting geral por endpoint. Rode uma vez no phpMyAdmin.
-- Janela fixa: (bucket + subject) guarda inicio da janela e contagem.
-- subject = user_id logado, senao IP.

CREATE TABLE IF NOT EXISTS rate_hits (
  bucket VARCHAR(48) NOT NULL,
  subject VARCHAR(64) NOT NULL,
  window_start INT UNSIGNED NOT NULL,
  hits INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, subject)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
