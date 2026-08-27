# 08 — Plano de investigação do incidente `plan_required`

**Data:** 2026-08-26
**Escopo:** inspeção estática ponta a ponta do fluxo de adicionar renda. Nenhuma conta, sessão, banco, endpoint, build ou teste foi executado.
**Legenda:** **EXISTENTE** = comprovado no worktree; **PROPOSTA** = correção/plano ainda não implementado; **BLOQUEADO POR AMBIENTE** = exige sessão/DB/runtime.

## Resumo e limite da conclusão

**EXISTENTE:** o servidor decide o plano exclusivamente no backend e devolve 402 antes de ler o body e antes de qualquer SQL financeiro. O cliente, porém, inclui a renda localmente e fecha o modal antes do debounce/fetch. Se o POST falha, não há rollback, o draft foi descartado e a UI mantém um item fantasma. O parser conserva apenas o código textual do erro e descarta status/metadados (`frontend/src/modules/finance/IncomeForm.tsx:77-113`; `frontend/src/modules/finance/store.tsx:185-218,268-278`; `frontend/src/modules/finance/api.ts:18-24,45-54`; `api/finance.php:10-22`).

**Não é conclusão desta auditoria:** por que uma conta específica recebeu 402. O UID da sessão, snapshot de assinatura, clock e dados no DB não foram observados. As hipóteses abaixo são caminhos testáveis, não atribuição de causa.

**Regra inegociável:** `require_plan` deve permanecer; o servidor não deve aceitar `plan` enviado pelo cliente. `plan_required` é código interno de protocolo/telemetria e **nunca deve aparecer literalmente para o usuário**.

## 1. Fluxo ponta a ponta EXISTENTE

1. `FinanceScreen` abre `FinanceActionCenter`; fechar apenas altera o booleano local (`frontend/src/modules/finance/FinanceScreen.tsx:149-153,454-458`).
2. O centro obtém `fin` por `useFinance()` e passa `fin.addIncome` ao `IncomeForm`; ao reabrir, a ação inicial volta a Despesa (`frontend/src/modules/finance/FinanceActionCenter.tsx:23-30,63-68`).
3. `IncomeForm` guarda o draft somente em estado React. O efeito de reset reinicializa descrição, valor, data, conta, salário e erro (`frontend/src/modules/finance/IncomeForm.tsx:39-66`).
4. Nos modos recorrentes/CLT, `submit()` chama `onSaveIncome(...)` de forma síncrona e imediatamente chama `onCancel()`. O callback retorna `void`; não há ack a aguardar (`frontend/src/modules/finance/IncomeForm.tsx:23-30,77-113`).
5. `fin.addIncome` apenas acrescenta o objeto ao array em memória: UX otimista (`frontend/src/modules/finance/store.tsx:268-278`).
6. O efeito de sync compara snapshots, marca `syncing`, espera **500 ms**, serializa a fila e chama `saveFinanceSet` para sets alterados. Para renda, envia o array inteiro de `income_lines` (`frontend/src/modules/finance/store.tsx:185-218`).
7. `saveFinanceSet` faz `POST /api/finance.php`, cookie same-origin, CSRF em header e body `{ key, value }`. Não existe `plan` no payload (`frontend/src/modules/finance/api.ts:45-54`).
8. O backend mapeia `income_lines` a transações `income`; a policy recebe `individual` hardcoded no servidor (`finance.php:4-14`; `app/Modules/Finance/FinanceRead.php:6-11`; `api/finance.php:10-14`).

**Desvio de escopo:** renda “Avulsa” usa `onSaveVariable`/`ifood-entries`; os modos fixa, variável recorrente, temporária e CLT seguem `income_lines` (`frontend/src/modules/finance/IncomeForm.tsx:77-113`).

## 2. Guards, precedência e contrato 402

### Ordem EXISTENTE

| Ordem | Guard/etapa | Efeito | Evidência |
|---:|---|---|---|
| 1 | `require_login()` | resolve/valida identidade | `api/finance.php:10-10` |
| 2 | rate limit | pode responder 429 | `api/finance.php:11-11` |
| 3 | CSRF | pode responder 403 | `api/finance.php:12-12` |
| 4 | `require_plan($uid, 'individual')` | pode responder 402 | `api/finance.php:13-13` |
| 5 | leitura do body, máximo 4 MiB | 413 se excedido | `api/finance.php:15-20` |
| 6 | decode/validação/persistência | 400/200/500 | `api/finance.php:22-24`; `app/Modules/Finance/FinanceApi.php:13-32` |

- **EXISTENTE:** não há `require_verified_email($uid)` em `api/finance.php`. A função existe, mas este endpoint não a chama (`api/finance.php:1-25`; `auth.php:172-198`). Isso não prova bug: a política de produto precisa ser decidida.
- **EXISTENTE:** `require_plan` consulta o snapshot pelo UID, calcula plano efetivo server-side e responde 402 com `error`, `required_plan` e `current_plan` (`plan.php:51-66`; `app/Modules/Subscription/SubscriptionRepository.php:27-45`).
- **EXISTENTE:** o 402 acontece antes do body. Com login/rate/CSRF válidos e policy negada, body inválido/grande não chega a 400/413.
- **EXISTENTE:** o 402 ocorre antes de SQL financeiro, mas não antes de todo SQL: autenticação pode validar `session_version`, rate limit usa sua tabela e a policy consulta `subscriptions` (`auth.php:86-148,249-344`; `plan.php:51-66`).
- **EXISTENTE:** sem snapshot, status/plano inválido, período pago inválido/expirado e trial não vigente falham fechado para `free`; período pago igual ao instante atual ainda vale, trial igual ao instante atual não (`app/Modules/Subscription/SubscriptionPolicy.php:17-69,95-109`).

## 3. Persistência e rollback por camada

### EXISTENTE

- `finance_api_save_set` exige chave conhecida, array e no máximo 5.000 linhas; erro de persistência vira 500 (`app/Modules/Finance/FinanceApi.php:13-32`).
- `finance_save_set` é replace-total por `user_id` + `kind`: abre transação, apaga o set, insere o array completo e commita. Falha SQL faz rollback (`app/Modules/Finance/FinanceWrite.php:15-18,20-28,49-103`).
- Em um 402, nenhuma transação financeira começou; não há o que reverter no banco.
- O rollback do banco não reverte o estado React. O catch do cliente só muda status/erro (`frontend/src/modules/finance/store.tsx:199-215`).
- Sets diferentes são POSTs separados dentro de `Promise.all`; não há atomicidade entre eles. Um pode ter sido persistido enquanto o snapshot cliente não é atualizado porque outro falhou (`frontend/src/modules/finance/store.tsx:185-218`).
- Reenviar exatamente o mesmo set/client IDs tende a ser idempotente para aquele snapshot, mas replace-total é last-write-wins e pode sobrescrever edição concorrente de outra aba/dispositivo (`app/Modules/Finance/FinanceWrite.php:20-28,49-98`).

## 4. UX atual após 402

### EXISTENTE

- `readJson` tenta JSON, mas em erro lança `Error(body.error)`. Perde `response.status`, `required_plan`, `current_plan`, headers e classificação terminal/transitória (`frontend/src/modules/finance/api.ts:18-24`).
- O modal já fechou e o formulário é reinicializado quando reaberto; não há draft persistido (`frontend/src/modules/finance/IncomeForm.tsx:39-66,77-113`; `frontend/src/modules/finance/FinanceActionCenter.tsx:23-30`).
- O catch não remove a renda, não restaura snapshot e não chama `refresh()`. O item local continua alimentando totais/projeções: **item fantasma** (`frontend/src/modules/finance/store.tsx:199-215,268-278`).
- O cabeçalho exibe `Falha na sincronização: plan_required`, ou seja, vaza o código interno diretamente na interface (`frontend/src/modules/finance/FinanceScreen.tsx:117-144`).
- Em reload remoto, o provider carrega `GET /api/data.php?all=1` e substitui o estado pelo servidor; como o 402 não escreveu a renda, o fantasma desaparece se o GET concluir (`frontend/src/modules/finance/store.tsx:137-183`; `api/data.php:10-60`).
- Não existe retry automático por timer. Porém, como `persistedSets.income_lines` não foi atualizado, uma mutação financeira posterior classifica o set como dirty e reenvia o array inteiro, incluindo o fantasma (`frontend/src/modules/finance/store.tsx:185-218`).
- Se a policy continuar negando, há outro 402/rate hit. Se a policy passar antes da mutação posterior, o item antigo pode ser persistido silenciosamente. Um reload anterior remove o item e evita essa ressurreição.
- Fechar/navegar antes dos 500 ms cancela o timer; após o fetch, não há `keepalive` nem contrato de confirmação (`frontend/src/modules/finance/store.tsx:185-218`; `frontend/src/modules/finance/api.ts:45-54`).

## 5. O que está BLOQUEADO POR AMBIENTE

Não existe símbolo `session_uid` no fonte. O UID efetivo vem da sessão web/móvel e é validado contra o usuário (`auth.php:86-148`). Sem sessão descartável e DB correspondente, não é possível verificar:

- UID realmente resolvido na requisição observada;
- linha/ausência de `subscriptions`, status, trial, período e clock do servidor;
- `rate_hits`, correspondência CSRF e e-mail verificado daquele UID;
- linhas de `transactions` antes/depois;
- timing de webhook/commit/replicação fora deste recorte.

O teste-fonte do adapter documenta que, sem sessão/DB substituível, o endpoint real só alcança o 401 inicial; cenários internos usam PDO injetado e não atravessam auth/plan (`tests/cases/finance_api_adapter_test.php:9-25`). A suíte completa e o smoke foram executados e passaram; os 16 casos ambientais/concorrrentes desta seção não possuem automação equivalente e permanecem pendentes.

## 6. Seis hipóteses testáveis — sem atribuir causa à conta

| # | Hipótese | Status | Como validar com segurança |
|---:|---|---|---|
| H1 | O snapshot do UID resolvido é ausente, plano desconhecido/free ou status pago não ativo; a policy cai para `free`. | **BLOQUEADO POR AMBIENTE — DB + UID** | Correlacionar request ID opaco ao UID server-side e ler somente os campos de policy em ambiente descartável. |
| H2 | Fronteira/formato de `current_period_end`/`trial_ends_at` ou clock do servidor levou ao fail-closed. | **BLOQUEADO POR AMBIENTE — DB/clock** | Comparar epochs normalizados no mesmo servidor, cobrindo igualdade e timezone. |
| H3 | A requisição resolveu sessão/UID diferente do contexto esperado, ou a sessão mudou/expirou entre carga e POST. | **BLOQUEADO POR AMBIENTE — sessão/UID** | Logar correlação opaca + UID interno; nunca cookie, token ou CSRF. |
| H4 | Atualização legítima de assinatura ainda não estava commitada/visível para o reader no instante do POST. | **BLOQUEADO POR AMBIENTE — writer/DB** | Usar timestamps/audit IDs em staging; não inferir pela tela. |
| H5 | O 402 foi percebido como “salvou e falhou” por causa do optimistic UI, fechamento e perda de metadados. | **EXISTENTE — mecanismo confirmado** | Interceptar 402 sintético sem tocar policy/DB real. |
| H6 | Reenvio posterior ou reload explica aparição tardia/desaparecimento do item; replace-total amplia risco concorrente. | **EXISTENTE, efeito condicionado** | Registrar sequência/status/hash/IDs sintéticos; não conteúdo financeiro real. |

## 7. Matriz de 16 casos policy × UX × retry

Definições: **P1** primeiro POST 200; **P2** 402 e policy continua negando; **P3** 402 e policy passa a permitir antes da próxima tentativa; **P4** erro não-policy (401/403/429/400/413/5xx/rede). **U-S** permanece na tela; **U-L** recarrega após a primeira resposta. **R0** sem mutação posterior; **R1** com mutação financeira posterior.

| Caso | Policy | UX | Retry | Resultado no código EXISTENTE | Oracle PROPOSTO |
|---:|---|---|---|---|---|
| 01 | P1 | U-S | R0 | item local torna-se persistido; `synced` | fechar apenas após ack |
| 02 | P1 | U-S | R1 | próxima alteração envia snapshot novo | versão/revisão explícita |
| 03 | P1 | U-L | R0 | GET traz item persistido | igual |
| 04 | P1 | U-L | R1 | GET + mutação salvam conjunto | rebase antes de escrever |
| 05 | P2 | U-S | R0 | modal fechado, draft perdido, fantasma e código interno | manter draft; mensagem humana + CTA; sem fantasma |
| 06 | P2 | U-S | R1 | `income_lines` é reenviado e recebe novo 402 | 402 terminal, sem retry implícito |
| 07 | P2 | U-L | R0 | GET bem-sucedido remove fantasma | draft preservado fora do estado canônico |
| 08 | P2 | U-L | R1 | bootstrap sem fantasma; próxima mutação não o leva | igual, com revisão |
| 09 | P3 | U-S | R0 | não há retry espontâneo; fantasma permanece | CTA explícito para revalidar/tentar |
| 10 | P3 | U-S | R1 | mutação não relacionada pode persistir item antigo | jamais retry silencioso |
| 11 | P3 | U-L | R0 | reload remove item apesar de policy agora permitir | draft reabrível |
| 12 | P3 | U-L | R1 | payload novo nasce sem o item | inclusão só por ação explícita |
| 13 | P4 | U-S | R0 | fantasma + `body.error`/`Erro HTTP N` | rollback/pending + erro tipado |
| 14 | P4 | U-S | R1 | reenvio; sucesso se condição cessar | retry só para transitório e com backoff |
| 15 | P4 | U-L | R0 | item some se GET funcionar; senão tela erra | estado stale/error explícito |
| 16 | P4 | U-L | R1 | após GET válido parte do servidor; sem GET retry é inseguro | bloquear escrita até rebase |

## 8. Reprodução segura PROPOSTA

### A. Reproduzir a UX sem policy/DB real

1. Usar somente local/staging descartável, com dados sintéticos e modo remoto já inicializado.
2. Interceptar `POST **/api/finance.php` e responder 402 JSON sintético com os mesmos campos de contrato. Não capturar/imprimir cookie, CSRF ou payload real.
3. Adicionar renda com label/valor fictícios e ID único.
4. Confirmar: modal fecha; item aparece; após ~500 ms há POST com `key`/`value`, sem `plan`; cabeçalho recebe erro.
5. Não mutar: confirmar ausência de retry automático.
6. Fazer outra mutação sintética: verificar reenvio do `income_lines` com o primeiro client ID.
7. Manter 402 e recarregar: GET deve remover o fantasma se o bootstrap funcionar.

Essa etapa comprova UX/retry, não a causa do 402.

### B. Validar policy/SQL em ambiente isolado

1. Criar DB e sessão descartáveis; nunca usar identidade/conta de produção.
2. Preparar snapshots: sem row, active/individual válido, status não ativo, data inválida/expirada, trial futuro e trial expirado.
3. Registrar somente status, código, UID sintético e contagens/hashes antes/depois.
4. Sob policy negada, enviar body inválido para confirmar precedência 402; sob policy permitida, confirmar 400. Testar 413 somente no ambiente descartável.
5. Confirmar que 402 não altera `transactions`, sem alegar ausência de SQL de auth/rate/policy.
6. Se a decisão de produto exigir, repetir com e-mail verificado/não verificado para documentar a policy desejada.

## 9. Correção PROPOSTA — sem enfraquecer autorização

### 9.1 Gate e fluxo visual

- **Manter** `require_plan($uid, 'individual')` antes de body/escrita.
- **Nunca** enviar/aceitar `plan` do cliente como autorização; `current_plan` serve apenas para UX.
- Enquanto assinatura está `loading/error`, deixar dados já carregados em **read-only fail-closed**; desabilitar Adicionar/Editar/Excluir/Importar com retry e explicação humana.
- Para criação explícita, preferir fluxo **pessimista**: o modal fica aberto, botão mostra `isSubmitting`, só fecha e injeta item canônico após 200. Alternativa aceitável: item otimista marcado `pending`, excluído de totais, com rollback garantido.

### 9.2 Draft, erro e CTA

- Persistir draft por usuário/ação em `sessionStorage`, com expiração; limpar somente após sucesso/cancelamento explícito.
- `addIncome` deve retornar Promise/resultado tipado.
- Criar `ApiError { status, code, body, retryAfter, requestId }`; preservar 402 e metadados, mas mapear para texto humano: “Seu plano atual não permite salvar alterações. Revise o plano ou continue em modo leitura.”
- CTA: **“Ver planos”** e, se a policy puder ter mudado, **“Verificar acesso novamente”**. O texto interno `plan_required` fica apenas em log/telemetria redigida.
- Em 401/403/402, não fazer retry automático; 429 respeita `Retry-After`; somente rede/5xx recebem retry limitado e visível.

### 9.3 Contrato, idempotência e concorrência

- Adotar `clientMutationId`/client ID estável por draft. O servidor deve deduplicar o mesmo ID para o mesmo usuário.
- Preferir endpoint granular de create/update/delete. Se replace-total continuar, exigir `revision`/ETag (`If-Match`) e retornar 409 em conflito; cliente recarrega/rebaseia antes de tentar de novo.
- Atualizar snapshot por POST bem-sucedido individual, sem perder sucessos parciais de `Promise.all`, ou tornar a operação multi-set atômica no servidor.
- Não usar mutação não relacionada como retry implícito.

### 9.4 E-mail verificado

**Decisão de produto necessária:** escrita financeira exige e-mail verificado? Se sim, adicionar `require_verified_email($uid)` no servidor em ordem documentada e cobrir os 16 cenários; se não, documentar explicitamente a exceção. Nunca confiar em flag do cliente.

## 10. Critérios de aceite PROPOSTOS

- Somente 200 transforma draft em renda canônica e fecha o modal.
- 402 não altera totais/listas, preserva draft e mostra mensagem humana + CTA; código interno não é renderizado.
- Reload não é necessário para reconciliar erro.
- Nenhum retry de 401/403/402 ocorre por outra mutação.
- Retry de rede/5xx é idempotente por client ID e respeita revisão.
- Conflito entre abas retorna 409, não sobrescreve silenciosamente.
- A suíte cobre os 16 casos, fronteiras temporais, body inválido sob 402, replay, reload e decisão sobre e-mail.

O defeito acionável demonstrado é o contrato assíncrono cliente: “Adicionar” hoje significa “inserir localmente”, não “persistência confirmada”. A causa concreta de um 402 de uma conta permanece **BLOQUEADA POR AMBIENTE**.