# Segurança, autenticação, planos e pagamentos

## Controle e veredito

| Campo | Valor |
|---|---|
| Data | `2026-08-26` |
| Branch / HEAD | `feature/ai-agent-guardrails` / `e600c0e` |
| Worktree na abertura | Sujo por alterações preexistentes em `app/Modules/Email/EmailTemplates.php` e `tests/cases/resend_mailer_test.php`; preservadas. |
| Decisão | **NO-GO para produção** |
| Prioridade | **P0=0; múltiplos P1** |
| Método | Inspeção estática de código, schema, migrations, testes e workflows; sem usar README/ROADMAP/comentários como prova. A bateria local posterior passou e está registrada em `12-validacoes-residuos-limitacoes.md`; não cobre os P1 sem regressão específica. |

**Legenda:** **Fato** = comportamento demonstrado no artefato atual; **Hipótese** = impacto que exige condição adicional; **Bloqueado por ambiente** = depende de banco/configuração/provedor/infraestrutura não observável no repositório. Nenhum segredo é reproduzido.

## 1. Matriz de identidade: senha, Google e Supabase

| Caminho/estado | Regra executável | Sessão, e-mail, trial e MFA | Avaliação |
|---|---|---|---|
| Cadastro local com senha | CSRF; username 3–64; e-mail válido; senha com mínimo de 10 e classes; `password_hash`; token de verificação persistido como hash (`register.php:10-62`). | Cria assinatura com trial de 30 dias, mas login é negado enquanto o e-mail não for confirmado (`register.php:46-62`; `auth.php:446-451`). | **Conforme em credencial/verificação.** Rate limit tem bypass para identidades únicas, detalhado abaixo. |
| Login local | Busca username/e-mail, exige hash não nulo e `password_verify`; falha alimenta lockout por IP (`auth.php:430-458`). | Sem TOTP conclui login; com TOTP cria desafio vinculado a `session_version` (`auth.php:390-400,461-484`). | **Fato:** conta passwordless não entra por senha. |
| Conta legada sem e-mail | Login só bloqueia e-mail quando ele existe e não foi verificado (`auth.php:446-451`). | `require_verified_email` exige e-mail presente + timestamp e bloqueia operações sensíveis (`auth.php:172-198`). | **Fato:** login e autorização sensível têm critérios distintos, de forma defensiva. |
| Verificação de e-mail | Token recebido é convertido em hash; registro válido/não usado é atualizado e limpo em transação (`verify-email.php:8-37`). | Define `email_verified_at`; expirado/usado falha. | **Conforme.** |
| Google legado — usuário existente | Callback consome `state`, troca código no servidor, exige `email_verified` do Google e procura por `google_id`, depois e-mail (`auth-google-callback.php:31-116`). | Se TOTP local está ativo, encaminha ao desafio (`auth-google-callback.php:141-147`). | **Fato:** vinculação automática por e-mail existe; política real do cliente Google é **Bloqueado por ambiente**. |
| Google legado — usuário novo | Insere somente `users`, com `sessionVersion=1`, sem inserir `subscriptions` (`auth-google-callback.php:118-139`). | Sem row de assinatura, policy retorna `free` (`app/Modules/Subscription/SubscriptionPolicy.php:35-39`). | **P1 — Fato:** Google legado não concede trial, divergindo do cadastro local e Supabase. |
| Supabase — validação | Cliente backend consulta Auth, confere identidade canônica, `sub`, issuer, audience, expiração e fator TOTP verificado (`app/Modules/Auth/SupabaseAuthClient.php:31-107`). | Identidade exige e-mail verificado; resolução por subject; colisão por e-mail exige link explícito (`app/Modules/Auth/SupabaseIdentityService.php:14-31`). | **Conforme:** reduz account takeover por payload forjado/auto-link silencioso. |
| Supabase — usuário novo | Cria usuário passwordless e assinatura trial (`app/Modules/Auth/SupabaseIdentityService.php:33-49`). | Exchange exige AAL2 quando o provedor informa TOTP verificado; TOTP local gera desafio; TOTP gerenciado+AAL2 aposenta o legado (`api/auth-supabase-exchange.php:27-48`). | **Conforme no AAL; P1** porque aposentadoria do fator não incrementa versão de sessão (`app/Modules/Auth/SupabaseIdentityService.php:89-106`). |

## 2. Sessão web/mobile, CSRF e e-mail verificado

| Canal/controle | Estado atual | Conformidade | Falha/limite |
|---|---|---|---|
| Sessão web local | Cookie lifetime 0, HttpOnly, SameSite=Lax, strict mode; `Secure` depende de `$_SERVER['HTTPS']` (`auth.php:18-36`). ID é regenerado no login/estágio MFA (`auth.php:390-400,461-484`). | Idle padrão de 12 h, configurável entre 15 min e 7 dias; cada request compara `users.session_version` (`auth.php:113-169`). | Propagação HTTPS por proxy e GC de sessão são **Bloqueado por ambiente**. Mudanças de MFA não usam a revogação disponível. |
| Sessão web Supabase | Após validação, cria a mesma sessão PHP e registra provider/expiração (`api/auth-supabase-exchange.php:27-61`; `auth.php:486-489`). | Além de idle/versão, invalida quando `supabase_expires_at` vence (`auth.php:95-106`). | Aposentadoria do TOTP legado não dá bump de versão. |
| Sessão mobile | Token aleatório opaco; banco armazena SHA-256; autorização exige não revogado, não expirado e versão igual (`app/Modules/Auth/MobileSessionService.php:13-16,41-57`). | Logout revoga; reset de senha invalida pela versão; app guarda em SecureStore (`app/Modules/Auth/MobileSessionService.php:99-142`; `mobile/src/lib/secure-storage.ts:11-14`). | **P1:** TTL absoluto de 30 dias e nenhum idle server-side; `last_used_at` não participa da decisão (`app/Modules/Auth/MobileSessionService.php:4-5,63-68`). |
| CSRF web | 32 bytes aleatórios na sessão, comparação `hash_equals`, header/forms (`auth.php:209-243`). | Checkout, TOTP e mutações sensíveis exigem token. SameSite=Lax é camada adicional. | Nenhuma falha geral de CSRF foi comprovada. |
| CSRF mobile | `require_csrf` dispensa CSRF apenas quando token mobile válido está presente (`auth.php:216-233`). Bootstrap nativo pode dispensar CSRF, mas ainda exige Supabase/senha (`api/mobile-session.php:95-136`). | Coerente com modelo bearer, sem cookie automático. | Roubo do bearer mantém a janela de 30 dias sem idle. |
| E-mail verificado | Guard exige e-mail não vazio e timestamp (`auth.php:172-198`). | TOTP, checkout e ações sensíveis usam o guard (`api/totp-enroll.php:8-16`; `api/subscription-checkout.php:11-14`). | Configuração de entrega/links é **Bloqueado por ambiente**. |
| Webhook Mercado Pago | Não usa sessão/CSRF de usuário; usa POST JSON limitado, HMAC e reconsulta ao provedor (`api/webhooks/mercadopago.php:10-60`). | Separação correta para callback server-to-server. | Lifecycle após autenticação do evento é incompleto. |

## 3. TOTP: matriz de regras e transições

| Estado inicial | Ação | Estado produzido pelo código | Resultado |
|---|---|---|---|
| Sem TOTP | `POST /api/totp-enroll.php` com sessão, e-mail verificado, rate limit e CSRF | Gera/substitui segredo e grava `totp_enabled=0` (`api/totp-enroll.php:8-16,27-33`). | Fluxo pode seguir para confirmação. |
| TOTP já ativo | Novo enrollment | O mesmo update substitui o segredo e desativa o fator vigente **antes** de validar o novo (`api/totp-enroll.php:27-33`). | **P1 — Fato:** existe janela de downgrade/lockout; fator anterior não é preservado até commit do novo. |
| Enrollment pendente | `POST /api/totp-confirm.php` com código válido | Valida código, ativa TOTP, gera backup codes e persiste hashes (`api/totp-confirm.php:8-16,39-63`). | **Conforme no happy path.** Backup codes são mostrados uma vez. |
| TOTP ativo + conta com senha | Disable | Se `password_hash !== null`, exige senha válida; então apaga segredo/codes (`api/totp-disable.php:27-40`). | Step-up por senha existe para conta local. |
| TOTP ativo + conta passwordless | Disable | A condição de senha é ignorada quando `password_hash` é `NULL`; sessão+CSRF+e-mail bastam (`api/totp-disable.php:7-15,27-40`). | **P1 — Fato:** sem TOTP atual, AAL2, recent-auth ou reautenticação do provedor. |
| TOTP local + Supabase TOTP/AAL2 | Exchange | Fator legado é aposentado (`api/auth-supabase-exchange.php:35-48`; `app/Modules/Auth/SupabaseIdentityService.php:89-106`). | Migração de MFA é razoável, mas não revoga sessões existentes. |
| Login com TOTP | Código de 6 dígitos | Janela de ±1 passo de 30 s (`totp.php:51-61`). | **Conforme** para tolerância temporal básica. |
| Login com recovery code | Código não usado | Busca todos os códigos `used_at IS NULL`, verifica hash fora de lock/transação e faz update por `id` (`auth.php:539-590`). | **P1 — Fato:** consumo não atômico; duplo sucesso exige corrida concorrente e é **Hipótese**. |
| Qualquer mudança/aposentadoria de MFA | Enroll, confirm, disable ou retire legacy | Nenhum desses caminhos incrementa `session_version` (`api/totp-enroll.php:27-33`; `api/totp-confirm.php:50-60`; `api/totp-disable.php:37-40`; `app/Modules/Auth/SupabaseIdentityService.php:89-106`). | **P1 — Fato:** sessões existentes sobrevivem à mudança do fator; abuso de sessão roubada é **Hipótese**. |

O mecanismo de revogação existe e funciona em outros fluxos: sessão web e mobile verificam a versão, e reset de senha a incrementa (`auth.php:129-151,773-805`; `app/Modules/Auth/MobileSessionService.php:41-57`). Portanto, a ausência em MFA é lacuna específica, não impossibilidade arquitetural.

## 4. Cadastro e rate limit

`register.php` consulta lockout no início, mas só chama `record_register_attempt()` quando username/e-mail já existe (`register.php:10-18,39-44`). Cadastro válido com identidade nova cria usuário/trial e chama `reset_attempts()` (`register.php:46-62,90-96`), que limpa `login_attempts`, não `register_attempts` (`auth.php:370-374`). Validações inválidas também não incrementam o contador. O contador de cadastro existe (`auth.php:596-617`), mas uma sequência de identidades sempre únicas não o alimenta.

**Classificação: P1 — Fato.** CSRF e unique constraints protegem outras propriedades; não substituem rate limit antiabuso. Volume efetivo, WAF/CDN e criação de contas em produção são **Bloqueado por ambiente**.

## 5. Dados no cliente e Sentry

| Superfície | Fato observado | Certeza/risco |
|---|---|---|
| Finanças no browser | Fallback serializa o estado financeiro inteiro em `localStorage` quando o backend do módulo está desabilitado (`frontend/src/modules/finance/store.tsx:95-117,136-164`). | **P1 — Fato condicional:** o caminho existe. Se ele é alcançável no deploy é **Bloqueado por ambiente**; leitura por XSS/extensão/browser compartilhado é **Hipótese**. |
| Treino/medidas | Fallback persiste treino, medidas e sessões em `localStorage` (`frontend/src/modules/training/store.tsx:28-46`). | Mesma classificação; dados pessoais permanecem acessíveis a script na origem enquanto existirem. |
| Mitigação de cache | Boot autenticado remove chaves legadas/por conta; perfil atual fica em memória (`frontend/src/lib/userStorage.ts:7-26,44-67`; `frontend/src/main.tsx:10-17`; `frontend/src/modules/profile/storage.ts:25-49`). | **Fato positivo**, mas limpeza posterior não elimina exposição durante a vida do cache fallback. |
| Supabase web | Sessão atual usa `sessionStorage`; verificador PKCE fica em `localStorage`; tokens legados são removidos (`frontend/src/auth/supabaseClient.ts:19-50`). | **Fato positivo:** não foi observado bearer Supabase atual persistido no mesmo fallback financeiro. |
| Sentry backend | Se configurado, monta `request.url` com `HTTP_HOST + REQUEST_URI`; query faz parte de `REQUEST_URI`; não há redaction antes do envio (`app/Core/SentryClient.php:14-57`). | **P1 — Fato condicional:** construção sem filtro existe. `SENTRY_DSN` ativo/evento real são **Bloqueado por ambiente**. |
| Sentry frontend | SDK inicializa sem `beforeSend`/redaction (`frontend/src/main.tsx:20-43`). | Ausência de filtro é **Fato**; campos automáticos exatos dependem da versão/runtime e são **Hipótese**. |

## 6. Planos e estados

O schema permite somente `plan ∈ {free, individual}` e `status ∈ {active, canceled, past_due}`; `current_period_end` e `trial_ends_at` são nullable (`schema.sql:143-152`). **Trial e lifetime não são estados persistidos:** trial é derivado de data; lifetime é semântica implícita de `current_period_end=NULL`.

| Row/estado persistido | Plano efetivo atual | Avaliação |
|---|---|---|
| Sem row em `subscriptions` | `free` (`app/Modules/Subscription/SubscriptionPolicy.php:35-39`). | Default fechado. É o resultado do Google legado novo. |
| `free` + trial futuro | `individual`, `paid_access=false` (`app/Modules/Subscription/SubscriptionPolicy.php:35-45,95-100`). | Trial esperado. |
| Qualquer plan/status + trial futuro sem paid access | `individual`; `isInTrialAt()` só olha a data (`app/Modules/Subscription/SubscriptionPolicy.php:35-45,95-100`). | **P1 — Fato:** `canceled`, `past_due` e valores inesperados com trial futuro recebem acesso. |
| `individual + active` + período futuro ou igual ao instante | `individual` (`app/Modules/Subscription/SubscriptionPolicy.php:102-108`). | Paid access esperado. |
| `individual + active` + período passado/inválido | `free`, salvo trial futuro. | Expiração por leitura existe. |
| `individual + active + current_period_end=NULL` | `individual` sem expiração (`app/Modules/Subscription/SubscriptionPolicy.php:102-108`; `tests/cases/subscription_module_test.php:108-120`). | **P1 — Fato:** “lifetime” implícito sem tipo, origem ou lifecycle próprios. |
| `individual + canceled/past_due` sem trial | `free`. | Fail closed no status. |
| Plano/status desconhecido sem trial | `free`. | Fail closed; trial futuro ainda suplanta o status. |

### Grant excepcional

`migrations/2026-07-08-grant-max-individual.sql` faz UPSERT de `user_id=1` para `individual/active` até `2027-01-01` (`migrations/2026-07-08-grant-max-individual.sql:10-15`). **P1 — Fato no artefato:** identidade hardcoded e concessão temporal excepcional. Se foi aplicada e a quem corresponde `user_id=1` são **Bloqueado por ambiente**; o workflow exclui migrations e não as aplica (`.github/workflows/deploy.yml:69-93,109-128`).

## 7. Checkout Mercado Pago

| Etapa | Regra atual | Avaliação |
|---|---|---|
| Entrada | Login e e-mail verificado; POST tem rate limit e CSRF (`api/subscription-checkout.php:11-14,70-78`). | **Conforme.** |
| Oferta | Método estrito Pix/cartão; plano/preço vêm do servidor (`api/subscription-checkout.php:80-126`). | **Conforme:** cliente não define entitlement/preço. |
| Intenção | Cria intenção local antes da chamada externa, trava row do usuário e reutiliza referência/idempotency key (`api/subscription-checkout.php:128-178`). | **Conforme.** |
| Cliente externo | API base fixa HTTPS, TLS verificado e timeout (`app/Modules/Subscription/MercadoPagoClient.php:17-100,129-171`). | **Conforme no transporte versionado.** |
| Callback/retorno | `APP_URL` forma callbacks; não deriva de `HTTP_HOST` da request (`api/subscription-checkout.php:118-124`). | **Fato positivo.** Valor real de `APP_URL` é **Bloqueado por ambiente**. |
| URL de checkout | Resposta do provedor é aceita se tiver HTTPS, host e tamanho válido (`api/subscription-checkout.php:219-231`). | **Falha:** host sem allowlist Mercado Pago. Ausência é **Fato**; phishing/redirecionamento exige resposta/cadeia maliciosa e é **Hipótese**. |
| Finalização | Trava por `id + user_id + provider` e confere referência (`api/subscription-checkout.php:244-286`). | **Conforme multiusuário.** |

## 8. Webhook, lifecycle e multiusuário

### Webhook e concessão

1. Aceita apenas POST JSON limitado, extrai `data.id`, rejeita divergência body/query e verifica assinatura (`api/webhooks/mercadopago.php:10-60`). O contrato testa HMAC inválido e janela de replay de 600 s (`tests/cases/mercadopago_webhook_signature_test.php:8-46`).
2. Reconsulta o recurso no Mercado Pago e fixa environment, application e collector configurados (`api/webhooks/mercadopago.php:98-117,131-212`).
3. Para conceder, exige pagamento aprovado, moeda/valor/método compatíveis (`api/webhooks/mercadopago.php:174-212`).
4. Resolve `user_id` pela intenção persistida, não pelo payload externo; usa locks, referência, deduplicação por evento/payment ID e escopo local (`app/Modules/Subscription/SubscriptionPaymentService.php:38-165`).
5. Schema reforça FKs e unicidade, e repository lê assinatura somente pelo usuário (`schema.sql:153-165,227-251`; `app/Modules/Subscription/SubscriptionRepository.php:25-42`).

Esses são **Fatos conformes** de autenticação do webhook, idempotência e isolamento multiusuário no happy path.

### Lifecycle incompleto

Eventos de `subscription_preapproval` chamam `subscription_record_provider_status()` (`api/webhooks/mercadopago.php:131-143`). Essa função atualiza `subscription_payments` e, em cancelamento, muda apenas pagamento ainda `pending` para `cancelled`; ela não escreve `subscriptions.status` nem `current_period_end` (`app/Modules/Subscription/SubscriptionPaymentService.php:174-197`). Pagamentos não aprovados seguem o mesmo caminho (`api/webhooks/mercadopago.php:181-185`). Não foi localizado endpoint/job versionado que traduza cancelamento, pause, `past_due`, refund ou chargeback em entitlement.

**P1 — Fato:** o ciclo provedor → pagamento → assinatura não é fechado. A policy ainda expira rows com data passada, mas `active + NULL` pode permanecer indefinidamente. Status reais no provedor/banco são **Bloqueado por ambiente**.

Há também divergência de vocabulário: `subscriptions.status` usa `canceled`, enquanto `subscription_payments.status` usa `cancelled` (`schema.sql:145,237`). A divergência isolada não prova defeito, mas não foi localizada camada completa que a traduza em lifecycle.

## 9. Registro consolidado de falhas

| ID | Pri. | Certeza | Achado | Evidência principal |
|---|---:|---|---|---|
| AUTH-01 | P1 | **Fato** | Enrollment TOTP desativa/substitui fator vigente antes da confirmação. | `api/totp-enroll.php:27-33` |
| AUTH-02 | P1 | **Fato** | Disable TOTP de conta passwordless não exige step-up. | `api/totp-disable.php:27-40` |
| AUTH-03 | P1 | **Fato** | Mudanças/aposentadoria de MFA não incrementam `session_version`. | `api/totp-confirm.php:50-60`; `app/Modules/Auth/SupabaseIdentityService.php:89-106` |
| AUTH-04 | P1 | **Fato**; replay é **Hipótese** | Recovery code não é consumido atomicamente. | `auth.php:539-590` |
| AUTH-05 | P1 | **Fato** | Token mobile vale 30 dias sem idle server-side. | `app/Modules/Auth/MobileSessionService.php:4-5,41-68` |
| AUTH-06 | P1 | **Fato** | Cadastro com identidades únicas não conta rate limit. | `register.php:10-18,39-62`; `auth.php:596-617` |
| AUTH-07 | P1 | **Fato** | Google legado cria usuário sem trial. | `auth-google-callback.php:118-139`; `app/Modules/Subscription/SubscriptionPolicy.php:35-39` |
| DATA-01 | P1 | **Fato condicional** | Fallbacks guardam finanças e treino/medidas em `localStorage`. | `frontend/src/modules/finance/store.tsx:95-117,136-164`; `frontend/src/modules/training/store.tsx:28-46` |
| OBS-01 | P1 | **Fato condicional** | Sentry backend inclui URL/query sem redaction; frontend não configura filtro. | `app/Core/SentryClient.php:14-57`; `frontend/src/main.tsx:20-43` |
| SUB-01 | P1 | **Fato** | Trial ignora `status` e `plan`. | `app/Modules/Subscription/SubscriptionPolicy.php:35-45,95-100` |
| SUB-02 | P1 | **Fato** | Lifetime é implícito por `current_period_end=NULL`. | `app/Modules/Subscription/SubscriptionPolicy.php:102-108`; `tests/cases/subscription_module_test.php:108-120` |
| SUB-03 | P1 | **Fato no artefato**; aplicação **Bloqueado por ambiente** | Grant hardcoded `user_id=1` até 2027. | `migrations/2026-07-08-grant-max-individual.sql:10-15` |
| SUB-04 | P1 | **Fato** | Lifecycle de cancelamento/past_due/refund não atualiza entitlement. | `api/webhooks/mercadopago.php:131-143,181-185`; `app/Modules/Subscription/SubscriptionPaymentService.php:174-197` |
| PAY-01 | P2 | **Fato**; exploração é **Hipótese** | URL de checkout aceita host HTTPS sem allowlist. | `api/subscription-checkout.php:219-231` |

Não há P0 comprovado. A soma e interação dos P1 mantém o release em **NO-GO**.

## 10. Conformidades que devem ser preservadas

- Hash de senha e de tokens de verificação/reset; reset transacional com `FOR UPDATE` e bump de versão (`auth.php:773-805`).
- Regeneração de sessão, idle web, logout e validação contínua de `session_version` (`auth.php:67-84,113-169,390-400`).
- CSRF centralizado e e-mail verificado em operações sensíveis (`auth.php:172-243`; `tests/cases/production_security_contract_test.php:7-39`).
- Validação canônica Supabase e exigência de AAL2 (`app/Modules/Auth/SupabaseAuthClient.php:31-107`; `api/auth-supabase-exchange.php:27-48`).
- Segredo TOTP criptografado/contextualizado segundo contrato e backup codes com hash (`tests/cases/totp_secret_crypto_test.php:8-23`; `api/totp-confirm.php:50-63`).
- Token mobile com hash no servidor, SecureStore, revogação e vínculo à versão (`tests/cases/mobile_session_sync_contract_test.php:8-70`).
- Checkout idempotente/user-bound e webhook assinado, reconsultado e fixado ao recebedor (`tests/cases/mercadopago_integration_contract_test.php:8-57`; `api/webhooks/mercadopago.php:98-117`).

Esses controles são necessários, mas não neutralizam as falhas registradas.

## 11. Bloqueado por ambiente e limites

1. **Banco:** migrations aplicadas, existência/uso do grant `user_id=1`, rows `active + NULL`, trials/status atuais e divergência do schema implantado.
2. **Auth externo:** políticas, redirects, fatores e rate limits reais do Supabase/Google.
3. **Mercado Pago:** credenciais, webhook cadastrado, mandatos, chargebacks/refunds e estados remotos.
4. **Sentry:** ativação de `SENTRY_DSN`, retenção/redaction do projeto e eventos já enviados.
5. **Infra:** HTTPS percebido pelo PHP, WAF/rate limit externo, política de sessão e scheduler.
6. **Execução:** testes e workflows existentes não foram rodados; status verde deste HEAD não foi inferido.

Apenas nomes de configurações foram considerados; nenhum valor secreto foi lido ou exposto. Nenhuma correção foi implementada. A conclusão desta trilha permanece **NO-GO** até que os P1 sejam removidos e demonstrados por regressão e validação ambiental.