'use strict';

/**
 * Teste focal de calculateAccountSummary() (Fase 25).
 * Roda com node puro, sem framework nem bundler.
 *
 * Rodar: node tests/js/finance_account_summary_calculation_test.js
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const typeFilePath = path.join(__dirname, '..', '..', 'assets', 'finance-account-type-calculation.js');
const filePath = path.join(__dirname, '..', '..', 'assets', 'finance-account-summary-calculation.js');
const typeCode = fs.readFileSync(typeFilePath, 'utf8');
const code = fs.readFileSync(filePath, 'utf8');

function makeHarness(){
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(typeCode, sandbox, { filename: typeFilePath });
  vm.runInContext(code, sandbox, { filename: filePath });
  return { calculateAccountSummary: sandbox.calculateAccountSummary };
}

// Harness que injeta um stub de isContaLike no lugar da implementacao real,
// para provar que calculateAccountSummary delega a classificacao em vez de
// comparar `tipo` inline.
function makeStubHarness(isContaLikeStub){
  const sandbox = { isContaLike: isContaLikeStub };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: filePath });
  return { calculateAccountSummary: sandbox.calculateAccountSummary };
}

let passed = 0;
let failed = 0;

function test(name, fn){
  try {
    fn();
    passed++;
    console.log(`ok - ${name}`);
  } catch (err) {
    failed++;
    console.error(`not ok - ${name}`);
    console.error(err && err.message ? err.message : err);
  }
}

// ---- empty collection ----

test('lista vazia retorna totais zerados e listas vazias', () => {
  const h = makeHarness();
  const r = h.calculateAccountSummary([]);
  assert.deepEqual(r.contas, []);
  assert.deepEqual(r.cartoes, []);
  assert.equal(r.saldoTotal, 0);
  assert.equal(r.faturaTotal, 0);
  assert.equal(r.patrimonio, 0);
  assert.equal(r.creditoCartoes, 0);
  assert.equal(r.chequeUsadoTotal, 0);
  assert.equal(r.chequeDisp, 0);
  assert.equal(r.creditoDisp, 0);
  assert.deepEqual(r.overdraft, []);
});

// ---- checking/savings accounts, isContaLike delegation ----

test('contas corrente e poupanca entram em contas, cartao fica de fora', () => {
  const h = makeHarness();
  const corrente = { tipo: 'conta', saldo: 100 };
  const poupanca = { tipo: 'poupanca', saldo: 50 };
  const cartao = { tipo: 'cartao', fatura: 30, limite: 100 };
  const r = h.calculateAccountSummary([corrente, poupanca, cartao]);
  assert.deepEqual(r.contas, [corrente, poupanca]);
  assert.deepEqual(r.cartoes, [cartao]);
  assert.equal(r.saldoTotal, 150);
});

test('calculateAccountSummary delega classificacao de contas para isContaLike (nao compara tipo inline)', () => {
  const calls = [];
  const stub = function(conta){
    calls.push(conta.tipo);
    return conta.tipo === '__TEST_ACCOUNT__';
  };
  const h = makeStubHarness(stub);
  const contaTeste = { tipo: '__TEST_ACCOUNT__', saldo: 100, chequeEspecial: 0 };
  const naoConta = { tipo: '__TEST_NOT_ACCOUNT__', saldo: 200 };

  let r = h.calculateAccountSummary([contaTeste]);
  assert.ok(calls.includes('__TEST_ACCOUNT__'));
  assert.equal(r.contas.length, 1);
  assert.equal(r.saldoTotal, 100);

  r = h.calculateAccountSummary([contaTeste, naoConta]);
  assert.ok(calls.includes('__TEST_NOT_ACCOUNT__'));
  assert.equal(r.contas.length, 1);
  assert.equal(r.saldoTotal, 100);
});

// ---- patrimonio = saldos - faturas ----

test('patrimonio e saldoTotal menos faturaTotal', () => {
  const h = makeHarness();
  const r = h.calculateAccountSummary([
    { tipo: 'conta', saldo: 200 },
    { tipo: 'cartao', fatura: 80, limite: 500 },
  ]);
  assert.equal(r.saldoTotal, 200);
  assert.equal(r.faturaTotal, 80);
  assert.equal(r.patrimonio, 120);
});

// ---- negative balances ----

test('saldo negativo entra em overdraft e soma em chequeUsadoTotal', () => {
  const h = makeHarness();
  const negativa = { tipo: 'conta', saldo: -40, chequeEspecial: 100 };
  const r = h.calculateAccountSummary([negativa, { tipo: 'conta', saldo: 60 }]);
  assert.deepEqual(r.overdraft, [negativa]);
  assert.equal(r.chequeUsadoTotal, 40);
  assert.equal(r.saldoTotal, 20);
});

// ---- invoice above limit clamps available card credit to zero ----

test('fatura maior que limite clampa creditoCartoes em zero', () => {
  const h = makeHarness();
  const r = h.calculateAccountSummary([{ tipo: 'cartao', fatura: 500, limite: 300 }]);
  assert.equal(r.creditoCartoes, 0);
  assert.equal(r.creditoDisp, 0);
});

// ---- overdraft usage and exhaustion ----

test('cheque especial parcialmente usado calcula chequeDisp restante', () => {
  const h = makeHarness();
  const r = h.calculateAccountSummary([{ tipo: 'conta', saldo: -30, chequeEspecial: 100 }]);
  assert.equal(r.chequeDisp, 70);
});

test('cheque especial totalmente usado clampa chequeDisp em zero', () => {
  const h = makeHarness();
  const r = h.calculateAccountSummary([{ tipo: 'conta', saldo: -150, chequeEspecial: 100 }]);
  assert.equal(r.chequeDisp, 0);
});

// ---- missing / string numeric values ----

test('campos numericos ausentes tratados como zero', () => {
  const h = makeHarness();
  const r = h.calculateAccountSummary([{ tipo: 'conta' }, { tipo: 'cartao' }]);
  assert.equal(r.saldoTotal, 0);
  assert.equal(r.faturaTotal, 0);
  assert.equal(r.creditoCartoes, 0);
  assert.equal(r.chequeDisp, 0);
});

test('campos numericos em string sao coagidos com Number(value||0)', () => {
  const h = makeHarness();
  const r = h.calculateAccountSummary([
    { tipo: 'conta', saldo: '100' },
    { tipo: 'cartao', fatura: '40', limite: '90' },
  ]);
  assert.equal(r.saldoTotal, 100);
  assert.equal(r.faturaTotal, 40);
  assert.equal(r.creditoCartoes, 50);
});

// ---- ordering and non-mutation ----

test('preserva ordem original de entrada e referencias dos objetos', () => {
  const h = makeHarness();
  const a = { tipo: 'conta', saldo: -10 };
  const b = { tipo: 'cartao', fatura: 5, limite: 10 };
  const c = { tipo: 'poupanca', saldo: 20 };
  const input = [a, b, c];
  const r = h.calculateAccountSummary(input);
  assert.equal(r.contas[0], a);
  assert.equal(r.contas[1], c);
  assert.equal(r.cartoes[0], b);
  assert.equal(r.overdraft[0], a);
});

test('nao muta o array de entrada nem os objetos de conta', () => {
  const h = makeHarness();
  const a = { tipo: 'conta', saldo: -10 };
  const input = [a];
  const snapshot = JSON.stringify(input);
  h.calculateAccountSummary(input);
  assert.equal(input.length, 1);
  assert.equal(input[0], a);
  assert.equal(JSON.stringify(input), snapshot);
});

// ---- canonical / public asset byte equality ----

test('canonico e asset publico sao byte-identicos', () => {
  const canonicalPath = path.join(__dirname, '..', '..', 'app', 'Modules', 'Finance', 'Frontend', 'finance-account-summary-calculation.js');
  const publicPath = path.join(__dirname, '..', '..', 'assets', 'finance-account-summary-calculation.js');
  const canonical = fs.readFileSync(canonicalPath);
  const publicAsset = fs.readFileSync(publicPath);
  assert.equal(Buffer.compare(canonical, publicAsset), 0);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
