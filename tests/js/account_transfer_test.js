'use strict';

/**
 * Teste focal de transferBetweenAccounts() (Fase 12). Roda com node puro,
 * sem framework nem bundler.
 *
 * transferBetweenAccounts() depende de varias funcoes globais definidas em
 * assets/app.js (getAccounts, getTransfers, storeSet, renderFinance, toast,
 * genId) e de document.getElementById (pra fechar o modal). No app real
 * elas coexistem no mesmo escopo global via <script> puro. Aqui, cada
 * teste monta um sandbox vm fresco com stubs dessas dependencias, pra
 * isolar so o comportamento da funcao extraida.
 *
 * Rodar: node tests/js/account_transfer_test.js
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const filePath = path.join(__dirname, '..', '..', 'assets', 'account-transfer.js');
const code = fs.readFileSync(filePath, 'utf8');

function makeHarness({ accounts, transfers }) {
  const state = {
    accounts,
    transfers,
    storeSetCalls: [],
    renderFinanceCalled: false,
    toastMessages: [],
    toastOpts: [],
    domCalls: [],
  };

  const sandbox = {
    getAccounts: async () => state.accounts,
    getTransfers: async () => state.transfers,
    storeSet: async (key, value) => { state.storeSetCalls.push([key, value]); },
    renderFinance: () => { state.renderFinanceCalled = true; },
    toast: (msg, opts) => { state.toastMessages.push(msg); state.toastOpts.push(opts); },
    genId: () => 'tr_test_id',
    document: {
      getElementById: (id) => ({
        classList: { remove: (cls) => { state.domCalls.push([id, cls]); } },
      }),
    },
  };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: filePath });

  return { transferBetweenAccounts: sandbox.transferBetweenAccounts, state };
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

test('transferencia entre duas contas validas: atualiza accounts_v2 corretamente', async () => {
  const from = { id: 'acc1', tipo: 'conta', saldo: 1000, label: 'Corrente' };
  const to = { id: 'acc2', tipo: 'conta', saldo: 200, label: 'Poupança' };
  const { transferBetweenAccounts, state } = makeHarness({ accounts: [from, to], transfers: [] });

  await transferBetweenAccounts('acc1', 'acc2', 300, '2026-07-14');

  assert.equal(state.accounts[0].saldo, 700, 'saldo da origem deve debitar o valor');
  assert.equal(state.accounts[1].saldo, 500, 'saldo do destino deve creditar o valor');
  assert.equal(state.accounts[1].fatura, undefined, 'destino comum nao deve ganhar campo fatura');
});

test('persistencia correta em transfers: registro com shape e kind atuais', async () => {
  const from = { id: 'acc1', tipo: 'conta', saldo: 1000 };
  const to = { id: 'acc2', tipo: 'conta', saldo: 200 };
  const { transferBetweenAccounts, state } = makeHarness({ accounts: [from, to], transfers: [] });

  await transferBetweenAccounts('acc1', 'acc2', 300, '2026-07-14');

  assert.equal(state.transfers.length, 1, 'deve registrar exatamente uma transferencia');
  const tr = state.transfers[0];
  assert.equal(tr.id, 'tr_test_id');
  assert.equal(tr.fromId, 'acc1');
  assert.equal(tr.toId, 'acc2');
  assert.equal(tr.value, 300);
  assert.equal(tr.date, '2026-07-14');
  assert.equal(tr.kind, 'transfer');
  assert.equal(typeof tr.createdAt, 'number');
  assert.deepEqual(Object.keys(tr).sort(), ['createdAt', 'date', 'fromId', 'id', 'kind', 'toId', 'value']);
});

test('pagamento de fatura via transferencia: destino cartao abate a fatura, kind=payment', async () => {
  const from = { id: 'acc1', tipo: 'conta', saldo: 1000 };
  const card = { id: 'card1', tipo: 'cartao', fatura: 250, saldo: 0 };
  const { transferBetweenAccounts, state } = makeHarness({ accounts: [from, card], transfers: [] });

  await transferBetweenAccounts('acc1', 'card1', 100, '2026-07-14');

  assert.equal(state.accounts[0].saldo, 900, 'saldo da origem deve debitar o valor');
  assert.equal(state.accounts[1].fatura, 150, 'fatura do cartao deve abater o valor');
  assert.equal(state.accounts[1].saldo, 0, 'cartao nao deve ganhar saldo');
  assert.equal(state.transfers[0].kind, 'payment', 'transferencia pro cartao deve ser kind=payment');
  assert.deepEqual(state.toastMessages, ['Fatura paga por transferência'], 'toast deve refletir pagamento de fatura');
});

test('pagamento de fatura via transferencia: nao deixa fatura negativa (Math.max(0, ...))', async () => {
  const from = { id: 'acc1', tipo: 'conta', saldo: 1000 };
  const card = { id: 'card1', tipo: 'cartao', fatura: 50, saldo: 0 };
  const { transferBetweenAccounts, state } = makeHarness({ accounts: [from, card], transfers: [] });

  await transferBetweenAccounts('acc1', 'card1', 100, '2026-07-14');

  assert.equal(state.accounts[1].fatura, 0, 'fatura nao deve ficar negativa mesmo pagando mais que o valor devido');
});

test('ordem dos storeSet(): accounts_v2 antes de transfers, mais renderFinance e fechamento do modal', async () => {
  const from = { id: 'acc1', tipo: 'conta', saldo: 1000 };
  const to = { id: 'acc2', tipo: 'conta', saldo: 200 };
  const { transferBetweenAccounts, state } = makeHarness({ accounts: [from, to], transfers: [] });

  await transferBetweenAccounts('acc1', 'acc2', 300, '2026-07-14');

  assert.equal(state.storeSetCalls.length, 2, 'deve chamar storeSet exatamente duas vezes');
  assert.equal(state.storeSetCalls[0][0], 'accounts_v2', 'accounts_v2 deve ser salvo primeiro');
  assert.equal(state.storeSetCalls[1][0], 'transfers', 'transfers deve ser salvo depois');
  assert.equal(state.renderFinanceCalled, true, 'deve rerenderizar o financeiro');
  assert.deepEqual(state.domCalls, [['transferModalOverlay', 'open']], 'deve fechar o modal de transferencia');
});

test('sem mutacao em contas nao envolvidas', async () => {
  const from = { id: 'acc1', tipo: 'conta', saldo: 1000 };
  const to = { id: 'acc2', tipo: 'conta', saldo: 200 };
  const bystander = { id: 'acc3', tipo: 'conta', saldo: 777, label: 'Outra' };
  const bystanderCard = { id: 'card1', tipo: 'cartao', fatura: 40 };
  const { transferBetweenAccounts, state } = makeHarness({
    accounts: [from, to, bystander, bystanderCard],
    transfers: [],
  });
  const bystanderBefore = { ...bystander };
  const bystanderCardBefore = { ...bystanderCard };

  await transferBetweenAccounts('acc1', 'acc2', 300, '2026-07-14');

  assert.deepEqual(state.accounts[2], bystanderBefore, 'acc3 nao deve ser tocada');
  assert.deepEqual(state.accounts[3], bystanderCardBefore, 'card1 nao deve ser tocado');
});

test('pre-condicao invalida: fromId ou toId vazio -> nenhuma mutacao', async () => {
  const from = { id: 'acc1', tipo: 'conta', saldo: 1000 };
  const to = { id: 'acc2', tipo: 'conta', saldo: 200 };
  const { transferBetweenAccounts, state } = makeHarness({ accounts: [from, to], transfers: [] });

  await transferBetweenAccounts('', 'acc2', 300, '2026-07-14');

  assert.equal(state.accounts[0].saldo, 1000);
  assert.equal(state.accounts[1].saldo, 200);
  assert.equal(state.storeSetCalls.length, 0, 'nenhum storeSet deve ser chamado');
  assert.equal(state.transfers.length, 0);
  assert.deepEqual(state.toastMessages, ['Escolha contas diferentes.']);
});

test('pre-condicao invalida: fromId === toId -> nenhuma mutacao', async () => {
  const from = { id: 'acc1', tipo: 'conta', saldo: 1000 };
  const { transferBetweenAccounts, state } = makeHarness({ accounts: [from], transfers: [] });

  await transferBetweenAccounts('acc1', 'acc1', 300, '2026-07-14');

  assert.equal(state.accounts[0].saldo, 1000);
  assert.equal(state.storeSetCalls.length, 0);
  assert.deepEqual(state.toastMessages, ['Escolha contas diferentes.']);
});

test('pre-condicao invalida: valor <= 0 -> nenhuma mutacao', async () => {
  const from = { id: 'acc1', tipo: 'conta', saldo: 1000 };
  const to = { id: 'acc2', tipo: 'conta', saldo: 200 };
  const { transferBetweenAccounts, state } = makeHarness({ accounts: [from, to], transfers: [] });

  await transferBetweenAccounts('acc1', 'acc2', 0, '2026-07-14');

  assert.equal(state.accounts[0].saldo, 1000);
  assert.equal(state.accounts[1].saldo, 200);
  assert.equal(state.storeSetCalls.length, 0);
  assert.deepEqual(state.toastMessages, ['Valor inválido.']);
});

test('pre-condicao invalida: conta de origem ou destino nao encontrada -> nenhuma mutacao', async () => {
  const to = { id: 'acc2', tipo: 'conta', saldo: 200 };
  const { transferBetweenAccounts, state } = makeHarness({ accounts: [to], transfers: [] });

  await transferBetweenAccounts('acc-sumiu', 'acc2', 300, '2026-07-14');

  assert.equal(state.accounts[0].saldo, 200);
  assert.equal(state.storeSetCalls.length, 0, 'nenhum storeSet deve ser chamado quando a conta nao existe');
  assert.equal(state.toastMessages.length, 0, 'nao ha toast especifico pra conta nao encontrada (retorno silencioso)');
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
