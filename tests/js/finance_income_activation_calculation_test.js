'use strict';

/**
 * Teste focal de isIncomeActive() (Fase 20).
 * Roda com node puro, sem framework nem bundler.
 *
 * Rodar: node tests/js/finance_income_activation_calculation_test.js
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const filePath = path.join(__dirname, '..', '..', 'assets', 'finance-income-activation-calculation.js');
const code = fs.readFileSync(filePath, 'utf8');

function makeHarness(){
  const dnumCalls = [];
  let dnumResults = new Map();

  function dnum(d){
    dnumCalls.push(d);
    if (dnumResults.has(d)) return dnumResults.get(d);
    return d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate();
  }

  const sandbox = { dnum };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: filePath });

  return {
    isIncomeActive: sandbox.isIncomeActive,
    dnumCalls,
    setDnumResult(d, v){ dnumResults.set(d, v); },
  };
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

const now = new Date(2026, 6, 14);

// ---- non-temporary income always active ----

test('isIncomeActive: renda fixa fica ativa', () => {
  const h = makeHarness();
  assert.equal(h.isIncomeActive({ type: 'fixa' }, now), true);
});

test('isIncomeActive: renda variavel fica ativa', () => {
  const h = makeHarness();
  assert.equal(h.isIncomeActive({ type: 'variavel' }, now), true);
});

test('isIncomeActive: tipo desconhecido fica ativo', () => {
  const h = makeHarness();
  assert.equal(h.isIncomeActive({ type: 'outro' }, now), true);
  assert.equal(h.isIncomeActive({}, now), true);
});

test('isIncomeActive: renda nao temporaria nao chama dnum()', () => {
  const h = makeHarness();
  h.isIncomeActive({ type: 'fixa' }, now);
  assert.equal(h.dnumCalls.length, 0);
});

// ---- temporary income without endDate ----

test('isIncomeActive: temporaria sem endDate fica ativa', () => {
  const h = makeHarness();
  assert.equal(h.isIncomeActive({ type: 'temporaria' }, now), true);
});

test('isIncomeActive: temporaria com endDate vazia fica ativa', () => {
  const h = makeHarness();
  assert.equal(h.isIncomeActive({ type: 'temporaria', endDate: '' }, now), true);
});

test('isIncomeActive: temporaria sem endDate nao chama dnum()', () => {
  const h = makeHarness();
  h.isIncomeActive({ type: 'temporaria' }, now);
  assert.equal(h.dnumCalls.length, 0);
});

// ---- temporary income with endDate: past / current / future ----

test('isIncomeActive: temporaria com endDate no passado fica inativa', () => {
  const h = makeHarness();
  assert.equal(h.isIncomeActive({ type: 'temporaria', endDate: '2026-01-01' }, now), false);
});

test('isIncomeActive: temporaria com endDate igual a now fica ativa (inclusiva)', () => {
  const h = makeHarness();
  assert.equal(h.isIncomeActive({ type: 'temporaria', endDate: '2026-07-14' }, now), true);
});

test('isIncomeActive: temporaria com endDate no futuro fica ativa', () => {
  const h = makeHarness();
  assert.equal(h.isIncomeActive({ type: 'temporaria', endDate: '2026-12-31' }, now), true);
});

// ---- time-of-day insensitivity ----

test('isIncomeActive: hora do dia de now nao afeta comparacao no dia do endDate', () => {
  const h = makeHarness();
  const nowLate = new Date(2026, 6, 14, 23, 59, 59);
  assert.equal(h.isIncomeActive({ type: 'temporaria', endDate: '2026-07-14' }, nowLate), true);
});

test('isIncomeActive: hora do dia do endDate nao afeta comparacao (sempre meia-noite local)', () => {
  const h = makeHarness();
  assert.equal(h.isIncomeActive({ type: 'temporaria', endDate: '2026-07-13' }, now), false);
});

// ---- invalid endDate ----

test('isIncomeActive: endDate invalida delega para dnum() com Invalid Date', () => {
  const h = makeHarness();
  const result = h.isIncomeActive({ type: 'temporaria', endDate: 'not-a-date' }, now);
  assert.equal(result, false);
  assert.equal(Number.isNaN(h.dnumCalls[0].getTime()), true);
});

// ---- dependency delegation ----

test('isIncomeActive: temporaria com endDate delega para dnum() duas vezes', () => {
  const h = makeHarness();
  h.isIncomeActive({ type: 'temporaria', endDate: '2026-07-14' }, now);
  assert.equal(h.dnumCalls.length, 2);
  assert.equal(h.dnumCalls[0].getFullYear(), 2026);
  assert.equal(h.dnumCalls[0].getMonth(), 6);
  assert.equal(h.dnumCalls[0].getDate(), 14);
  assert.equal(h.dnumCalls[1], now);
});

test('isIncomeActive: constroi endDate como meia-noite local (T00:00:00)', () => {
  const h = makeHarness();
  h.isIncomeActive({ type: 'temporaria', endDate: '2026-07-14' }, now);
  const endArg = h.dnumCalls[0];
  assert.equal(endArg.getHours(), 0);
  assert.equal(endArg.getMinutes(), 0);
  assert.equal(endArg.getSeconds(), 0);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
