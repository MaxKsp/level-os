# 06 — APIs, e-mail, integrações e deploy

**Data da auditoria:** 2026-08-26
**Escopo:** worktree atual de `marketing-launch`, branch `feature/ai-agent-guardrails`, HEAD `e600c0eb8e8e4fe417fdfb4a6b82f53e9a5d300d`.
**Método:** leitura estática das 35 entradas em `api/` (34 diretas + um webhook), 12 entradas raiz, controles compartilhados, consumidores, integrações, testes e workflows; comparação Git somente leitura de HEAD/worktree nos dois arquivos protegidos; varredura histórica sanitizada, sem imprimir valores. README não foi usado como prova. Os gates locais e GETs públicos passivos posteriores estão em [12](./12-validacoes-residuos-limitacoes.md); commit, push e deploy não foram executados.

## Legenda

- **A**: autenticação; **C**: CSRF; **V**: verificação adicional (e-mail, token ou provedor); **P**: plano; **NS**: `Cache-Control: no-store` explícito.
- `—` significa gate não aplicável/não presente; “método aberto” significa que o arquivo não fecha verbo com 405.
- **Comprovado** significa comportamento demonstrado pelo código local; **Risco** é consequência plausível; **Bloqueado** depende de configuração/serviço externo.
- Os gates `require_plan`/`require_paid_plan` são controles necessários e devem ser **preservados**, não removidos (`plan.php:42-93`).

## Resultado executivo

Os controles centrais de sessão, CSRF, rate limit e plano são sólidos, mas cada endpoint decide localmente método, body, cache, verificação e quota, gerando inconsistências. O bloqueio funcional claro é Calendar mobile GET versus endpoint POST. Há APIs sem verbo fechado, dois bodies JSON sem teto local, cache privado não uniforme e quotas que limitam leitura mas não crescimento. Resend usa transporte HTTPS/TLS restrito e idempotency key, porém não há outbox/retry durável; tokens são rotacionados antes da entrega. O worktree local — não o HEAD — introduz origem fixa `https://lvlos.com` e redesign nos templates. Integrações têm controles locais comprovados, mas operação real está bloqueada. Deploy testa/refere SHAs diferentes em dispatch, publica PHP/frontend em duas fases FTPS não atômicas, não aplica migrations e não possui rollback real.

## Controles centrais versus locais

| Controle | Implementação central | Decisão local/lacuna | Evidência |
|---|---|---|---|
| Sessão/auth | Cookie seguro, token mobile, expiração Supabase, inatividade e `session_version` | Quase toda API inclui `auth.php`; health é público | `auth.php:16-32`, `auth.php:86-172`; `api/health.php:4-38` |
| E-mail verificado | `require_verified_email()` consulta usuário e falha 403/NS | Aplicado a ações sensíveis, não globalmente | `auth.php:174-199` |
| CSRF | Header/form com `hash_equals`; token mobile autenticado é dispensado por não ser credencial ambiente | Cada endpoint deve chamar o gate | `auth.php:209-243` |
| Rate limit | Janela fixa persistente, transação e `SELECT ... FOR UPDATE`; 429/Retry-After | Buckets/limites são locais; falha do DB é fail-closed por exceção | `auth.php:254-344` |
| Plano | `require_plan` considera acesso efetivo/trial; `require_paid_plan` exige assinatura paga | Sete gates de produto e seis de IA; preservar os gates | `plan.php:31-93`; `SubscriptionPolicy.php:28-119` |
| Requisitos crypto | Assistente/Calendar falham 503 se sodium necessário falta | Não é middleware global | `app/Core/Requirements.php:14-42` |
| Cache | `SecurityHeaders` não define Cache-Control | Alguns endpoints definem NS, outros dependem de runtime/PHP/proxy | `app/Core/SecurityHeaders.php:42-55` |

## Inventário completo — 35 entradas `api/`

| # | Entrada | Método | A/C/V/P | Rate, body, cache | Efeito e consumidor | Evidência |
|---:|---|---|---|---|---|---|
| 1 | `activity.php` | GET | A/—/—/— | `me` 60/min; sem body; sem NS explícito | Lê 30 eventos de auditoria do usuário; Perfil web/mobile | `api/activity.php:8-25`; `ProfileScreen.tsx:507-510`; `mobile/src/lib/api.ts:418-420` |
| 2 | `assistant-confirm.php` | POST | A/C/V/paid | 30/min; JSON 256 KiB; NS | Confirma/cancela token e executa ação preparada; assistente web/mobile | `api/assistant-confirm.php:10-35`; `frontend/src/modules/assistant/api.ts:67-70` |
| 3 | `assistant-history.php` | GET, DELETE | A/C só DELETE/V só DELETE/paid | 60/min; limit 1..100; NS | Lista histórico cifrado ou apaga por agente; assistente web/mobile | `api/assistant-history.php:10-39`; `AssistantRepository.php:283-321` |
| 4 | `assistant-insights.php` | GET | A/—/—/paid | 30/min; `module` allowlist; NS | Insights locais; frontend assistente | `api/assistant-insights.php:9-24`; `frontend/src/modules/assistant/api.ts:92-95` |
| 5 | `assistant-quality.php` | GET | A/—/—/paid | 30/min; `days` 1..90; NS | Uso/latência/tokens/custo estimado; frontend | `api/assistant-quality.php:10-22`; `AssistantRepository.php:406-449` |
| 6 | `assistant-undo.php` | POST | A/C/V/paid | 30/min; lê 4.097 bytes, sem 413 explícito; NS | Desfaz action token sem conflito; frontend | `api/assistant-undo.php:10-35`; `frontend/src/modules/assistant/api.ts:52-55` |
| 7 | `assistant.php` | POST | A/C/—/paid | 20/min; JSON 16 KiB; NS; quotas diária/provedor | Roteia comando, chama provedor/ação, grava histórico/qualidade; web/mobile | `api/assistant.php:10-72`; `frontend/src/modules/assistant/api.ts:43-46` |
| 8 | `auth-supabase-exchange.php` | POST | Bearer/C/JWT+AAL2/— | 20/min por IP; sem body próprio; NS | Resolve/vincula identidade, cria sessão e renova CSRF; cliente Supabase web | `api/auth-supabase-exchange.php:7-60`; `supabaseClient.ts:86-89` |
| 9 | `avatar.php` | POST | A/C/—/— | 10/min; multipart 4 MiB; sem NS explícito | Valida/reencoda JPEG 256² e atualiza avatar; identidade web/mobile | `api/avatar.php:7-80`; `frontend/src/modules/identity/api.ts:37-40` |
| 10 | `calendar-connect.php` | POST | A/C/V/— | 6/10 min; sem body; NS | Emite grant one-shot e URL OAuth; web correto, mobile usa GET | `api/calendar-connect.php:9-27`; `calendar/api.ts:156-159`; `mobile/.../routine.tsx:165-168` |
| 11 | `calendar-disconnect.php` | POST | A/C/V/— | 10/10 min; sem body; NS | Revoga best-effort/remove integração; web/mobile | `api/calendar-disconnect.php:9-28` |
| 12 | `calendar.php` | GET | A/—/—/— | 120/min; range ≤370 dias/±5 anos; NS | Estado/eventos Google read-only; web/mobile | `api/calendar.php:9-67`; `calendar/api.ts:123-138` |
| 13 | `data.php` | GET, POST | A/C POST/—/P POST | 200/min; POST 2 MiB; GET all ≤500 chaves/2 MiB KV; sem NS explícito | Lê/upserta KV e auxiliares; dashboard/rotina/finanças web/mobile | `api/data.php:11-86` |
| 14 | `export.php` | método aberto (GET usado) | A/—/V/— | 10/min; saída sem teto; attachment; sem NS explícito | Exporta KV público + 4 sets; Perfil/paywall web/mobile | `api/export.php:8-35` |
| 15 | `finance.php` | método aberto (POST semântico) | A/C/—/P | 200/min; 4 MiB/5.000 rows; sem NS explícito | Substitui um set e pode conceder XP; finanças web/mobile | `api/finance.php:10-25`; `FinanceApi.php:16-31` |
| 16 | `health.php` | método aberto | —/—/—/— | Sem rate/body; NS | DB, sodium e duas tabelas; pós-deploy | `api/health.php:7-38`; `.github/workflows/deploy.yml:188-192` |
| 17 | `import-ofx.php` | método aberto (POST multipart) | A/C/—/P | 10/min; arquivo 5 MiB; sem NS explícito | Parse/preview OFX, sem gravar; finanças web/mobile | `api/import-ofx.php:11-31` |
| 18 | `import.php` | POST | A/C/V/P | 5/min; 10 MiB, content type/confirm; 500 chaves, item 4 MiB, set 5.000; sem NS explícito | Restore destrutivo transacional do escopo portátil; Perfil | `api/import.php:12-129` |
| 19 | `marketing-event.php` | POST | opcional/—/Fetch Metadata/— | 20/min; **body sem teto local**; NS | Agrega dois eventos da landing; analytics first-party | `api/marketing-event.php:7-43`; `frontend/src/marketing/analytics.ts:5-10` |
| 20 | `me.php` | método aberto | A/—/—/— | bucket `me` 60/min; sem NS explícito | Identidade/flags; web/mobile | `api/me.php:7-38` |
| 21 | `mobile-session.php` | GET, POST, DELETE | variável/variável/credencial+MFA/— | 30/min IP; **JSON sem teto local**; NS | Emite/reusa/revoga token, sessão e vínculo; app nativo | `api/mobile-session.php:45-105`, `:107-280` |
| 22 | `nutrition.php` | GET, POST | A/C POST/—/P POST | 90/min; lê 8.193 bytes sem 413 explícito; NS | Snapshot/arquiva/restaura plano; nutrição web/mobile | `api/nutrition.php:9-48` |
| 23 | `prefs.php` | GET, POST | A/C POST/—/— | 60/min; POST 16 KiB; sem NS explícito | Tema/notificações/onboarding/KV; web/mobile | `api/prefs.php:7-80` |
| 24 | `profile.php` | GET, POST | A/C POST/—/— | GET sem limiter local; POST 20/min/8 KiB; NS | Lê/grava perfil em KV; web/mobile | `api/profile.php:8-83` |
| 25 | `progress-event.php` | POST | A/C/—/P | 30/min; 8 KiB; sem NS explícito | Premia Rotina/Treino por `ref` do cliente; frontend | `api/progress-event.php:9-47` |
| 26 | `progress.php` | GET | A/—/—/— | 120/min; sem NS explícito | GET reconcilia persistência e devolve XP; web/mobile | `api/progress.php:8-27` |
| 27 | `push-devices.php` | POST | A/C/—/— | 30/min; 8 KiB; token 20..4096; sem NS explícito | Registra/upserta ou desabilita tokens; web/native | `api/push-devices.php:7-89` |
| 28 | `subscription-checkout.php` | GET, POST | A/C POST/V/— | GET 60/min; POST 8/min/16 KiB; sem NS explícito | Consulta/cria checkout idempotente Pix/cartão; Perfil/paywall | `api/subscription-checkout.php:11-94`, `:99-330` |
| 29 | `subscription.php` | método aberto (leitura) | A/—/—/— | 60/min; sem NS explícito | Plano/trial/acesso/preço; web/mobile | `api/subscription.php:8-19` |
| 30 | `totp-confirm.php` | POST | A/C/V/— | TOTP 20/min; 4 KiB; sem NS explícito | Ativa TOTP/substitui backup codes; segurança web/mobile | `api/totp-confirm.php:8-63` |
| 31 | `totp-disable.php` | POST | A/C/V/— | TOTP 20/min; 4 KiB; sem NS explícito | Valida senha quando local e remove TOTP; web/mobile | `api/totp-disable.php:7-43` |
| 32 | `totp-enroll.php` | POST | A/C/V/— | TOTP 20/min; body ignorado; sem NS explícito | Gera segredo e põe `totp_enabled=0` antes da confirmação; web/mobile | `api/totp-enroll.php:8-38` |
| 33 | `training.php` | GET, POST | A/C POST/—/P POST | 120/min; POST 256 KiB; NS | Snapshot/saves/deletes/programas; treino web/mobile | `api/training.php:9-70` |
| 34 | `web-vitals.php` | POST | A/—/Fetch Metadata/— | 30/min; 4 KiB; NS | Agrega CLS/INP/LCP best-effort; frontend | `api/web-vitals.php:8-66`; `frontend/src/lib/webVitals.ts:11-32` |
| 35 | `webhooks/mercadopago.php` | POST | HMAC/—/provedor/efeito P | 600/min IP; JSON 1 MiB; sem NS explícito | Reconsulta recurso, valida conta/ambiente/valor e aplica pagamento idempotente; Mercado Pago | `api/webhooks/mercadopago.php:9-69`, `:123-260` |

**Cobertura:** 35/35. Não há recomendação de retirar plano: `data POST`, `finance`, `import-ofx`, `import`, `nutrition POST`, `progress-event` e `training POST` usam `require_plan`; os endpoints do assistente usam `require_paid_plan`.

## Inventário completo — 12 entradas raiz

| # | Entrada | Método | A/C/V/P | Rate/body/cache | Efeito/consumidor | Evidência |
|---:|---|---|---|---|---|---|
| 1 | `index.php` | método aberto (GET/HEAD) | opcional/token injetado/—/— | sem limiter/body/NS explícito | Landing/redirect/shell React; navegação pública | `index.php:7-23`; `.htaccess:16-20` |
| 2 | `auth-google-start.php` | aberto (GET) | login anônimo ou sessão Calendar/state/grant/grant/— | sem limiter/body; NS | Inicia OAuth login/Calendar | `auth-google-start.php:13-58`; `GoogleOAuthFlow.php:5-73` |
| 3 | `auth-google-callback.php` | aberto (GET provedor) | state/state/código+Google verified/— | sem limiter/body; NS/Pragma/no-referrer | Cria/vincula sessão ou salva tokens Calendar | `auth-google-callback.php:8-45`, `:75-150` |
| 4 | `auth-supabase-callback.php` | aberto (GET) | —/—/—/— | sem limiter/body; NS/no-referrer | Shell para concluir callback/exchange; browser/mobile bridge | `auth-supabase-callback.php:7-31` |
| 5 | `cron-notify.php` | CLI ou HTTP aberto | segredo estático/—/hash_equals/— | sem rate/body/NS | Lembretes e backup mensal cifrado; scheduler externo | `cron-notify.php:24-32`, `:74-257` |
| 6 | `forgot-password.php` | GET, POST | anônimo/C form/anti-enumeração/— | 5/IP/h + 3/conta/h; form sem teto; NS | Gera hash/token e e-mail se conta existe; login | `forgot-password.php:7-78`; `auth.php:694-765` |
| 7 | `login.php` | GET, POST | credencial/pending MFA/C form/senha+e-mail+TOTP/— | lock IP 5/15 min; form sem teto; NS | Sessão/MFA/vínculo; entrada | `login.php:7-69`; `auth.php:430-615` |
| 8 | `logout.php` | método aberto, inclusive GET | opcional/—/—/— | sem limiter/body/NS explícito | Audita e destrói sessão; Perfil/paywall | `logout.php:5-23` |
| 9 | `register.php` | GET, POST | anônimo/C form/e-mail pendente/trial | lock consultado; form sem teto; sem NS explícito | Cria usuário, trial, token, telemetria e e-mail | `register.php:5-98` |
| 10 | `resend-verification.php` | GET, POST | anônimo/C form/pendente/— | 8/IP/h + 3/conta/h; form sem teto; sem NS explícito | Rotaciona token e tenta reenvio com resposta genérica | `resend-verification.php:7-108` |
| 11 | `reset-password.php` | GET, POST | capability/recovery/C local/token one-shot/— | submit 10/IP/15m; validate 30/IP/15m; NS/no-referrer | Troca senha, incrementa session_version e invalida links | `reset-password.php:8-129`; `auth.php:773-820` |
| 12 | `verify-email.php` | aberto (GET mutável) | token/—/hash+48h/— | sem limiter/body/NS explícito | Confirma e-mail e invalida token; link de cadastro/reenvio | `verify-email.php:7-42` |

`dev-router.php` não entra nas 12 porque responde 404 fora de `cli-server` (`dev-router.php:9-12`).

## Inconsistências locais de método, body, quota e cache

1. **Métodos:** seis APIs não fecham verbo: `export`, `finance`, `health`, `import-ofx`, `me`, `subscription`. `finance`/`import-ofx` ainda têm auth/CSRF/plano, portanto não é bypass direto. Raiz também tem GETs mutáveis (`logout`, `verify-email`, `login?cancel=1`) e `progress.php` reconcilia em GET (`api/progress.php:19-22`).
2. **Bodies:** `api/mobile-session.php:90` e `api/marketing-event.php:23` leem todo `php://input`; limites ficam a cargo de PHP/web server. Formulários raiz também não têm teto de aplicação.
3. **Quota:** `data POST` aceita chaves arbitrárias de até 2 MiB, mas o limite de 500 chaves/2 MiB é verificado apenas em GET all (`api/data.php:23-42`, `:62-83`); o usuário pode crescer até bloquear a leitura agregada. `push-devices` limita frequência/tamanho, não quantidade por usuário (`api/push-devices.php:54-83`).
4. **Cache:** dados pessoais, export, assinatura, TOTP, atividade e vários writes não têm NS explícito. `SecurityHeaders.php:42-55` não define cache; depender do cache limiter/configuração externa não é contrato versionado.
5. **TOTP:** reenrollment grava novo segredo e desativa o fator atual antes de confirmar (`api/totp-enroll.php:28-33`). Contas sem senha local podem desabilitar sem reautenticação equivalente (`api/totp-disable.php:28-38`).
6. **Avatar:** limita bytes e reencoda, mas não limita dimensões antes do decode (`api/avatar.php:17-49`).
7. **Health:** público, sem rate/método, consulta DB/`information_schema`; testa apenas DB, sodium e duas tabelas (`api/health.php:7-38`).
8. **Telemetria:** `Sec-Fetch-Site` é aceito quando ausente (`api/marketing-event.php:15-22`; `api/web-vitals.php:17-23`). Efeitos são allowlisted/agregados, reduzindo impacto.

## Includes raiz e document root

`.htaccess` bloqueia dotfiles, diretórios internos e `config.php`, `config.example.php`, `schema.sql`, `db.php`, `auth.php`, `totp.php` (`.htaccess:4-27`). `finance.php`, `ofx.php` e `plan.php` são includes raiz não incluídos no deny; acesso direto tende a carregar definições e responder vazio, sem evidência de imprimir segredo (`finance.php:15-19`; `ofx.php:10-60`; `plan.php:16-93`). Ainda são superfície HTTP desnecessária e dependem de Apache/`AllowOverride`; em Nginx ou servidor embutido a proteção não é portátil (`dev-router.php:14-28`). Estado real: **bloqueado por ambiente**.

## E-mail/Resend — HEAD versus worktree local

### Estado preservado

Antes desta auditoria, somente estes dois arquivos estavam modificados; eles foram inspecionados e preservados:

- `app/Modules/Email/EmailTemplates.php`: diff local de **227 adições/66 remoções**;
- `tests/cases/resend_mailer_test.php`: **43 adições/0 remoções**.

O HEAD já contém templates funcionais e teste básico do transporte. O **worktree local**, não o HEAD, introduz `EMAIL_TEMPLATE_APP_URL='https://lvlos.com'` e logo derivado (`EmailTemplates.php:4-5`), usa essa origem em recuperação (`:53-68`), rotina (`:132-169`), logo/rodapé (`:209-244`) e adiciona asserções de OLED/acento/logo/preheader/branding/CTAs (`tests/cases/resend_mailer_test.php:40-90`). O domínio aparecia em fixtures do teste no HEAD; a mudança funcional local é a constante fixa dentro do template.

### Transporte seguro, operação externa bloqueada

`ResendMailer` fixa `https://api.resend.com/emails`, valida segredo/remetente/reply-to contra CR/LF, destinatário/assunto/body/idempotency key/anexos, limita anexos base64 a 20 MiB e valida resposta/ID (`ResendMailer.php:7-124`). cURL permite só HTTPS, valida peer/host, não segue redirect, limita conexão a 3 s, request a 10 s e resposta a 1 MiB (`ResendMailer.php:128-168`). `send_transactional_email()` é best-effort e não loga segredo/conteúdo (`EmailBootstrap.php:29-60`). Domínio verificado, chave, quota e entrega real permanecem **bloqueados**; `config.example.php:59-65` é só contrato ambiental.

### Sem outbox/retry durável

Busca por `email_outbox`, `mail_outbox`, `outbox`, `email_queue`, `mail_queue`, `delivery_attempt`, `retry_count` e `next_attempt` em PHP/SQL retornou zero. A idempotency key (`EmailBootstrap.php:20-27`; `ResendMailer.php:99-106`) evita duplicação no provedor, mas não agenda retry. O helper tenta uma vez e retorna `false` (`EmailBootstrap.php:36-60`). O cron só marca logs após entrega (`cron-notify.php:153-167`, `:237-247`), permitindo nova tentativa incidental na próxima execução, sem outbox/backoff/contagem.

### Token rotacionado antes da entrega

Reset apaga tokens anteriores, insere o novo hash e faz commit antes de chamar Resend (`auth.php:739-761`). Reenvio de verificação substitui hash/expiração e commita antes do envio (`resend-verification.php:43-68`). Cadastro commita usuário/trial antes do primeiro envio (`register.php:39-98`). Falha do provedor preserva a operação principal, mas pode deixar o link anterior inválido e o novo desconhecido, sem retry durável.

### Anti-enumeração e helper de URL

Forgot aplica rate por IP/conta, responde genericamente e equaliza tempo em aproximadamente 0,9–1,05 s (`forgot-password.php:12-46`, `:64-78`; lookup silencioso em `auth.php:724-733`). Reenvio também usa resposta genérica para conta pendente/inexistente, mas sem padding equivalente (`resend-verification.php:19-70`, `:96-108`).

`trusted_app_base_url()` valida `APP_URL`, rejeita credenciais/query/fragmento, exige HTTPS fora de loopback e só aceita `HTTP_HOST` no servidor embutido local (`auth.php:672-720`). Cadastro/reset/reenvio usam esse helper (`register.php:73-81`; `resend-verification.php:57-65`; `auth.php:733-761`). O worktree local cria uma segunda política fixa `lvlos.com`; reduz Host injection, mas quebra portabilidade/staging e pode misturar origens. Correção recomendada: uma origem canônica validada compartilhada, preservando o redesign local.

## Integrações

| Integração | Comprovado no código | Bloqueado/risco operacional | Evidência |
|---|---|---|---|
| Supabase | Flag + URL `*.supabase.co` + publishable key; `/auth/v1/user`; valida issuer/aud/sub/exp; TLS, sem redirect; AAL2 quando TOTP | Projeto, migration, OAuth e sessão reais não verificados; service-role não vai ao cliente | `SupabaseAuthBootstrap.php:14-37`; `SupabaseAuthClient.php:29-175`; `api/auth-supabase-exchange.php:7-68` |
| Google | Hosts HTTPS allowlisted; state hash one-shot 600 s; grant Calendar 120 s; tokens cifrados | Client/secret, callbacks, consent e API reais bloqueados | `GoogleHttpTransport.php:8-61`; `GoogleOAuthFlow.php:4-74`; `GoogleCalendarBootstrap.php:10-24` |
| Mercado Pago | Checkout hospedado, idempotência, intenção local; webhook HMAC, janela, reconsulta canônica, conta/ambiente/BRL/valor/método e evento idempotente | Credenciais, webhook registrado e pagamento real bloqueados | `MercadoPagoClient.php:6-194`; `subscription-checkout.php:121-330`; `webhooks/mercadopago.php:42-260` |
| Resend | Transporte seguro e teste injetado | DNS/domínio/quota/entrega bloqueados; sem outbox | `ResendMailer.php:7-168`; `tests/cases/resend_mailer_test.php:7-123` |
| LLM | Rotas locais primeiro, contexto mínimo, ferramentas por módulo, uma repetição temporária e fallback; HTTPS/limites | Chaves/modelos/quota/respostas reais bloqueados | `AssistantRouter.php:20-155`; `OpenAiCompatibleProvider.php:14-72`; `GeminiNativeProvider.php:35-83`; `config.example.php:80-116` |
| Sentry | Backend/frontend opcionais e best-effort | DSN/ingestão bloqueados; backend envia mensagem e URL completa sem scrubber explícito, podendo incluir query/PII | `app/Core/SentryClient.php:4-73`; `frontend/src/main.tsx:31-40` |
| Analytics/Web Vitals | Pipeline first-party; eventos allowlisted; CLS/INP/LCP agregados | Migration/recepção real bloqueadas; marketing envia `pathname+search+hash`, podendo persistir parâmetros | `frontend/src/marketing/analytics.ts:4-10`; `api/marketing-event.php:7-48`; `frontend/src/lib/webVitals.ts:4-32`; `api/web-vitals.php:7-70` |
| Push | Registro exige login/CSRF/rate e persiste token+hash | Token também fica em claro; nenhum sender FCM/APNs foi localizado; entrega ausente/bloqueada | `api/push-devices.php:5-85`; `tests/cases/native_push_contract_test.php:12-22` |
| Backup/cron | Full CLI cifrado/temporário; restore isolado; cron autenticado e backup mensal opt-in | Scheduler/hPanel, retenção e execução real bloqueados | `scripts/backup.php:16-152`; `scripts/restore.php:16-139`; `cron-notify.php:8-25`, `:172-258` |

**Rotação de `CRON_SECRET`: condicional.** O cron aceita argumento CLI ou query (`cron-notify.php:24-27`). Se o scheduler usa `?token=...`, a credencial pode aparecer em URL/access logs e deve ser rotacionada ao migrar para CLI. Se usa argumento CLI, o worktree não prova exposição que justifique rotação automática. O modo real está bloqueado.

## Deploy

| Achado | Impacto | Evidência |
|---|---|---|
| Ref manual diferente do testado | `quality-gate` reutiliza `tests.yml`, cujo checkout não recebe `inputs.ref`; deploy depois faz checkout de `inputs.ref || github.sha` | `.github/workflows/deploy.yml:6-29`; `.github/workflows/tests.yml:16-19`, `:39-42` |
| SHA incorreto no artefato manual | Tar é do ref checado, mas artifact chama `level-os-${{ github.sha }}`; rollback/ref alternativo fica rotulado com SHA do evento | `deploy.yml:46-55` |
| FTPS em duas fases não atômico | PHP e frontend têm uploads/retries separados; produção pode observar combinação mista | `deploy.yml:58-173` |
| Sem migrations | `migrations/**`, `scripts/**` e `schema.sql` são excluídos; nenhuma etapa DB | `deploy.yml:57-128` |
| Sem rollback real | Tar de 30 dias é “auditável”, mas não há job de restore/redeploy nem reversão de DB | `deploy.yml:39-55` |
| Health/readiness parcial | Verifica chunks e `/api/health.php`; telemetria ausente ainda responde 200 degraded; não verifica SHA, e-mail, OAuth, pagamento, LLM, push, cron/backup | `deploy.yml:175-192`; `api/health.php:7-38` |
| Actions por tag | `@v4`, `@v2`, `@v4.3.5`, não commit SHA imutável | `deploy.yml:27,32,51,60,96,132,147`; `tests.yml:18,21,41,44,51` |
| `public_html`/`.htaccess` | Loader recomenda segredo fora de `public_html`; `.htaccess` é enviado e protege paths | `ConfigLoader.php:5-34`; `.htaccess:4-27`; `server-dir`/AllowOverride reais bloqueados |
| Branch protection | Workflow de PR para `master` existe | Required checks, approvals e rulesets são configuração GitHub externa; **bloqueado**, não afirmar ausência (`tests.yml:3-10`) |

## Busca de secrets

### Escopo e resultado

- **576 arquivos versionados no recorte:** contagem reproduzida a partir de 768 caminhos no HEAD, excluindo 170 mídias (`.svg`, `.png`, `.webp`, `.avif`) e 22 arquivos de `automation/`. Portanto, 576 é o **escopo filtrado**, não o total do repositório.
- **111 commits únicos em todos os refs**, contados por `git rev-list --all` com deduplicação; o ancestral do HEAD isolado é menor.
- Busca histórica sanitizada por assinaturas de alta confiança (private keys e formatos conhecidos de provedores), sem imprimir valores: **nenhum segredo real versionado encontrado**. Ocorrências ficaram restritas a fixtures/placeholders de teste, por exemplo `tests/cases/resend_mailer_test.php:7-18` e `tests/cases/supabase_auth_bridge_test.php:42-67`.
- `config.example.php:7-17`, `:35-36`, `:48-71`, `:103-116` contém valores vazios/placeholders e orientação de ambiente; histórico de `config.php`, `.env` e `*.env` não apresentou arquivos versionados na busca.

O resultado é defensável para os padrões/refs inspecionados, não uma prova matemática contra qualquer formato arbitrário. Nenhum valor potencialmente sensível é reproduzido neste relatório.

## Prioridades

A ordem abaixo não altera a classificação global da auditoria: **P0=0**; estes itens são bloqueadores **P1**.

1. **P1:** resolver um SHA único antes do quality gate, testar/deployar o mesmo checkout e rotular o artefato com esse SHA.
2. **P1:** publicar release atomicamente e incluir estratégia explícita de migration/compatibilidade/rollback; o relatório 05 detalha o bloqueio de dados.
3. **P1:** corrigir Calendar mobile GET→POST e limitar bodies de `mobile-session`/`marketing-event`.
4. **P1:** adotar outbox/compensação para token+e-mail e unificar origem no helper canônico sem perder o redesign local.
5. **P1:** fechar métodos/cache/quota de forma uniforme; preservar `require_plan`/`require_paid_plan`.
6. **P1:** ampliar readiness para SHA/schema e integrações críticas; implementar sender push ou declarar cadastro sem entrega.
7. **P2:** scrub de Sentry, remover query/hash da telemetria e registrar formalmente o filtro da varredura de 576 arquivos.

## Limites da conclusão

Não foi possível confirmar: configuração/saúde real de Supabase, Google, Mercado Pago, Resend, LLM, Sentry, push, cron ou backup; migrations aplicadas; diretório FTPS/`public_html`; Apache `AllowOverride`; branch protection; SHA atualmente implantado; DNS/redirect URIs/webhook; entrega de e-mail/push; nem scheduler. Esses itens permanecem **bloqueados por ambiente**, não “ausentes” por inferência.