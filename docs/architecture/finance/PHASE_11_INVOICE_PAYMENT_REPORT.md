# Phase 11 Invoice Payment Report

Data: 2026-07-14

## Objetivo executado

Extrair apenas `payFaturaAccount()` de `assets/app.js` para um novo arquivo
JS local (`assets/pay-fatura-account.js`), seguindo o mesmo padrao usado em
`assets/finance-account-movement.js` (Fase 10): sem bundler, sem
framework, mesmo escopo global via `<script>`.

## Escopo desta extracao

Movido para `assets/pay-fatura-account.js`:

- `payFaturaAccount(acc)`

Copia literal — nenhuma linha de logica foi reescrita. A funcao continua
dependendo de varias globais definidas em `assets/app.js`
(`getAccounts`, `getExpenseLines`, `storeSet`, `refreshDetail`,
`renderFinance`, `toast`, `genId`, `dkey`, `pad`, `fmtMoney`) e do
`confirm()` do navegador — isso ja era assim antes da extracao, e continua
funcionando porque os dois arquivos compartilham o mesmo escopo global de
`<script>` no navegador (nao ha isolamento por modulo).

`index.php` passou a carregar o novo arquivo, com o mesmo padrao de
cache-busting por `filemtime()`, entre `finance-account-movement.js` e
`app.js`:

```html
<script src="assets/finance-account-movement.js?v=<?= @filemtime(__DIR__.'/assets/finance-account-movement.js') ?>"></script>
<script src="assets/pay-fatura-account.js?v=<?= @filemtime(__DIR__.'/assets/pay-fatura-account.js') ?>"></script>
<script src="assets/app.js?v=<?= @filemtime(__DIR__.'/assets/app.js') ?>"></script>
```

## Nota importante sobre "conta pagadora"

O escopo da tarefa citava "debitar a conta pagadora" e "conta pagadora
valida" como comportamento a preservar. Ao ler o codigo real de
`payFaturaAccount()`, confirmei que **isso nao existe hoje**: a funcao
recebe so o proprio cartao (`acc`), zera a `fatura` desse mesmo cartao, e
cria uma despesa derivada **sem** `accountId` — ou seja, nao ha uma conta
separada sendo debitada para pagar a fatura; o unico "debito" e a propria
fatura do cartao voltando a zero. Isso e diferente do handler irmao em
`assets/app.js` (`document.getElementById('acPayFatura').onclick`, na
tela de edicao de conta), que tem uma logica quase identica mas **nao**
foi tocado, pois nao e `payFaturaAccount()` e nao estava no escopo desta
fase.

Segui a regra do ladder — "extrair exatamente o que existe" — em vez do
texto da tarefa, para nao introduzir uma mudanca de comportamento
disfarcada de extracao. Os testes e este relatorio documentam esse
comportamento real: "conta pagadora" e o proprio cartao sendo pago.

## O que foi preservado

- assinatura: `payFaturaAccount(acc)`
- pre-condicoes: `acc.tipo !== 'cartao'` ou `Number(acc.fatura) <= 0` ->
  retorna sem fazer nada
- `confirm()` com o texto atual; cancelar -> retorna sem fazer nada
- releitura de `getAccounts()` e busca por `id` antes de mutar (`a`); conta
  nao encontrada -> retorna sem fazer nada
- zerar a fatura do cartao pagador (`a.fatura = 0`)
- despesa derivada criada com o mesmo shape: `id` (via `genId()`),
  `label: 'Pagamento fatura — ' + a.label`, `value` = valor da fatura,
  `date`/`time` via `dkey`/`pad`, `recorrencia: 'none'`,
  `categoria: 'outros'`, `method: 'pix'`, `bank: a.bank`, `createdAt`
- ordem atual dos `storeSet()`: `accounts_v2` primeiro, depois
  `expense_lines_v4`
- `refreshDetail()` e `renderFinance()` chamados depois dos `storeSet()`,
  nesta ordem
- `toast('Fatura paga')` no final
- unico chamador: `detailAction('payfatura', ...)` em
  `assets/app.js`, inalterado

## O que nao foi tocado

- transferencias
- confirmacao final de importacao OFX
- cofrinhos
- projecoes
- anomalias
- `api/`
- PHP de backend (exceto `index.php`, so pra carregar o script)
- `app/Modules/Finance/`
- `schema.sql`
- `migrations/`
- `auth.php`
- `db.php`
- `plan.php`
- `ofx.php`
- o handler irmao `acPayFatura` (logica quase identica, mas fora do
  escopo desta fase)

## Sem abstracoes novas

Nenhum bundler, framework, classe ou wrapper foi introduzido.
`assets/pay-fatura-account.js` e um `<script>` simples com uma funcao
global, no mesmo padrao de `assets/finance-account-movement.js`.

## Arquivos alterados

- `assets/app.js` (modificado: remove a definicao de
  `payFaturaAccount()`, deixa um comentario apontando pro novo arquivo; o
  unico chamador continua identico)
- `assets/pay-fatura-account.js` (novo)
- `index.php` (modificado: adiciona a tag `<script>` do novo arquivo,
  antes de `assets/app.js`)
- `tests/js/pay_fatura_account_test.js` (novo)
- `docs/architecture/finance/PHASE_11_INVOICE_PAYMENT_REPORT.md` (novo)

## Testes automatizados

### `tests/js/pay_fatura_account_test.js`

Teste focal em `node` puro (sem framework, sem bundler — so
`node:assert`, `node:fs`, `node:path`, `node:vm`, built-in). Como
`payFaturaAccount()` depende de varias globais externas, cada teste monta
um sandbox `vm` novo com stubs dessas dependencias (`getAccounts`,
`getExpenseLines`, `storeSet`, `refreshDetail`, `renderFinance`, `toast`,
`genId`, `confirm`, e `dkey`/`pad` espelhando a implementacao real e
trivial de `assets/app.js`), isolando so o comportamento da funcao
extraida:

- cartao com fatura aberta + conta pagadora valida (o proprio cartao):
  fatura debitada corretamente pra zero
- despesa derivada criada corretamente: `label`, `value`, `date`, `time`,
  `recorrencia`, `categoria`, `method`, `bank`, `createdAt`, sem
  `accountId` (mesmo comportamento atual)
- ordem dos `storeSet()`: `accounts_v2` antes de `expense_lines_v4`, mais
  `refreshDetail()`, `renderFinance()` e o `toast` atual
- ausencia de mutacao indevida em outras contas (conta comum e outro
  cartao no mesmo array)
- pre-condicao invalida: conta nao e cartao -> nenhuma mutacao
- pre-condicao invalida: fatura zero/negativa -> nenhuma mutacao
- usuario cancela a confirmacao -> nenhuma mutacao
- conta nao encontrada na releitura de `getAccounts()` -> nenhuma mutacao

Rodar: `node tests/js/pay_fatura_account_test.js`

### `tests/js/finance_account_movement_test.js`

Reexecutado sem alteracoes; continua 7/7.

### Suite PHP

`tests/run.php` nao foi afetado por esta fase (mudanca e so front-end);
rodado como validacao de regressao geral.

## Validacao

- `php -l index.php`: sem erro de sintaxe
- `node --check assets/app.js`: sem erro de sintaxe
- `node --check assets/pay-fatura-account.js`: sem erro de sintaxe
- `node --check tests/js/pay_fatura_account_test.js`: sem erro de sintaxe
- `node tests/js/pay_fatura_account_test.js`: 8/8 passou
- `node tests/js/finance_account_movement_test.js`: 7/7 passou (sem
  regressao)
- `tests/run.php` (suite PHP completa): 13/13 passou (sem regressao)
- `git diff --stat`: `assets/app.js` com 2 insercoes, 16 remocoes;
  `index.php` com 1 insercao; nenhum arquivo PHP de dominio ou de `api/`
  tocado

## Smoke tests manuais pendentes

Cobertura automatizada valida `payFaturaAccount()` isolada, com
dependencias simuladas. Ela **nao** substitui validacao manual no
navegador, porque:

- o fluxo real depende do `confirm()` nativo do navegador, de
  `getAccounts`/`storeSet` reais (via `api/finance.php`/`api/data.php`), e
  do `refreshDetail()`/`renderFinance()` reais, que tocam DOM
- a ordem de carregamento de scripts em `index.php` mudou de novo (mais um
  arquivo antes de `app.js`) — precisa confirmar no navegador que
  `payFaturaAccount` esta disponivel quando `app.js` executa

Antes de considerar esta fase pronta para producao, validar manualmente
(reafirmando a lista pendente da Fase 10 e acrescentando o foco desta
fase):

1. **Criar despesa em conta** — nova despesa vinculada a uma conta comum;
   confirmar que o saldo debita certo (Fase 10, ainda pendente).
2. **Editar despesa em conta** — editar valor/conta de uma despesa
   existente; confirmar estorno do movimento antigo e aplicacao do novo
   (Fase 10, ainda pendente).
3. **Excluir despesa em conta** — excluir despesa vinculada a conta;
   confirmar estorno e undo do toast (Fase 10, ainda pendente).
4. **Pagar fatura** (foco desta fase) — abrir o detalhe de um cartao com
   fatura > 0, clicar "Pagar fatura", confirmar o dialog; verificar que a
   fatura zera na tela, que uma despesa "Pagamento fatura — <cartão>"
   aparece no extrato, que o detalhe da conta atualiza sozinho
   (`refreshDetail`), e que o toast "Fatura paga" aparece. Repetir
   cancelando o `confirm()` e conferir que nada muda.
5. **Transferencia entre contas** — fluxo de transferencia (nao tocado
   nesta fase); confirmar que continua funcionando normalmente apos mais
   uma mudanca na ordem de carregamento de scripts.

Verificar tambem: console do navegador sem erro
`payFaturaAccount is not defined` (confirmaria problema de ordem de
carregamento entre os tres scripts), e que o botao "Pagar fatura" tanto no
detalhe da conta (`payFaturaAccount`, extraido) quanto no modal de edicao
(`acPayFatura`, no local, nao tocado) continuam funcionando de forma
independente.

## Garantias desta fase

- nenhum contrato de API foi tocado
- nenhuma regra de negocio nova foi introduzida
- nenhum bundler, framework, classe ou abstracao nova foi criado
- comportamento de `payFaturaAccount()` e identico ao anterior — copia
  literal, so mudou de arquivo
- rollback trivial: mover a funcao de volta pra `assets/app.js`, remover a
  tag `<script>` nova e apagar o arquivo

## Proximo passo (fora deste recorte)

O handler irmao `acPayFatura` (modal de edicao de conta), transferencias,
cofrinhos, confirmacao final de OFX, projecoes e anomalias continuam
inteiramente em `assets/app.js`, como regra cliente-side nao migrada —
conforme `FINANCE_BOUNDARIES.md` e `FINANCE_EXTRACTION_RISKS.md`.
