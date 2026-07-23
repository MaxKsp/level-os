-- Level OS: progressão server-side, auditável e isolada por usuário.
CREATE TABLE IF NOT EXISTS user_progress (
  user_id INT UNSIGNED NOT NULL PRIMARY KEY,
  level INT UNSIGNED NOT NULL DEFAULT 1,
  xp INT UNSIGNED NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
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
