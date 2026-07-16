<?php
// Copie este arquivo para config.php e preencha com as credenciais reais
// do banco MySQL criado no hPanel da Hostinger.
//
// config.php NUNCA deve ser commitado no git (já está no .gitignore).

define('DB_HOST', 'localhost');
define('DB_NAME', 'seu_banco');
define('DB_USER', 'seu_usuario');
define('DB_PASS', 'sua_senha');

// Login com Google (opcional). Deixe como está se não for usar — o botão
// "Entrar com Google" simplesmente não vai funcionar até isso ser
// preenchido. Veja o README pra criar as credenciais no Google Cloud Console.
define('GOOGLE_CLIENT_ID', '');
define('GOOGLE_CLIENT_SECRET', '');

// Token do cron de notificações por e-mail (cron-notify.php). Gere um valor
// aleatório longo (ex: bin2hex(random_bytes(24))) e use o mesmo valor no
// Cron Job do hPanel. Vazio = cron desabilitado.
define('CRON_SECRET', '');

// Backup e restauracao (scripts/backup.php e scripts/restore.php).
// Estas nao sao constantes de config.php: sao variaveis de AMBIENTE
// lidas via getenv(), para nao salvar segredos no repositorio.
//
// ORBY_BACKUP_KEY
//   Chave base64 de 32 bytes para criptografia do backup via libsodium.
//   Gere com:
//     php -r "echo base64_encode(random_bytes(SODIUM_CRYPTO_SECRETSTREAM_XCHACHA20POLY1305_KEYBYTES)), PHP_EOL;"
//
// ORBY_RESTORE_DB_HOST / ORBY_RESTORE_DB_NAME / ORBY_RESTORE_DB_USER / ORBY_RESTORE_DB_PASS
//   Credenciais de um banco de restauracao isolado.
//
// ORBY_RESTORE_CONFIRM_NAME
//   Precisa ser identico a ORBY_RESTORE_DB_NAME antes da restauracao.
