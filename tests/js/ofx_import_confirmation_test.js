'use strict';

/**
 * Teste focal de confirmOfxImport() (Fase 13). Roda com node puro, sem
 * framework nem bundler.
 *
 * confirmOfxImport() depende de varias funcoes globais definidas em
 * assets/app.js (getExpenseLines, getIncomeLines, storeSet, renderFinance,
 * toast, genId). No app real elas coexistem no mesmo escopo global via
 * <script> puro. Aqui, cada teste monta um sandbox vm fresco com stubs
 * dessas dependencias, pra isolar so o comportamento de
 * confirmOfxImport() sem carregar o app.js inteiro.
 *
 * Rodar: node tests/js/ofx_import_confirmation_test.js
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const filePath = path.join(__dirname, '..', '..', 'assets', 'ofx-import-confirmation.js');
const code = fs.readFileSync(filePath, 'utf8');

function makeHarness({ expLines, incLines }) {
  const state = {
    expLines,
    incLines,
    storeSetCalls: [],
    renderFinanceCalled: false,
    toastMessages: [],
    modalClosed: false,
    genIdCounter: 0,
  };

  const modalOverlay = {
    classList: {
      remove: (cls) => { if (cls === 'open') state.modalClosed = true; },
    },
  };

  const sandbox = {
    getExpenseLines: async () => state.expLines,
    getIncomeLines: async () => state.incLines,
    storeSet: async (key, value) => { state.storeSetCalls.push([key, value]); },
    renderFinance: () => { state.renderFinanceCalled = true; },
    toast: (msg) => { state.toastMessages.push(msg); },
    genId: () => `id_${++state.genIdCounter}`,
    document: {
      getElementById: (id) => (id === 'ofxModalOverlay' ? modalOverlay : null),
    },
  };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: filePath });

  return { confirmOfxImport: sandbox.confirmOfxImport, state };
}

let passed = 0;
let failed = 0;
const tests = [];

function test(name, fn) {
  tests.push(async () => {
    try {
      await fn();
      passed++;
      console.log(`[PASS] ${name}`);
    } catch (err) {
      failed++;
      console.log(`[FAIL] ${name}`);
      console.log(`  ${err.message}`);
    }
  });
}

test('nada selecionado: toast de erro, sem persistencia, sem fechar modal, sem render', async () => {
  const { confirmOfxImport, state } = makeHarness({ expLines: [], incLines: [] });

  await confirmOfxImport([{ kind: 'expense', desc: 'X', value: 10, date: '2026-01-01' }], [], () => 'outros');

  assert.deepEqual(state.toastMessages, ['Nada selecionado.']);
  assert.equal(state.storeSetCalls.length, 0);
  assert.equal(state.modalClosed, false);
  assert.equal(state.renderFinanceCalled, false);
});

test('somente despesas: cria linha com shape e defaults exatos', async () => {
  const { confirmOfxImport, state } = makeHarness({ expLines: [], incLines: [] });
  const rows = [{ kind: 'expense', desc: 'Mercado', value: 55.5, date: '2026-02-10' }];

  await confirmOfxImport(rows, [0], () => 'alimentacao');

  assert.equal(state.expLines.length, 1);
  const line = state.expLines[0];
  assert.equal(typeof line.id, 'string');
  assert.equal(line.label, 'Mercado');
  assert.equal(line.value, 55.5);
  assert.equal(line.date, '2026-02-10');
  assert.equal(line.time, '12:00');
  assert.equal(line.recorrencia, 'none');
  assert.equal(line.categoria, 'alimentacao');
  assert.equal(line.method, 'outro');
  assert.equal(line.bank, 'outro');
  assert.equal(line.accountId, null);
  assert.equal(typeof line.createdAt, 'number');
  assert.equal(state.incLines.length, 0);
});

test('despesa sem descricao usa fallback "Importado"', async () => {
  const { confirmOfxImport, state } = makeHarness({ expLines: [], incLines: [] });
  const rows = [{ kind: 'expense', desc: '', value: 10, date: '2026-01-01' }];

  await confirmOfxImport(rows, [0], () => 'outros');

  assert.equal(state.expLines[0].label, 'Importado');
});

test('categoria nao selecionada cai para "outros"', async () => {
  const { confirmOfxImport, state } = makeHarness({ expLines: [], incLines: [] });
  const rows = [{ kind: 'expense', desc: 'Sem categoria', value: 10, date: '2026-01-01' }];

  await confirmOfxImport(rows, [0], () => undefined);

  assert.equal(state.expLines[0].categoria, 'outros');
});

test('somente receitas: cria linha com shape e defaults exatos', async () => {
  const { confirmOfxImport, state } = makeHarness({ expLines: [], incLines: [] });
  const rows = [{ kind: 'income', desc: 'Salario', value: 3000 }];

  await confirmOfxImport(rows, [0], () => 'outros');

  assert.equal(state.incLines.length, 1);
  const line = state.incLines[0];
  assert.equal(typeof line.id, 'string');
  assert.equal(line.label, 'Salario');
  assert.equal(line.value, 3000);
  assert.equal(line.type, 'variavel');
  assert.equal(line.endDate, null);
  assert.equal(typeof line.createdAt, 'number');
  assert.equal(state.expLines.length, 0);
});

test('receita sem descricao usa fallback "Importado"', async () => {
  const { confirmOfxImport, state } = makeHarness({ expLines: [], incLines: [] });
  const rows = [{ kind: 'income', desc: '', value: 100 }];

  await confirmOfxImport(rows, [0], () => 'outros');

  assert.equal(state.incLines[0].label, 'Importado');
});

test('selecao mista: despesa e receita importadas juntas, contagem correta no toast', async () => {
  const { confirmOfxImport, state } = makeHarness({ expLines: [], incLines: [] });
  const rows = [
    { kind: 'expense', desc: 'Aluguel', value: 1200, date: '2026-03-01' },
    { kind: 'income', desc: 'Freela', value: 500 },
  ];

  await confirmOfxImport(rows, [0, 1], () => 'moradia');

  assert.equal(state.expLines.length, 1);
  assert.equal(state.incLines.length, 1);
  assert.deepEqual(state.toastMessages, ['2 lançamento(s) importado(s)']);
});

test('linha marcada como duplicada pode ser selecionada e importada normalmente', async () => {
  const { confirmOfxImport, state } = makeHarness({ expLines: [], incLines: [] });
  const rows = [{ kind: 'expense', desc: 'Duplicado', value: 20, date: '2026-01-05', dup: true }];

  await confirmOfxImport(rows, [0], () => 'outros');

  assert.equal(state.expLines.length, 1, 'linha dup selecionada deve ser importada sem dedup adicional');
});

test('linhas nao selecionadas permanecem intocadas (preserva linhas nao relacionadas)', async () => {
  const { confirmOfxImport, state } = makeHarness({ expLines: [], incLines: [] });
  const rows = [
    { kind: 'expense', desc: 'A', value: 1, date: '2026-01-01' },
    { kind: 'expense', desc: 'B', value: 2, date: '2026-01-02' },
    { kind: 'income', desc: 'C', value: 3 },
  ];

  await confirmOfxImport(rows, [1], () => 'outros');

  assert.equal(state.expLines.length, 1);
  assert.equal(state.expLines[0].label, 'B');
  assert.equal(state.incLines.length, 0);
});

test('ordem de persistencia: expense_lines_v4 antes de income_lines quando ambos existem', async () => {
  const { confirmOfxImport, state } = makeHarness({ expLines: [], incLines: [] });
  const rows = [
    { kind: 'expense', desc: 'A', value: 1, date: '2026-01-01' },
    { kind: 'income', desc: 'B', value: 2 },
  ];

  await confirmOfxImport(rows, [0, 1], () => 'outros');

  assert.equal(state.storeSetCalls.length, 2);
  assert.equal(state.storeSetCalls[0][0], 'expense_lines_v4');
  assert.equal(state.storeSetCalls[1][0], 'income_lines');
});

test('somente despesas: nenhum storeSet de income_lines e chamado', async () => {
  const { confirmOfxImport, state } = makeHarness({ expLines: [], incLines: [] });
  const rows = [{ kind: 'expense', desc: 'A', value: 1, date: '2026-01-01' }];

  await confirmOfxImport(rows, [0], () => 'outros');

  assert.equal(state.storeSetCalls.length, 1);
  assert.equal(state.storeSetCalls[0][0], 'expense_lines_v4');
});

test('somente receitas: nenhum storeSet de expense_lines_v4 e chamado', async () => {
  const { confirmOfxImport, state } = makeHarness({ expLines: [], incLines: [] });
  const rows = [{ kind: 'income', desc: 'A', value: 1 }];

  await confirmOfxImport(rows, [0], () => 'outros');

  assert.equal(state.storeSetCalls.length, 1);
  assert.equal(state.storeSetCalls[0][0], 'income_lines');
});

test('confirmacao com sucesso fecha modal, rerenderiza e mostra toast com contagem', async () => {
  const { confirmOfxImport, state } = makeHarness({ expLines: [], incLines: [] });
  const rows = [{ kind: 'expense', desc: 'A', value: 1, date: '2026-01-01' }];

  await confirmOfxImport(rows, [0], () => 'outros');

  assert.equal(state.modalClosed, true);
  assert.equal(state.renderFinanceCalled, true);
  assert.deepEqual(state.toastMessages, ['1 lançamento(s) importado(s)']);
});

test('persistencia rejeitada propaga erro e nao fecha modal/renderiza/mostra sucesso', async () => {
  const rejectState = { renderFinanceCalled: false, toastMessages: [], modalClosed: false };
  const modalOverlay = { classList: { remove: (cls) => { if (cls === 'open') rejectState.modalClosed = true; } } };
  const sandbox = {
    getExpenseLines: async () => [],
    getIncomeLines: async () => [],
    storeSet: async () => { throw new Error('falha ao salvar'); },
    renderFinance: () => { rejectState.renderFinanceCalled = true; },
    toast: (msg) => { rejectState.toastMessages.push(msg); },
    genId: () => 'id_x',
    document: { getElementById: (id) => (id === 'ofxModalOverlay' ? modalOverlay : null) },
  };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: filePath });

  const rows = [{ kind: 'expense', desc: 'A', value: 1, date: '2026-01-01' }];

  await assert.rejects(
    () => sandbox.confirmOfxImport(rows, [0], () => 'outros'),
    /falha ao salvar/
  );

  assert.equal(rejectState.modalClosed, false, 'modal nao deve fechar quando a persistencia falha');
  assert.equal(rejectState.renderFinanceCalled, false, 'nao deve rerenderizar quando a persistencia falha');
  assert.deepEqual(rejectState.toastMessages, [], 'nenhum toast de sucesso quando a persistencia falha');
});

(async () => {
  for (const run of tests) {
    await run();
  }
  console.log('');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total:  ${passed + failed}`);
  process.exit(failed === 0 ? 0 : 1);
})();
