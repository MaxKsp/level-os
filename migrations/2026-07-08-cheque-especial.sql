-- Cheque especial (limite de saldo negativo) por conta corrente.
-- Rode uma vez no phpMyAdmin ANTES de publicar esta versão.
-- Se a coluna já existir, o phpMyAdmin avisa — pode ignorar.

ALTER TABLE accounts ADD COLUMN cheque_especial DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER saldo;
