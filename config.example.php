<?php
// Em produção, copie este arquivo para ../level-os-config.php (um nível acima
// de public_html) e preencha com as credenciais reais. Alternativamente,
// LEVELOS_CONFIG_PATH pode apontar para outro arquivo PHP absoluto e privado.
// config.php na raiz pública continua aceito somente para migração.
//
// config.php NUNCA deve ser commitado no git (já está no .gitignore).

define('DB_HOST', 'localhost');
define('DB_NAME', 'seu_banco');
define('DB_USER', 'seu_usuario');
define('DB_PASS', 'sua_senha');

// Origem publica canonica usada em links enviados por e-mail e no callback
// OAuth. Em producao, use HTTPS e nao inclua barra no fim.
// Ex.: https://app.seudominio.com
define('APP_URL', 'https://app.seudominio.com');

// Supabase Auth (migracao gradual). A publishable key pode existir no
// navegador; nunca use SUPABASE_SERVICE_ROLE_KEY no frontend ou neste fluxo.
// Mantenha SUPABASE_AUTH_ENABLED=false ate aplicar a migration e configurar
// URLs/Google/Resend no painel do Supabase.
// Variaveis de ambiente:
//   SUPABASE_AUTH_ENABLED=true
//   SUPABASE_URL=https://SEU-PROJETO.supabase.co
//   SUPABASE_PUBLISHABLE_KEY=sb_publishable_...

// Login com Google (opcional). Deixe como está se não for usar — o botão
// "Entrar com Google" simplesmente não vai funcionar até isso ser
// preenchido. Veja o README pra criar as credenciais no Google Cloud Console.
define('GOOGLE_CLIENT_ID', '');
define('GOOGLE_CLIENT_SECRET', '');

// Google Calendar: chave exclusiva de 32 bytes em base64 para criptografar
// access/refresh/sync tokens no banco. Configure como variável de ambiente,
// nunca como constante versionada:
//   LEVELOS_GOOGLE_TOKEN_KEY  (nome legado ORBY_GOOGLE_TOKEN_KEY ainda é aceito)
// Gere com:
//   php -r "echo base64_encode(random_bytes(32)), PHP_EOL;"
// TOTP usa LEVELOS_TOTP_KEY (32 bytes em base64). Se ausente, uma chave
// exclusiva é derivada por HKDF de LEVELOS_GOOGLE_TOKEN_KEY.

// Sentry — monitoramento de erros (opcional, gratuito em sentry.io).
// Crie um projeto PHP em sentry.io, copie o DSN e cole aqui.
// O mesmo DSN é injetado no frontend React via window.LEVEL_OS_SENTRY_DSN.
// Vazio = Sentry desativado.
define('SENTRY_DSN', '');

// Token do cron de notificações por e-mail (cron-notify.php). Gere um valor
// aleatório longo (ex: bin2hex(random_bytes(24))) e use o mesmo valor no
// Cron Job do hPanel. Vazio = cron desabilitado.
define('CRON_SECRET', '');

// E-mail transacional via Resend. Configure como variaveis de ambiente no
// servidor; nao grave a API key neste arquivo nem envie ao frontend.
// O dominio do remetente precisa estar verificado no painel do Resend.
//   RESEND_API_KEY       = chave secreta do Resend
//   RESEND_FROM_EMAIL    = notificacoes@seudominio.com
//   RESEND_FROM_NAME     = Level OS
//   RESEND_REPLY_TO      = suporte@seudominio.com (opcional)

// Mercado Pago (assinatura recorrente hospedada para Pix e cartão).
// Copie o Access Token e a assinatura secreta em Suas integrações > Webhooks.
// Estes valores são privados e nunca devem ser enviados ao frontend.
define('MERCADOPAGO_ACCESS_TOKEN', '');
define('MERCADOPAGO_WEBHOOK_SECRET', '');
define('MERCADOPAGO_INDIVIDUAL_PRICE_CENTS', 1990);
// O meio disponível é selecionado no ambiente do Mercado Pago. Este fluxo
// hospedado cria a recorrência sem associar um preapproval_plan_id.
// production exige live_mode=true; sandbox exige live_mode=false no webhook.
// QR Code e Pix copia-e-cola criados com token TEST- são apenas simulações:
// aplicativos bancários reais os rejeitam. Para receber um Pix real, use
// MERCADOPAGO_ENVIRONMENT=production e um Access Token produtivo APP_USR-.
define('MERCADOPAGO_ENVIRONMENT', 'production');
define('MERCADOPAGO_APPLICATION_ID', '');
define('MERCADOPAGO_COLLECTOR_ID', '');

// Assistente de ações. Reordene ou desative provedores conforme limites e ToS.
// Chaves ficam em variáveis de ambiente; nunca envie estas chaves ao frontend.
// O Gemini usa a API REST nativa. Flash-Lite reduz custo e mantém function calling.
// OPENAI_API_KEY_1 e OPENAI_API_KEY_2 permitem dois fallbacks independentes.
// OPENAI_MODEL é opcional; gpt-5-nano é o padrão de menor custo.
// LEVELOS_ASSISTANT_DATA_KEY (legado ORBY_ASSISTANT_DATA_KEY aceito) deve ser
// uma chave de 32 bytes em base64. Ela é recomendada e tem prioridade. Quando
// ausente, uma chave exclusiva do assistente é derivada com HKDF a partir de
// LEVELOS_GOOGLE_TOKEN_KEY, permitindo instalações que usam uma única chave:
//   php -r "echo base64_encode(random_bytes(32)), PHP_EOL;"
// LEVELOS_ASSISTANT_DAILY_TOKEN_LIMIT limita tokens de IA por usuário/dia
// (padrão: 100000; use 0 para desativar). Consultas locais não contam.
// LEVELOS_ASSISTANT_HISTORY_DAYS controla a retenção do histórico cifrado
// (padrão: 90; mínimo: 7; máximo: 365).
// LEVELOS_ASSISTANT_EXPENSE_CONFIRM_CENTS exige confirmação para despesas
// acima do limite (padrão: 50000 = R$ 500,00; 0 desativa). Transferências
// sempre exigem confirmação explícita.
define('ASSISTANT_PROVIDERS', [
    ['name'=>'openai-1', 'enabled'=>(getenv('OPENAI_API_KEY_1') ?: '') !== '', 'base_url'=>'https://api.openai.com/v1', 'api_key'=>(string)(getenv('OPENAI_API_KEY_1') ?: ''), 'model'=>(string)(getenv('OPENAI_MODEL') ?: 'gpt-5-nano'), 'supports_tools'=>true],
    ['name'=>'openai-2', 'enabled'=>(getenv('OPENAI_API_KEY_2') ?: '') !== '', 'base_url'=>'https://api.openai.com/v1', 'api_key'=>(string)(getenv('OPENAI_API_KEY_2') ?: ''), 'model'=>(string)(getenv('OPENAI_MODEL') ?: 'gpt-5-nano'), 'supports_tools'=>true],
    ['name'=>'gemini', 'driver'=>'gemini', 'enabled'=>(getenv('GEMINI_API_KEY') ?: '') !== '', 'api_key'=>(string)(getenv('GEMINI_API_KEY') ?: ''), 'model'=>(string)(getenv('GEMINI_MODEL') ?: 'gemini-3.1-flash-lite'), 'cost_optimized'=>true],
    ['name'=>'groq', 'enabled'=>(getenv('GROQ_API_KEY') ?: '') !== '', 'base_url'=>'https://api.groq.com/openai/v1', 'api_key'=>(string)(getenv('GROQ_API_KEY') ?: ''), 'model'=>(string)(getenv('GROQ_MODEL') ?: 'llama-3.3-70b-versatile'), 'supports_tools'=>true],
    ['name'=>'cerebras', 'enabled'=>(getenv('CEREBRAS_API_KEY') ?: '') !== '', 'base_url'=>'https://api.cerebras.ai/v1', 'api_key'=>(string)(getenv('CEREBRAS_API_KEY') ?: ''), 'model'=>(string)(getenv('CEREBRAS_MODEL') ?: 'llama-3.3-70b'), 'supports_tools'=>true],
    ['name'=>'mistral', 'enabled'=>(getenv('MISTRAL_API_KEY') ?: '') !== '', 'base_url'=>'https://api.mistral.ai/v1', 'api_key'=>(string)(getenv('MISTRAL_API_KEY') ?: ''), 'model'=>(string)(getenv('MISTRAL_MODEL') ?: 'mistral-small-latest'), 'supports_tools'=>true],
    ['name'=>'github', 'enabled'=>(getenv('GITHUB_MODELS_TOKEN') ?: '') !== '', 'base_url'=>'https://models.github.ai/inference', 'api_key'=>(string)(getenv('GITHUB_MODELS_TOKEN') ?: ''), 'model'=>(string)(getenv('GITHUB_MODELS_MODEL') ?: 'openai/gpt-4.1-mini'), 'supports_tools'=>true],
    ['name'=>'openrouter', 'enabled'=>(getenv('OPENROUTER_API_KEY') ?: '') !== '', 'base_url'=>'https://openrouter.ai/api/v1', 'api_key'=>(string)(getenv('OPENROUTER_API_KEY') ?: ''), 'model'=>(string)(getenv('OPENROUTER_MODEL') ?: 'openrouter/free'), 'supports_tools'=>false],
    ['name'=>'sambanova', 'enabled'=>(getenv('SAMBANOVA_API_KEY') ?: '') !== '', 'base_url'=>'https://api.sambanova.ai/v1', 'api_key'=>(string)(getenv('SAMBANOVA_API_KEY') ?: ''), 'model'=>(string)(getenv('SAMBANOVA_MODEL') ?: 'Meta-Llama-3.3-70B-Instruct'), 'supports_tools'=>true],
    ['name'=>'cloudflare', 'enabled'=>(getenv('CLOUDFLARE_AI_TOKEN') ?: '') !== '' && (getenv('CLOUDFLARE_ACCOUNT_ID') ?: '') !== '', 'base_url'=>'https://api.cloudflare.com/client/v4/accounts/' . rawurlencode((string)(getenv('CLOUDFLARE_ACCOUNT_ID') ?: 'ACCOUNT_ID')) . '/ai/v1', 'api_key'=>(string)(getenv('CLOUDFLARE_AI_TOKEN') ?: ''), 'model'=>(string)(getenv('CLOUDFLARE_AI_MODEL') ?: '@cf/meta/llama-3.3-70b-instruct-fp8-fast'), 'supports_tools'=>false],
]);


// Backup e restauracao (scripts/backup.php e scripts/restore.php).
// Estas nao sao constantes de config.php: sao variaveis de AMBIENTE
// lidas via getenv(), para nao salvar segredos no repositorio.
//
// LEVELOS_BACKUP_KEY  (nome legado ORBY_BACKUP_KEY ainda é aceito)
//   Chave base64 de 32 bytes para criptografia do backup via libsodium.
//   Gere com:
//     php -r "echo base64_encode(random_bytes(SODIUM_CRYPTO_SECRETSTREAM_XCHACHA20POLY1305_KEYBYTES)), PHP_EOL;"
//
// LEVELOS_RESTORE_DB_HOST / LEVELOS_RESTORE_DB_NAME / LEVELOS_RESTORE_DB_USER / LEVELOS_RESTORE_DB_PASS
//   Credenciais de um banco de restauracao isolado. (Nomes legados ORBY_RESTORE_* aceitos.)
//
// LEVELOS_RESTORE_CONFIRM_NAME
//   Precisa ser identico a LEVELOS_RESTORE_DB_NAME antes da restauracao.
//
// Requisito de servidor: extensao sodium do PHP habilitada (php -m | grep sodium).
// Sem ela, backup cifrado, tokens do Google Calendar e o Agente de IA ficam
// indisponiveis (o app responde com erro claro em vez de 500).
