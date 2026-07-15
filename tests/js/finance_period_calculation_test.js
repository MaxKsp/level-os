'use strict';

/**
 * Teste focal de periodRange(), prorate(), inRange(), clampRangeToToday()
 * e prorateElapsed() (Fase 18).
 * Roda com node puro, sem framework nem bundler.
 *
 * Rodar: node tests/js/finance_period_calculation_test.js
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const filePath = path.join(__dirname, '..', '..', 'assets', 'finance-period-calculation.js');
const code = fs.readFileSync(filePath, 'utf8');

function dnum(d){ return d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate(); }
function addDays(d,n){ const r=new Date(d); r.setDate(r.getDate()+n); return r; }
function startOfWeek(d){ const r=new Date(d); r.setDate(r.getDate()-r.getDay()); r.setHours(0,0,0,0); return r; }

function makeHarness(){
  const sandbox = { dnum, addDays, startOfWeek };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: filePath });
  return sandbox;
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

const { periodRange, prorate, inRange, clampRangeToToday, prorateElapsed } = makeHarness();

// ---- periodRange ----

test('periodRange: day retorna inicio e fim iguais ao dia informado', () => {
  const now = new Date(2026, 6, 14);
  const r = periodRange('day', now);
  assert.equal(dnum(r.start), 20260714);
  assert.equal(dnum(r.end), 20260714);
});

test('periodRange: week comeca no domingo e termina no sabado', () => {
  const now = new Date(2026, 6, 14); // terca-feira
  const r = periodRange('week', now);
  assert.equal(r.start.getDay(), 0);
  assert.equal(r.end.getDay(), 6);
  assert.equal(dnum(r.start), 20260712);
  assert.equal(dnum(r.end), 20260718);
});

test('periodRange: month cobre do dia 1 ao ultimo dia do mes', () => {
  const now = new Date(2026, 6, 14);
  const r = periodRange('month', now);
  assert.equal(dnum(r.start), 20260701);
  assert.equal(dnum(r.end), 20260731);
});

test('periodRange: month respeita fevereiro bissexto', () => {
  const now = new Date(2024, 1, 10);
  const r = periodRange('month', now);
  assert.equal(dnum(r.end), 20240229);
});

test('periodRange: year cobre 1 de janeiro a 31 de dezembro', () => {
  const now = new Date(2026, 6, 14);
  const r = periodRange('year', now);
  assert.equal(dnum(r.start), 20260101);
  assert.equal(dnum(r.end), 20261231);
});

test('periodRange: periodo desconhecido cai no fallback de month', () => {
  const now = new Date(2026, 6, 14);
  const r = periodRange('unknown', now);
  assert.equal(dnum(r.start), 20260701);
  assert.equal(dnum(r.end), 20260731);
});

// ---- prorate ----

test('prorate: day divide por 30', () => {
  assert.equal(prorate(300, 'day'), 10);
});

test('prorate: week divide por 4.345', () => {
  const actual = prorate(4345, 'week');
  const expected = 1000;
  assert.ok(Math.abs(actual - expected) < 1e-9);
});

test('prorate: month retorna o valor mensal sem alteracao', () => {
  assert.equal(prorate(500, 'month'), 500);
});

test('prorate: year multiplica por 12', () => {
  assert.equal(prorate(100, 'year'), 1200);
});

test('prorate: periodo desconhecido cai no fallback de month', () => {
  assert.equal(prorate(500, 'unknown'), 500);
});

// ---- inRange ----

test('inRange: data dentro do intervalo retorna true', () => {
  const range = { start: new Date(2026, 6, 1), end: new Date(2026, 6, 31) };
  assert.equal(inRange('2026-07-14', range), true);
});

test('inRange: extremos do intervalo sao inclusivos', () => {
  const range = { start: new Date(2026, 6, 1), end: new Date(2026, 6, 31) };
  assert.equal(inRange('2026-07-01', range), true);
  assert.equal(inRange('2026-07-31', range), true);
});

test('inRange: data fora do intervalo retorna false', () => {
  const range = { start: new Date(2026, 6, 1), end: new Date(2026, 6, 31) };
  assert.equal(inRange('2026-08-01', range), false);
  assert.equal(inRange('2026-06-30', range), false);
});

// ---- clampRangeToToday ----

test('clampRangeToToday: mantem o range quando o fim ja esta dentro do mes atual', () => {
  const now = new Date(2026, 6, 14);
  const range = { start: new Date(2026, 6, 1), end: new Date(2026, 6, 31) };
  const r = clampRangeToToday(range, now);
  assert.equal(r, range);
});

test('clampRangeToToday: corta o range de ano no fim do mes atual', () => {
  const now = new Date(2026, 6, 14);
  const range = { start: new Date(2026, 0, 1), end: new Date(2026, 11, 31) };
  const r = clampRangeToToday(range, now);
  assert.equal(r.start, range.start);
  assert.equal(dnum(r.end), 20260731);
});

// ---- prorateElapsed ----

test('prorateElapsed: year multiplica pelo numero de meses decorridos', () => {
  const now = new Date(2026, 6, 14); // julho e mes index 6, 7 meses decorridos
  assert.equal(prorateElapsed(100, 'year', now), 700);
});

test('prorateElapsed: day/week/month delegam para prorate()', () => {
  const now = new Date(2026, 6, 14);
  assert.equal(prorateElapsed(300, 'day', now), prorate(300, 'day'));
  assert.equal(prorateElapsed(4345, 'week', now), prorate(4345, 'week'));
  assert.equal(prorateElapsed(500, 'month', now), prorate(500, 'month'));
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
