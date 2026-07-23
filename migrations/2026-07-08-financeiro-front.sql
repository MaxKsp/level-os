-- Colunas novas pro pacote "front do financeiro":
--   transactions.payday   -> dia do mês em que a renda é recebida (salário)
--   accounts.fechamento   -> dia de fechamento da fatura do cartão
--   accounts.vencimento   -> dia de vencimento da fatura do cartão
-- Rode uma vez no phpMyAdmin ANTES de publicar esta versão (o front grava
-- esses campos e o back só persiste se as colunas existirem).
--
-- Se a coluna já existir, o phpMyAdmin avisa — pode ignorar o erro nessa linha.

ALTER TABLE transactions ADD COLUMN payday TINYINT UNSIGNED NULL AFTER km;
ALTER TABLE accounts ADD COLUMN fechamento TINYINT UNSIGNED NULL AFTER fatura;
ALTER TABLE accounts ADD COLUMN vencimento TINYINT UNSIGNED NULL AFTER fechamento;
