# Fase 13 — Extração da confirmação final de importação OFX

## Escopo

Extraída apenas a lógica do handler `ofxConfirm.onclick` (confirmação final
de importação de extrato OFX) de `assets/app.js` para um novo script
`assets/ofx-import-confirmation.js`.

Permanecem em `assets/app.js`, sem alteração de comportamento:

- Upload do arquivo OFX (`ofxFile.onchange`) e chamada a
  `api/import-ofx.php`.
- Renderização do preview (`renderOfxPreview`), incluindo marcação de
  duplicados e select de categoria.
- Cancelamento do modal (`ofxCancel.onclick`).
- A variável `__ofxRows` (posse mantida em `assets/app.js`; passada
  explicitamente para a função extraída, já que é `let` de escopo de
  módulo/script, não propriedade de `window`).

## O que mudou

- Novo arquivo `assets/ofx-import-confirmation.js` com a função
  `confirmOfxImport(rows, picked, categoryFor)`, contendo o corpo exato do
  antigo handler (mesma ordem de operações, mesmos objetos criados, mesmos
  `storeSet`, mesmo toast, mesmo fechamento de modal, mesmo `renderFinance`).
- `assets/app.js`: o handler `ofxConfirm.onclick` virou um adaptador fino
  que apenas lê os checkboxes selecionados (`#ofxRows [data-i]`) e delega
  para `confirmOfxImport`, passando `__ofxRows`, a lista de índices
  selecionados e um callback `categoryFor(i)` que lê o `<select data-cat>`
  correspondente (mesma leitura de categoria de antes, só que via callback
  para não duplicar acesso ao DOM dentro do script extraído).
- `index.php`: adicionada uma tag `<script>` para
  `assets/ofx-import-confirmation.js` com o mesmo padrão de cache-busting
  (`?v=<?= @filemtime(...) ?>`) já usado pelos outros scripts extraídos,
  posicionada **antes** de `assets/app.js`.

## Por que o comportamento é preservado

- `confirmOfxImport` é chamada em tempo de clique, não em tempo de carga do
  script. Como `assets/ofx-import-confirmation.js` é carregado antes de
  `assets/app.js`, mas suas funções só executam depois que o usuário
  interage com a página, as globais definidas em `assets/app.js`
  (`toast`, `genId`, `storeSet`, `getExpenseLines`, `getIncomeLines`,
  `renderFinance`) já existem no escopo global no momento da chamada —
  igual ao padrão já usado pelos outros scripts extraídos
  (`finance-account-movement.js`, `pay-fatura-account.js`,
  `account-transfer.js`).
- O shape e os defaults de despesa (`id`, `label` com fallback
  `'Importado'`, `value`, `date`, `time: '12:00'`, `recorrencia: 'none'`,
  `categoria` selecionada ou `'outros'`, `method: 'outro'`,
  `bank: 'outro'`, `accountId: null`, `createdAt`) e de receita (`id`,
  `label` com fallback, `value`, `type: 'variavel'`, `endDate: null`,
  `createdAt`) foram copiados sem alteração.
- Nenhuma regra de deduplicação foi adicionada; linhas `dup` continuam
  desmarcadas por padrão na renderização (inalterada), mas podem ser
  selecionadas e importadas normalmente.
- A ordem de persistência (`expense_lines_v4` antes de `income_lines`,
  cada um condicional à existência de linhas do tipo) foi mantida
  exatamente.
- O caminho de "nada selecionado" continua retornando cedo com o toast de
  erro `Nada selecionado.`, sem persistência, fechamento de modal,
  `renderFinance` ou toast de sucesso.
- Falhas de persistência (`storeSet` rejeitado) continuam propagando o
  erro e impedindo o fechamento do modal, o `renderFinance` e o toast de
  sucesso subsequentes, pois nenhum `try/catch` foi adicionado.

## Validação

Comandos necessários (não executados nesta sessão por falta de ferramenta
de shell disponível — devem ser rodados manualmente antes do merge):

```
C:\Users\Max\tools\php\php.exe tests\run.php
node tests/js/finance_account_movement_test.js
node tests/js/pay_fatura_account_test.js
node tests/js/account_transfer_test.js
node tests/js/ofx_import_confirmation_test.js
C:\Users\Max\tools\php\php.exe -l index.php
node --check assets/app.js
node --check assets/ofx-import-confirmation.js
node --check tests/js/ofx_import_confirmation_test.js
```

Testes focados adicionados em `tests/js/ofx_import_confirmation_test.js`
cobrem: nada selecionado, somente despesas (shape/defaults exatos),
fallback de descrição para despesa e receita, categoria ausente caindo
para `outros`, somente receitas (shape/defaults exatos), seleção mista,
linha duplicada selecionada e importada sem dedup extra, preservação de
linhas não selecionadas, ordem de persistência
(`expense_lines_v4` → `income_lines`), persistência condicional isolada
(só despesa / só receita), fechamento de modal + render + toast de
sucesso, e propagação de rejeição de persistência sem efeitos colaterais
posteriores.

Smoke tests manuais recomendados (não executados nesta sessão):

- Upload de um OFX válido, conferir preview (duplicados, categorias),
  importar seleção mista de despesas e receitas, conferir persistência,
  toast e fechamento de modal, e conferir ausência de erro de função
  indefinida no console.
- Resposta 402 (plano pago) e OFX inválido, conferindo que o fluxo
  pré-confirmação permanece inalterado.

## Rollback

Reversão é só código, sem dado ou schema envolvido:

1. Restaurar o handler original de `ofxConfirm.onclick` em
   `assets/app.js` (o corpo que hoje está em `confirmOfxImport`).
2. Remover a tag `<script src="assets/ofx-import-confirmation.js?...">`
   de `index.php`.
3. Remover `assets/ofx-import-confirmation.js`,
   `tests/js/ofx_import_confirmation_test.js` e este relatório.

## Arquivos alterados

- `assets/app.js`
- `assets/ofx-import-confirmation.js` (novo)
- `index.php`
- `tests/js/ofx_import_confirmation_test.js` (novo)
- `docs/architecture/finance/PHASE_13_OFX_CONFIRMATION_REPORT.md` (novo)

Nenhum arquivo fora da allowlist foi tocado.
