# 04 — Domínios e regras de negócio

**Data da auditoria:** 2026-08-26
**Escopo:** worktree atual de `marketing-launch`, branch `feature/ai-agent-guardrails`, HEAD `e600c0eb8e8e4fe417fdfb4a6b82f53e9a5d300d`.
**Método:** conclusões por leitura estática de código, schema, testes e workflows; nenhum README foi usado como prova. Depois da inspeção, os gates web/PHP e testes direcionados foram executados com sucesso; resultados e lacunas estão em [12](./12-validacoes-residuos-limitacoes.md). Nenhum ambiente autenticado/provedor foi consultado.
**Legenda:** **C** conforme; **P** parcial; **NC** não conforme; **B** bloqueado por ambiente. “Esperado” significa a invariante necessária para consistência do domínio, não uma funcionalidade prometida fora do código.

## Síntese executiva

O produto combina modelos relacionais, snapshots JSON e regras derivadas no cliente. Finanças persiste quatro conjuntos relacionais por substituição integral, mas operações de negócio que atravessam conjuntos/KV não são atômicas e não existe ledger. Rotina permanece em um único documento `tasks_v6`; o cliente web concede XP antes de confirmar o save e não revoga ao reabrir. Calendar é read-only, cifra tokens/eventos e coordena cache/lease/sync, porém o mobile navega por GET para um endpoint POST. Treino aplica ownership e limites, mas retries sem `id` podem duplicar medidas/sessões e o delete ocorre antes do revoke de XP. Nutrição tem preview, versões, histórico e undo com tolerância orçamentária de ±10%, sem opção `keep` e sem safety nutricional. Progressão calcula XP no servidor, porém aceita uma `ref` de Rotina/Treino criada pelo cliente e mantém conquistas monotônicas após revoke.

## Matriz transversal de regras e invariantes

| Invariante esperada | Estado real no worktree | Avaliação | Evidência inspecionada |
|---|---|---:|---|
| Todo dado multiusuário deve ser isolado por owner | Consultas principais usam `user_id`; KV usa PK `(user_id,data_key)`; Calendar, Treino, Nutrição e Progressão filtram owner | C no código de aplicação; FKs compostas ainda têm lacunas, tratadas no relatório 05 | `schema.sql:54-61`, `schema.sql:167-217`, `schema.sql:254-438`, `TrainingService.php:107-191`, `TrainingService.php:379-395`, `NutritionPlanService.php:41-54` |
| Ação composta deve confirmar tudo ou nada | Há transação por snapshot/sessão/plano, mas não entre requests, sets financeiros, KV auxiliar e alguns efeitos de XP | NC na composição | `FinanceWrite.php:15-103`, `frontend/src/modules/finance/store.tsx:147-230`, `AssistantActionExecutor.php:205-306`, `TrainingService.php:491-526` |
| Dinheiro deve ter representação canônica única | Relacional usa colunas `_cents`, mas mantém DECIMAL dual-write, devolve `float` e OFX parseia `float`; KV auxiliar é JSON opaco | P | `FinanceRead.php:13-42`, `FinanceWrite.php:34-91`, `schema.sql:167-217`, `ofx.php:39-55`, `FinanceAuxiliaryKv.php:15-32` |
| Retry de create deve ser idempotente | XP deduplica por `ref`; snapshots substituem; Treino cria novo ID se o cliente não manda um | P/NC | `ProgressService.php:286-331`, `TrainingService.php:20-26`, `TrainingService.php:446-506` |
| Undo/delete deve remover efeitos derivados | Treino tenta revogar XP; Rotina web e remoção financeira normal não revogam; conquistas são monotônicas | NC | `AppContext.tsx:159-181`, `FinanceWrite.php:19-25`, `FinanceWrite.php:49-97`, `TrainingService.php:518-526`, `ProgressService.php:336-365` |
| Datas devem compartilhar timezone/relógio | Backend declara São Paulo para negócio e UTC para persistência; web usa local; mobile usa `toISOString()` UTC; algumas validações usam UTC | NC entre canais | `app/Core/Clock.php:4-29`, `RoutineService.php:36-46`, `routine/selectors.ts:3-36`, `mobile/src/app/(app)/routine.tsx:27-30` |
| Regras críticas devem estar cobertas no CI dos clientes | CI cobre frontend web e backend; não há job do app `mobile` | P | `.github/workflows/tests.yml:11-91` |

## Finanças

### Quatro sets relacionais e KV auxiliar

| Contrato público | Persistência | Escrita real | Observação |
|---|---|---|---|
| `expense_lines_v4` | `transactions.kind='expense'` | `DELETE` do snapshot do usuário/tipo e `INSERT` de todas as linhas | `FinanceRead.php:6-11`; `FinanceWrite.php:49-66` |
| `income_lines` | `transactions.kind='income'` | Mesmo padrão; serializa `salaryDetails` até 16 KiB | `FinanceWrite.php:67-82` |
| `ifood-entries` | `transactions.kind='income_var'` | Mesmo padrão | `FinanceWrite.php:83-91` |
| `accounts_v2` | `accounts` | `DELETE` por usuário e reinserção integral | `FinanceWrite.php:28-48` |

Cada chamada abre transação própria quando não herda uma, fazendo commit/rollback do set isolado (`FinanceWrite.php:15-17`, `FinanceWrite.php:98-103`). O frontend, porém, detecta vários snapshots alterados e chama `Promise.all` para requests independentes; auxiliares usam outra fila/debounce (`frontend/src/modules/finance/store.tsx:147-230`). Logo, a substituição é atômica **por set**, não por ação de negócio.

O whitelist auxiliar contém oito chaves: `vaults`, `transfers`, `budget_goals`, `custom_categories`, `anomaly_dismissed`, `income_meta`, `acc_view` e `bank_favorites`; todas são JSON em `kv_store`, sem schema relacional (`FinanceAuxiliaryKv.php:15-32`). O store React atual sincroniza explicitamente apenas `transfers` e `bank_favorites`, embora carregue `vaults` (`frontend/src/modules/finance/store.tsx:120-134`, `frontend/src/modules/finance/store.tsx:198-230`).

### Matriz de regras financeiras

| Invariante esperada | Real | Avaliação | Evidência |
|---|---|---:|---|
| Snapshot de cada set deve ser transacional | `BEGIN` → `DELETE` → `INSERT*` → `COMMIT`, com rollback em exceção | C por set | `FinanceWrite.php:15-103`; teste estrutural/happy path em `tests/cases/finance_save_set_test.php:65-123` |
| Despesa/transferência deve atualizar todos os recursos atomicamente | Despesa altera `expense` + `accounts`; transferência altera `accounts` + KV `transfers`, por saves separados | NC | `frontend/src/modules/finance/store.tsx:308-356`; `AssistantActionExecutor.php:205-306`; `api/finance.php:10-25`; `api/data.php:61-86` |
| Deve existir ledger reconciliável e imutável | `transactions` é snapshot corrente apagado/reinserido; não foi localizado `ledger`/`journal`; transferência não é tabela | NC | `schema.sql:167-217`; `FinanceWrite.php:49-97`; `config/schema-contract.php:12-17`; `tests/cases/backup_recovery_test.php:267-269` |
| Cents deve ser canônico sem float decisório | Conversão textual evita float e `_cents` é lido primeiro; API pública volta a float, DECIMAL permanece e OFX usa cast float | P | `FinanceRead.php:13-42`, `FinanceRead.php:52-66`, `FinanceWrite.php:34-91`, `ofx.php:39-52` |
| Auxiliares devem ter validação de domínio | Há allowlist de chaves, mas o valor é JSON opaco | P | `FinanceAuxiliaryKv.php:15-32`; `api/data.php:61-86` |
| Transferência deve ser entidade única, reconciliável e vinculada a contas | Registro em KV + alteração de dois saldos; sem lançamento débito/crédito e sem FK | NC | `frontend/src/modules/finance/store.tsx:327-356`; `AssistantActionExecutor.php:272-306` |
| Cofrinhos, metas e categorias devem ter modelo consistente | Cofrinhos são exibidos/carregados; metas/categorias permanecem KV e não têm mutadores equivalentes no store atual | P | `FinanceAuxiliaryKv.php:15-25`; `frontend/src/modules/finance/store.tsx:43-92`, `frontend/src/modules/finance/store.tsx:221-253`; `frontend/src/modules/finance/overview/components/VaultsOverview.tsx:11-31` |
| OFX deve oferecer preview sem mutar | Endpoint apenas parseia, lê sets e marca duplicidade provável | C | `FinanceOfxPreview.php:4-13`, `FinanceOfxPreview.php:19-43`; `tests/cases/finance_ofx_preview_test.php:13-42` |
| FITID deve ser a chave de deduplicação/idempotência | Parser preserva `FITID`, mas preview deduplica por `(date,value)` | NC | `ofx.php:39-52`; `FinanceOfxPreview.php:27-39` |
| FITID deve sobreviver à confirmação | Modal gera novo `genId` e não grava FITID | NC | `frontend/src/modules/finance/OfxImportModal.tsx:47-62` |
| Parcelas devem ter schedule/estado próprio | Só existe `parcelas`; UI interpreta `value` como valor de cada parcela e deriva total por multiplicação; não persiste parcelas pagas | P/NC | `schema.sql:167-194`; `frontend/src/modules/finance/installments.ts:49-54`, `frontend/src/modules/finance/installments.ts:76-117` |
| Fatura de cartão deve seguir a mesma semântica das parcelas | Ao adicionar, soma `expense.value` uma vez à fatura; relatórios repetem o valor em cada mês | NC/ambígua | `frontend/src/modules/finance/store.tsx:333-350`; `installments.ts:84-111`; `annualTax.ts:38-48`, `annualTax.ts:68-88` |
| Remoção deve reconciliar XP | Award compara IDs antigos/novos; remoção de ID não chama revoke. Só undo específico do assistente carrega `xpRef` | NC | `FinanceWrite.php:19-25`, `FinanceWrite.php:92-97`; `AssistantActionExecutor.php:136-169` |

### Divergências de cálculo

| Conceito | Implementações observadas | Divergência |
|---|---|---|
| Despesa mensal | KPI conta só linhas cuja data original está no mês (`selectors.ts:58-65`) | Parcelas/recorrências futuras não entram no KPI, mas entram no relatório anual (`annualTax.ts:38-48`, `annualTax.ts:68-120`) |
| “IR” anual | Agrega renda, despesas, saldo e categorias (`annualTax.ts:5-25`, `annualTax.ts:60-120`) | Não calcula imposto, faixas ou deduções; é relatório financeiro anual |
| Patrimônio web | Saldos de não-cartões + cofrinhos − faturas (`selectors.ts:16-44`) | Fórmula mais rica que os demais canais |
| Patrimônio do assistente | Soma `saldo − fatura` de toda conta, sem cofrinhos (`AssistantActionExecutor.php:462-470`) | Pode contar saldo de cartão e omite cofrinhos |
| Dashboard mobile | Soma saldos/faturas sem o mesmo filtro de tipo (`mobile/src/app/(app)/index.tsx:32-36`) | Resultado pode divergir do web para o mesmo snapshot |

## Rotina

| Invariante esperada | Real | Avaliação | Evidência |
|---|---|---:|---|
| Escrita concorrente deve detectar conflito | Todas as tarefas são um JSON `tasks_v6`, até 5.000 itens/1 MiB, salvo por UPSERT integral; sem versão/ETag/CAS | NC; last-write-wins | `RoutineService.php:6-34`; `frontend/src/modules/routine/api.ts:5-7` |
| Recorrência deve ser canônica e compartilhada | `daily`, `weekdays`, `weekly` e custom são expandidos no frontend; conclusão/exclusão ficam em `completedDates`/`excludedDates` | P; regra client-side | `routine/selectors.ts:22-45`, `routine/selectors.ts:68-127`; `routine/actions.ts:12-85` |
| Timezone deve ser uniforme | Backend: São Paulo/UTC; web usa `Date` local; mobile usa data UTC de `toISOString()` | NC | `Clock.php:4-29`; `RoutineService.php:36-46`; `routine/selectors.ts:3-19`; `mobile/src/app/(app)/routine.tsx:27-30` |
| Reminder deve funcionar com aba/processo fechado | `Notification` é verificada por `window.setInterval` a cada 30 s, janela +30/−90 s e dedupe em localStorage | NC para background garantido | `TaskNotificationCenter.tsx:94-117` |
| XP deve ocorrer depois de save confirmado | Toggle atualiza estado e dispara `awardEvent` fire-and-forget; save ocorre em effect separado 450 ms depois | NC | `AppContext.tsx:129-134`, `AppContext.tsx:159-181` |
| Reabrir tarefa deve revogar XP | Reabertura remove conclusão, mas não chama revoke; não há endpoint público de revoke | NC | `AppContext.tsx:159-181`; `api/progress-event.php:12-38` |
| Web e mobile devem aplicar a mesma progressão | Mobile salva `tasks_v6` e não concede/revoga XP nesse fluxo | NC entre canais | `mobile/src/app/(app)/routine.tsx:49-96` |

## Calendar

| Invariante esperada | Real | Avaliação | Evidência |
|---|---|---:|---|
| Integração somente leitura | Scope `calendar.readonly`; eventos públicos têm `readOnly:true`; endpoint de eventos aceita GET | C | `GoogleCalendarService.php:13-21`; `GoogleCalendarRepository.php:194-215`; `api/calendar.php:10-18`; `tests/cases/google_calendar_service_test.php:104-106` |
| Tokens/eventos sensíveis cifrados em repouso | Access/refresh/sync passam por `TokenCrypto`; ID, título, local e link do espelho também são cifrados/contextualizados | C no código | `GoogleCalendarService.php:88-102`, `GoogleCalendarService.php:222-304`; `GoogleCalendarRepository.php:223-258`; `schema.sql:254-292` |
| Cache e concorrência de sync devem ser limitados | TTL 120 s, lease 120 s, deadline 25 s; serve mirror stale se outro request segura lease; full/delta são trocas transacionais | C/P | `GoogleCalendarService.php:15-21`, `GoogleCalendarService.php:124-177`, `GoogleCalendarService.php:186-306`; `GoogleCalendarRepository.php:90-183` |
| Range deve ser limitado | RFC3339, `end>start`, máximo 370 dias, horizonte ±5 anos | C | `api/calendar.php:20-51` |
| Cliente e endpoint de conexão devem concordar | Web faz POST+CSRF; mobile abre diretamente `/api/calendar-connect.php`, portanto navega por GET; endpoint retorna 405 | NC funcional | `frontend/src/modules/calendar/api.ts:143-178`; `mobile/src/app/(app)/routine.tsx:165-168`; `api/calendar-connect.php:14-22` |
| Timeout do cliente deve cobrir deadline servidor | Web aborta em 15 s; serviço admite sync por 25 s | NC operacional | `frontend/src/modules/calendar/api.ts:18`, `frontend/src/modules/calendar/api.ts:74-111`; `GoogleCalendarService.php:20` |

## Treino

| Invariante esperada | Real | Avaliação | Evidência |
|---|---|---:|---|
| Ownership em toda leitura/mutação | Snapshots, joins, lookup e deletes filtram `user_id` | C no serviço | `TrainingService.php:101-191`, `TrainingService.php:379-395`, `TrainingService.php:434-456`, `TrainingService.php:467-470`, `TrainingService.php:518-523` |
| Ranges e cardinalidades devem ser limitados | Datas hoje−10 anos/hoje+1 ano; números finitos; 200 treinos, 4.000 exercícios, 1.000 medidas, 500 sessões e 10.000 métricas; sessão até 100 itens | C | `TrainingService.php:40-78`, `TrainingService.php:107-154`, `TrainingService.php:365-376`, `TrainingService.php:413-425`, `TrainingService.php:460-478` |
| Retry de create deve ser idempotente | Se `id` não vier, servidor gera aleatório; clientes remotos enviam medidas/sessões sem ID em fluxos manuais | NC | `TrainingService.php:20-26`, `TrainingService.php:446-450`, `TrainingService.php:460-495`; `frontend/src/modules/training/api.ts:32-34`; `frontend/src/modules/training/store.tsx:18-23`, `frontend/src/modules/training/store.tsx:69-73` |
| Sessão + XP devem ser atômicos | Inserts da sessão/entries e award ocorrem dentro da mesma transação quando própria | C | `TrainingService.php:491-516`; `ProgressService.php:293-330` |
| Delete + revoke devem ser atômicos | DELETE é executado antes de `progress_revoke_event`, sem transação englobando ambos | NC | `TrainingService.php:518-526`; teste cobre apenas sucesso em `tests/cases/training_service_test.php:41-45` |

Retry após resposta perdida pode criar nova sessão e novo XP quando o cliente não conserva uma chave de idempotência. Não foi localizado teste de retry nem de falha entre DELETE e revoke.

## Nutrição

| Invariante esperada | Real | Avaliação | Evidência |
|---|---|---:|---|
| Preview não deve mutar antes da confirmação | Normaliza draft, informa plano ativo, calcula hash; execução ocorre somente após confirmação | C | `AssistantActionExecutor.php:88-107`; `AssistantService.php:152-177`, `AssistantService.php:544-555` |
| Custo deve ser recalculado no servidor | Soma refeições/dias e repete o ciclo até `periodDays`; não confia no agregado fornecido | C | `AssistantActionExecutor.php:385-416`; `DietPlanCostCalculator.php:23-39` |
| Tolerância deve ser ±10% inclusiva | Faixa 90%–110%, mínimo truncado e máximo arredondado para cima | C | `DietPlanCostCalculator.php:20-68`; bordas em `tests/cases/diet_plan_cost_calculator_test.php:8-36` |
| Versão/histórico devem ser preservados | Arquiva ativo, usa `MAX(version_no)+1`, cria nova versão e retorna até 20 arquivadas | C | `NutritionPlanService.php:41-54`, `NutritionPlanService.php:61-119` |
| Restore/undo deve preservar histórico | Restore cria nova versão; undo arquiva a nova e reativa a anterior com conflito detectado | C | `NutritionPlanService.php:125-134`, `NutritionPlanService.php:144-176`; `AssistantActionExecutor.php:170-175` |
| Usuário deve poder manter/mesclar plano vigente (`keep`) | Parâmetro de aprovação não altera a ativação; toda ativação arquiva o ativo; não há `keep`/merge | NC | `AssistantActionExecutor.php:367-383`; `NutritionPlanService.php:90-106` |
| Plano deve validar safety nutricional | Validator cobre objetivo, período, orçamento, dias/refeições, texto/custo e lista; não cobre calorias, macros, alergias, intolerâncias ou contraindicações | NC; não afirmar segurança clínica | `AssistantActionExecutor.php:385-439` |
| Tabela relacional e espelho legado devem arquivar atomicamente | Ativação/undo são transacionais; `nutrition_archive_active_plan` faz UPDATE e depois UPSERT sem transação própria | P | `NutritionPlanService.php:61-119`, `NutritionPlanService.php:137-142`, `NutritionPlanService.php:144-176` |

## Progressão

| Invariante esperada | Real | Avaliação | Evidência |
|---|---|---:|---|
| Tipo e quantidade de XP devem vir do servidor | API aceita apenas `rotina`/`treino`; valores estão em `PROGRESS_EVENT_XP`; Finanças nasce do hook de persistência | C/P | `api/progress-event.php:27-38`; `ProgressService.php:7-12`, `ProgressService.php:92-107`, `ProgressService.php:286-303` |
| `ref` deve provar a ocorrência fonte | API copia `body.ref`; serviço valida apenas formato/tamanho/unicidade, sem buscar tarefa/sessão | NC; client-trusted | `api/progress-event.php:20-38`; `ProgressService.php:286-308` |
| Retry da mesma operação deve ser idempotente | UNIQUE `(user_id,ref)` + insert-ignore deduplica a mesma `ref` | C apenas para `ref` idêntica | `schema.sql:545-555`; `ProgressService.php:304-315`; `tests/cases/progress_service_test.php:42-45` |
| Revoke deve desfazer todos os derivados | Remove evento e recalcula XP/nível; conquistas e bônus `conquista:*` permanecem monotônicos | P por desenho explícito | `ProgressService.php:180-207`, `ProgressService.php:336-365` |
| Todos os domínios devem revogar ao desfazer | Treino chama revoke; Rotina e remoção financeira normal não | NC | referências cruzadas nas matrizes anteriores |
| Conquistas devem derivar do estado canônico | Unlock usa contagens de `xp_events`, streak, XP e nível; insert-ignore evita bônus repetido | C para o modelo atual | `ProgressService.php:116-207`; `schema.sql:557-574` |

## Provas em testes/workflows e lacunas

| Área | Prova estática localizada | Lacuna |
|---|---|---|
| Finanças | `tests/cases/finance_save_set_test.php:11-46,65-123`; `finance_ofx_preview_test.php:13-42`; `finance_auxiliary_kv_test.php:34-77` | Sem falha parcial cross-set/KV, concorrência ou compensação de XP |
| Rotina | `frontend/src/test/RoutineRecurrence.test.ts:57-60`; `RoutineActions.test.ts:52-68` | Sem concorrência de abas, falha de save após XP, timezone cross-channel ou revoke |
| Calendar | `google_calendar_service_test.php:72-180`; `google_calendar_integration_contract_test.php:59-74,130-133` | Sem teste do fluxo mobile GET→POST |
| Treino | `training_service_test.php:23-45` | Sem retry após timeout e falha de revoke depois do DELETE |
| Nutrição | `diet_plan_cost_calculator_test.php:8-36` | Sem suíte unitária dedicada a todas as transições/safety/keep |
| Progressão | `progress_service_test.php:28-83` | Sem `ref` distinta forjada e sem rollback de conquistas |
| CI | `.github/workflows/tests.yml:11-91` | Web/backend foram executados localmente e passaram; continua sem job mobile, MySQL real ou cobertura dos cenários indicados acima |

## Prioridades de correção

A ordem abaixo não altera a classificação global da auditoria: **P0=0**; estes itens são bloqueadores **P1**.

1. **P1:** introduzir unidade atômica/idempotente para ações financeiras compostas e para delete+revoke; não tratar snapshots como ledger.
2. **P1:** corrigir Calendar mobile para obter a URL por POST autenticado/CSRF e só então abrir o navegador.
3. **P1:** conceder XP somente após persistência confirmada, verificar a ocorrência fonte no servidor e definir política uniforme de revoke.
4. **P1:** unificar timezone e fórmulas financeiras entre web, mobile e assistente; formalizar semântica de `value` parcelado/fatura.
5. **P1:** usar chaves de idempotência estáveis em creates de Treino e preservar FITID na importação OFX.
6. **P1:** adicionar opção explícita de keep/merge e safety nutricional mensurável antes de apresentar planos como apropriados.

## Limites da conclusão

A análise prova os caminhos estáticos do worktree, não o schema aplicado nem o comportamento em produção. Concorrência real, isolamento MySQL, jobs em background, entrega de notificações e integrações externas permanecem não verificados. Não foi encontrado ledger, endpoint público de revoke, keep nutricional ou teste mobile de Calendar no repositório; isso não prova inexistência de sistemas externos fora deste escopo.