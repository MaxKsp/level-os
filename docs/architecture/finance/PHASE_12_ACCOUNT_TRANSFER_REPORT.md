# Phase 12 Account Transfer Report

Data: 2026-07-14

## Objetivo executado

Extrair apenas a logica de transferencia entre contas de `assets/app.js`
para um novo arquivo JS local (`assets/account-transfer.js`), seguindo o
mesmo padrao das Fases 10 e 11: sem bundler, sem framework, mesmo escopo
global via `<script>`.

## Escopo desta extracao

Diferente de `applyAccountMovement()` (Fase 10) e `payFaturaAccount()`
(Fase 11), a transferencia **nao existia como funcao nomeada** — era o
corpo inteiro do handler `document.getElementById('trSave').onclick`,
misturando leitura de DOM com a logica de negocio. Segui o mesmo criterio
das fases anteriores (extrair a logica, nao a leitura de DOM):

Movido para `assets/account-transfer.js`, como nova funcao nomeada
`transferBetweenAccounts(fromId, toId, value, date)`:

- validacao de pre-condicoes (contas diferentes, valor > 0, contas
  existentes)
- ajuste de saldo/fatura
- registro em `transfers`
- os dois `storeSet()`
- fechamento do modal, `renderFinance()`, `toast()` e o `undo`

Ficou em `assets/app.js`, dentro do handler `trSave.onclick` (inalterado
na essencia, so delegando):

```js
document.getElementById('trSave').onclick = async ()=>{
  const fromId = document.getElementById('trFrom').value;
  const toId = document.getElementById('trTo').value;
  const value = Number(document.getElementById('trValue').value||0);
  const date = document.getElementById('trDate').value || dkey(new Date());
  await transferBetweenAccounts(fromId, toId, value, date);
};
```

`getTransfers()` **nao foi movida** — ela e um leitor generico usado
tambem na renderizacao do detalhe da conta (linha ~1616, historico de
movimentacoes), fora do escopo desta extracao. `transferBetweenAccounts()`
continua chamando o `getTransfers()` global de `assets/app.js`.

`index.php` passou a carregar o novo arquivo, com o mesmo padrao de
cache-busting por `filemtime()`, entre `pay-fatura-account.js` e
`app.js`:

```html
<script src="assets/pay-fatura-account.js?v=<?= @filemtime(__DIR__.'/assets/pay-fatura-account.js') ?>"></script>
<script src="assets/account-transfer.js?v=<?= @filemtime(__DIR__.'/assets/account-transfer.js') ?>"></script>
<script src="assets/app.js?v=<?= @filemtime(__DIR__.'/assets/app.js') ?>"></script>
```

## Nada foi inventado

`transferBetweenAccounts()` e uma copia literal do corpo que ja existia
em `trSave.onclick`. Nenhuma validacao nova, nenhuma regra de
conciliacao, nenhum conceito de "conta pagadora" e nenhum comportamento
financeiro novo foi introduzido — inclusive porque, como no
`payFaturaAccount()` da Fase 11, o codigo real ja tem tudo isso resolvido
do jeito que esta: a mesma funcao cobre tanto transferencia comum
(`kind: 'transfer'`) quanto pagamento de fatura de cartao por
transferencia (`kind: 'payment'`), decidido so pelo `tipo` da conta de
destino (`to.tipo==='cartao'`).

## O que foi preservado

- shape de `accounts_v2`: nenhum campo novo, nenhum removido
- shape de `transfers`: `{ id, fromId, toId, value, date, kind, createdAt }`,
  igual antes
- ajuste atual de saldo/fatura:
  - origem: `from.saldo -= value`, sempre
  - destino conta comum: `to.saldo += value`
  - destino cartao: `to.fatura = Math.max(0, to.fatura - value)` (nunca
    fica negativa)
- registro atual em `transfers`, incluindo `kind` (`'payment'` quando o
  destino e cartao, `'transfer'` caso contrario)
- ordem atual dos `storeSet()`: `accounts_v2` primeiro, `transfers` depois
- textos: `'Escolha contas diferentes.'`, `'Valor inválido.'`,
  `'Fatura paga por transferência'`, `'Transferência feita'`, com `{error:true}`
  nas duas primeiras
- comportamento atual das pre-condicoes: `!fromId || !toId ||
  fromId===toId` -> toast de erro e retorno; `value<=0` -> toast de erro e
  retorno; conta de origem ou destino nao encontrada na releitura de
  `getAccounts()` -> retorno silencioso, sem toast
- fluxo visual: fecha `transferModalOverlay`, chama `renderFinance()`,
  mostra o `toast()` com `undo` identico ao anterior
- ausencia de mutacao em contas nao envolvidas

## O que nao foi tocado

- confirmacao final de importacao OFX
- cofrinhos
- projecoes
- anomalias
- `payFaturaAccount()` (Fase 11, arquivo `assets/pay-fatura-account.js`)
- `applyAccountMovement()` (Fase 10, arquivo
  `assets/finance-account-movement.js`)
- `api/`
- PHP de backend (exceto `index.php`, so pra carregar o script)
- `app/Modules/Finance/`
- `schema.sql`
- `migrations/`
- `auth.php`
- `db.php`
- `plan.php`
- `ofx.php`
- `getTransfers()`, `updateTransferHint()`, `btnTransfer.onclick`,
  `trFrom.onchange`, `trTo.onchange`, `trCancel.onclick` (wiring de UI do
  modal, fora do escopo desta extracao)

## Sem abstracoes novas

Nenhum bundler, framework, classe ou wrapper foi introduzido.
`assets/account-transfer.js` e um `<script>` simples com uma funcao
global, no mesmo padrao de `assets/finance-account-movement.js` e
`assets/pay-fatura-account.js`.

## Arquivos alterados

- `assets/app.js` (modificado: `trSave.onclick` passa a ler os campos do
  modal e delegar pra `transferBetweenAccounts()`; nenhum outro handler
  tocado)
- `assets/account-transfer.js` (novo)
- `index.php` (modificado: adiciona a tag `<script>` do novo arquivo,
  entre `pay-fatura-account.js` e `app.js`)
- `tests/js/account_transfer_test.js` (novo)
- `docs/architecture/finance/PHASE_12_ACCOUNT_TRANSFER_REPORT.md` (novo)

## Testes automatizados

### `tests/js/account_transfer_test.js`

Teste focal em `node` puro (sem framework, sem bundler). Como
`transferBetweenAccounts()` depende de globais externas (`getAccounts`,
`getTransfers`, `storeSet`, `renderFinance`, `toast`, `genId`) e de
`document.getElementById` pra fechar o modal, cada teste monta um sandbox
`vm` novo com stubs dessas dependencias:

- transferencia entre duas contas validas: `accounts_v2` atualizado
  corretamente (debito na origem, credito no destino)
- persistencia correta em `transfers`: shape completo (`id`, `fromId`,
  `toId`, `value`, `date`, `kind`, `createdAt`)
- pagamento de fatura via esse fluxo (destino cartao): fatura abatida,
  `kind='payment'`, toast especifico, e confirmacao de que a fatura nunca
  fica negativa (`Math.max(0, ...)`)
- ordem dos `storeSet()`: `accounts_v2` antes de `transfers`, mais
  `renderFinance()` e o fechamento do modal
- ausencia de mutacao em contas nao envolvidas (uma conta comum e um
  cartao no mesmo array, nao participantes da transferencia)
- quatro cenarios de pre-condicao invalida sem mutacao: `fromId`/`toId`
  vazio, `fromId===toId`, `value<=0`, conta nao encontrada na releitura

Rodar: `node tests/js/account_transfer_test.js`

### Reexecucao dos testes das fases anteriores

- `node tests/js/finance_account_movement_test.js`: 7/7 (sem regressao)
- `node tests/js/pay_fatura_account_test.js`: 8/8 (sem regressao)

### Suite PHP

`tests/run.php` nao foi afetado por esta fase (mudanca e so front-end);
rodado como validacao de regressao geral.

## Validacao

- `php -l index.php`: sem erro de sintaxe
- `node --check assets/app.js`: sem erro de sintaxe
- `node --check assets/account-transfer.js`: sem erro de sintaxe
- `node --check tests/js/account_transfer_test.js`: sem erro de sintaxe
- `node tests/js/account_transfer_test.js`: 10/10 passou
- `node tests/js/finance_account_movement_test.js`: 7/7 passou
- `node tests/js/pay_fatura_account_test.js`: 8/8 passou
- `tests/run.php` (suite PHP completa): 13/13 passou (sem regressao)
- `git diff --stat`: `assets/app.js` com 4 insercoes, 24 remocoes;
  `index.php` com 1 insercao; nenhum arquivo PHP de dominio ou de `api/`
  tocado

## Smoke tests manuais pendentes

Cobertura automatizada valida `transferBetweenAccounts()` isolada, com
dependencias simuladas. Ela **nao** substitui validacao manual no
navegador, porque:

- o fluxo real depende de `getAccounts`/`getTransfers`/`storeSet` reais
  (via `api/finance.php`/`api/data.php`), e de `renderFinance()` real, que
  toca DOM
- a ordem de carregamento de scripts em `index.php` mudou de novo (mais
  um arquivo antes de `app.js`) — precisa confirmar no navegador que
  `transferBetweenAccounts` esta disponivel quando `app.js` executa
- o handler `trFrom.onchange`/`trTo.onchange`/`updateTransferHint()`, que
  monta as opcoes dos selects do modal, nao foi tocado mas precisa
  continuar entregando `fromId`/`toId` validos pro handler que agora
  delega

Lista acumulada de smoke tests manuais pendentes (Fases 10, 11 e 12):

1. **Criar despesa em conta** — nova despesa vinculada a uma conta comum;
   confirmar que o saldo debita certo (Fase 10).
2. **Editar despesa em conta** — editar valor/conta de uma despesa
   existente; confirmar estorno do movimento antigo e aplicacao do novo
   (Fase 10).
3. **Excluir despesa em conta** — excluir despesa vinculada a conta;
   confirmar estorno e undo do toast (Fase 10).
4. **Pagar fatura** (Fase 11) — abrir o detalhe de um cartao com fatura
   > 0, clicar "Pagar fatura", confirmar o dialog; verificar zerar fatura,
   despesa derivada no extrato, atualizacao do detalhe e o toast "Fatura
   paga". Repetir cancelando o `confirm()`.
5. **Transferencia entre contas** (foco desta fase) — abrir o modal de
   transferencia, escolher origem/destino validos (conta -> conta),
   confirmar que o saldo se move corretamente entre as duas e que o toast
   "Transferência feita" aparece com undo funcional.
6. **Pagamento de fatura via transferencia** (foco desta fase) — no mesmo
   modal, escolher um cartao como destino; confirmar que a fatura abate
   (sem ficar negativa) e que o toast "Fatura paga por transferência"
   aparece.

Verificar tambem: console do navegador sem erro
`transferBetweenAccounts is not defined` (confirmaria problema de ordem
de carregamento entre os quatro scripts agora envolvidos), e que os dois
fluxos de pagamento de fatura que coexistem no app
(`payFaturaAccount()` no detalhe da conta, e pagamento via transferencia
neste modal) continuam independentes e sem conflito visual.

## Garantias desta fase

- nenhum contrato de API foi tocado
- nenhuma regra de negocio nova foi introduzida
- nenhum bundler, framework, classe ou abstracao nova foi criado
- comportamento de `transferBetweenAccounts()` e identico ao anterior —
  copia literal do corpo do handler, so mudou de arquivo e ganhou nome
- rollback trivial: mover a funcao de volta pro corpo de
  `trSave.onclick` em `assets/app.js`, remover a tag `<script>` nova e
  apagar o arquivo

## Proximo passo (fora deste recorte)

Cofrinhos, confirmacao final de OFX, projecoes e anomalias continuam
inteiramente em `assets/app.js`, como regra cliente-side nao migrada —
conforme `FINANCE_BOUNDARIES.md` e `FINANCE_EXTRACTION_RISKS.md`.
