'use strict';

/**
 * Teste focal de calculateEndOfMonthProjection() (Fase 27).
 * Roda com node puro, sem framework nem bundler.
 *
 * Rodar: node tests/js/finance_end_of_month_projection_calculation_test.js
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const occurrenceFilePath = path.join(__dirname, '..', '..', 'assets', 'finance-expense-occurrence-calculation.js');
const periodFilePath = path.join(__dirname, '..', '..', 'assets', 'finance-period-calculation.js');
const incomeActivationFilePath = path.join(__dirname, '..', '..', 'assets', 'finance-income-activation-calculation.js');
const appJsFilePath = path.join(__dirname, '..', '..', 'assets', 'app.js');
const filePath = path.join(__dirname, '..', '..', 'assets', 'finance-end-of-month-projection-calculation.js');

const occurrenceCode = fs.readFileSync(occurrenceFilePath, 'utf8');
const periodCode = fs.readFileSync(periodFilePath, 'utf8');
const incomeActivationCode = fs.readFileSync(incomeActivationFilePath, 'utf8');
const appJsSource = fs.readFileSync(appJsFilePath, 'utf8');
const code = fs.readFileSync(filePath, 'utf8');

const dnumMatch = appJsSource.match(/function dnum\([^)]*\)\{[^}]*\}/);
if (!dnumMatch) throw new Error('dnum não encontrado em assets/app.js');
const dnumCode = dnumMatch[0];

const addDaysMatch = appJsSource.match(/function addDays\([^)]*\)\{[^}]*\}/);
if (!addDaysMatch) throw new Error('addDays não encontrado em assets/app.js');
const addDaysCode = addDaysMatch[0];

// Harness com as implementações reais de addDays, isIncomeActive,
// expenseTotalInRange (e suas próprias dependências: dnum, clampDayOfMonth,
// inRange) — as mesmas dependências carregadas em produção.
function makeHarness(){
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(dnumCode, sandbox, { filename: appJsFilePath });
  vm.runInContext(addDaysCode, sandbox, { filename: appJsFilePath });
  vm.runInContext(occurrenceCode, sandbox, { filename: occurrenceFilePath });
  vm.runInContext(periodCode, sandbox, { filename: periodFilePath });
  vm.runInContext(incomeActivationCode, sandbox, { filename: incomeActivationFilePath });
  vm.runInContext(code, sandbox, { filename: filePath });
  return { calculateEndOfMonthProjection: sandbox.calculateEndOfMonthProjection };
}

// Harness com stubs no lugar de addDays, isIncomeActive e
// expenseTotalInRange, pra provar que calculateEndOfMonthProjection delega
// em vez de recalcular tudo inline.
function makeStubHarness(addDaysStub, isIncomeActiveStub, expenseTotalInRangeStub){
  const sandbox = { addDays: addDaysStub, isIncomeActive: isIncomeActiveStub, expenseTotalInRange: expenseTotalInRangeStub };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: filePath });
  return { calculateEndOfMonthProjection: sandbox.calculateEndOfMonthProjection };
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

// ---- listas vazias ----

test('listas vazias: aReceber e aPagar zerados, projetado = saldoTotal', () => {
  const h = makeHarness();
  const now = new Date(2024, 0, 10);
  const r = h.calculateEndOfMonthProjection(500, [], [], now);
  assert.equal(r.aReceber, 0);
  assert.equal(r.aPagar, 0);
  assert.equal(r.projetado, 500);
});

// ---- saldo positivo/negativo/string (sem coercao adicional, preserva comportamento original) ----

test('saldoTotal positivo soma direto quando aReceber/aPagar sao zero', () => {
  const h = makeHarness();
  const now = new Date(2024, 0, 10);
  const r = h.calculateEndOfMonthProjection(300, [], [], now);
  assert.equal(r.projetado, 300);
});

test('saldoTotal negativo soma direto quando aReceber/aPagar sao zero', () => {
  const h = makeHarness();
  const now = new Date(2024, 0, 10);
  const r = h.calculateEndOfMonthProjection(-150, [], [], now);
  assert.equal(r.projetado, -150);
});

test('saldoTotal em string nao recebe coercao propria (preserva concatenacao original de +)', () => {
  const h = makeHarness();
  const now = new Date(2024, 0, 10);
  const r = h.calculateEndOfMonthProjection('100', [], [], now);
  // '100' + 0 (aReceber) concatena como string '1000'; '1000' - 0 (aPagar) converte de volta a numero.
  assert.equal(r.projetado, 1000);
});

// ---- rendas ativas e inativas ----

test('renda temporaria com endDate expirado nao entra em aReceber', () => {
  const h = makeHarness();
  const now = new Date(2024, 0, 10);
  const inc = { type: 'temporaria', endDate: '2023-12-01', payday: 15, value: 200 };
  const r = h.calculateEndOfMonthProjection(0, [inc], [], now);
  assert.equal(r.aReceber, 0);
});

test('renda temporaria sem endDate fica sempre ativa', () => {
  const h = makeHarness();
  const now = new Date(2024, 0, 10);
  const inc = { type: 'temporaria', payday: 15, value: 200 };
  const r = h.calculateEndOfMonthProjection(0, [inc], [], now);
  assert.equal(r.aReceber, 200);
});

test('renda nao temporaria fica sempre ativa', () => {
  const h = makeHarness();
  const now = new Date(2024, 0, 10);
  const inc = { type: 'fixa', payday: 15, value: 200 };
  const r = h.calculateEndOfMonthProjection(0, [inc], [], now);
  assert.equal(r.aReceber, 200);
});

// ---- payday ausente/anterior/igual/posterior a today ----

test('payday ausente exclui a renda', () => {
  const h = makeHarness();
  const now = new Date(2024, 0, 10);
  const inc = { type: 'fixa', value: 200 };
  const r = h.calculateEndOfMonthProjection(0, [inc], [], now);
  assert.equal(r.aReceber, 0);
});

test('payday anterior a today exclui a renda', () => {
  const h = makeHarness();
  const now = new Date(2024, 0, 10);
  const inc = { type: 'fixa', payday: 9, value: 200 };
  const r = h.calculateEndOfMonthProjection(0, [inc], [], now);
  assert.equal(r.aReceber, 0);
});

test('payday igual a today inclui a renda', () => {
  const h = makeHarness();
  const now = new Date(2024, 0, 10);
  const inc = { type: 'fixa', payday: 10, value: 200 };
  const r = h.calculateEndOfMonthProjection(0, [inc], [], now);
  assert.equal(r.aReceber, 200);
});

test('payday posterior a today inclui a renda', () => {
  const h = makeHarness();
  const now = new Date(2024, 0, 10);
  const inc = { type: 'fixa', payday: 11, value: 200 };
  const r = h.calculateEndOfMonthProjection(0, [inc], [], now);
  assert.equal(r.aReceber, 200);
});

// ---- Number(value||0) ausente/string ----

test('value ausente na renda e tratado como zero', () => {
  const h = makeHarness();
  const now = new Date(2024, 0, 10);
  const inc = { type: 'fixa', payday: 10 };
  const r = h.calculateEndOfMonthProjection(0, [inc], [], now);
  assert.equal(r.aReceber, 0);
});

test('value em string na renda e coagido com Number(value||0)', () => {
  const h = makeHarness();
  const now = new Date(2024, 0, 10);
  const inc = { type: 'fixa', payday: 10, value: '250' };
  const r = h.calculateEndOfMonthProjection(0, [inc], [], now);
  assert.equal(r.aReceber, 250);
});

// ---- despesas restantes e recorrencias ----

test('despesa avulsa dentro do range restante entra em aPagar', () => {
  const h = makeHarness();
  const now = new Date(2024, 0, 10);
  const exp = { date: '2024-01-15', value: 80 };
  const r = h.calculateEndOfMonthProjection(0, [], [exp], now);
  assert.equal(r.aPagar, 80);
});

test('despesa avulsa antes do range restante nao entra em aPagar', () => {
  const h = makeHarness();
  const now = new Date(2024, 0, 10);
  const exp = { date: '2024-01-05', value: 999 };
  const r = h.calculateEndOfMonthProjection(0, [], [exp], now);
  assert.equal(r.aPagar, 0);
});

test('despesa mensal recorrente conta a ocorrencia restante do mes', () => {
  const h = makeHarness();
  const now = new Date(2024, 0, 10);
  const exp = { date: '2024-01-20', recorrencia: 'mensal', value: 50 };
  const r = h.calculateEndOfMonthProjection(0, [], [exp], now);
  assert.equal(r.aPagar, 50);
});

test('aPagar soma varias despesas restantes e ignora as ja passadas', () => {
  const h = makeHarness();
  const now = new Date(2024, 0, 10);
  const passada = { date: '2024-01-05', value: 999 };
  const avulsa = { date: '2024-01-15', value: 80 };
  const recorrente = { date: '2024-01-20', recorrencia: 'mensal', value: 50 };
  const r = h.calculateEndOfMonthProjection(500, [], [passada, avulsa, recorrente], now);
  assert.equal(r.aPagar, 130);
  assert.equal(r.projetado, 370); // 500 + 0 - 130
});

// ---- ultimo dia do mes forca aPagar=0 ----

test('no ultimo dia do mes aPagar e zero mesmo com despesas restantes', () => {
  const h = makeHarness();
  const now = new Date(2024, 0, 31); // 31/jan/2024, ultimo dia
  const exp = { date: '2024-01-31', value: 500 };
  const r = h.calculateEndOfMonthProjection(0, [], [exp], now);
  assert.equal(r.aPagar, 0);
});

// ---- viradas de mes/ano e fevereiro bissexto ----

test('virada de ano: endMonth e remRange calculados em dezembro', () => {
  const h = makeHarness();
  const now = new Date(2023, 11, 20); // 20/dez/2023
  const r = h.calculateEndOfMonthProjection(0, [], [], now);
  assert.equal(r.today, 20);
  assert.equal(r.endMonth.getFullYear(), 2023);
  assert.equal(r.endMonth.getMonth(), 11);
  assert.equal(r.endMonth.getDate(), 31);
  assert.equal(r.remRange.start.getFullYear(), 2023);
  assert.equal(r.remRange.start.getMonth(), 11);
  assert.equal(r.remRange.start.getDate(), 21);
});

test('fevereiro bissexto (2024) tem endMonth no dia 29', () => {
  const h = makeHarness();
  const now = new Date(2024, 1, 15);
  const r = h.calculateEndOfMonthProjection(0, [], [], now);
  assert.equal(r.endMonth.getDate(), 29);
});

test('fevereiro comum (2023) tem endMonth no dia 28', () => {
  const h = makeHarness();
  const now = new Date(2023, 1, 15);
  const r = h.calculateEndOfMonthProjection(0, [], [], now);
  assert.equal(r.endMonth.getDate(), 28);
});

// ---- remRange comeca amanha e termina no ultimo dia ----

test('remRange comeca amanha e termina no ultimo dia do mes', () => {
  const h = makeHarness();
  const now = new Date(2024, 2, 10); // 10/mar/2024
  const r = h.calculateEndOfMonthProjection(0, [], [], now);
  assert.equal(r.remRange.start.getFullYear(), 2024);
  assert.equal(r.remRange.start.getMonth(), 2);
  assert.equal(r.remRange.start.getDate(), 11);
  assert.equal(r.remRange.end, r.endMonth);
  assert.equal(r.remRange.end.getDate(), 31);
});

// ---- entrada e objetos nao mutados ----

test('nao muta incLines/expLines nem seus objetos', () => {
  const h = makeHarness();
  const now = new Date(2024, 0, 10);
  const inc = { type: 'fixa', payday: 15, value: 200 };
  const exp = { date: '2024-01-15', value: 80 };
  const incLines = [inc];
  const expLines = [exp];
  const incSnapshot = JSON.stringify(incLines);
  const expSnapshot = JSON.stringify(expLines);
  h.calculateEndOfMonthProjection(0, incLines, expLines, now);
  assert.equal(incLines.length, 1);
  assert.equal(expLines.length, 1);
  assert.equal(incLines[0], inc);
  assert.equal(expLines[0], exp);
  assert.equal(JSON.stringify(incLines), incSnapshot);
  assert.equal(JSON.stringify(expLines), expSnapshot);
});

// ---- delegacao para addDays, isIncomeActive e expenseTotalInRange (falha se inlined) ----

test('delega para addDays, isIncomeActive e expenseTotalInRange (nao recalcula inline)', () => {
  const addDaysCalls = [];
  const incomeCalls = [];
  const expenseCalls = [];
  const SENTINEL_TOMORROW = new Date(2099, 5, 1); // data artificial, prova que o retorno do stub e usado

  const addDaysStub = function(d, n){
    addDaysCalls.push([d, n]);
    return SENTINEL_TOMORROW;
  };
  // renda "expirada" de verdade (endDate no passado); o stub ignora a regra
  // real e forca ativa via marcador artificial, provando que o retorno do
  // stub — nao a logica real de isIncomeActive — decide a inclusao.
  const isIncomeActiveStub = function(line, now){
    incomeCalls.push(line);
    return line.__forceActive === true;
  };
  const expenseTotalInRangeStub = function(exp, range){
    expenseCalls.push([exp, range]);
    return 42; // valor artificial, independente do conteudo real da despesa
  };

  const h = makeStubHarness(addDaysStub, isIncomeActiveStub, expenseTotalInRangeStub);
  const now = new Date(2024, 0, 10); // nao e o ultimo dia do mes
  const incLines = [{ type: 'temporaria', endDate: '2020-01-01', payday: 15, value: 500, __forceActive: true }];
  const expLines = [{ label: 'X' }, { label: 'Y' }];

  const r = h.calculateEndOfMonthProjection(100, incLines, expLines, now);

  assert.ok(addDaysCalls.length > 0, 'addDays deveria ter sido chamado');
  assert.equal(addDaysCalls[0][1], 1);
  assert.equal(r.remRange.start, SENTINEL_TOMORROW);

  assert.ok(incomeCalls.length > 0, 'isIncomeActive deveria ter sido chamado');
  assert.equal(r.aReceber, 500); // so inclui pq o stub forcou ativo (real seria expirada)

  assert.equal(expenseCalls.length, 2, 'expenseTotalInRange deveria ter sido chamado uma vez por despesa');
  assert.equal(expenseCalls[0][1], r.remRange);
  assert.equal(r.aPagar, 84); // 2 despesas * 42 (stub), prova que o retorno do stub e usado

  assert.equal(r.projetado, 100 + 500 - 84);
});

// ---- ultimo dia: spy comprova zero chamadas a expenseTotalInRange ----

test('no ultimo dia do mes, expenseTotalInRange nao e chamado nenhuma vez', () => {
  const expenseCalls = [];
  const addDaysStub = function(d, n){ const r = new Date(d); r.setDate(r.getDate()+n); return r; };
  const isIncomeActiveStub = function(){ return true; };
  const expenseTotalInRangeStub = function(exp, range){
    expenseCalls.push([exp, range]);
    return 999;
  };
  const h = makeStubHarness(addDaysStub, isIncomeActiveStub, expenseTotalInRangeStub);
  const now = new Date(2024, 0, 31); // ultimo dia de janeiro
  const expLines = [{ label: 'X' }, { label: 'Y' }, { label: 'Z' }];

  const r = h.calculateEndOfMonthProjection(0, [], expLines, now);

  assert.equal(expenseCalls.length, 0);
  assert.equal(r.aPagar, 0);
});

// ---- canonical / public asset byte equality ----

test('canonico e asset publico sao byte-identicos', () => {
  const canonicalPath = path.join(__dirname, '..', '..', 'app', 'Modules', 'Finance', 'Frontend', 'finance-end-of-month-projection-calculation.js');
  const publicPath = path.join(__dirname, '..', '..', 'assets', 'finance-end-of-month-projection-calculation.js');
  const canonical = fs.readFileSync(canonicalPath);
  const publicAsset = fs.readFileSync(publicPath);
  assert.equal(Buffer.compare(canonical, publicAsset), 0);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
