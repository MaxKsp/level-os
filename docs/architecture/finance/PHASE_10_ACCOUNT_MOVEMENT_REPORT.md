# Phase 10 Account Movement Report

Data: 2026-07-14

## Objetivo executado

Extrair apenas `applyAccountMovement()` de `assets/app.js` para um novo
arquivo JS local (`assets/finance-account-movement.js`), sem bundler, sem
framework, sem alterar o deploy.

## Escopo desta extracao

Movido para `assets/finance-account-movement.js`:

- `applyAccountMovement(accounts, accountId, value, sign)`

Mesma assinatura, mesmo corpo, mesmo comportamento — copia literal da
funcao que existia em `assets/app.js`. Nenhuma logica foi reescrita.

`index.php` passou a carregar o novo arquivo, com o mesmo padrao de
cache-busting por `filemtime()` ja usado em `assets/app.js`, **antes** da
tag de `assets/app.js`:

```html
<script src="assets/finance-account-movement.js?v=<?= @filemtime(__DIR__.'/assets/finance-account-movement.js') ?>"></script>
<script src="assets/app.js?v=<?= @filemtime(__DIR__.'/assets/app.js') ?>"></script>
```

`applyAccountMovement()` continua uma funcao global simples (sem modulo
ES, sem `type="module"`, sem IIFE) — mesmo estilo de todo o resto de
`assets/app.js`, que tambem depende de escopo global compartilhado entre
scripts carregados via `<script src>` puro.

## O que foi preservado

- assinatura: `applyAccountMovement(accounts, accountId, value, sign)`
- contas comuns: `sign +1` debita `saldo` (`saldo -= value`); `sign -1`
  estorna (`saldo += value`)
- cartoes (`tipo === 'cartao'`): `sign +1` soma em `fatura`; `sign -1`
  subtrai (estorno)
- conta inexistente: `accounts.find(...)` nao encontra, funcao retorna sem
  lancar erro e sem mutar nada
- shape de `accounts_v2`: nenhum campo novo, nenhum campo removido
- os cinco pontos de chamada em `assets/app.js`, na mesma ordem, com os
  mesmos argumentos:
  - editar despesa (estorna o movimento antigo, aplica o novo, quando
    `accountId` ou `value` mudam)
  - criar despesa (aplica `+1` se `accountId` setado)
  - excluir despesa (estorna `-1`)
  - desfazer exclusao / undo do toast (reaplica `+1`)
- ordem atual das gravacoes: `applyAccountMovement()` continua rodando
  antes de `storeSet('accounts_v2', accounts)`; `storeSet('expense_lines_v4', ...)`
  continua depois, na mesma sequencia de cada handler
- chamadas atuais de `storeSet()`: nenhuma foi adicionada, removida ou
  reordenada
- comportamento visual e financeiro dos fluxos existentes: nenhuma
  renderizacao, `toast()` ou fluxo de undo foi tocado

## O que nao foi tocado

- `payFaturaAccount()`
- transferencias (`accountAction`, `getTransfers`, `updateTransferHint`)
- cofrinhos (`getVaults`, `openVaultModal`, `openVaultMove`,
  `renderVaultsPage`)
- confirmacao final de importacao OFX (`renderOfxPreview` e o fluxo de
  gravacao no cliente)
- projecoes (`bucketPeriodTotals`, `expenseTotalInRange`, etc.)
- anomalias (`detectAnomalies`, `renderAnomalies`)
- `api/`
- qualquer arquivo PHP
- banco, `schema.sql`, `migrations/`
- `app/Modules/Finance/` (nenhum modulo PHP existente foi tocado)

## Sem abstracoes novas

Nenhum bundler, framework, classe ou wrapper foi introduzido.
`assets/finance-account-movement.js` e um `<script>` simples com uma
funcao global, carregado exatamente como os demais scripts de `index.php`.

## Arquivos alterados

- `assets/app.js` (modificado: remove a definicao de
  `applyAccountMovement()`, deixa um comentario apontando pro novo
  arquivo; os cinco pontos de chamada continuam identicos)
- `assets/finance-account-movement.js` (novo)
- `index.php` (modificado: adiciona a tag `<script>` do novo arquivo,
  antes de `assets/app.js`)
- `tests/js/finance_account_movement_test.js` (novo)
- `docs/architecture/finance/PHASE_10_ACCOUNT_MOVEMENT_REPORT.md` (novo)

## Testes automatizados

### `tests/js/finance_account_movement_test.js`

Teste focal em `node` puro (sem framework, sem bundler, sem `npm install`
— so `node:assert`, `node:fs`, `node:path`, `node:vm`, todos built-in).
Carrega `assets/finance-account-movement.js` num contexto `vm` isolado
(a funcao nao toca DOM) e roda:

- conta comum: debito (`sign +1`) subtrai do `saldo`
- conta comum: credito/estorno (`sign -1`) devolve o `saldo` ao valor
  original
- cartao: debito (`sign +1`) soma na `fatura`
- cartao: credito/estorno (`sign -1`) subtrai da `fatura`
- conta inexistente: nao lanca erro e nao muda nenhuma conta do array
- ausencia de mutacao indevida em outras contas: movimentar uma conta nao
  toca no `saldo`/`fatura` das demais

Rodar: `node tests/js/finance_account_movement_test.js`

### Suite PHP

`tests/run.php` nao foi afetado por esta fase (mudanca e so front-end);
rodado como validacao de regressao geral.

## Validacao

- `php -l index.php`: sem erro de sintaxe
- `node --check assets/app.js`: sem erro de sintaxe
- `node --check assets/finance-account-movement.js`: sem erro de sintaxe
- `node --check tests/js/finance_account_movement_test.js`: sem erro de
  sintaxe
- `node tests/js/finance_account_movement_test.js`: 7/7 passou
- `tests/run.php` (suite PHP completa): 13/13 passou, sem regressao
- `git diff --stat`: `assets/app.js` com 2 insercoes, 7 remocoes;
  `index.php` com 1 insercao; nenhum arquivo PHP de dominio ou de `api/`
  tocado

## Smoke tests manuais obrigatorios

Cobertura automatizada acima valida `applyAccountMovement()` isolada, com
dados sinteticos. Ela **nao** substitui validacao manual dos fluxos reais
no navegador, porque:

- os handlers que chamam `applyAccountMovement()` tambem manipulam DOM,
  `storeGet`/`storeSet` reais (via `api/finance.php`/`api/data.php`) e
  `toast()`/undo
- a ordem de carregamento de scripts em `index.php` mudou (novo arquivo
  antes de `app.js`) — precisa confirmar que o navegador carrega os dois
  na ordem certa e que `applyAccountMovement` esta disponivel quando
  `app.js` executa

Antes de considerar esta fase pronta para producao, validar manualmente:

1. **Criar despesa em conta** — nova despesa vinculada a uma conta comum;
   confirmar que o saldo da conta debita o valor certo e que a despesa
   aparece na lista.
2. **Editar despesa em conta** — editar valor e/ou conta de uma despesa
   existente; confirmar que o movimento antigo e estornado e o novo e
   aplicado (saldo/fatura da conta antiga e da nova ficam corretos).
3. **Excluir despesa em conta** — excluir uma despesa vinculada a conta;
   confirmar que o saldo estorna, e que o undo do toast reaplica o
   movimento corretamente.
4. **Pagar fatura** — fluxo de `payFaturaAccount()` (nao tocado nesta
   fase); confirmar que continua funcionando normalmente apos a mudanca de
   carregamento de scripts.
5. **Transferencia entre contas** — fluxo de transferencia (nao tocado
   nesta fase); confirmar que continua funcionando normalmente apos a
   mudanca de carregamento de scripts.

Verificar tambem, de forma geral: console do navegador sem erros de
`applyAccountMovement is not defined` (confirmaria problema de ordem de
carregamento), e responsividade mobile/desktop da tela financeira sem
mudanca visual.

## Garantias desta fase

- nenhum contrato de API foi tocado
- nenhuma regra de negocio nova foi introduzida
- nenhum bundler, framework, classe ou abstracao nova foi criado
- comportamento de `applyAccountMovement()` e identico ao anterior — copia
  literal, so mudou de arquivo
- rollback trivial: mover a funcao de volta pra `assets/app.js`, remover a
  tag `<script>` nova e apagar o arquivo

## Proximo passo (fora deste recorte)

`payFaturaAccount()`, transferencias, cofrinhos, confirmacao final de OFX,
projecoes e anomalias continuam inteiramente em `assets/app.js`, como
regra cliente-side nao migrada — conforme documentado em
`FINANCE_BOUNDARIES.md` e `FINANCE_EXTRACTION_RISKS.md` (risco #4: regra
de negocio significativa ainda mora no front).
