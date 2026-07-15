'use strict';

/**
 * Teste focal de calculateInvoiceReminders() (Fase 26).
 * Roda com node puro, sem framework nem bundler.
 *
 * Rodar: node tests/js/finance_invoice_reminder_calculation_test.js
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const occurrenceFilePath = path.join(__dirname, '..', '..', 'assets', 'finance-expense-occurrence-calculation.js');
const appJsFilePath = path.join(__dirname, '..', '..', 'assets', 'app.js');
const filePath = path.join(__dirname, '..', '..', 'assets', 'finance-invoice-reminder-calculation.js');

const occurrenceCode = fs.readFileSync(occurrenceFilePath, 'utf8');
const appJsSource = fs.readFileSync(appJsFilePath, 'utf8');
const code = fs.readFileSync(filePath, 'utf8');

const dnumMatch = appJsSource.match(/function dnum\([^)]*\)\{[^}]*\}/);
if (!dnumMatch) throw new Error('dnum não encontrado em assets/app.js');
const dnumCode = dnumMatch[0];

// Harness com as implementações reais de clampDayOfMonth e dnum (mesmas
// dependências carregadas em produção antes de calculateInvoiceReminders).
function makeHarness(){
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(occurrenceCode, sandbox, { filename: occurrenceFilePath });
  vm.runInContext(dnumCode, sandbox, { filename: appJsFilePath });
  vm.runInContext(code, sandbox, { filename: filePath });
  return { calculateInvoiceReminders: sandbox.calculateInvoiceReminders };
}

// Harness com stubs no lugar de clampDayOfMonth e dnum, pra provar que
// calculateInvoiceReminders delega em vez de recalcular inline.
function makeStubHarness(clampStub, dnumStub){
  const sandbox = { clampDayOfMonth: clampStub, dnum: dnumStub };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: filePath });
  return { calculateInvoiceReminders: sandbox.calculateInvoiceReminders };
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

test('lista vazia retorna array vazio', () => {
  const h = makeHarness();
  const r = Array.from(h.calculateInvoiceReminders([], new Date(2024, 0, 15)));
  assert.deepEqual(r, []);
});

// ---- sem vencimento ----

test('cartao sem vencimento e ignorado', () => {
  const h = makeHarness();
  const r = Array.from(h.calculateInvoiceReminders([{ label: 'Sem venc', fatura: 100 }], new Date(2024, 0, 15)));
  assert.deepEqual(r, []);
});

// ---- fatura zero/negativa ----

test('cartao com fatura zero e ignorado', () => {
  const h = makeHarness();
  const r = Array.from(h.calculateInvoiceReminders([{ label: 'Zero', vencimento: 20, fatura: 0 }], new Date(2024, 0, 15)));
  assert.deepEqual(r, []);
});

test('cartao com fatura negativa e ignorado', () => {
  const h = makeHarness();
  const r = Array.from(h.calculateInvoiceReminders([{ label: 'Negativa', vencimento: 20, fatura: -50 }], new Date(2024, 0, 15)));
  assert.deepEqual(r, []);
});

// ---- vencimento hoje / amanha / 7 dias / 8 dias ----

test('vencimento hoje entra com days=0', () => {
  const h = makeHarness();
  const now = new Date(2024, 0, 1, 12, 0);
  const r = Array.from(h.calculateInvoiceReminders([{ label: 'Hoje', vencimento: 1, fatura: 10 }], now));
  assert.equal(r.length, 1);
  assert.equal(r[0].days, 0);
});

test('vencimento amanha entra com days=1', () => {
  const h = makeHarness();
  const now = new Date(2024, 0, 1, 12, 0);
  const r = Array.from(h.calculateInvoiceReminders([{ label: 'Amanha', vencimento: 2, fatura: 10 }], now));
  assert.equal(r.length, 1);
  assert.equal(r[0].days, 1);
});

test('vencimento em 7 dias e incluido (limite)', () => {
  const h = makeHarness();
  const now = new Date(2024, 0, 1, 12, 0);
  const r = Array.from(h.calculateInvoiceReminders([{ label: 'Sete', vencimento: 8, fatura: 10 }], now));
  assert.equal(r.length, 1);
  assert.equal(r[0].days, 7);
});

test('vencimento em 8 dias e excluido', () => {
  const h = makeHarness();
  const now = new Date(2024, 0, 1, 12, 0);
  const r = Array.from(h.calculateInvoiceReminders([{ label: 'Oito', vencimento: 9, fatura: 10 }], now));
  assert.deepEqual(r, []);
});

// ---- vencimento passado migra pro proximo mes ----

test('vencimento ja passado neste mes migra pro proximo mes', () => {
  const h = makeHarness();
  const now = new Date(2024, 0, 30, 9, 0); // 30/jan/2024
  const r = Array.from(h.calculateInvoiceReminders([{ label: 'Rollover', vencimento: 5, fatura: 10 }], now));
  assert.equal(r.length, 1);
  assert.equal(r[0].due.getMonth(), 1); // fevereiro
  assert.equal(r[0].due.getDate(), 5);
  assert.equal(r[0].days, 6);
});

// ---- virada de ano ----

test('vencimento passado em dezembro migra pro janeiro do ano seguinte', () => {
  const h = makeHarness();
  const now = new Date(2023, 11, 30, 9, 0); // 30/dez/2023
  const r = Array.from(h.calculateInvoiceReminders([{ label: 'AnoNovo', vencimento: 5, fatura: 10 }], now));
  assert.equal(r.length, 1);
  assert.equal(r[0].due.getFullYear(), 2024);
  assert.equal(r[0].due.getMonth(), 0); // janeiro
  assert.equal(r[0].due.getDate(), 5);
  assert.equal(r[0].days, 6);
});

// ---- clamp em fevereiro comum/bissexto e meses curtos ----

test('clamp em fevereiro comum (2023, 28 dias)', () => {
  const h = makeHarness();
  const now = new Date(2023, 1, 25);
  const r = Array.from(h.calculateInvoiceReminders([{ label: 'FevComum', vencimento: 31, fatura: 10 }], now));
  assert.equal(r.length, 1);
  assert.equal(r[0].due.getDate(), 28);
});

test('clamp em fevereiro bissexto (2024, 29 dias)', () => {
  const h = makeHarness();
  const now = new Date(2024, 1, 25);
  const r = Array.from(h.calculateInvoiceReminders([{ label: 'FevBissexto', vencimento: 31, fatura: 10 }], now));
  assert.equal(r.length, 1);
  assert.equal(r[0].due.getDate(), 29);
});

test('clamp em mes curto (abril, 30 dias)', () => {
  const h = makeHarness();
  const now = new Date(2024, 3, 25);
  const r = Array.from(h.calculateInvoiceReminders([{ label: 'Abril', vencimento: 31, fatura: 10 }], now));
  assert.equal(r.length, 1);
  assert.equal(r[0].due.getDate(), 30);
});

// ---- ordenacao estavel por days e referencias preservadas ----

test('ordena crescente por days e preserva referencias dos cartoes', () => {
  const h = makeHarness();
  const now = new Date(2024, 0, 1, 12, 0);
  const cA = { label: 'A', vencimento: 5, fatura: 10 };
  const cB = { label: 'B', vencimento: 2, fatura: 10 };
  const cC = { label: 'C', vencimento: 8, fatura: 10 };
  const cD = { label: 'D', vencimento: 2, fatura: 10 }; // mesmo days de B
  const r = Array.from(h.calculateInvoiceReminders([cA, cB, cC, cD], now));
  assert.deepEqual(r.map(x=>x.days), [1, 1, 4, 7]);
  assert.equal(r[0].c, cB);
  assert.equal(r[1].c, cD);
  assert.equal(r[2].c, cA);
  assert.equal(r[3].c, cC);
});

// ---- nao muta entrada ----

test('nao muta o array de entrada nem os objetos de cartao', () => {
  const h = makeHarness();
  const now = new Date(2024, 0, 1, 12, 0);
  const cartao = { label: 'Imutavel', vencimento: 5, fatura: 10 };
  const input = [cartao];
  const snapshot = JSON.stringify(input);
  h.calculateInvoiceReminders(input, now);
  assert.equal(input.length, 1);
  assert.equal(input[0], cartao);
  assert.equal(JSON.stringify(input), snapshot);
});

// ---- delegacao para clampDayOfMonth e dnum (falha se inlined) ----

test('delega classificacao de vencimento para clampDayOfMonth e dnum (nao recalcula inline)', () => {
  const clampCalls = [];
  const dnumCalls = [];
  const SENTINEL_DAY = 9; // dia artificial, diferente do clamp real, prova que o retorno do stub e usado
  const clampStub = function(year, month, day){
    clampCalls.push([year, month, day]);
    return SENTINEL_DAY;
  };
  const dnumStub = function(d){
    dnumCalls.push(d);
    return 0; // constante: nunca dispara o "ja passou este mes", mesmo com datas reais indicando o contrario
  };
  const h = makeStubHarness(clampStub, dnumStub);
  const now = new Date(2024, 5, 20); // 20/jun/2024
  const cartao = { label: 'Delegacao', vencimento: 5, fatura: 10 }; // 5 < 20: sem stub, migraria pro proximo mes
  const r = Array.from(h.calculateInvoiceReminders([cartao], now));

  assert.ok(clampCalls.length > 0, 'clampDayOfMonth deveria ter sido chamado');
  assert.deepEqual(clampCalls[0], [2024, 5, 5]);
  assert.ok(dnumCalls.length >= 2, 'dnum deveria ter sido chamado ao menos para due e todayD');

  assert.equal(r.length, 1);
  // dnum constante => nunca migra de mes, mesmo com vencimento "passado"
  assert.equal(r[0].due.getMonth(), 5);
  assert.equal(r[0].due.getDate(), SENTINEL_DAY);
});

// ---- canonical / public asset byte equality ----

test('canonico e asset publico sao byte-identicos', () => {
  const canonicalPath = path.join(__dirname, '..', '..', 'app', 'Modules', 'Finance', 'Frontend', 'finance-invoice-reminder-calculation.js');
  const publicPath = path.join(__dirname, '..', '..', 'assets', 'finance-invoice-reminder-calculation.js');
  const canonical = fs.readFileSync(canonicalPath);
  const publicAsset = fs.readFileSync(publicPath);
  assert.equal(Buffer.compare(canonical, publicAsset), 0);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
