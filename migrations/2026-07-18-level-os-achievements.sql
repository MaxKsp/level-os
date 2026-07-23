-- Expansão incremental das conquistas do Level OS.
-- Execute depois de 2026-07-17-level-os-progress.sql em instalações existentes.
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
  ('xp_10000', 'Marco de dez mil', 'Acumule 10.000 XP.', 800, 'diamond')
ON DUPLICATE KEY UPDATE
  title = VALUES(title), description = VALUES(description), xp_bonus = VALUES(xp_bonus), icon = VALUES(icon);
