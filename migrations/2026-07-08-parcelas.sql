-- Compras parceladas: nº de parcelas numa despesa.
-- Rode uma vez no phpMyAdmin ANTES de publicar esta versão.
-- Se a coluna já existir, o phpMyAdmin avisa — pode ignorar.

ALTER TABLE transactions ADD COLUMN parcelas INT NULL AFTER payday;
