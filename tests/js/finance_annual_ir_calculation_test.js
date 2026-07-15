'use strict';

/**
 * Teste focal de irMonthRange() e buildIrData() (Fase 17).
 * Roda com node puro, sem framework nem bundler.
 *
 * Rodar: node tests/js/finance_annual_ir_calculation_test.js
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const filePath = path.join(__dirname, '..', '..', 'assets', 'finance-annual-ir-calculation.js');
const code = fs.readFileSync(filePath, 'utf8');
const occFilePath = path.join(__dirname, '..', '..', 'assets', 'finance-expense-occurrence-calculation.js');
const occCode = fs.readFileSync(occFilePath, 'utf8');

const MONTH_ABBR = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

function pad(n){ return n.toString().padStart(2,'0'); }
function dnum(d){ return d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate(); }
function inRange(dateStr, range){
  const d = new Date(dateStr+'T00:00:00');
  return dnum(d) >= dnum(range.start) && dnum(d) <= dnum(range.end);
}

function isIncomeActive(line, now){
  if (line.type !== 'temporaria') return true;
  if (!line.endDate) return true;
  return dnum(new Date(line.endDate+'T00:00:00')) >= dnum(now);
}

function makeHarness(){
  const sandbox = { pad, MONTH_ABBR, dnum, inRange, isIncomeActive };
  vm.createContext(sandbox);
  vm.runInContext(occCode, sandbox, { filename: occFilePath });
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

const { irMonthRange, buildIrData } = makeHarness();

// ---- irMonthRange ----

test('irMonthRange: retorna inicio e fim do mes', () => {
  const r = irMonthRange(2026, 0);
  assert.equal(dnum(r.start), 20260101);
  assert.equal(dnum(r.end), 20260131);
});

test('irMonthRange: fevereiro bissexto vai ate dia 29', () => {
  const r = irMonthRange(2024, 1);
  assert.equal(dnum(r.end), 20240229);
});

test('irMonthRange: dezembro nao estoura pro ano seguinte', () => {
  const r = irMonthRange(2026, 11);
  assert.equal(dnum(r.start), 20261201);
  assert.equal(dnum(r.end), 20261231);
});

// ---- buildIrData: estrutura basica ----

test('buildIrData: retorna 12 meses em ordem Jan-Dez com labels de MONTH_ABBR', () => {
  const d = buildIrData(2026, [], [], []);
  assert.equal(d.months.length, 12);
  assert.deepEqual(Array.from(d.months, m=>m.label), MONTH_ABBR);
});

test('buildIrData: entradas vazias retornam totais zerados', () => {
  const d = buildIrData(2026, [], [], []);
  assert.equal(d.annualExp, 0);
  assert.equal(d.annualInc, 0);
  assert.equal(d.incFixed, 0);
  assert.equal(d.incVar, 0);
  assert.equal(d.incTemp, 0);
  assert.equal(d.incIfood, 0);
  assert.deepEqual(Object.assign({}, d.catTotals), {});
  d.months.forEach(m=> assert.equal(m.saldo, 0));
});

// ---- despesas: recorrencia e categoria ----

test('buildIrData: despesa avulsa entra no mes correto e soma na categoria', () => {
  const exp = { date: '2026-03-10', value: 100, categoria: 'mercado' };
  const d = buildIrData(2026, [exp], [], []);
  assert.equal(d.months[2].exp, 100);
  assert.equal(d.months[0].exp, 0);
  assert.equal(d.catTotals.mercado, 100);
  assert.equal(d.annualExp, 100);
});

test('buildIrData: despesa parcelada distribui pelas parcelas e soma total anual', () => {
  const exp = { date: '2026-01-10', value: 50, parcelas: 3, categoria: 'cartao' };
  const d = buildIrData(2026, [exp], [], []);
  assert.equal(d.months[0].exp, 50);
  assert.equal(d.months[1].exp, 50);
  assert.equal(d.months[2].exp, 50);
  assert.equal(d.months[3].exp, 0);
  assert.equal(d.catTotals.cartao, 150);
  assert.equal(d.annualExp, 150);
});

test('buildIrData: duas despesas na mesma categoria acumulam', () => {
  const e1 = { date: '2026-05-01', value: 30, categoria: 'lazer' };
  const e2 = { date: '2026-05-15', value: 20, categoria: 'lazer' };
  const d = buildIrData(2026, [e1, e2], [], []);
  assert.equal(d.catTotals.lazer, 50);
  assert.equal(d.months[4].exp, 50);
});

// ---- rendas: ativacao e createdAt ----

test('buildIrData: renda fixa sem createdAt entra em todos os meses', () => {
  const inc = { type: 'fixa', value: 1000 };
  const d = buildIrData(2026, [], [inc], []);
  d.months.forEach(m=> assert.equal(m.inc, 1000));
  assert.equal(d.incFixed, 12000);
  assert.equal(d.annualInc, 12000);
});

test('buildIrData: renda com createdAt so entra a partir do mes de criacao', () => {
  const inc = { type: 'fixa', value: 500, createdAt: '2026-04-15T00:00:00' };
  const d = buildIrData(2026, [], [inc], []);
  assert.equal(d.months[2].inc, 0);
  assert.equal(d.months[3].inc, 500);
  assert.equal(d.months[11].inc, 500);
});

test('buildIrData: renda temporaria com endDate para de contar apos o fim', () => {
  const inc = { type: 'temporaria', value: 200, endDate: '2026-06-15' };
  const d = buildIrData(2026, [], [inc], []);
  assert.equal(d.months[5].inc, 200);
  assert.equal(d.months[6].inc, 0);
  assert.equal(d.incTemp, 200*6);
});

test('buildIrData: renda variavel classifica em incVar', () => {
  const inc = { type: 'variavel', value: 300 };
  const d = buildIrData(2026, [], [inc], []);
  assert.equal(d.incVar, 300*12);
  assert.equal(d.incFixed, 0);
  assert.equal(d.incTemp, 0);
});

// ---- iFood ----

test('buildIrData: entradas do ifood casam pelo mes YYYY-MM e somam em incIfood', () => {
  const entries = [
    { date: '2026-02-05', valor: 40 },
    { date: '2026-02-20', valor: 10 },
    { date: '2026-03-01', valor: 15 },
  ];
  const d = buildIrData(2026, [], [], entries);
  assert.equal(d.months[1].inc, 50);
  assert.equal(d.months[2].inc, 15);
  assert.equal(d.incIfood, 65);
  assert.equal(d.annualInc, 65);
});

test('buildIrData: entrada do ifood sem valor e coagida para zero', () => {
  const entries = [{ date: '2026-01-05' }];
  const d = buildIrData(2026, [], [], entries);
  assert.equal(d.months[0].inc, 0);
});

test('buildIrData: entrada do ifood com valor em string numerica e coagida', () => {
  const entries = [{ date: '2026-01-05', valor: '25.5' }];
  const d = buildIrData(2026, [], [], entries);
  assert.equal(d.months[0].inc, 25.5);
});

// ---- saldo mensal e totais anuais combinados ----

test('buildIrData: saldo mensal e diferenca entre inc e exp do mes', () => {
  const exp = { date: '2026-07-10', value: 100, categoria: 'geral' };
  const inc = { type: 'fixa', value: 400 };
  const d = buildIrData(2026, [exp], [inc], []);
  assert.equal(d.months[6].saldo, 300);
  assert.equal(d.months[0].saldo, 400);
});

test('buildIrData: totais anuais combinam despesas, rendas cadastradas e ifood', () => {
  const exp = { date: '2026-01-05', value: 100, categoria: 'geral' };
  const inc = { type: 'fixa', value: 500 };
  const entries = [{ date: '2026-01-10', valor: 20 }];
  const d = buildIrData(2026, [exp], [inc], entries);
  assert.equal(d.annualExp, 100);
  assert.equal(d.annualInc, 500*12 + 20);
  assert.equal(d.months[0].inc, 520);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
