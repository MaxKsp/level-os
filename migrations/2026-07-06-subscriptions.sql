-- Esqueleto do modelo de assinatura. Rode uma vez no phpMyAdmin.
-- Sem row = plano 'free'. Plano so muda server-side (futuro webhook do
-- gateway), NUNCA pelo cliente. Controle de acesso le SEMPRE desta tabela.

CREATE TABLE IF NOT EXISTS subscriptions (
  user_id INT UNSIGNED NOT NULL PRIMARY KEY,
  plan ENUM('free','individual','family') NOT NULL DEFAULT 'free',
  status ENUM('active','canceled','past_due') NOT NULL DEFAULT 'active',
  current_period_end DATETIME NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Trilha de mudancas de plano (auditoria; preenchida pelo webhook depois).
CREATE TABLE IF NOT EXISTS subscription_events (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  event VARCHAR(48) NOT NULL,
  detail VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
