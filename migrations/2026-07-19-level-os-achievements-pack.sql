-- Segundo pacote incremental de conquistas do Level OS.
-- Execute depois de 2026-07-18-level-os-achievements.sql em instalações existentes.
INSERT INTO achievements (code, title, description, xp_bonus, icon) VALUES
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
