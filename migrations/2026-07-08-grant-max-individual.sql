-- Concede plano 'individual' ao usuario max, pra testar a importacao de
-- extrato (OFX), que exige plano pago (require_plan). Rode uma vez no
-- phpMyAdmin. Ajuste o user_id se o id do max nao for 1.
--
-- Confirme o id primeiro:
--   SELECT id, username FROM users WHERE username = 'max';
--
-- Depois rode (troque 1 pelo id retornado, se diferente):

INSERT INTO subscriptions (user_id, plan, status, current_period_end)
VALUES (1, 'individual', 'active', '2027-01-01 00:00:00')
ON DUPLICATE KEY UPDATE
  plan = 'individual',
  status = 'active',
  current_period_end = '2027-01-01 00:00:00';
