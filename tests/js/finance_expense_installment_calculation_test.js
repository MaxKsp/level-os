'use strict';

/**
 * Teste focal de parcelaLabel() (Fase 22).
 * Roda com node puro, sem framework nem bundler.
 *
 * Rodar: node tests/js/finance_expense_installment_calculation_test.js
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const filePath = path.join(__dirname, '..', '..', 'assets', 'finance-expense-installment-calculation.js');
const code = fs.readFileSync(filePath, 'utf8');

function makeHarness(){
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: filePath });
  return { parcelaLabel: sandbox.parcelaLabel };
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

// ---- falsy inputs ----

test('parcelaLabel: parcelas ausente retorna string vazia', () => {
  const h = makeHarness();
  assert.equal(h.parcelaLabel({ date: '2026-07-01' }, new Date(2026, 6, 14)), '');
});

test('parcelaLabel: parcelas zero retorna string vazia', () => {
  const h = makeHarness();
  assert.equal(h.parcelaLabel({ parcelas: 0, date: '2026-07-01' }, new Date(2026, 6, 14)), '');
});

test('parcelaLabel: date ausente retorna string vazia', () => {
  const h = makeHarness();
  assert.equal(h.parcelaLabel({ parcelas: 3 }, new Date(2026, 6, 14)), '');
});

test('parcelaLabel: date vazia retorna string vazia', () => {
  const h = makeHarness();
  assert.equal(h.parcelaLabel({ parcelas: 3, date: '' }, new Date(2026, 6, 14)), '');
});

// ---- first / current / future installment ----

test('parcelaLabel: mesmo mes da compra e a parcela 1', () => {
  const h = makeHarness();
  const result = h.parcelaLabel({ parcelas: 5, date: '2026-07-01' }, new Date(2026, 6, 14));
  assert.equal(result, 'parcela 1/5');
});

test('parcelaLabel: mes seguinte e a parcela 2', () => {
  const h = makeHarness();
  const result = h.parcelaLabel({ parcelas: 5, date: '2026-07-01' }, new Date(2026, 7, 1));
  assert.equal(result, 'parcela 2/5');
});

test('parcelaLabel: mes futuro dentro do range calcula parcela correta', () => {
  const h = makeHarness();
  const result = h.parcelaLabel({ parcelas: 12, date: '2026-01-15' }, new Date(2026, 5, 1));
  assert.equal(result, 'parcela 6/12');
});

// ---- before observed month (clamp to 1) ----

test('parcelaLabel: mes anterior a compra clampa em 1', () => {
  const h = makeHarness();
  const result = h.parcelaLabel({ parcelas: 5, date: '2026-07-01' }, new Date(2026, 5, 1));
  assert.equal(result, 'parcela 1/5');
});

// ---- after last installment (clamp to N) ----

test('parcelaLabel: mes muito depois clampa no total de parcelas', () => {
  const h = makeHarness();
  const result = h.parcelaLabel({ parcelas: 3, date: '2026-01-01' }, new Date(2027, 11, 1));
  assert.equal(result, 'parcela 3/3');
});

// ---- year boundaries ----

test('parcelaLabel: atravessa virada de ano corretamente', () => {
  const h = makeHarness();
  const result = h.parcelaLabel({ parcelas: 6, date: '2025-11-01' }, new Date(2026, 0, 1));
  assert.equal(result, 'parcela 3/6');
});

// ---- numeric-string coercion ----

test('parcelaLabel: parcelas como string numerica participa do clamp/concat', () => {
  const h = makeHarness();
  const result = h.parcelaLabel({ parcelas: '4', date: '2026-07-01' }, new Date(2026, 6, 14));
  assert.equal(result, 'parcela 1/4');
});

test('parcelaLabel: parcelas string "0" e falsy-coercivel mas truthy como string nao vazia', () => {
  const h = makeHarness();
  // "0" e uma string nao vazia (truthy), entao segue o calculo normalmente.
  const result = h.parcelaLabel({ parcelas: '0', date: '2026-07-01' }, new Date(2026, 6, 14));
  assert.equal(result, 'parcela 1/0');
});

// ---- malformed dates ----

test('parcelaLabel: date malformada gera NaN propagado na label', () => {
  const h = makeHarness();
  const result = h.parcelaLabel({ parcelas: 5, date: 'not-a-date' }, new Date(2026, 6, 14));
  assert.equal(result, 'parcela NaN/5');
});

// ---- canonical / public asset byte equality ----

test('canonico e asset publico sao byte-identicos', () => {
  const canonicalPath = path.join(__dirname, '..', '..', 'app', 'Modules', 'Finance', 'Frontend', 'finance-expense-installment-calculation.js');
  const publicPath = path.join(__dirname, '..', '..', 'assets', 'finance-expense-installment-calculation.js');
  const canonical = fs.readFileSync(canonicalPath);
  const publicAsset = fs.readFileSync(publicPath);
  assert.equal(Buffer.compare(canonical, publicAsset), 0);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
