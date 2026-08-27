# Arquitetura e inventário

## Controle e critério

| Campo | Valor |
|---|---|
| Data | `2026-08-26` |
| Branch / HEAD | `feature/ai-agent-guardrails` / `e600c0e` |
| Worktree na abertura | Sujo por alterações preexistentes em `app/Modules/Email/EmailTemplates.php` e `tests/cases/resend_mailer_test.php`; preservadas. |
| Decisão global | **NO-GO**; `P0=0`, múltiplos P1. |
| Fonte da verdade | Código, schema, migrations, testes e workflows. README, ROADMAP e comentários não sustentam fatos. |

**Legenda:** **Fato** = demonstrado no repositório; **Hipótese** = efeito dependente de condição adicional; **Bloqueado por ambiente** = exige banco, configuração, infraestrutura, provedor ou histórico externo. A auditoria foi estática e não executou build/test.

## 1. Arquitetura fonte → build → execução → deploy

| Camada | Implementação atual | Evidência e conclusão |
|---|---|---|
| Entrada PHP | Front controllers na raiz, adapters em `api/`, guards/fachadas como `auth.php`, `db.php`, `finance.php`, `plan.php`, `ofx.php` e `totp.php`. | PDO MySQL é singleton com charset, exceptions e prepares nativos (`db.php:4-17`); autenticação/sessão/CSRF são centralizados (`auth.php:86-101,161-195,216-232,336-344`). **Fato.** |
| Serviços de domínio | Código em `app/Modules/`, separado em dez módulos; `app/Core` e `app/Shared` concentram infraestrutura/apresentação compartilhada. | Os handlers carregam serviços de domínio em vez de embutir todo o fluxo, por exemplo assistente, finanças e assinatura (`api/assistant.php:4-21`; `api/finance.php:4-13`; `api/subscription-checkout.php:4-14`). **Fato.** |
| Shell web | Usuário sem sessão recebe landing/login; autenticado recebe o build React via `DashboardView`. | O shell lê `frontend/dist/index.php`, injeta CSRF/escopo/configurações públicas e devolve 503 quando o build falta (`index.php:4-23`; `app/Shared/DashboardView.php:16-97`). **Fato.** |
| Fonte web | React/Vite com duas entradas, app autenticado e landing. | Vite define entradas e chunks (`frontend/vite.config.ts:10-26`). O script `build` encadeia Vite, cliente de auth e geração do shell PHP (`frontend/package.json:7-18`). **Fato.** |
| Artefato web | `build-php-shell.mjs` converte `dist/index.html` em `dist/index.php`, adiciona guards/metas e remove o HTML original. | `frontend/scripts/build-php-shell.mjs:3-21`. **Fato:** `frontend/dist` é artefato operacional, não resíduo morto. |
| Mobile | Projeto Expo Router/React Native independente em `mobile/`; compartilha backend/contratos HTTP, não componentes React DOM. | Stack nativa em `mobile/src/app/_layout.tsx:21-43`; chamadas e token em `mobile/src/lib/api.ts:71-170,373-545`; dependências em `mobile/package.json:3-58`. **Fato.** |
| Deploy | Workflow chama quality gate, constrói web, verifica budget, empacota, envia PHP e `frontend/dist` por FTPS em duas etapas, verifica chunks e health. | `.github/workflows/deploy.yml:14-192`. **Fato:** migrations e fontes web/mobile são excluídas do upload principal; não existe etapa de migration nem publicação Expo (`.github/workflows/deploy.yml:69-93,109-128`). |

### Sequência efetiva

1. O browser chega ao PHP; sessão web ou token mobile é resolvido por `current_user_id()` (`auth.php:86-101`).
2. No web autenticado, PHP injeta contexto mínimo e serve o shell gerado (`app/Shared/DashboardView.php:32-84`).
3. Providers React carregam identidade, preferências, assinatura, progressão e domínios; as páginas são lazy-loaded (`frontend/src/App.tsx:31-41,131-158`).
4. Web e mobile chamam os mesmos adapters HTTP; o mobile envia credencial bearer própria e CSRF quando aplicável (`mobile/src/lib/api.ts:71-170`).
5. Persistência combina tabelas relacionais e KV; integrações externas são chamadas por clientes PHP.
6. Em produção, o workflow publica PHP e o build web; banco, scheduler e mobile ficam fora da cadeia versionada de deploy. **Fato** (`.github/workflows/deploy.yml:47-192`).

## 2. Dez módulos PHP

A contagem de **10 módulos** é específica de `app/Modules/` e não deve ser extrapolada para os diretórios modulares do frontend.

| # | Módulo | Responsabilidade observada | Evidência executável |
|---:|---|---|---|
| 1 | Assistant | Roteamento, providers LLM, ações, confirmação, undo, histórico, insights e qualidade. | `api/assistant.php:4-45`; `api/assistant-confirm.php:10-40`; `api/assistant-undo.php:10-35` |
| 2 | Auth | Supabase, identidade, sessão mobile e criptografia TOTP. | `auth.php:6-13`; `api/auth-supabase-exchange.php:4-61`; `app/Modules/Auth/MobileSessionService.php:3-142` |
| 3 | Calendar | OAuth Google, tokens/cache e leitura do Calendar. | `api/calendar.php:4-40`; `api/calendar-connect.php:4-27`; `app/Modules/Calendar/GoogleOAuthClient.php:69-90` |
| 4 | Email | Templates e transporte Resend usados por auth e notificações. | `auth.php:11-13`; `cron-notify.php:14-19,74-167`; `app/Modules/Email/ResendMailer.php:8-10,128-133` |
| 5 | Finance | Leitura/escrita relacional, compatibilidade KV, bootstrap e OFX. | `finance.php:13-18`; `api/data.php:4-39`; `api/finance.php:4-25` |
| 6 | Nutrition | Planos e snapshots versionados de nutrição. | `api/nutrition.php:4-42`; `app/Modules/Nutrition/NutritionPlanService.php:41-98` |
| 7 | Progress | XP, níveis, eventos e achievements. | `api/progress.php:4-25`; `api/progress-event.php:4-42` |
| 8 | Routine | Tarefas persistidas em KV e ações do assistente. | `app/Modules/Routine/RoutineService.php:9-67` |
| 9 | Subscription | Policy/repository, checkout, pagamentos e Mercado Pago. | `api/subscription-checkout.php:4-50`; `api/webhooks/mercadopago.php:4-40`; `app/Modules/Subscription/SubscriptionPolicy.php:16-108` |
| 10 | Training | Workouts, programas e sessões versionadas. | `api/training.php:4-45`; `app/Modules/Training/TrainingService.php:87-103,174-280` |

## 3. Seis rotas web

| Rota | Tela | Evidência |
|---|---|---|
| `/` | Visão geral | `frontend/src/App.tsx:105-106` |
| `/financeiro` | Financeiro | `frontend/src/App.tsx:106-107` |
| `/agenda` | Agenda | `frontend/src/App.tsx:107-108` |
| `/treinos` | Treinos | `frontend/src/App.tsx:108-109` |
| `/alimentacao` | Alimentação | `frontend/src/App.tsx:109-110` |
| `/perfil` | Perfil | `frontend/src/App.tsx:110-111` |

`*` redireciona para `/` e não é uma sétima tela (`frontend/src/App.tsx:112-113`). Os loaders repetem o mesmo mapa (`frontend/src/app/routeLoaders.ts:3-17`); o Apache reescreve os cinco caminhos nomeados para o front controller (`.htaccess:15-19`).

## 4. Trinta e cinco endpoints API/webhook

Critério: cada handler HTTP versionado em `api/` conta uma vez, independentemente de suportar mais de um verbo. O total é **35**.

| Grupo | Qtde. | Handlers | Evidência de guards/dispatch |
|---|---:|---|---|
| Assistente | 6 | `assistant.php`, `assistant-confirm.php`, `assistant-history.php`, `assistant-insights.php`, `assistant-quality.php`, `assistant-undo.php` | `api/assistant.php:10-45`; `api/assistant-history.php:10-29`; `api/assistant-quality.php:10-21` |
| Calendário | 3 | `calendar.php`, `calendar-connect.php`, `calendar-disconnect.php` | `api/calendar.php:9-40`; `api/calendar-connect.php:9-27`; `api/calendar-disconnect.php:9-30` |
| Identidade, perfil e segurança | 10 | `auth-supabase-exchange.php`, `avatar.php`, `me.php`, `mobile-session.php`, `prefs.php`, `profile.php`, `push-devices.php`, `totp-confirm.php`, `totp-disable.php`, `totp-enroll.php` | `api/auth-supabase-exchange.php:4-61`; `api/mobile-session.php:45-160`; `api/totp-enroll.php:6-33` |
| Dados, backup e importação | 4 | `data.php`, `export.php`, `import.php`, `import-ofx.php` | `api/data.php:4-39`; `api/export.php:4-30`; `api/import.php:4-48`; `api/import-ofx.php:4-32` |
| Domínios | 6 | `activity.php`, `finance.php`, `nutrition.php`, `progress.php`, `progress-event.php`, `training.php` | `api/activity.php:4-27`; `api/finance.php:4-25`; `api/nutrition.php:9-42`; `api/training.php:9-45` |
| Assinatura e pagamento | 3 | `subscription.php`, `subscription-checkout.php`, `webhooks/mercadopago.php` | `api/subscription.php:4-18`; `api/subscription-checkout.php:4-50`; `api/webhooks/mercadopago.php:10-65` |
| Operação, aquisição e telemetria | 3 | `health.php`, `marketing-event.php`, `web-vitals.php` | `api/health.php:4-39`; `api/marketing-event.php:4-45`; `api/web-vitals.php:4-50` |
| **Total** | **35** |  |  |

A disciplina de método não é uniforme: alguns handlers executam leitura/mutação sem branch explícito de `405`, por exemplo `me.php`, `export.php`, `import-ofx.php` e `finance.php` (`api/me.php:4-31`; `api/export.php:4-30`; `api/import-ofx.php:4-32`; `api/finance.php:4-25`). **Fato**, sem afirmar exploração automática.

## 5. Dados: 36 tabelas e 25 migrations

### Tabelas do schema consolidado

| Grupo | Qtde. | Tabelas | Evidência |
|---|---:|---|---|
| Identidade, segurança e operação | 10 | `users`, `register_attempts`, `totp_backup_codes`, `kv_store`, `login_attempts`, `password_reset_tokens`, `rate_hits`, `push_devices`, `mobile_sessions`, `audit_events` | `schema.sql:6-140` |
| Assinatura e financeiro | 5 | `subscriptions`, `subscription_events`, `transactions`, `accounts`, `subscription_payments` | `schema.sql:142-252` |
| Calendar | 2 | `google_calendar_tokens`, `google_calendar_events` | `schema.sql:254-292` |
| Nutrição e treino | 8 | `nutrition_plans`, `body_measurements`, `training_workouts`, `training_workout_exercises`, `training_programs`, `training_program_workouts`, `training_sessions`, `training_session_entries` | `schema.sql:294-439` |
| Assistente | 5 | `assistant_actions`, `assistant_route_cache`, `assistant_history`, `assistant_usage_daily`, `assistant_quality_daily` | `schema.sql:440-520` |
| Telemetria/marketing | 2 | `web_vitals_daily`, `marketing_events_daily` | `schema.sql:521-544` |
| Progressão/achievements | 4 | `user_progress`, `xp_events`, `achievements`, `user_achievements` | `schema.sql:219-226,545-575` |
| **Total** | **36** |  |  |

### Migrations SQL versionadas

Foram contados **25 arquivos `.sql`**; artefatos Markdown no diretório não entram nessa métrica:

1. `migrations/2026-07-06-rate-limit.sql:1`
2. `migrations/2026-07-06-subscriptions.sql:1`
3. `migrations/2026-07-06-transactions.sql:1`
4. `migrations/2026-07-08-cheque-especial.sql:1`
5. `migrations/2026-07-08-financeiro-front.sql:1`
6. `migrations/2026-07-08-grant-max-individual.sql:1`
7. `migrations/2026-07-08-parcelas.sql:1`
8. `migrations/2026-07-17-level-os-progress.sql:1`
9. `migrations/2026-07-17-password-reset.sql:1`
10. `migrations/2026-07-18-assistant-training-expansion.sql:1`
11. `migrations/2026-07-18-finance-salary-details.sql:1`
12. `migrations/2026-07-18-google-calendar-readonly.sql:1`
13. `migrations/2026-07-18-level-os-achievements.sql:1`
14. `migrations/2026-07-18-platform-hardening.sql:1`
15. `migrations/2026-07-18-subscription-mercadopago.sql:1`
16. `migrations/2026-07-19-level-os-achievements-pack.sql:1`
17. `migrations/2026-07-20-supabase-auth.sql:1`
18. `migrations/2026-07-22-ai-plan-versions.sql:1`
19. `migrations/2026-07-22-assistant-history.sql:1`
20. `migrations/2026-07-24-encrypt-totp-secrets.sql:1`
21. `migrations/2026-07-25-native-push.sql:1`
22. `migrations/2026-07-28-mobile-sessions.sql:1`
23. `migrations/2026-08-09-assistant-quality.sql:1`
24. `migrations/2026-08-22-marketing-events.sql:1`
25. `migrations/2026-08-22-web-vitals.sql:1`

O aplicador versionado aceita somente as três migrations mais recentes (`scripts/apply-migration.php:11-24`), e nenhum workflow invoca runner de migrations (`.github/workflows/deploy.yml:14-192`). **Fato.** Quais migrations chegaram ao banco é **Bloqueado por ambiente**.

### Drift entre schema e contratos

O contrato de schema possui 31 entradas, omite `push_devices`, `nutrition_plans`, `training_programs`, `training_program_workouts`, `assistant_history` e `assistant_usage_daily`, e inclui `schema_migrations`, que não aparece no `schema.sql` nem em criação versionada localizada (`config/schema-contract.php:28-640`; `schema.sql:6-575`). As tabelas omitidas possuem consumidores ativos (`api/push-devices.php:31-45`; `app/Modules/Nutrition/NutritionPlanService.php:41-98`; `app/Modules/Training/TrainingService.php:87-103,174-280`). O contrato de backup segue o subconjunto e consulta `schema_migrations` (`config/backup-contract.php:36-58,183-204`; `app/Core/DatabaseBackup.php:399-403`). **Fato:** os artefatos versionados não são isomórficos. A existência da tabela extra e o conteúdo real do backup em produção são **Bloqueado por ambiente**.

## 6. Jobs e workflows

| Artefato | Função | Estado comprovado |
|---|---|---|
| `.github/workflows/tests.yml` | PR para `master`/`workflow_call`; valida web, lint PHP/JS, suíte PHP, smoke e readiness. | `.github/workflows/tests.yml:4-104`. Não há job de `mobile/`; nenhum resultado foi executado nesta auditoria. |
| `.github/workflows/deploy.yml` | Push em `master` ou manual; chama testes, build/budget, artefato, FTPS, chunks e health. | `.github/workflows/deploy.yml:4-192`. Não aplica migration nem publica mobile. |
| `cron-notify.php` | Notificações por e-mail e backup cifrado opcional; aceita CLI ou segredo HTTP. | `cron-notify.php:24-32,74-167,180-253`. Não há trigger `schedule` versionado; scheduler real é **Bloqueado por ambiente**. |
| `scripts/backup.php` / `restore.php` | Operação CLI de backup/restore. | Não são chamados pelos workflows; contratos em `config/backup-contract.php:36-58,183-204`. Isso não prova que nunca sejam executados externamente. |
| `scripts/apply-migration.php` | Aplicação allowlisted de três migrations. | `scripts/apply-migration.php:11-24`; não integra deploy. |
| `automation/` | Artefatos de automação. | Diretório é excluído do upload (`.github/workflows/deploy.yml:69-91`) e não é chamado pelos dois workflows. Pode ter consumidor externo; não é classificado como morto. |

## 7. Dependências e integrações

| Área | Dependências/integrações observadas | Evidência | Situação |
|---|---|---|---|
| Backend | PHP 8.2 no CI, PDO, mbstring, JSON, cURL e sodium; MySQL em execução. | `.github/workflows/tests.yml:43-49`; `db.php:7-16` | Estrutura validada; runtime produtivo **Bloqueado por ambiente**. |
| Web | React 19, React Router 7, Motion, Radix, Tailwind 4, Sentry React, Supabase JS, web-vitals e Capacitor 8. | `frontend/package.json:22-64` | Build web versionado; trilha Capacitor incompleta. |
| Mobile | Expo 55, React Native 0.83, React 19.2, Supabase JS, Google Sign-In, Notifications, SecureStore e biometria. | `mobile/package.json:3-58` | Cliente separado; sem CI/deploy versionado. |
| E-mail | Resend por cURL. | `app/Modules/Email/ResendMailer.php:8-10,128-133` | Entrega/DNS/configuração **Bloqueado por ambiente**. |
| Pagamento | Mercado Pago por API fixa HTTPS. | `app/Modules/Subscription/MercadoPagoClient.php:17-100,129-171` | Controles de request existem; lifecycle e allowlist incompletos. |
| Google | OAuth/Calendar por clientes PHP. | `app/Modules/Calendar/GoogleOAuthClient.php:69-90`; `app/Modules/Calendar/GoogleCalendarClient.php:25-29` | Painel/tokens **Bloqueado por ambiente**. |
| Supabase | Auth canônico no backend + SDKs web/mobile. | `app/Modules/Auth/SupabaseAuthClient.php:31-107`; `frontend/src/auth/supabaseClient.ts:19-50` | Tenant/políticas **Bloqueado por ambiente**. |
| Observabilidade | Sentry backend/web. | `app/Core/SentryClient.php:14-57`; `frontend/src/main.tsx:20-43` | URL/query sem redaction; ativação/retention **Bloqueado por ambiente**. |
| IA | OpenAI-compatible, Gemini e providers configuráveis. | `app/Modules/Assistant/OpenAiCompatibleProvider.php:25-41`; `app/Modules/Assistant/GeminiNativeProvider.php:34-48` | Credenciais/modelos/quota **Bloqueado por ambiente**. |
| Deploy | FTPS. | `.github/workflows/deploy.yml:47-156` | Servidor e valores `FTP_*` não foram lidos. |

Somente nomes de configurações são relevantes para o mapa; nenhum valor secreto foi exposto.

## 8. Mobile separado

O mobile não é o build Capacitor da SPA. Seu entrypoint é `expo-router/entry`; o root stack contém index, login, recuperação/reset, callback e grupo autenticado (`mobile/package.json:3-14`; `mobile/src/app/_layout.tsx:21-43`). O grupo autenticado oferece cinco tabs visíveis e telas adicionais ocultas na tab bar (`mobile/src/app/(app)/_layout.tsx:99-135`). Ele reutiliza endpoints de dados, finanças, treino, nutrição, perfil, TOTP, backup, calendário, assinatura, OFX e avatar (`mobile/src/lib/api.ts:373-545`).

O token mobile é persistido em SecureStore e enviado como bearer próprio (`mobile/src/lib/api.ts:52-61,71-170`; `mobile/src/lib/secure-storage.ts:11-14`). O app registra push e envia o token para `api/push-devices.php` (`mobile/src/lib/native-push.ts:11-43`; `api/push-devices.php:31-45`), mas não foi localizado transporte backend versionado que consuma `push_devices` e entregue notificações. **Fato:** registro existe; entrega é **Bloqueado por ambiente** ou ausente desta árvore.

`mobile/app.json` referencia `../frontend/android/app/google-services.json` (`mobile/app.json:15-24`), caminho não versionado no repositório auditado. Pode ser injetado privadamente; é pré-requisito **Bloqueado por ambiente**, não prova de código morto.

## 9. Fluxos de dados principais

1. **Identidade:** senha, Google legado ou Supabase resolvem `user_id`; web mantém sessão PHP e mobile emite token opaco vinculado à versão (`auth.php:86-151`; `api/mobile-session.php:77-160`).
2. **Bootstrap web:** PHP injeta CSRF, usuário e configurações públicas; React monta providers (`frontend/scripts/build-php-shell.mjs:7-20`; `frontend/src/App.tsx:131-158`).
3. **Persistência híbrida:** `api/data.php?all=1` combina KV público limitado com sets financeiros relacionais (`api/data.php:17-38`). Perfil/preferências e tarefas ainda usam KV (`api/profile.php:10-39`; `api/prefs.php:10-31`; `app/Modules/Routine/RoutineService.php:9-31`).
4. **Financeiro:** web/mobile escrevem sets via adapter e fachadas relacionais/compatibilidade (`api/finance.php:4-25`; `finance.php:13-18`).
5. **Treino/nutrição:** snapshots e mutações vão a tabelas/planos versionados (`api/training.php:14-45`; `api/nutrition.php:14-40`).
6. **Progressão:** eventos e reconciliação atualizam XP/achievements (`api/progress-event.php:12-38`; `api/progress.php:16-21`).
7. **Assistente:** texto é roteado para domínios permitidos; ações sensíveis usam confirmação/undo e serviços de domínio (`api/assistant.php:40-45`; `api/assistant-confirm.php:25-40`; `api/assistant-undo.php:24-35`).
8. **Assinatura:** checkout cria intenção local, chama Mercado Pago e webhook assinado reconcilia pagamento/acesso; cancelamento/lifecycle não fecha o ciclo (`api/subscription-checkout.php:128-286`; `api/webhooks/mercadopago.php:98-212`).
9. **Backup do usuário:** exportação cobre KV público e quatro sets financeiros, não as 36 tabelas (`api/export.php:10-30`; `cron-notify.php:207-222`).

## 10. Legado e resíduos — somente critério forte

**Critério forte:** classificar como resíduo/incompleto exige referência quebrada, drift objetivo entre contratos, ou ausência em toda a cadeia versionada relevante. Um nome antigo, alias, fachada, diretório excluído do deploy ou código não chamado pelos workflows não basta para declarar “morto”.

| Item | Classificação | Evidência e limite |
|---|---|---|
| `prepare-capacitor.mjs` | **Fato — referência quebrada/incompleta.** | `mobile:sync` chama `node scripts/prepare-capacitor.mjs` (`frontend/package.json:18`), mas o arquivo não existe em `frontend/scripts/` no HEAD auditado. Assim, o script não é reprodutível só com esta árvore. |
| Caminho Capacitor web | **Incompleto, não morto.** | Dependências e bridges continuam no grafo (`frontend/package.json:18-28`; `frontend/src/App.tsx:25-26,142-146`), mas não há config/plataformas versionadas no alvo. Não se pode afirmar abandono. |
| Schema/backup | **Drift comprovado.** | 36 tabelas no DDL versus 31 entradas contratuais, seis tabelas ativas omitidas e `schema_migrations` extra (`schema.sql:6-575`; `config/schema-contract.php:28-640`; `config/backup-contract.php:36-58,183-204`). |
| `ORBY_*` | **Compatibilidade ativa, não resíduo morto.** | Aliases ainda são lidos por criptografia TOTP/backup (`app/Modules/Auth/TotpSecretCrypto.php:20-24`; `app/Core/BackupCrypto.php:36-79`). |
| Fachadas raiz e chaves KV antigas | **Ativas.** | `finance.php`, tarefas `tasks_v6` e sets financeiros possuem consumidores (`finance.php:13-18`; `app/Modules/Routine/RoutineService.php:9-31`; `api/data.php:17-38`). |
| `frontend/dist` | **Artefato operacional.** | É lido pelo PHP e publicado separadamente (`app/Shared/DashboardView.php:16-30`; `.github/workflows/deploy.yml:94-156`). |
| `automation/` | **Uso interno não demonstrado; morte não provada.** | Excluído do deploy e ausente dos workflows (`.github/workflows/deploy.yml:69-91`); consumidor externo continua possível. |
| Push sender | **Lacuna versionada.** | Registro de dispositivo existe (`api/push-devices.php:31-45`), mas não há consumidor de envio localizado. Não se conclui que serviço externo inexista. |
| `google-services.json` mobile | **Pré-requisito não versionado.** | Config Expo aponta para caminho ausente (`mobile/app.json:15-24`); pode ser injetado pelo ambiente. |

## 11. PWA não operacional

Há peças de PWA: `manifest.json` declara `start_url`, modo standalone e ícones (`manifest.json:2-15`); `sw.js` implementa install/activate e fetch network-first apenas sob `/assets/` (`sw.js:3-31`); páginas PHP de autenticação ligam o manifesto (`app/Shared/AuthView.php:22-32`). Porém, as entradas Vite do dashboard/landing não declaram o manifesto (`frontend/index.html:1-29`; `frontend/landing.html:1-42`) e não foi localizado registro executável `navigator.serviceWorker.register(...)` nos fontes. Portanto, **a PWA não é operacional como cadeia instalável/offline end-to-end neste HEAD**: possuir manifesto e worker sem registro não ativa o worker, e o cache implementado nem cobre a aplicação inteira. **Fato de estrutura;** comportamento de browser não foi executado.

## 12. Limites e conclusão

Não foram confirmados: estado/migrations do banco remoto, restore real, scheduler, segredos/configuração, painéis Google/Supabase/Mercado Pago/Sentry, arquivos privados de mobile, entrega push, CI verde ou deploy efetivo. Tudo isso é **Bloqueado por ambiente**.

A arquitetura é substancial e modular, mas a cadeia de release não fecha banco + web + mobile, o inventário de schema diverge dos contratos, a PWA não é operacional e a trilha Capacitor referencia script ausente. Somados aos P1 detalhados em [03 — Segurança, auth, planos e pagamentos](./03-seguranca-auth-planos-pagamentos.md), esses fatos sustentam o **NO-GO**.