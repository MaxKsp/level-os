'use strict';

/**
 * Teste focal de bucketPeriodTotals() (Fase 19).
 * Roda com node puro, sem framework nem bundler.
 *
 * Rodar: node tests/js/finance_expense_aggregation_calculation_test.js
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const filePath = path.join(__dirname, '..', '..', 'assets', 'finance-expense-aggregation-calculation.js');
const code = fs.readFileSync(filePath, 'utf8');

function makeHarness(){
  const occurrenceCalls = [];
  const prorateCalls = [];
  let occurrenceResults = new Map();
  let prorateResult = 0;

  function expenseOccurrencesInRange(exp, range){
    occurrenceCalls.push({ exp, range });
    if (occurrenceResults.has(exp)) return occurrenceResults.get(exp);
    return [];
  }
  function prorateElapsed(monthlyValue, period, now){
    prorateCalls.push({ monthlyValue, period, now });
    return prorateResult;
  }

  const sandbox = { expenseOccurrencesInRange, prorateElapsed };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: filePath });

  return {
    bucketPeriodTotals: sandbox.bucketPeriodTotals,
    occurrenceCalls,
    prorateCalls,
    setOccurrences(exp, arr){ occurrenceResults.set(exp, arr); },
    setProrateResult(v){ prorateResult = v; },
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

const range = { start: new Date(2026, 6, 1), end: new Date(2026, 6, 31) };
const now = new Date(2026, 6, 14);

// ---- dated one-off / recurring / installment expenses ----

test('bucketPeriodTotals: despesa com data soma ocorrencias * valor na chave da keyFn', () => {
  const h = makeHarness();
  const exp = { date: '2026-07-10', value: 100 };
  h.setOccurrences(exp, [new Date(2026, 6, 10)]);
  const totals = Object.assign({}, h.bucketPeriodTotals([exp], range, 'month', () => 'moradia', now));
  assert.deepEqual(totals, { moradia: 100 });
});

test('bucketPeriodTotals: despesa recorrente com multiplas ocorrencias multiplica pelo valor', () => {
  const h = makeHarness();
  const exp = { date: '2026-01-15', recorrencia: 'mensal', value: 50 };
  h.setOccurrences(exp, [new Date(2026, 0, 15), new Date(2026, 1, 15), new Date(2026, 2, 15)]);
  const totals = Object.assign({}, h.bucketPeriodTotals([exp], range, 'month', () => 'assinaturas', now));
  assert.deepEqual(totals, { assinaturas: 150 });
});

test('bucketPeriodTotals: despesa parcelada soma cada parcela contada como ocorrencia', () => {
  const h = makeHarness();
  const exp = { date: '2026-01-10', parcelas: 3, value: 200 };
  h.setOccurrences(exp, [new Date(2026, 0, 10), new Date(2026, 1, 10)]);
  const totals = Object.assign({}, h.bucketPeriodTotals([exp], range, 'month', () => 'outros', now));
  assert.deepEqual(totals, { outros: 400 });
});

// ---- undated prorated expenses ----

test('bucketPeriodTotals: despesa sem data delega para prorateElapsed()', () => {
  const h = makeHarness();
  h.setProrateResult(33.3);
  const exp = { value: 100 };
  const totals = Object.assign({}, h.bucketPeriodTotals([exp], range, 'month', () => 'moradia', now));
  assert.deepEqual(totals, { moradia: 33.3 });
  assert.equal(h.prorateCalls.length, 1);
  assert.deepEqual(h.prorateCalls[0], { monthlyValue: 100, period: 'month', now });
});

test('bucketPeriodTotals: despesa sem data nao chama expenseOccurrencesInRange()', () => {
  const h = makeHarness();
  h.bucketPeriodTotals([{ value: 10 }], range, 'month', () => 'k', now);
  assert.equal(h.occurrenceCalls.length, 0);
});

// ---- mixed buckets ----

test('bucketPeriodTotals: mistura despesas com e sem data acumula na mesma chave', () => {
  const h = makeHarness();
  h.setProrateResult(20);
  const dated = { date: '2026-07-05', value: 100 };
  const undated = { value: 50 };
  h.setOccurrences(dated, [new Date(2026, 6, 5)]);
  const totals = Object.assign({}, h.bucketPeriodTotals([dated, undated], range, 'month', () => 'moradia', now));
  assert.deepEqual(totals, { moradia: 120 });
});

test('bucketPeriodTotals: chaves diferentes ficam separadas', () => {
  const h = makeHarness();
  const e1 = { date: '2026-07-05', value: 100 };
  const e2 = { date: '2026-07-06', value: 30 };
  h.setOccurrences(e1, [new Date(2026, 6, 5)]);
  h.setOccurrences(e2, [new Date(2026, 6, 6)]);
  const totals = Object.assign({}, h.bucketPeriodTotals([e1, e2], range, 'month', (e) => e.value === 100 ? 'a' : 'b', now));
  assert.deepEqual(totals, { a: 100, b: 30 });
});

// ---- repeated and undefined keys ----

test('bucketPeriodTotals: keyFn retornando undefined agrupa sob chave "undefined"', () => {
  const h = makeHarness();
  const exp = { date: '2026-07-05', value: 40 };
  h.setOccurrences(exp, [new Date(2026, 6, 5)]);
  const totals = Object.assign({}, h.bucketPeriodTotals([exp], range, 'month', () => undefined, now));
  assert.deepEqual(totals, { undefined: 40 });
});

test('bucketPeriodTotals: keys repetidas somam no mesmo bucket', () => {
  const h = makeHarness();
  const e1 = { date: '2026-07-05', value: 10 };
  const e2 = { date: '2026-07-06', value: 20 };
  h.setOccurrences(e1, [new Date(2026, 6, 5)]);
  h.setOccurrences(e2, [new Date(2026, 6, 6)]);
  const totals = Object.assign({}, h.bucketPeriodTotals([e1, e2], range, 'month', () => 'mesma', now));
  assert.deepEqual(totals, { mesma: 30 });
});

// ---- zero/missing/string values ----

test('bucketPeriodTotals: valor ausente e coagido para zero e nao adiciona ao total', () => {
  const h = makeHarness();
  const exp = { date: '2026-07-05' };
  h.setOccurrences(exp, [new Date(2026, 6, 5)]);
  const totals = Object.assign({}, h.bucketPeriodTotals([exp], range, 'month', () => 'k', now));
  assert.deepEqual(totals, { k: 0 });
});

test('bucketPeriodTotals: valor em string numerica e coagido', () => {
  const h = makeHarness();
  const exp = { date: '2026-07-05', value: '25.5' };
  h.setOccurrences(exp, [new Date(2026, 6, 5)]);
  const totals = Object.assign({}, h.bucketPeriodTotals([exp], range, 'month', () => 'k', now));
  assert.deepEqual(totals, { k: 25.5 });
});

test('bucketPeriodTotals: despesa com data e zero ocorrencias nao cria a chave', () => {
  const h = makeHarness();
  const exp = { date: '2026-08-05', value: 100 };
  h.setOccurrences(exp, []);
  const totals = Object.assign({}, h.bucketPeriodTotals([exp], range, 'month', () => 'k', now));
  assert.deepEqual(totals, {});
});

// ---- empty inputs ----

test('bucketPeriodTotals: lista vazia retorna objeto vazio', () => {
  const h = makeHarness();
  const totals = Object.assign({}, h.bucketPeriodTotals([], range, 'month', () => 'k', now));
  assert.deepEqual(totals, {});
});

// ---- callback invocation order ----

test('bucketPeriodTotals: chama keyFn exatamente uma vez por item, na ordem de entrada, mesmo com zero ocorrencias', () => {
  const h = makeHarness();
  const e1 = { date: '2026-07-05', value: 10 };
  const e2 = { date: '2026-08-05', value: 20 };
  const e3 = { value: 30 };
  h.setOccurrences(e1, [new Date(2026, 6, 5)]);
  h.setOccurrences(e2, []);
  const seen = [];
  h.bucketPeriodTotals([e1, e2, e3], range, 'month', (e) => { seen.push(e); return 'k'; }, now);
  assert.deepEqual(seen, [e1, e2, e3]);
});

// ---- dependency delegation ----

test('bucketPeriodTotals: despesa com data delega para expenseOccurrencesInRange() com exp e range originais', () => {
  const h = makeHarness();
  const exp = { date: '2026-07-05', value: 10 };
  h.setOccurrences(exp, [new Date(2026, 6, 5)]);
  h.bucketPeriodTotals([exp], range, 'month', () => 'k', now);
  assert.equal(h.occurrenceCalls.length, 1);
  assert.equal(h.occurrenceCalls[0].exp, exp);
  assert.equal(h.occurrenceCalls[0].range, range);
});

test('bucketPeriodTotals: despesa sem data delega para prorateElapsed() com period e now originais', () => {
  const h = makeHarness();
  h.setProrateResult(5);
  h.bucketPeriodTotals([{ value: 10 }], range, 'year', () => 'k', now);
  assert.equal(h.prorateCalls[0].period, 'year');
  assert.equal(h.prorateCalls[0].now, now);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
