'use strict';

/**
 * Teste focal de clampDayOfMonth(), expenseOccurrencesInRange(),
 * expenseTotalInRange() e expenseOccurrenceEntries() (Fase 16).
 * Roda com node puro, sem framework nem bundler.
 *
 * Rodar: node tests/js/finance_expense_occurrence_calculation_test.js
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const filePath = path.join(__dirname, '..', '..', 'assets', 'finance-expense-occurrence-calculation.js');
const code = fs.readFileSync(filePath, 'utf8');

function dnum(d){ return d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate(); }
function inRange(dateStr, range){
  const d = new Date(dateStr+'T00:00:00');
  return dnum(d) >= dnum(range.start) && dnum(d) <= dnum(range.end);
}

function makeHarness(){
  const sandbox = { dnum, inRange };
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

const { clampDayOfMonth, expenseOccurrencesInRange, expenseTotalInRange, expenseOccurrenceEntries } = makeHarness();

function d(y,m,day){ return new Date(y, m, day); }
function range(y1,m1,day1,y2,m2,day2){ return { start: d(y1,m1,day1), end: d(y2,m2,day2) }; }

// ---- clampDayOfMonth ----

test('clampDayOfMonth: dia dentro do mes retorna o mesmo dia', () => {
  assert.equal(clampDayOfMonth(2026, 0, 15), 15);
});

test('clampDayOfMonth: fevereiro comum clampa dia 31 para 28', () => {
  assert.equal(clampDayOfMonth(2026, 1, 31), 28);
});

test('clampDayOfMonth: fevereiro bissexto clampa dia 31 para 29', () => {
  assert.equal(clampDayOfMonth(2024, 1, 31), 29);
});

test('clampDayOfMonth: mes de 30 dias clampa dia 31 para 30', () => {
  assert.equal(clampDayOfMonth(2026, 3, 31), 30);
});

// ---- expenseOccurrencesInRange: despesa avulsa (sem recorrencia/parcela) ----

test('expenseOccurrencesInRange: despesa avulsa dentro do periodo retorna a propria data', () => {
  const exp = { date: '2026-07-10' };
  const occ = expenseOccurrencesInRange(exp, range(2026,6,1,2026,6,31));
  assert.equal(occ.length, 1);
  assert.equal(dnum(occ[0]), 20260710);
});

test('expenseOccurrencesInRange: despesa avulsa fora do periodo retorna vazio', () => {
  const exp = { date: '2026-08-10' };
  const occ = expenseOccurrencesInRange(exp, range(2026,6,1,2026,6,31));
  assert.deepEqual(Array.from(occ), []);
});

test('expenseOccurrencesInRange: sem data retorna vazio', () => {
  assert.deepEqual(Array.from(expenseOccurrencesInRange({}, range(2026,6,1,2026,6,31))), []);
});

test('expenseOccurrencesInRange: limites do periodo sao inclusivos', () => {
  const start = expenseOccurrencesInRange({ date: '2026-07-01' }, range(2026,6,1,2026,6,31));
  const end = expenseOccurrencesInRange({ date: '2026-07-31' }, range(2026,6,1,2026,6,31));
  assert.equal(start.length, 1);
  assert.equal(end.length, 1);
});

// ---- expenseOccurrencesInRange: recorrencia mensal ----

test('expenseOccurrencesInRange: recorrencia mensal gera uma ocorrencia por mes no mesmo dia', () => {
  const exp = { date: '2026-01-15', recorrencia: 'mensal' };
  const occ = expenseOccurrencesInRange(exp, range(2026,0,1,2026,2,31));
  assert.deepEqual(Array.from(occ, dnum), [20260115, 20260215, 20260315]);
});

test('expenseOccurrencesInRange: recorrencia mensal exclui ocorrencias antes da data ancora', () => {
  const exp = { date: '2026-03-15', recorrencia: 'mensal' };
  const occ = expenseOccurrencesInRange(exp, range(2026,0,1,2026,2,31));
  assert.deepEqual(Array.from(occ, dnum), [20260315]);
});

test('expenseOccurrencesInRange: recorrencia mensal clampa dia 31 em meses curtos', () => {
  const exp = { date: '2026-01-31', recorrencia: 'mensal' };
  const occ = expenseOccurrencesInRange(exp, range(2026,0,1,2026,3,30));
  assert.deepEqual(Array.from(occ, dnum), [20260131, 20260228, 20260331, 20260430]);
});

test('expenseOccurrencesInRange: sem "mensal" e sem parcelas trata como despesa avulsa', () => {
  const exp = { date: '2026-07-10', recorrencia: 'nenhuma' };
  const occ = expenseOccurrencesInRange(exp, range(2026,6,1,2026,6,31));
  assert.equal(occ.length, 1);
});

// ---- expenseOccurrencesInRange: parcelado ----

test('expenseOccurrencesInRange: parcelado gera N ocorrencias mensais a partir da 1a parcela', () => {
  const exp = { date: '2026-01-10', parcelas: 3 };
  const occ = expenseOccurrencesInRange(exp, range(2026,0,1,2026,11,31));
  assert.deepEqual(Array.from(occ, dnum), [20260110, 20260210, 20260310]);
});

test('expenseOccurrencesInRange: parcelado clampa dia em meses curtos', () => {
  const exp = { date: '2026-01-31', parcelas: 3 };
  const occ = expenseOccurrencesInRange(exp, range(2026,0,1,2026,11,31));
  assert.deepEqual(Array.from(occ, dnum), [20260131, 20260228, 20260331]);
});

test('expenseOccurrencesInRange: parcelado so retorna parcelas dentro do periodo', () => {
  const exp = { date: '2026-01-10', parcelas: 3 };
  const occ = expenseOccurrencesInRange(exp, range(2026,1,1,2026,1,28));
  assert.deepEqual(Array.from(occ, dnum), [20260210]);
});

// ---- 600-month guard ----

test('expenseOccurrencesInRange: guarda de 600 meses limita a geracao', () => {
  const exp = { date: '1900-01-15', recorrencia: 'mensal' };
  const occ = expenseOccurrencesInRange(exp, range(1900,0,1,3000,0,1));
  assert.ok(occ.length <= 600);
});

// ---- expenseTotalInRange ----

test('expenseTotalInRange: multiplica ocorrencias pelo valor', () => {
  const exp = { date: '2026-01-15', recorrencia: 'mensal', value: 100 };
  assert.equal(expenseTotalInRange(exp, range(2026,0,1,2026,2,31)), 300);
});

test('expenseTotalInRange: valor ausente e coagido para zero', () => {
  const exp = { date: '2026-07-10' };
  assert.equal(expenseTotalInRange(exp, range(2026,6,1,2026,6,31)), 0);
});

test('expenseTotalInRange: valor em string numerica e coagido', () => {
  const exp = { date: '2026-07-10', value: '50.5' };
  assert.equal(expenseTotalInRange(exp, range(2026,6,1,2026,6,31)), 50.5);
});

test('expenseTotalInRange: sem ocorrencias no periodo retorna zero', () => {
  const exp = { date: '2026-08-10', value: 100 };
  assert.equal(expenseTotalInRange(exp, range(2026,6,1,2026,6,31)), 0);
});

// ---- expenseOccurrenceEntries ----

test('expenseOccurrenceEntries: ignora despesas sem data', () => {
  const entries = expenseOccurrenceEntries([{ value: 10 }], range(2026,6,1,2026,6,31));
  assert.deepEqual(Array.from(entries), []);
});

test('expenseOccurrenceEntries: achata ocorrencias preservando a ordem das despesas', () => {
  const e1 = { date: '2026-01-15', recorrencia: 'mensal' };
  const e2 = { date: '2026-07-05' };
  const entries = expenseOccurrenceEntries([e1, e2], range(2026,0,1,2026,6,31));
  assert.equal(entries.length, 8);
  assert.equal(entries[0].exp, e1);
  assert.equal(entries[entries.length-1].exp, e2);
});

test('expenseOccurrenceEntries: mantem a identidade do objeto original da despesa', () => {
  const e1 = { date: '2026-07-05', foo: 'bar' };
  const entries = expenseOccurrenceEntries([e1], range(2026,6,1,2026,6,31));
  assert.equal(entries[0].exp, e1);
  assert.equal(dnum(entries[0].date), 20260705);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
