'use strict';

/**
 * Prova textual: renderFinance() nao mais declara calculos mortos
 * (incomeFromLines, income, outflow, saldo) e mantem tudo que renderDashCharts
 * e o resto da funcao ainda usam. Roda com node puro.
 *
 * Rodar: node tests/js/finance_render_dead_code_test.js
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const filePath = path.join(__dirname, '..', '..', 'assets', 'app.js');
const code = fs.readFileSync(filePath, 'utf8');

function functionBody(name){
  const start = code.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `funcao ${name} nao encontrada`);
  const nextFnMatch = code.slice(start + 1).search(/\n(async )?function /);
  const end = nextFnMatch >= 0 ? start + 1 + nextFnMatch : code.length;
  return code.slice(start, end);
}

const renderFinanceBody = functionBody('renderFinance');
const renderDashChartsBody = functionBody('renderDashCharts');

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

test('incomeFromLines foi removido de renderFinance', () => {
  assert.equal(/\bincomeFromLines\b/.test(renderFinanceBody), false);
});

test('const income = incomeFromLines + ifoodTotal foi removido', () => {
  assert.equal(/const\s+income\s*=\s*incomeFromLines\s*\+\s*ifoodTotal/.test(renderFinanceBody), false);
});

test('const outflow foi removido de renderFinance', () => {
  assert.equal(/const\s+outflow\s*=/.test(renderFinanceBody), false);
});

test('const saldo = income-outflow foi removido de renderFinance', () => {
  assert.equal(/const\s+saldo\s*=\s*income\s*-\s*outflow/.test(renderFinanceBody), false);
});

test('existe exatamente um const hasVariableIncome em todo o arquivo', () => {
  const matches = code.match(/const\s+hasVariableIncome\s*=/g) || [];
  assert.equal(matches.length, 1);
});

test('hasVariableIncome nao esta mais em renderFinance', () => {
  assert.equal(/const\s+hasVariableIncome\s*=/.test(renderFinanceBody), false);
});

test('hasVariableIncome permanece dentro de renderDashCharts', () => {
  assert.equal(/const\s+hasVariableIncome\s*=\s*entries\.length>0\s*\|\|\s*incLines\.some\(l=>l\.type==='variavel'\)/.test(renderDashChartsBody), true);
});

test('calculo de ifoodTotal permanece em renderFinance', () => {
  assert.equal(/const\s+ifoodTotal\s*=\s*monthEntries\.reduce/.test(renderFinanceBody), true);
});

test('renderDashCharts continua recebendo ifoodTotal', () => {
  assert.equal(/renderDashCharts\(entries,\s*expLines,\s*incLines,\s*ifoodTotal,/.test(renderFinanceBody), true);
});

test('renderFinance continua buscando entries, expLines, incLines e accounts', () => {
  assert.equal(/const\s+entries\s*=\s*await\s+storeGet\('ifood-entries',\s*\[\]\)/.test(renderFinanceBody), true);
  assert.equal(/const\s+expLines\s*=\s*await\s+getExpenseLines\(\)/.test(renderFinanceBody), true);
  assert.equal(/const\s+incLines\s*=\s*await\s+getIncomeLines\(\)/.test(renderFinanceBody), true);
  assert.equal(/const\s+accounts\s*=\s*await\s+getAccounts\(\)/.test(renderFinanceBody), true);
});

test('mk e monthEntries permanecem em renderFinance', () => {
  assert.equal(/const\s+mk\s*=\s*monthKey\(\)/.test(renderFinanceBody), true);
  assert.equal(/const\s+monthEntries\s*=\s*entries\.filter/.test(renderFinanceBody), true);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
