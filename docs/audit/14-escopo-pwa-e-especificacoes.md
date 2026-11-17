# 14 — Decisão de escopo PWA e especificações 19–25

**Data:** 2026-08-26
**Branch / HEAD de referência:** `feature/ai-agent-guardrails` / `e600c0e`
**Natureza:** decisão de produto registrada + especificação funcional. O incidente 19 já foi **implementado e validado**; os itens 21–25 permanecem especificação, não código.

## 1. Decisão: PWA como único cliente

O desenvolvimento do app nativo (`mobile/`, Expo) foi descontinuado por decisão do produto. O Level OS segue como aplicação web + PWA + shell PHP autenticado.

### Efeito na auditoria

| Achado de [11](./11-achados-priorizados.md) | Antes | Agora | Justificativa |
|---|---|---|---|
| MOB-DEP-01 (20 advisories Expo/Metro) | P1 | **Fora de escopo de release** | Nenhum binário é publicado. Volta a P1 se o app voltar ao roadmap. Recomenda-se arquivar `mobile/` ou marcá-lo como não mantido para o scanner não pautar decisão de release. |
| TEST-01 (sem CI/testes mobile) | P1 | **Fora de escopo** | Sem cliente nativo, não há gate a exigir. |
| CAL-01 (Calendar mobile GET em endpoint POST) | P1 | **Fora de escopo** | Defeito existe apenas no app nativo. O caminho web já usa POST + CSRF (`frontend/src/modules/calendar/api.ts:143-178`). |
| ROT-02 (timezone divergente) | P1 | **P1, reduzido a web+backend** | Continua válido entre `Clock.php:4-29` e `routine/selectors.ts:3-19`. |
| TRN-01 (retry sem idempotency key) | P1 | **P1** | Web e API continuam expostos. |
| PWA-01 (manifest/SW sem cadeia operacional) | P2 | **P1** | Com PWA como único cliente, instalabilidade/atualização/offline deixam de ser opcionais. |

### Consequência prática

**Atualização:** PWA-01 foi implementado: manifest nas duas entradas, registro e atualização do service worker tanto no app quanto na landing, cache somente de assets públicos versionados e contrato online-first, com 12 testes. A regressão visual da landing também foi corrigida: conteúdo essencial deixou de depender de opacidade zero, chunk Motion dinâmico ou `IntersectionObserver`; 3 testes e capturas desktop/mobile validam o fallback. Instalação e atualização em dispositivo real e Lighthouse continuam pendentes.

## 2. Incidente `plan_required` — resolvido

### Causa raiz

Três defeitos independentes no mesmo caminho:

1. **Vazamento de código interno.** `readJson` convertia `body.error` em `Error("plan_required")`, e o cabeçalho renderizava `Falha na sincronização: plan_required` (`frontend/src/modules/finance/api.ts:20-24` e `FinanceScreen.tsx:141`, no estado anterior).
2. **Item fantasma.** O `catch` do save marcava `error` e não revertia o estado otimista; a renda recusada continuava somando em totais e projeções (`store.tsx:199-215`, estado anterior).
3. **Reenvio implícito.** Como `persistedSets.current.income_lines` não era atualizado nem revertido, a mutação seguinte reclassificava o set como dirty e reenviava o array inteiro, incluindo o item recusado.

A regra de plano **não** era o defeito. `require_plan` está correto ao cortar com 402; o servidor permanece a autoridade.

### Correção aplicada

| Camada | Mudança | Arquivo |
|---|---|---|
| Backend | 402 passa a devolver `ok:false` + `code` estável, mantendo `error` por compatibilidade com clientes existentes | `plan.php:56-70` |
| Contrato de erro | Mapa central com os 10 códigos exigidos, aliases de servidor, mapa por status HTTP e classe `ApiError` | `frontend/src/lib/apiErrors.ts` |
| Adaptador | `readJson` lança `ApiError` classificado; nunca propaga código bruto como mensagem | `frontend/src/modules/finance/api.ts:17-33` |
| Store/API | Todas as mutações dos quatro sets passam pela mesma fila e são publicadas só após 2xx; ações compostas usam um único batch transacional; cada operação recalcula sobre o último estado confirmado | `frontend/src/modules/finance/store.tsx`; `frontend/src/modules/finance/api.ts`; `app/Modules/Finance/FinanceApi.php` |
| Interface | Mensagem humana no cabeçalho e CTA "Conhecer o plano" quando a recusa é de plano | `frontend/src/modules/finance/FinanceScreen.tsx` |
| Formulário | Conta, renda, reajuste e despesa só fecham após 2xx; em recusa, guard é liberado e campos/draft permanecem para retry | `AccountFormModal.tsx`; `IncomeForm.tsx`; `IncomeFormModal.tsx`; `ExpenseForm.tsx` |

Mensagem final ao usuário: **“Adicionar movimentações é um recurso do plano Individual.”**, com ação “Conhecer o plano”. Exportação e logout seguem disponíveis.

### Contrato de erro central

`plan_required`, `email_verification_required`, `authentication_required`, `csrf_invalid`, `validation_failed`, `account_not_found`, `duplicate_transaction`, `rate_limited`, `synchronization_failed`, `service_unavailable`. Falha de rede (`TypeError`) é classificada como `service_unavailable`. Nenhum caminho exibe código, SQL, classe ou stack.

### Testes adicionados

`frontend/src/test/FinancePlanRequired.test.tsx`, 8 casos: classificação de códigos/status; garantia de que a mensagem não contém o código interno; rede como indisponibilidade; 402 sem publicar a renda; ausência de reenvio acumulado; sucesso 2xx preservando a renda; serialização de mutações sobrepostas; falha de rede sem alterar o snapshot confirmado.

Resultado do gate web após o fechamento: **46 arquivos / 172 testes** verdes, typecheck, build e budgets OK. A execução local de PHP, smoke e readiness ficou bloqueada nesta máquina por ausência do runtime PHP; não se repete aqui o resultado histórico como se fosse evidência atual.

### Cobertura dos 16 cenários do item 19.5

| # | Cenário | Estado |
|---:|---|---|
| 1, 2, 3, 5 | free, trial ativo, trial expirado, cancelado | **Regra coberta** por `SubscriptionPolicy`; matriz de estados é SUB-01/SUB-02 em `11` |
| 4 | Individual ativo | Coberto pelo caso 2xx |
| 6 | Vitalício | **Pendente por decisão**: hoje é implícito (`current_period_end = NULL`), ver SUB-02 |
| 7, 8 | Supabase vinculado e conta legada | Cobertos por `supabase_auth_bridge_test.php`; AUTH-07 segue aberto |
| 9 | E-mail não verificado | Código `email_verification_required` mapeado; `api/finance.php` não exige verificação hoje — decisão de produto pendente |
| 10 | Plano forjado no payload | **Impossível por desenho**: plano nunca vem do cliente (`plan.php:38-70`) |
| 11 | Envio duplicado | Coberto: guard de submit + teste de não reenvio |
| 12 | Resposta 402 | Coberto |
| 13 | Falha de rede | Coberto |
| 14 | Criação bem-sucedida | Coberto |
| 15 | Recarga após sucesso | Coberto indiretamente por `refresh`; E2E ainda ausente (TEST-02) |
| 16 | Isolamento entre usuários | Coberto no servidor por `user_id`; E2E multiusuário ausente |

**Risco de regressão:** baixo-médio. Em modo remoto, as listas agora mudam apenas após confirmação do servidor; isso remove estado fantasma e corridas entre autosave e submit, ao custo de feedback pessimista durante o request. Modo local continua imediato, e `require_plan` não foi tocado.

**Confirmação exigida pelo item 19.4:** todas as mutações dos quatro sets financeiros usam uma única fila, recalculam sobre o último estado confirmado e só publicam o dado após 2xx. Em recusa, o modal mantém o rascunho para retry e o estado financeiro não precisa de rollback otimista.

## 3. Regras de uso da referência (item 20)

As imagens da plataforma de referência foram usadas apenas como inspiração de densidade informacional e hierarquia. Não foram copiados marca, nomes, ilustrações, personagens, textos, código, layout ou identidade visual. Toda proposta abaixo é original e mantém OLED, accent aqua `#31E6D4`, tipografia, tokens, design system, acessibilidade e custo operacional baixo. Nenhum serviço pago ou dependência grande é introduzido.

**Limite de evidência:** os arquivos das imagens 3–10 não foram fornecidos nesta sessão. A análise a seguir usa as descrições textuais que você enviou, cruzadas com o código real do Level OS. Ela **não** é inspeção pixel a pixel dessas imagens.

## 4. Matriz das imagens (item 25.1)

| Imagem | Conceito | Existe no Level OS? | Lacuna | Adaptação original | Prioridade |
|---|---|---|---|---|---:|
| 3 | Painel de parcelamentos com progresso | **Parcial**: aba Parcelamentos derivada de `expense.parcelas` (`installments.ts:49-117`; `FinanceInstallments.tsx:18-35`) | Sem parcelas pagas persistidas, sem separar em andamento/finalizados, total derivado por multiplicação | Cabeçalho com contrato/pago/restante e progresso por compra, calculado do mesmo `expense`, sem nova fonte de dados | P2 |
| 4 | Visão de assinaturas | **Não** | Recorrentes não têm especialização de assinatura, próxima cobrança nem projeção | `recurring_kind = "subscription"` sobre a despesa recorrente existente, nunca estrutura paralela | P2 |
| 5 | Categorias com distribuição | **Parcial**: `expenseAnalytics.ts` e `ParticipationDonut` já agregam | Sem navegação entre meses nem subcategoria/expansão | Barras proporcionais com cor só quando carrega significado, resumo textual e detalhe por toque | P2 |
| 6 | Cartões: fatura, limite, disponível | **Implementado (slice 1)**: `cardBilling.ts` + `FinanceCards.tsx` separam fatos e estimativas | Fatura **confirmada** ainda não existe: falta ciclo/status persistido | Fatura informada, disponível calculado, após fechamento e parcelas futuras rotulados; sem somar estimativa à fatura | P1 → slice 2 pendente |
| 8, 9, 10 | Comparação com período anterior, heatmap e insights | **Parcial**: comparação justa e insight local implementados; heatmap pendente | Falta heatmap acessível e gráfico comparativo com tooltip | Preservar o cálculo único já implementado e adicionar visualizações sem nova fonte de verdade | P2 |

**Risco de duplicidade:** alto em 3, 4 e 6. Nenhuma das propostas deve criar segunda fonte de verdade; todas derivam de `transactions`/`accounts` e dos quatro sets existentes.

## 5. Comparação de período (item 22)

> **Status 2026-08-26 — implementado (núcleo).** Os três recortes, os deltas, a semântica de cor, a classificação por categoria e o insight local já estão no produto (`periodComparison.ts`, `FinancePeriodComparison.tsx`, `financeInsights.ts`), cobertos por 11 testes. O que permanece especificação: gráfico atual vs. anterior com tooltip, heatmap acessível, tratamento de reembolso e exclusão explícita de transferências/pagamento de fatura do realizado.

### Regra de comparação justa

Três recortes permitidos, sempre rotulados de forma explícita:

1. **Parcial equivalente:** `1 a 18 de agosto vs. 1 a 18 de julho`.
2. **Fechado:** mês atual completo/projetado vs. mês anterior completo, com projeção sinalizada.
3. **Janela móvel:** `Últimos 30 dias vs. 30 dias anteriores`.

Proibido exibir apenas “vs. mês anterior” quando os intervalos têm durações diferentes.

### Cálculo

```
absolute_delta   = current_total - previous_total
percentage_delta = previous_total > 0
                   ? ((current_total - previous_total) / previous_total) * 100
                   : null
```

- `previous_total = 0` e `current_total > 0` → rótulo **“novo”**, nunca infinito.
- ambos zero → **“sem variação”**.
- transferências, pagamento de fatura, cancelados e projeções recorrentes/parcelas futuras ficam **fora** do realizado.
- reembolso reduz a despesa da categoria original, com regra declarada.
- tudo em centavos inteiros, timezone `America/Sao_Paulo`.

### Semântica de cor

Em despesa, aumento é alerta e redução é melhoria — não usar verde apenas porque o número subiu. Cada categoria recebe classificação `aumentou`, `diminuiu`, `estável` ou `nova`.

### Gráfico e heatmap

Linha sólida para o período atual, tracejada para o anterior, tooltip com data/atual/anterior/diferença, sem corte nas bordas, navegável por teclado, com resumo textual equivalente, SVG leve, respeitando `prefers-reduced-motion` e carregado sob demanda. Meses de tamanhos diferentes normalizam pelo dia relativo. O heatmap usa o mesmo filtro do dashboard, com escala acessível e fallback textual.

### Insight local

Gerado sem IA, no mesmo módulo dos insights atuais (`financeInsights.ts`): variação do período comparável, maior categoria em alta/baixa, consumo de limite e assinatura nova. IA somente quando o usuário pedir explicação elaborada.

## 6. Wireframes textuais (item 25.3)

**Visão geral** — saldo consolidado; recorte comparativo ativo; três KPIs (realizado, variação, projeção sinalizada); próximas obrigações; insight local; atalho de nova movimentação.

**Movimentações** — filtro de período com rótulo explícito; busca; lista agrupada por dia com valor alinhado à direita e tabular; chips de tipo; estado vazio distinto de carregando; erro com ação de recuperação.

**Parcelamentos** — resumo: em andamento, total contratado, pago, restante, progresso geral; lista com progresso individual, próxima parcela, mês final e vínculo com conta/cartão; seção separada para finalizados, recolhida por padrão.

**Assinaturas** — ativas, gasto mensal, projeção anual rotulada como projeção; lista com próxima cobrança, conta/cartão, categoria e status; ação de cancelar que interrompe a projeção sem apagar histórico.

**Categorias** — total do período; barras proporcionais com participação percentual; comparação com o período anterior; expansão para lançamentos; resumo textual para leitor de tela.

**Cartões** — por cartão: fatura confirmada, compras após fechamento, parcelas futuras, limite total/usado/disponível, fechamento e vencimento; identidade do banco pelo componente existente; nunca inventar fatura estimada sem rótulo.

**Comparação mensal** — seletor de recorte; KPIs com delta absoluto e percentual; gráfico atual vs. anterior; tabela de categorias classificadas; heatmap; insights locais.

## 7. Navegação financeira (item 24)

Proposta a validar, preservando todas as URLs e recursos atuais:

- **Primárias:** Visão geral, Movimentações, Contas, Dashboard.
- **Secundárias, em “Mais”:** Parcelamentos, Assinaturas, Categorias, Cartões, OFX, Imposto de Renda, Salário.

Requisitos: sem rolagem horizontal obrigatória; filtro ativo sempre visível; navegação por teclado; progressive disclosure; nada de remover OFX, IR, contas, rendas ou dashboard. O componente `Tabs` atual já suporta esse agrupamento (`FinanceScreen.tsx:155-210`), então a mudança é de organização, não de tecnologia.

## 8. Especialidades de agentes (item 25.4)

Todas as linhas são **propostas**. Nenhuma amplia a allowlist automaticamente; toda mutação exige preview, confirmação, idempotência e teste, conforme `AssistantActionCatalog.php:81-105`.

| Nome | Módulo | Propósito | Dados permitidos | Ferramentas | Precisa IA? | Confirmação |
|---|---|---|---|---|---|---|
| Caça-Duplicatas | Finanças | Apontar lançamentos possivelmente repetidos | transações do usuário | hash/valor/data/conta locais | Não | Sim, ao mesclar |
| Radar de Assinaturas | Finanças | Detectar recorrência e reajuste | despesas recorrentes | periodicidade/merchant locais | Não | Sim, ao marcar |
| Guardião da Fatura | Finanças | Fechamento, vencimento e consumo de limite | contas/cartões, transações | cálculo local | Não | Sim, ao criar lembrete |
| Planejador de Metas | Finanças | Orçamento, cofrinhos e categorias | metas, saldos | projeção local | Não | Sim, ao salvar meta |
| Fiscal do Extrato | Finanças | Conferir OFX e conciliar | arquivo OFX, transações | parser/dedupe local | Opcional, só rótulo | Sim, ao importar |
| Guardiã dos Prazos | Rotina | Atrasos e vencimentos próximos | tarefas/datas | ordenação local | Não | Sim, ao reagendar |
| Planejadora da Semana | Rotina | Distribuir tarefas recorrentes | tarefas, duração | feasibility local | Opcional, rascunho | Sim, ao aplicar |
| Diário de Carga | Treinos | Comparar carga, repetições e evolução | sessões do usuário | fórmulas locais | Não | Não (leitura) |
| Guardião da Consistência | Treinos | Frequência, sem diagnóstico médico | sessões | contagem local | Não | Não (leitura) |
| Lista de Mercado | Alimentação | Consolidar ingredientes | plano aprovado | agregação local | Opcional, normalizar nome | Sim, ao salvar lista |
| Fiscal do Orçamento | Alimentação | Custo estimado vs. orçamento | plano, orçamento | soma/tolerância local | Não | Sim, ao salvar plano |

Restrições mantidas: treino não acessa finanças; financeiro não cria cardápio; alimentação não acessa extrato; o agente global não escreve; personagem não pode suavizar confirmação financeira; nenhuma especialidade inventa dados. Custo: roteamento determinístico, cálculo local e cache; a demo da landing continua 100% local.

## 9. Priorização (item 25.5)

**Corrigir imediatamente**
- Incidente `plan_required` — **feito**.
- PWA-01 agora P1: manifest referenciado, service worker registrado e claim alinhado — **feito**.
- Landing com conteúdo essencial visível sem depender de Motion/observer — **feito**.
- Cartões: separar fatura informada de estimativas e rotular o que não é confirmado — **feito (slice 1)**; ciclo de fatura persistido segue pendente.

**Alto valor, baixo esforço**
- Insight local comparativo reutilizando `financeInsights.ts`.
- Rótulo explícito de recorte comparativo.
- Reorganizar navegação financeira em primárias + “Mais”.
- Especialidades read-only locais (Diário de Carga, Guardiã dos Prazos).

**Alto valor, esforço médio**
- Comparação de período completa com gráfico e categorias classificadas.
- Assinaturas como especialização de recorrente.
- Painel de parcelamentos com pago/restante persistido.
- Heatmap acessível.

**Aprofundamento posterior**
- Caça-Duplicatas e Fiscal do Extrato com mutação.
- Subcategorias.
- Virtualização, após medir.

**Não recomendado**
- Segunda fonte de dados para assinaturas ou parcelamentos.
- Fatura estimada sem rótulo.
- Verde/vermelho puramente por direção numérica.
- Retomar dependências do app nativo enquanto o escopo for PWA.

## 9.1 Cartões e faturas — slice 1 entregue

**Regra implementada.** Por cartão, `limite` e `fatura` continuam sendo fatos informados pelo usuário; `disponível = max(0, limite − fatura)` em centavos inteiros, com corte por cartão (não no agregado). A janela de estimativa usa o último fechamento nominal anterior ao dia atual: lançamentos entre o dia seguinte a esse fechamento e hoje aparecem como “após fechamento · estimativa”. Ocorrências no próprio dia do fechamento ficam **fora** da soma e são reportadas como corte de horário desconhecido. Parcelas com data futura são somadas separadamente e nunca alteram fatura nem disponível. Sem dia de fechamento informado, a estimativa não é fabricada: a interface pede o dado.

**Onde:** `frontend/src/modules/finance/cardBilling.ts` (puro) e `frontend/src/modules/finance/FinanceCards.tsx` (UI), consumidos por `FinanceScreen`. Nenhuma mudança em `contracts.ts`, `api/`, PHP ou `schema.sql`; portanto nenhuma segunda fonte de verdade foi criada.

**Terminologia corrigida.** Parcelamentos não afirmam mais pagamento: “quitado” virou “sem futuras”, “parcelas estimadas como pagas” virou “ocorrências até hoje”, “restante” virou “futuro estimado” e “total ainda a quitar” virou “parcelas futuras estimadas”. O formulário passou a dizer “limite informado” e “fatura atual informada”.

**Cobertura.** `cardBilling.test.ts`: separação sem dupla contagem em centavos, corte no próprio fechamento, clamp de dia 31 em fevereiro de ano não bissexto, ausência de fechamento e uso acima do limite com disponível zero. `FinanceCards.test.tsx`: rótulos de fato versus estimativa, `role="meter"` com `aria-valuetext`, ausência de termos “fatura confirmada/quitado/parcela paga” no DOM e ação de edição. Gate: **43 arquivos / 157 testes**, typecheck, build e budgets verdes.

**Limite explícito.** “Fatura confirmada” **não** foi entregue e não pode ser derivada: o modelo não tem ciclo, status, pagamento nem vínculo parcela→fatura. Isso exige o slice 2, com entidade persistida de ciclo e escrita transacional única — o padrão atual salva `accounts_v2` e `expense_lines_v4` em POSTs independentes e não serve para uma operação que precise ser atômica.

## 10. Limites

Este documento registra decisão e especificação. Além do incidente 19, nenhum item de 21–25 foi implementado. As lacunas ambientais de [12](./12-validacoes-residuos-limitacoes.md) continuam válidas, e a decisão de release segue **NO-GO** até o fechamento dos P1 de [11](./11-achados-priorizados.md), agora sem os itens exclusivos do cliente nativo.
