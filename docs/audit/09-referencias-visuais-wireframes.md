# 09 — Referências visuais e wireframes financeiros

**Data:** 2026-08-26
**Método:** inspeção estática do worktree e inspeção visual dos dois PNGs soltos no workspace; o build/test posterior passou, mas os wireframes propostos não foram implementados ou testados. Resultados em [12](./12-validacoes-residuos-limitacoes.md).
**Legenda:** **EXISTENTE** = comprovado no produto atual; **PROPOSTA** = benchmark/wireframe, ainda não entregue; **BLOQUEADO POR AMBIENTE** = depende de validação renderizada/dados reais.

## 1. Regra de uso das referências

As imagens/conceitos externos são **benchmark de problema, hierarquia e densidade**, não autorização para copiar. Não copiar Pierre, nome/marca, gatos/mascotes, ilustrações, textos, paleta, ícones proprietários, composição, ordem de blocos ou layout pixel a pixel. A solução deve continuar sendo Level OS e reutilizar seus componentes/tokens.

Os números 3, 4, 5, 6, 8, 9 e 10 abaixo identificam os conceitos fornecidos como referência. Eles não provam que essas funcionalidades já existem.

## 2. Evidência visual interna do próprio Level OS

### EXISTENTE

- `frontend/public/marketing/screens/finance.png` é referenciado como “Dashboard financeiro real do Level OS”; seus AVIF/WebP são apenas outros formatos da mesma captura (`frontend/src/marketing/MarketingProductSections.tsx:27-43,168-175`).
- `overview.png` é rotulado “Captura real da plataforma” e “dados de demonstração” (`frontend/src/marketing/LandingPage.tsx:119-133`). Essas capturas sustentam linguagem visual, shell, KPIs e densidade — não validam lifecycle financeiro.
- Os dois PNGs soltos no workspace foram inspecionados e são composições da própria marca Level OS:
  - `../landing-route-finance-routine.png` — **artefato binário sem linhas**; exploração orbital/rota Finanças→Rotina.
  - `../level-os-landing-senior-desktop.png` — **artefato binário sem linhas**; exploração de hero/dashboard Level OS.

Arquivos binários não possuem endereço `arquivo:linha`; por isso o caminho é a evidência máxima possível. Eles entram apenas como evidência interna de direção visual do Level OS, **não** como as referências externas numeradas e **não** como prova de funcionalidade financeira.

### PROPOSTA

Usar das capturas internas somente: tipografia, contraste/densidade, superfícies, espaçamento, hierarquia de KPI e comportamento responsivo. Usar placeholders genéricos para contas/cartões; não reproduzir marcas bancárias no wireframe.

## 3. Matriz imagens/conceitos × produto atual

| Ref. | Conceito do benchmark | O que é EXISTENTE | O que não existe / limite | Tratamento PROPOSTO |
|---:|---|---|---|---|
| 3 | Parcelamentos | Aba `/financeiro?tab=parcelamentos`, `FinanceInstallments`, dados derivados de `expense_lines_v4` e cronograma mensal (`frontend/src/modules/finance/FinanceScreen.tsx:46-50,73-104,181-212`; `frontend/src/modules/finance/installments.ts:29-128`) | Não há baixa/status por parcela. “Paga/quitado” é inferido por data `<= hoje` (`frontend/src/modules/finance/installments.ts:78-128`; `frontend/src/modules/finance/contracts.ts:29-43`) | Exibir “estimado por data”/“pago inferido”, nunca pagamento confirmado; não inventar checkbox/baixa |
| 4 | Assinaturas | Insight filtra `categoria=assinaturas` + `recorrencia=mensal` e soma valores (`frontend/src/modules/finance/financeInsights.ts:81-94`) | Sem entidade, aba, lifecycle, cancelamento, pausa, falha, renovação ou view dedicada (`frontend/src/modules/finance/FinanceScreen.tsx:46-52`) | Primeiro bloco/filtro em Gastos: “recorrências classificadas como assinatura”; lifecycle somente após novo contrato canônico |
| 5 | Categorias | Donut top 4 + Outros no dashboard; ranking completo, percentual e drill-down em Gastos (`frontend/src/modules/finance/FinanceDashboard.tsx:31-42,194-196`; `frontend/src/modules/finance/FinanceExpenses.tsx:24-35,86-124`) | Sem CRUD, subcategorias ou metas. `alimentacao` é sugerida, mas falta em `CATEGORY_LABEL` (`frontend/src/modules/finance/categories.ts:2-13`; `frontend/src/modules/finance/categorySuggestions.ts:1-8,17-21`) | Corrigir taxonomia única; manter ranking/donut; não criar array paralelo de categorias |
| 6 | Cartões/fatura | `accounts_v2` com `tipo=cartao`, `limite`, `fatura`, fechamento e vencimento; cards mostram usado/livre (`frontend/src/modules/finance/contracts.ts:13-28`; `frontend/src/modules/finance/FinanceScreen.tsx:228-305`) | `fatura` é snapshot editável; sem competência, ciclo, fechamento histórico, pagamento ou conciliação (`frontend/src/modules/finance/AccountFormModal.tsx:12-18,97-111`) | Rotular “Fatura atual (snapshot)”; não desenhar “pagar/fechar fatura” como existente |
| 8 | Comparação | Gastos compara período anterior; dashboard reconstrói tendência ancorada no patrimônio atual (`frontend/src/modules/finance/FinanceExpenses.tsx:24-35,68-81`; `frontend/src/modules/finance/FinanceDashboard.tsx:31-38,98-143`) | Comparação é parcial; não é snapshot histórico nem realizado×projetado completo | Alimentar comparação pela série canônica única, com grau de certeza |
| 9 | Ritmo / heatmap | Sparkline mensal de gastos | Não há pace diário nem heatmap financeiro (`frontend/src/modules/finance/FinanceExpenses.tsx:78-82`) | Tratar como futuro, derivado da mesma série; sem persistência paralela |
| 10 | Insights | `financeInsights()` calcula localmente pico de categoria, maior gasto, assinaturas inferidas e uso de cartão; retorna até 3 (`frontend/src/modules/finance/financeInsights.ts:18-112`) | Não é aconselhamento, lifecycle nem chamada LLM | Preservar cálculo local; explicar método/certeza e permitir drill-down |

## 4. Fonte de verdade e navegação

### EXISTENTE

- A rota é `/financeiro`; `tab` aceita `contas`, `extrato`, `gastos`, `parcelamentos`, `dash` e `ir`. Inválido/ausente cai em Contas; selecionar Contas remove a query (`frontend/src/App.tsx:106-109`; `frontend/src/modules/finance/FinanceScreen.tsx:46-52,73-104`).
- No mobile, Contas/Extrato/Dashboard ficam visíveis e Parcelamentos/Gastos/IR entram no select “Mais” (`frontend/src/modules/finance/FinanceScreen.tsx:159-207`).
- Fontes persistidas: `accounts_v2`, `income_lines`, `expense_lines_v4` e `ifood-entries`; o backend as mapeia às tabelas relacionais (`app/Modules/Finance/FinanceRead.php:5-11,113-158`; `finance.php:4-14`; `frontend/src/modules/finance/store.tsx:120-128,185-215,244-253`).

### PROPOSTA — regra arquitetural

- **Preservar** todos os deep links `/financeiro?tab=...` existentes.
- Assinaturas e Categorias entram inicialmente como filtros/painéis de `tab=gastos`; Cartões/Fatura permanecem em `tab=contas`; Parcelamentos continua em `tab=parcelamentos`; Resumo em `tab=dash`.
- Não persistir arrays/tabelas paralelos como `installments[]`, `subscriptions[]`, `categories[]`, `invoiceHistory[]`, `actualSeries[]` ou `forecastSeries[]`.
- Quando pagamento/lifecycle exigir novos fatos, evoluir **uma vez** o contrato/schema canônico com migração e IDs estáveis.

## 5. Uma única série canônica realizado/projetado

### PROPOSTA

Criar um seletor puro, não persistido, por exemplo `buildFinanceOccurrences(data, range, asOf)`. Ele produz **uma única coleção derivada**, em centavos:

- `occurrenceDate`
- `sourceKind`: renda, renda variável ou despesa
- `sourceId` e `accountId`
- `category`
- `amountCents` assinado
- `phase`: `realized` ou `projected`
- `certainty`: `recorded` ou `date-inferred`

Regras sem inventar dados:

1. Lançamento avulso/entrada variável com data até hoje: `realized + recorded`.
2. Recorrência/parcela com ocorrência até hoje: `realized + date-inferred`, pois não existe baixa.
3. Ocorrência futura: `projected + date-inferred`.
4. `accounts_v2.fatura` fica fora do fluxo: é snapshot e somá-la duplicaria despesas.
5. Gráfico usa a mesma coleção: linha sólida até Hoje, tracejada depois, padrão/rótulo além de cor.
6. Donut, ranking, comparação, parcelamentos, ritmo, heatmap e insights derivam dessa coleção. Isso elimina a divergência atual entre agregações do dashboard e de Gastos.

A implementação atual já possui expansão de parcelas/recorrências que deve ser reaproveitada (`frontend/src/modules/finance/installments.ts:48-76`; `frontend/src/modules/finance/period.ts:158-206`). A série é derivação, não nova fonte de verdade.

## 6. Wireframes textuais — desktop

Tudo nesta seção é **PROPOSTA**, salvo os elementos marcados “existente”.

### 6.1 Resumo financeiro — `/financeiro?tab=dash`

```text
┌ Finanças ───────────────────── [Período ▾] [Nova movimentação]
│ status de sincronização / dado stale / modo leitura
├ Patrimônio atual ───────── Saldo do período ───────── Próxima pressão
│ R$ ...                     +/− R$ ...                 R$ ... em parcelas
├ Realizado ━━━━━━━━━━━━━● Hoje ┄┄┄┄┄┄ Projetado
│ [gráfico único; resumo textual; alternar tabela acessível]
│ legenda: registrado | inferido por data | projetado
├ Categorias do período ───────────── Insights locais
│ donut + ranking + drill-down        método + CTA “ver lançamentos”
└ Contas/cartões (snapshots) ───────── Próximas ocorrências
```

- **EXISTENTE reaproveitado:** filtro, patrimônio reconstruído, donut, crédito e insights (`frontend/src/modules/finance/FinanceDashboard.tsx:16-96,98-236`).
- Não chamar a projeção de saldo bancário confirmado.

### 6.2 Parcelamentos — `/financeiro?tab=parcelamentos`

```text
┌ Parcelamentos ─ Total ainda a quitar (estimado) ─ Compras ativas
├ Cronograma mensal futuro ───────── Compras parceladas
│ mês | parcelas | impacto           compra | conta | n/N inferidas
│ barras + valores                   próxima data | restante
└ Aviso: “pagamento inferido pela data; não há baixa registrada”
```

- Manter loading/error/empty/stale já existentes (`frontend/src/modules/finance/FinanceInstallments.tsx:18-32,102-103`).
- Trocar “Quitado” por “Sem parcelas futuras (inferido)” enquanto não houver baixa real.

### 6.3 Assinaturas — dentro de `/financeiro?tab=gastos`

```text
┌ Gastos > filtro [Todos | Recorrências | Assinaturas inferidas]
├ R$ .../mês inferido ─ n recorrências ─ variação média
├ Nome             Categoria       Valor       Evidência
│ Serviço A        Assinaturas     R$ ...      mensal + categoria
│ Serviço B        Assinaturas     R$ ...      mensal + categoria
└ Nota: sem confirmação de ativo/cancelado; editar lançamento [CTA]
```

Não mostrar status ativa/pausada/cancelada, próxima cobrança confirmada ou botão Cancelar. Esses fatos não existem.

### 6.4 Categorias — dentro de `/financeiro?tab=gastos`

```text
┌ Categorias [Período ▾] [Agrupar: categoria/conta]
├ Donut (top 4 + Outros) ───────── Ranking completo
│ resumo textual                   01 Moradia  R$...  xx%  n itens
│                                  02 Mercado  R$...  xx%  n itens
├ Detalhamento da seleção
└ Taxonomia desconhecida: “alimentacao” → ação administrativa futura
```

CRUD, subcategoria e meta ficam fora da primeira entrega. Primeiro unificar `CATEGORY_LABEL`/sugestão.

### 6.5 Cartões/Fatura — dentro de `/financeiro?tab=contas`

```text
┌ Cartões de crédito ─ usado R$ ... de R$ ...
├ Cartão genérico A
│ Fatura atual (snapshot) R$ ... | limite livre R$ ...
│ fecha dia — | vence dia — | utilização xx%
│ [Editar snapshot]
├ Cartão genérico B ...
└ Aviso: sem ciclo/histórico/pagamento conciliado
```

“Pagar fatura”, ciclo fechado e histórico são futuros dependentes de modelo canônico.

## 7. Wireframes textuais — mobile

### 7.1 Resumo

```text
[Finanças] [+]
[Contas] [Extrato] [Dashboard] [Mais ▾]
[Período ▾]
[Patrimônio]
[Saldo do período] [Parcelas futuras]
[gráfico rolável somente se necessário]
[Hoje: realizado/inferido | depois: projetado]
[Categorias ▾]
[Insights locais ▾]
```

### 7.2 Parcelamentos

```text
[Total estimado a quitar]
[Compras ativas] [Meses]
[Próximos meses — lista vertical]
[Compra A]
  3/10 inferidas por data
  próxima: dd/mm | restante R$...
[nota de inferência]
```

### 7.3 Assinaturas

```text
[Gastos] [Filtro ▾: Assinaturas inferidas]
[R$.../mês | n itens]
[Serviço A]
 categoria · mensal
 R$... [Ver lançamento]
[sem lifecycle confirmado]
```

### 7.4 Categorias

```text
[Período ▾] [Categoria/Conta]
[Resumo textual do donut]
01 Moradia      R$...  xx%
02 Mercado      R$...  xx%
[Expandir: lançamentos]
```

### 7.5 Cartões/Fatura

```text
[Contas] > Cartões
[Cartão A]
Fatura atual (snapshot) R$...
[barra xx%] livre R$...
fecha — | vence —
[Editar]
```

No mobile, não adicionar novas tabs horizontais. Preservar as três primárias + “Mais” já implementadas.

## 8. Estados obrigatórios

| Estado | Resumo | Parcelamentos | Assinaturas | Categorias | Cartões/Fatura |
|---|---|---|---|---|---|
| Loading | skeleton de KPIs/gráfico | skeleton existente | skeleton de lista | skeleton donut/ranking | skeleton cards |
| Empty | cadastrar conta/lançamento | “nenhuma compra parcelada” | “nenhuma recorrência classificada” | “sem gastos no período” | “adicionar cartão” |
| Error sem cache | alerta + retry; escrita bloqueada | alerta existente | alerta + retry | alerta + retry | alerta + retry |
| Error com cache/stale | dados + timestamp + aviso | padrão existente | lista stale | ranking stale | snapshots stale |
| Locked/paywall | leitura segura + CTA de plano | leitura, sem mutar | leitura, sem mutar | leitura, sem mutar | leitura, sem mutar |
| Sem base | explicar comparação | sem meses futuros | base insuficiente | sem base anterior | limite/data ausente |
| Inferido | legenda global | todas as “pagas” | “assinatura inferida” | agregação derivada | snapshot, não fluxo |
| Categoria desconhecida | badge “não mapeada” | rótulo cru seguro | não classificar como assinatura | CTA de correção | N/A |

O código já oferece precedentes de loading/error/empty/stale em Parcelamentos e parte de Gastos, mas a semântica deve ser uniformizada (`frontend/src/modules/finance/FinanceInstallments.tsx:18-32,102-103`; `frontend/src/modules/finance/FinanceExpenses.tsx:42-44,68-74,132-133`).

## 9. Acessibilidade

### EXISTENTE

- Há `aria-busy`, `role=alert`, status de sincronização e labels de gráficos em componentes financeiros (`frontend/src/modules/finance/FinanceScreen.tsx:117-144`; `frontend/src/modules/finance/FinanceInstallments.tsx:18-32`; `frontend/src/modules/finance/FinanceExpenses.tsx:42-44,78-82`).

### PROPOSTA

- Ligar tabs a `tabpanel` com `aria-controls`, roving `tabIndex` e setas.
- Alvos de pelo menos 44×44 px e foco com contraste suficiente.
- Gráficos com resumo textual e opção de lista/tabela acessível; pontos/tooltips por teclado.
- Não depender somente de verde/vermelho, sólido/tracejado ou posição.
- Anunciar troca de período em região de status única, sem excesso de live regions.
- Respeitar reduced motion; preservar ordem de leitura no mobile.
- Valores monetários com texto completo e sinais explícitos; porcentagens com contexto.
- Incerteza deve ser textual: “registrado”, “inferido por data” ou “projetado”.

## 10. BLOQUEADO POR AMBIENTE

Sem executar o produto, não foram validados: correspondência pixel a pixel das capturas com o build atual, viewports, zoom, leitor de tela, foco, dados volumosos, datas de fronteira e legibilidade dos gráficos. Os wireframes são especificação **PROPOSTA**, não declaração de entrega.