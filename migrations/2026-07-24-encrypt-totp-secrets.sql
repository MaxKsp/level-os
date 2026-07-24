-- Amplia o envelope do segredo TOTP cifrado. Idempotente: MODIFY pode ser
-- executado novamente sem alterar dados ou a definição final.
ALTER TABLE users MODIFY COLUMN totp_secret VARCHAR(255) NULL;
