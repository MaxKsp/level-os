'use strict';

/**
 * Teste focal de isContaLike() (Fase 23).
 * Roda com node puro, sem framework nem bundler.
 *
 * Rodar: node tests/js/finance_account_type_calculation_test.js
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const filePath = path.join(__dirname, '..', '..', 'assets', 'finance-account-type-calculation.js');
const code = fs.readFileSync(filePath, 'utf8');

function makeHarness(){
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: filePath });
  return { isContaLike: sandbox.isContaLike };
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

// ---- cartao is the only account-unlike type ----

test('isContaLike: tipo cartao retorna false', () => {
  const h = makeHarness();
  assert.equal(h.isContaLike({ tipo: 'cartao' }), false);
});

// ---- supported account-like types ----

test('isContaLike: tipo conta retorna true', () => {
  const h = makeHarness();
  assert.equal(h.isContaLike({ tipo: 'conta' }), true);
});

test('isContaLike: tipo poupanca retorna true', () => {
  const h = makeHarness();
  assert.equal(h.isContaLike({ tipo: 'poupanca' }), true);
});

// ---- missing / unknown / null tipo ----

test('isContaLike: tipo ausente retorna true', () => {
  const h = makeHarness();
  assert.equal(h.isContaLike({}), true);
});

test('isContaLike: tipo desconhecido retorna true', () => {
  const h = makeHarness();
  assert.equal(h.isContaLike({ tipo: 'investimento' }), true);
});

test('isContaLike: tipo null retorna true', () => {
  const h = makeHarness();
  assert.equal(h.isContaLike({ tipo: null }), true);
});

// ---- case sensitivity ----

test('isContaLike: tipo Cartao (maiusculo) retorna true, comparacao e case-sensitive', () => {
  const h = makeHarness();
  assert.equal(h.isContaLike({ tipo: 'Cartao' }), true);
});

test('isContaLike: tipo CARTAO retorna true, comparacao e case-sensitive', () => {
  const h = makeHarness();
  assert.equal(h.isContaLike({ tipo: 'CARTAO' }), true);
});

// ---- non-string tipo values ----

test('isContaLike: tipo numerico retorna true', () => {
  const h = makeHarness();
  assert.equal(h.isContaLike({ tipo: 123 }), true);
});

test('isContaLike: tipo objeto retorna true', () => {
  const h = makeHarness();
  assert.equal(h.isContaLike({ tipo: {} }), true);
});

// ---- invalid account argument ----

test('isContaLike: argumento null lanca TypeError', () => {
  const h = makeHarness();
  assert.throws(() => h.isContaLike(null), (err) => err.name === 'TypeError');
});

test('isContaLike: argumento undefined lanca TypeError', () => {
  const h = makeHarness();
  assert.throws(() => h.isContaLike(undefined), (err) => err.name === 'TypeError');
});

// ---- callback compatibility ----

test('isContaLike: compativel com Array.prototype.filter', () => {
  const h = makeHarness();
  const accounts = [{ tipo: 'conta' }, { tipo: 'cartao' }, { tipo: 'poupanca' }];
  const result = accounts.filter(h.isContaLike);
  assert.equal(result.length, 2);
  assert.equal(result[0].tipo, 'conta');
  assert.equal(result[1].tipo, 'poupanca');
});

test('isContaLike: compativel com Array.prototype.some', () => {
  const h = makeHarness();
  assert.equal([{ tipo: 'cartao' }, { tipo: 'conta' }].some(h.isContaLike), true);
  assert.equal([{ tipo: 'cartao' }].some(h.isContaLike), false);
});

// ---- canonical / public asset byte equality ----

test('canonico e asset publico sao byte-identicos', () => {
  const canonicalPath = path.join(__dirname, '..', '..', 'app', 'Modules', 'Finance', 'Frontend', 'finance-account-type-calculation.js');
  const publicPath = path.join(__dirname, '..', '..', 'assets', 'finance-account-type-calculation.js');
  const canonical = fs.readFileSync(canonicalPath);
  const publicAsset = fs.readFileSync(publicPath);
  assert.equal(Buffer.compare(canonical, publicAsset), 0);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
