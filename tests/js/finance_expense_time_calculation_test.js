'use strict';

/**
 * Teste focal de expenseTimeOf() e expenseHourOf() (Fase 21).
 * Roda com node puro, sem framework nem bundler.
 *
 * Rodar: node tests/js/finance_expense_time_calculation_test.js
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const filePath = path.join(__dirname, '..', '..', 'assets', 'finance-expense-time-calculation.js');
const code = fs.readFileSync(filePath, 'utf8');

function makeHarness(padFn){
  const padCalls = [];
  function pad(n){
    padCalls.push(n);
    return padFn ? padFn(n) : String(n).padStart(2, '0');
  }

  const sandbox = { pad };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: filePath });

  return {
    expenseTimeOf: sandbox.expenseTimeOf,
    expenseHourOf: sandbox.expenseHourOf,
    padCalls,
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

// ---- explicit time precedence ----

test('expenseTimeOf: exp.time explicito tem precedencia sobre createdAt', () => {
  const h = makeHarness();
  const result = h.expenseTimeOf({ time: '09:30', createdAt: '2026-07-14T23:59:00' });
  assert.equal(result, '09:30');
  assert.equal(h.padCalls.length, 0);
});

test('expenseTimeOf: exp.time explicito retornado sem alteracao', () => {
  const h = makeHarness();
  assert.equal(h.expenseTimeOf({ time: '7:5' }), '7:5');
});

// ---- empty / missing time falls through ----

test('expenseTimeOf: time vazio cai para createdAt', () => {
  const h = makeHarness();
  const result = h.expenseTimeOf({ time: '', createdAt: new Date(2026, 6, 14, 8, 5).toISOString() });
  assert.equal(result, '08:05');
});

test('expenseTimeOf: time ausente cai para createdAt', () => {
  const h = makeHarness();
  const result = h.expenseTimeOf({ createdAt: new Date(2026, 6, 14, 8, 5).toISOString() });
  assert.equal(result, '08:05');
});

// ---- missing/empty createdAt fallback to 12:00 ----

test('expenseTimeOf: sem time e sem createdAt cai no fallback 12:00', () => {
  const h = makeHarness();
  assert.equal(h.expenseTimeOf({}), '12:00');
});

test('expenseTimeOf: time e createdAt vazios caem no fallback 12:00', () => {
  const h = makeHarness();
  assert.equal(h.expenseTimeOf({ time: '', createdAt: '' }), '12:00');
});

// ---- valid createdAt / local Date behavior ----

test('expenseTimeOf: createdAt valido usa new Date() local (getHours/getMinutes)', () => {
  const h = makeHarness();
  const d = new Date(2026, 6, 14, 23, 7);
  const result = h.expenseTimeOf({ createdAt: d.toISOString() });
  assert.equal(result, '23:07');
});

test('expenseTimeOf: pad() recebe getHours() e getMinutes() nesta ordem', () => {
  const h = makeHarness();
  const d = new Date(2026, 6, 14, 3, 45);
  h.expenseTimeOf({ createdAt: d.toISOString() });
  assert.equal(h.padCalls.length, 2);
  assert.equal(h.padCalls[0], d.getHours());
  assert.equal(h.padCalls[1], d.getMinutes());
});

test('expenseTimeOf: pad() e resolvido em tempo de chamada, nao em tempo de carga', () => {
  const h = makeHarness((n) => 'X' + n);
  const result = h.expenseTimeOf({ createdAt: new Date(2026, 6, 14, 1, 2).toISOString() });
  assert.equal(result, 'X1:X2');
});

// ---- malformed createdAt ----

test('expenseTimeOf: createdAt malformado gera NaN:NaN via pad(NaN)', () => {
  const h = makeHarness();
  const result = h.expenseTimeOf({ createdAt: 'not-a-date' });
  assert.equal(result, 'NaN:NaN');
});

// ---- hour extraction / Number coercion ----

test('expenseHourOf: retorna Number(expenseTimeOf(exp).split(":")[0])', () => {
  const h = makeHarness();
  const result = h.expenseHourOf({ time: '09:30' });
  assert.equal(result, 9);
  assert.equal(typeof result, 'number');
});

test('expenseHourOf: delega para expenseTimeOf() e usa fallback 12:00 -> 12', () => {
  const h = makeHarness();
  assert.equal(h.expenseHourOf({}), 12);
});

test('expenseHourOf: createdAt malformado gera NaN', () => {
  const h = makeHarness();
  assert.equal(Number.isNaN(h.expenseHourOf({ createdAt: 'not-a-date' })), true);
});

// ---- canonical / public asset byte equality ----

test('canonico e asset publico sao byte-identicos', () => {
  const canonicalPath = path.join(__dirname, '..', '..', 'app', 'Modules', 'Finance', 'Frontend', 'finance-expense-time-calculation.js');
  const publicPath = path.join(__dirname, '..', '..', 'assets', 'finance-expense-time-calculation.js');
  const canonical = fs.readFileSync(canonicalPath);
  const publicAsset = fs.readFileSync(publicPath);
  assert.equal(Buffer.compare(canonical, publicAsset), 0);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
