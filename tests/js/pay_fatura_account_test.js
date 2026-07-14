'use strict';

/**
 * Teste focal de payFaturaAccount() (Fase 11). Roda com node puro, sem
 * framework nem bundler.
 *
 * payFaturaAccount() depende de varias funcoes globais definidas em
 * assets/app.js (getAccounts, getExpenseLines, storeSet, refreshDetail,
 * renderFinance, toast, genId, dkey, pad, fmtMoney) e do confirm() do
 * navegador. No app real elas coexistem no mesmo escopo global via
 * <script> puro. Aqui, cada teste monta um sandbox vm fresco com stubs
 * dessas dependencias, pra isolar so o comportamento de
 * payFaturaAccount() sem carregar o app.js inteiro.
 *
 * Rodar: node tests/js/pay_fatura_account_test.js
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const filePath = path.join(__dirname, '..', '..', 'assets', 'pay-fatura-account.js');
const code = fs.readFileSync(filePath, 'utf8');

function makeHarness({ accounts, lines, confirmResult }) {
  const state = {
    accounts,
    lines,
    storeSetCalls: [],
    refreshDetailCalled: false,
    renderFinanceCalled: false,
    toastMessages: [],
  };

  const sandbox = {
    confirm: () => confirmResult,
    getAccounts: async () => state.accounts,
    getExpenseLines: async () => state.lines,
    storeSet: async (key, value) => { state.storeSetCalls.push([key, value]); },
    refreshDetail: async () => { state.refreshDetailCalled = true; },
    renderFinance: () => { state.renderFinanceCalled = true; },
    toast: (msg) => { state.toastMessages.push(msg); },
    genId: () => 'exp_test_id',
    dkey: (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
    pad: (n) => n.toString().padStart(2, '0'),
    fmtMoney: (v) => `R$ ${v}`,
  };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: filePath });

  return { payFaturaAccount: sandbox.payFaturaAccount, state };
}

let passed = 0;
let failed = 0;

function test(name, fn) {
  const run = async () => {
    try {
      await fn();
      passed++;
      console.log(`[PASS] ${name}`);
    } catch (err) {
      failed++;
      console.log(`[FAIL] ${name}`);
      console.log(`  ${err.message}`);
    }
  };
  tests.push(run);
}

const tests = [];

test('cartao com fatura aberta + conta pagadora valida: debita a fatura corretamente', async () => {
  const cardAccount = { id: 'card1', tipo: 'cartao', fatura: 250, label: 'Nubank', bank: 'nubank' };
  const otherAccount = { id: 'acc2', tipo: 'conta', saldo: 500, label: 'Conta corrente' };
  const { payFaturaAccount, state } = makeHarness({
    accounts: [cardAccount, otherAccount],
    lines: [],
    confirmResult: true,
  });

  await payFaturaAccount({ id: 'card1', tipo: 'cartao', fatura: 250, label: 'Nubank' });

  assert.equal(state.accounts[0].fatura, 0, 'a fatura do cartao pagador deve ser zerada');
});

test('despesa derivada criada corretamente', async () => {
  const cardAccount = { id: 'card1', tipo: 'cartao', fatura: 250, label: 'Nubank', bank: 'nubank' };
  const { payFaturaAccount, state } = makeHarness({
    accounts: [cardAccount],
    lines: [],
    confirmResult: true,
  });

  await payFaturaAccount({ id: 'card1', tipo: 'cartao', fatura: 250, label: 'Nubank' });

  assert.equal(state.lines.length, 1, 'deve criar exatamente uma despesa derivada');
  const expense = state.lines[0];
  assert.equal(expense.id, 'exp_test_id');
  assert.equal(expense.label, 'Pagamento fatura — Nubank');
  assert.equal(expense.value, 250);
  assert.equal(expense.recorrencia, 'none');
  assert.equal(expense.categoria, 'outros');
  assert.equal(expense.method, 'pix');
  assert.equal(expense.bank, 'nubank');
  assert.equal(typeof expense.date, 'string');
  assert.match(expense.date, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(expense.time, /^\d{2}:\d{2}$/);
  assert.equal(typeof expense.createdAt, 'number');
  assert.ok(!('accountId' in expense), 'a despesa derivada nao vincula accountId (comportamento atual, sem conta pagadora separada)');
});

test('ordem dos storeSet(): accounts_v2 antes de expense_lines_v4', async () => {
  const cardAccount = { id: 'card1', tipo: 'cartao', fatura: 250, label: 'Nubank', bank: 'nubank' };
  const { payFaturaAccount, state } = makeHarness({
    accounts: [cardAccount],
    lines: [],
    confirmResult: true,
  });

  await payFaturaAccount({ id: 'card1', tipo: 'cartao', fatura: 250, label: 'Nubank' });

  assert.equal(state.storeSetCalls.length, 2, 'deve chamar storeSet exatamente duas vezes');
  assert.equal(state.storeSetCalls[0][0], 'accounts_v2', 'accounts_v2 deve ser salvo primeiro');
  assert.equal(state.storeSetCalls[1][0], 'expense_lines_v4', 'expense_lines_v4 deve ser salvo depois');
  assert.equal(state.refreshDetailCalled, true, 'deve atualizar o detalhe da conta');
  assert.equal(state.renderFinanceCalled, true, 'deve rerenderizar o financeiro');
  assert.deepEqual(state.toastMessages, ['Fatura paga'], 'deve mostrar o toast atual');
});

test('sem mutacao indevida em outras contas', async () => {
  const cardAccount = { id: 'card1', tipo: 'cartao', fatura: 250, label: 'Nubank', bank: 'nubank' };
  const otherAccount = { id: 'acc2', tipo: 'conta', saldo: 500, label: 'Conta corrente' };
  const otherCard = { id: 'card2', tipo: 'cartao', fatura: 80, label: 'Itau' };
  const { payFaturaAccount, state } = makeHarness({
    accounts: [cardAccount, otherAccount, otherCard],
    lines: [],
    confirmResult: true,
  });
  const otherBefore = { ...otherAccount };
  const otherCardBefore = { ...otherCard };

  await payFaturaAccount({ id: 'card1', tipo: 'cartao', fatura: 250, label: 'Nubank' });

  assert.deepEqual(state.accounts[1], otherBefore, 'acc2 nao deve ser tocada ao pagar a fatura do card1');
  assert.deepEqual(state.accounts[2], otherCardBefore, 'card2 nao deve ser tocado ao pagar a fatura do card1');
});

test('pre-condicao invalida: conta nao e cartao -> nenhuma mutacao', async () => {
  const account = { id: 'acc1', tipo: 'conta', saldo: 500, fatura: 100 };
  const { payFaturaAccount, state } = makeHarness({
    accounts: [account],
    lines: [],
    confirmResult: true,
  });

  await payFaturaAccount({ id: 'acc1', tipo: 'conta', fatura: 100, label: 'Conta' });

  assert.equal(state.accounts[0].saldo, 500, 'saldo nao deve mudar');
  assert.equal(state.storeSetCalls.length, 0, 'nenhum storeSet deve ser chamado');
  assert.equal(state.lines.length, 0, 'nenhuma despesa deve ser criada');
  assert.equal(state.toastMessages.length, 0, 'nenhum toast deve aparecer');
});

test('pre-condicao invalida: fatura zero ou negativa -> nenhuma mutacao', async () => {
  const cardAccount = { id: 'card1', tipo: 'cartao', fatura: 0, label: 'Nubank' };
  const { payFaturaAccount, state } = makeHarness({
    accounts: [cardAccount],
    lines: [],
    confirmResult: true,
  });

  await payFaturaAccount({ id: 'card1', tipo: 'cartao', fatura: 0, label: 'Nubank' });

  assert.equal(state.accounts[0].fatura, 0);
  assert.equal(state.storeSetCalls.length, 0, 'nenhum storeSet deve ser chamado');
  assert.equal(state.lines.length, 0, 'nenhuma despesa deve ser criada');
});

test('usuario cancela a confirmacao -> nenhuma mutacao', async () => {
  const cardAccount = { id: 'card1', tipo: 'cartao', fatura: 250, label: 'Nubank' };
  const { payFaturaAccount, state } = makeHarness({
    accounts: [cardAccount],
    lines: [],
    confirmResult: false,
  });

  await payFaturaAccount({ id: 'card1', tipo: 'cartao', fatura: 250, label: 'Nubank' });

  assert.equal(state.accounts[0].fatura, 250, 'fatura nao deve mudar quando o usuario cancela');
  assert.equal(state.storeSetCalls.length, 0);
  assert.equal(state.lines.length, 0);
  assert.equal(state.toastMessages.length, 0);
});

test('conta nao encontrada na leitura viva de getAccounts -> nenhuma mutacao', async () => {
  // acc passado tem id que nao existe mais no array vivo (ex.: excluida em outra aba)
  const { payFaturaAccount, state } = makeHarness({
    accounts: [{ id: 'acc-outro', tipo: 'conta', saldo: 10 }],
    lines: [],
    confirmResult: true,
  });

  await payFaturaAccount({ id: 'card-sumiu', tipo: 'cartao', fatura: 250, label: 'Sumiu' });

  assert.equal(state.storeSetCalls.length, 0, 'nenhum storeSet deve ser chamado quando a conta nao existe mais');
  assert.equal(state.lines.length, 0);
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
