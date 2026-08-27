# Resumo executivo

## Controle

| Campo | Valor |
|---|---|
| Data | `2026-08-26` |
| Branch / HEAD | `feature/ai-agent-guardrails` / `e600c0e` |
| Worktree na abertura | Sujo, com alterações preexistentes em `app/Modules/Email/EmailTemplates.php` e `tests/cases/resend_mailer_test.php`; conteúdo, hashes e numstats foram preservados. |
| Método | Código, schema, migrations, testes, workflows e execução local controlada; README, ROADMAP e comentários não foram usados como fonte da verdade. |
| Execução | Gates web/backend/mobile e GETs públicos passivos; nenhum commit, push, deploy, banco real ou credencial externa. Resultados completos em [12](./12-validacoes-residuos-limitacoes.md). |

## O sistema pode entrar em produção?

**Não. A decisão obrigatória é NO-GO para produção neste estado.** Não foi identificado comprometimento crítico imediato comprovado, portanto **P0=0**, mas há múltiplos P1 em MFA, sessão, proteção de dados, entitlement, lifecycle de pagamentos, integridade/migrations/DR e dependências mobile. Os gates locais web e backend passaram, mas isso não elimina falhas que os testes atuais não codificam nem itens dependentes de banco/provedores.

A decisão não é motivada por ausência de funcionalidades: o sistema possui arquitetura e controles relevantes. Ela decorre de propriedades de segurança e autorização que podem falhar em estados válidos do produto. Exemplos diretos: o enrollment substitui e desativa o TOTP vigente antes de confirmar o novo fator (`api/totp-enroll.php:27-33`); conta passwordless pode remover TOTP sem step-up (`api/totp-disable.php:27-40`); trial futuro promove acesso mesmo com status inativo (`app/Modules/Subscription/SubscriptionPolicy.php:35-45,95-100`); e eventos de cancelamento do provedor não atualizam `subscriptions.status/current_period_end` (`api/webhooks/mercadopago.php:131-143`; `app/Modules/Subscription/SubscriptionPaymentService.php:174-197`). **Fato.**

## Inventário executivo

| Métrica | Resultado confirmado | Escopo e evidência |
|---|---:|---|
| Módulos | **10** | Módulos PHP de domínio em `app/Modules`: Assistant, Auth, Calendar, Email, Finance, Nutrition, Progress, Routine, Subscription e Training; seus adapters/fachadas estão ativos (`api/assistant.php:4-21`; `auth.php:6-13`; `api/calendar.php:4-13`; `cron-notify.php:14-19`; `finance.php:13-18`; `api/nutrition.php:4-28`; `api/progress.php:4-19`; `app/Modules/Routine/RoutineService.php:9-67`; `api/subscription-checkout.php:4-14`; `api/training.php:4-39`). |
| Rotas web | **6** | `/`, `/financeiro`, `/agenda`, `/treinos`, `/alimentacao`, `/perfil`; `*` é apenas redirect (`frontend/src/App.tsx:105-113`). |
| Endpoints | **35** | Handlers em `api/`, incluindo um webhook: 6 assistente, 3 calendário, 10 identidade/perfil, 4 dados/importação, 6 domínios, 3 assinatura/pagamento e 3 operação/telemetria (`api/assistant.php:10-21`; `api/calendar.php:9-40`; `api/mobile-session.php:45-76`; `api/data.php:4-39`; `api/training.php:9-45`; `api/webhooks/mercadopago.php:10-40`; `api/health.php:4-39`). |
| Tabelas | **36** | Declarações `CREATE TABLE` no schema consolidado (`schema.sql:6-575`). |
| Migrations | **25** | Arquivos SQL versionados entre `migrations/2026-07-06-rate-limit.sql:1` e `migrations/2026-08-22-web-vitals.sql:1`; o aplicador disponível cobre apenas três recentes (`scripts/apply-migration.php:11-24`). |
| Clientes | **web + mobile** | SPA React/Vite servida por PHP e app Expo/React Native separado; o mobile compartilha APIs, não componentes DOM (`frontend/src/App.tsx:131-158`; `mobile/src/app/_layout.tsx:21-43`; `mobile/src/lib/api.ts:71-170`). |

As contagens são métricas de artefatos executáveis, não de intenção documental. “10 módulos” refere-se a `app/Modules`; o frontend possui outro recorte modular. “35 endpoints” conta handlers, não combinações verbo/rota.

## Positivos comprovados

| Controle | Evidência | Leitura executiva |
|---|---|---|
| Senhas, tokens e reset | Senha usa verificação de hash; reset trava registro, atualiza senha e incrementa `session_version` em transação (`auth.php:430-458`; `auth.php:773-805`). | **Fato:** existe base correta para credenciais locais e revogação global no reset. |
| Sessão web | Cookie HttpOnly/SameSite, strict mode, regeneração de ID, idle e checagem contínua de `session_version` (`auth.php:18-36,113-169,390-400,461-484`). | **Fato:** sessão web possui controles importantes; `Secure` depende da sinalização HTTPS do ambiente. |
| CSRF e e-mail verificado | Token aleatório comparado com `hash_equals`; operações sensíveis exigem e-mail verificado (`auth.php:172-198,209-243`; `tests/cases/production_security_contract_test.php:7-39`). | **Fato:** guards são centralizados e testados contratualmente. |
| Supabase/AAL | Backend valida identidade canônica, claims e fator; exchange exige AAL2 quando aplicável (`app/Modules/Auth/SupabaseAuthClient.php:31-107`; `api/auth-supabase-exchange.php:27-48`). | **Fato:** o bridge não confia apenas no payload do browser. |
| Token mobile | Token opaco, hash no banco, vínculo à versão de sessão, revogação e armazenamento em SecureStore (`app/Modules/Auth/MobileSessionService.php:13-16,41-72,99-142`; `mobile/src/lib/secure-storage.ts:11-14`). | **Fato:** há proteção em repouso; o problema é a janela sem idle. |
| Mercado Pago | Checkout exige autenticação/CSRF/rate limit; webhook valida assinatura, reconsulta o recurso, fixa atributos do recebedor e aplica idempotência/ownership local (`api/subscription-checkout.php:70-178`; `api/webhooks/mercadopago.php:10-60,98-117`; `app/Modules/Subscription/SubscriptionPaymentService.php:38-165`). | **Fato:** concessão não confia em `user_id` recebido do webhook. |
| Isolamento multiusuário | Assinatura é consultada por `user_id`; pagamento resolve usuário pela intenção local e por chaves únicas/FKs (`app/Modules/Subscription/SubscriptionRepository.php:25-42`; `schema.sql:153-165,227-251`). | **Fato:** o fluxo normal é user-scoped. |
| Gates automatizados | CI codifica validação web, lint, suíte PHP, smoke e readiness; deploy depende desse gate, faz build, budget, artefato, FTPS com retry e health check (`.github/workflows/tests.yml:15-104`; `.github/workflows/deploy.yml:14-192`). | **Fato + execução local:** web passou 38 arquivos/130 testes, build e budget; PHP passou 50/50, smoke e readiness 40/40. Isso não valida MySQL real, provedores, deploy ou P1 sem teste. |

## Validações executadas e confiança

| Gate | Resultado observado |
|---|---|
| Frontend web | `npm ci` OK; `npm run validate` OK em 40,461 s; TypeScript, **38 arquivos/130 testes**, build de 2.708 módulos e todos os budgets passaram. `npm audit --omit=dev`: 0 vulnerabilidades. |
| Backend | **180 PHP** sem erro sintático; **50/50** casos PHP; smoke **5/5**; readiness `--built` **40/40**; 22 JS versionados passaram `node --check`. |
| IA dirigida | `assistant_agent_policy` e `assistant_router_contract` passaram; centenas de wrappers hostis são barrados antes do provider (`tests/cases/assistant_agent_policy_test.php:62-94`; `tests/cases/assistant_router_contract_test.php:139-166`). Stored injection via dado persistido continua sem teste E2E. |
| Mobile | `npm run validate` passou typecheck/lint. `npm audit --omit=dev` falhou: **20 vulnerabilidades (8 altas, 12 moderadas)** no grafo Expo/Metro/React Native e utilitários; alcance runtime requer triagem. Não há suíte mobile. |
| Produção passiva | `GET https://lvlos.com/api/health.php` retornou `status=ok` e checks de banco/crypto/qualidade/telemetria verdadeiros. Login, cadastro e recuperação responderam conteúdo público. Nenhuma credencial ou mutação foi enviada. |

**Nível de confiança:** alto para estrutura estática e gates locais web/PHP; médio para mobile por ausência de testes/runtime; baixo para banco implantado, provedores, FTPS, lifecycle real, DR e telas autenticadas. A execução local usou Node 24/PHP 8.3, enquanto o workflow fixa Node 22/PHP 8.2 (`.github/workflows/tests.yml:15-49`).

## Bloqueadores de produção

| Bloco P1 | Falha comprovada | Impacto / certeza |
|---|---|---|
| MFA e revogação | Enrollment desativa o TOTP existente antes da confirmação; disable passwordless não exige fator atual/AAL2/reautenticação; mudanças de MFA não incrementam `session_version` (`api/totp-enroll.php:27-33`; `api/totp-disable.php:27-40`; `api/totp-confirm.php:50-60`; `app/Modules/Auth/SupabaseIdentityService.php:89-106`). | **Fato:** quebra de invariantes de step-up e sobrevivência de sessões após mudança de MFA. Exploração por sessão já roubada é **Hipótese**, mas a ausência do controle é factual. |
| Recovery code | Leitura/verificação e marcação de uso não são atômicas; o `UPDATE` não condiciona `used_at IS NULL` nem confere compare-and-set (`auth.php:539-590`). | **Fato:** implementação permite corrida. Replay simultâneo é **Hipótese** dependente de concorrência. |
| Sessão mobile | Token vale 30 dias absolutos; `last_used_at` é atualizado, mas não participa da autorização (`app/Modules/Auth/MobileSessionService.php:4-5,41-68`). | **Fato:** não há idle server-side; bearer capturado conserva janela longa. |
| Antiabuso de cadastro | Só colisões de username/e-mail contam tentativa; cadastros com identidades sempre novas e entradas inválidas não elevam o contador (`register.php:10-18,39-62`; `auth.php:596-617`). | **Fato:** o rate limit implementado não limita o caso principal de abuso em volume. |
| Dados e telemetria | Fallbacks persistem finanças e treino/medidas em `localStorage`; Sentry backend compõe URL com `REQUEST_URI`, incluindo query, sem redaction (`frontend/src/modules/finance/store.tsx:95-117,136-164`; `frontend/src/modules/training/store.tsx:28-46`; `app/Core/SentryClient.php:14-57`). | Persistência e montagem da URL são **Fatos**. Alcance do fallback, Sentry ativo e exfiltração exigem ambiente/XSS e são **Bloqueado por ambiente/Hipótese**. |
| Entitlement | Trial considera apenas a data, ignora `status`/`plan`; `individual + active + current_period_end NULL` é acesso sem expiração, embora não exista estado `lifetime` explícito (`app/Modules/Subscription/SubscriptionPolicy.php:35-45,95-108`; `schema.sql:143-152`; `tests/cases/subscription_module_test.php:108-120`). | **Fato:** estados cancelado/past_due com trial futuro podem ganhar acesso; grants sem prazo não têm semântica/auditoria própria. |
| Lifecycle de pagamento | Preapproval/cancelamento atualiza apenas pagamento local e não reconcilia entitlement; não há job/endpoint versionado para cancelamento, past_due, refund ou chargeback (`api/webhooks/mercadopago.php:131-143,181-185`; `app/Modules/Subscription/SubscriptionPaymentService.php:174-197`). | **Fato:** o ciclo provedor → assinatura está incompleto. Estado real das assinaturas é **Bloqueado por ambiente**. |
| Exceções e consistência | Migration concede `individual/active` a `user_id=1` até 2027; Google legado cria usuário sem trial, ao contrário de cadastro local/Supabase (`migrations/2026-07-08-grant-max-individual.sql:10-15`; `auth-google-callback.php:107-139`; `register.php:46-62`; `app/Modules/Auth/SupabaseIdentityService.php:33-49`). | **Fato no artefato**; aplicação da migration é **Bloqueado por ambiente**. O caminho Google produz entitlement inconsistente. |
| Checkout externo | URL devolvida pelo provedor aceita qualquer host HTTPS; não há allowlist de domínio (`api/subscription-checkout.php:219-231`). | Ausência da allowlist é **Fato**; redirecionamento malicioso exige resposta/cadeia comprometida e é **Hipótese**. |
| Dependências mobile | O `npm audit --omit=dev` executado no app Expo encontrou 20 vulnerabilidades no grafo de produção: 8 altas e 12 moderadas, envolvendo `brace-expansion`, `image-size`/Metro, `js-yaml`, `nanoid` e `uuid`/Expo. | **P1 de release até triagem de alcance:** scanner e lockfile comprovam versões afetadas; exploração no binário/runtime é hipótese. Não foi aplicado `npm audit fix`, pois alteraria dependências. |
| Release/data/mobile | Workflow não aplica migrations nem testa/publica o app Expo; PWA não registra o worker; `mobile:sync` referencia `scripts/prepare-capacitor.mjs`, ausente (`.github/workflows/deploy.yml:69-93`; `.github/workflows/tests.yml:15-104`; `sw.js:3-31`; `frontend/package.json:7-18`). | **Fato:** a cadeia versionada não demonstra reprodutibilidade integral web+mobile+banco. |

## Integrações: validado no repositório versus bloqueado por ambiente

“Validado” abaixo significa **estrutura e controles inspecionados**, não chamada real bem-sucedida.

| Integração | Validado estaticamente | Bloqueado por ambiente / gap |
|---|---|---|
| MySQL/PDO | PDO com `utf8mb4`, exceptions, fetch associativo e prepares nativos (`db.php:4-17`). | Schema/migrations realmente aplicados, backups restauráveis e dados atuais. |
| Supabase Auth | Validação backend de usuário/claims e AAL (`app/Modules/Auth/SupabaseAuthClient.php:31-107`). | Política real do tenant, redirects, fatores e valores de `SUPABASE_*`. |
| Google Auth/Calendar | OAuth server-side, validação de e-mail e cliente Calendar versionados (`auth-google-callback.php:31-102`; `app/Modules/Calendar/GoogleOAuthClient.php:69-90`). | Clientes/redirects do painel, tokens remotos e o defeito de trial no Google legado. |
| Mercado Pago | Cliente com base fixa/TLS, assinatura, reconsulta e pinning de aplicação/collector (`app/Modules/Subscription/MercadoPagoClient.php:17-100,129-171`; `api/webhooks/mercadopago.php:98-117`). | Credenciais/webhook reais, mandatos existentes, reconciliação de lifecycle e allowlist da URL de checkout. |
| Resend/e-mail | Adapter e job de envio existem (`app/Modules/Email/ResendMailer.php:8-10,128-133`; `cron-notify.php:74-167`). | DNS, reputação, configuração, entregabilidade e scheduler externo. |
| Sentry | Cliente backend e SDK web são inicializados condicionalmente (`app/Core/SentryClient.php:14-57`; `frontend/src/main.tsx:20-43`). | Se `SENTRY_DSN` está ativo, retenção/redaction do projeto e eventos já enviados; query sem filtro é bloqueador. |
| IA | Providers OpenAI-compatible/Gemini e roteamento estão implementados (`app/Modules/Assistant/OpenAiCompatibleProvider.php:25-41`; `app/Modules/Assistant/GeminiNativeProvider.php:34-48`). | Chaves, modelos, quotas, residência de dados e disponibilidade dos provedores. |
| FTPS | Workflow faz dois uploads com exclusões, retry e health check (`.github/workflows/deploy.yml:47-192`). | Segredos `FTP_*`, servidor/diretório reais e histórico de execução. |
| Push mobile | App registra permissão/token e API persiste dispositivo (`mobile/src/lib/native-push.ts:11-43`; `api/push-devices.php:31-45`). | Não há sender versionado que leia `push_devices`; entrega real não é demonstrada. |

Nenhum valor de segredo foi lido ou reproduzido.

## Gates verdes não são prontidão real

| Camada | O que um verde prova | O que não prova |
|---|---|---|
| `tests.yml` | Nesta execução local, validação web, build/budget, lint PHP/JS, 50 casos PHP, smoke e readiness passaram; a cadeia versionada está em `.github/workflows/tests.yml:15-104`. | Não cobre app mobile, MySQL real, painel dos provedores, scheduler, restore ambiental nem P1 sem regressão específica. A execução local usou versões diferentes do runner do CI. |
| `deploy.yml` | Que o gate chamado, build/budget, empacotamento, upload e health check passaram naquela execução (`.github/workflows/deploy.yml:14-192`). | Não aplica migrations, não publica mobile e não valida lifecycle de assinatura. O trigger de push é `master`, enquanto o HEAD auditado está em `feature/ai-agent-guardrails` (`.github/workflows/deploy.yml:4-18`). |
| Testes contratuais | Que invariantes codificadas, como sessão mobile hash/version binding e assinatura Mercado Pago, podem ser exercitadas (`tests/cases/mobile_session_sync_contract_test.php:8-70`; `tests/cases/mercadopago_webhook_signature_test.php:8-46`). | Não há contratos localizados para troca segura de TOTP, step-up passwordless, bump de versão em MFA, CAS de recovery code, idle mobile, trial condicionado a status, allowlist do checkout ou lifecycle completo. |
| Health/readiness | Que o processo/DB/tabelas mínimas respondem segundo checks implementados (`api/health.php:4-39`; `.github/workflows/deploy.yml:158-192`). | Não prova correção de autorização, integridade dos dados, migrations completas, restore ou operação de terceiros. |

## Condição executiva

O release permanece **NO-GO**. Para mudar a decisão, não basta “CI verde”: os múltiplos P1 devem deixar de existir no código, ganhar cobertura de regressão, ser validados no banco/configuração/provedores e passar por um release gate que inclua migrations e o cliente mobile quando ele fizer parte da entrega. Esta auditoria não implementou correções; apenas registrou o estado atual.