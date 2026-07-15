'use strict';

/**
 * Teste focal de catSlug() (Fase 24).
 * Roda com node puro, sem framework nem bundler.
 *
 * Rodar: node tests/js/finance_category_key_calculation_test.js
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const filePath = path.join(__dirname, '..', '..', 'assets', 'finance-category-key-calculation.js');
const code = fs.readFileSync(filePath, 'utf8');

function makeHarness(dateNowFn){
  const sandbox = { Date: dateNowFn ? { now: dateNowFn } : Date };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: filePath });
  return { catSlug: sandbox.catSlug };
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

// ---- accents / diacritics ----

test('catSlug: remove acentos via NFD', () => {
  const h = makeHarness();
  assert.equal(h.catSlug('João da Silva'), 'joao_da_silva');
});

test('catSlug: remove acentos e simbolos combinados', () => {
  const h = makeHarness();
  assert.equal(h.catSlug('Café & Pão!'), 'cafe_pao');
});

// ---- spaces / punctuation / repeated separators ----

test('catSlug: espacos repetidos viram um unico underscore', () => {
  const h = makeHarness();
  assert.equal(h.catSlug('a   b'), 'a_b');
});

test('catSlug: pontuacao vira underscore', () => {
  const h = makeHarness();
  assert.equal(h.catSlug('lazer, viagens & hobbies'), 'lazer_viagens_hobbies');
});

// ---- mixed case ----

test('catSlug: converte para minusculo', () => {
  const h = makeHarness();
  assert.equal(h.catSlug('MiXeD CaSe'), 'mixed_case');
});

// ---- leading / trailing separators ----

test('catSlug: remove underscore inicial e final', () => {
  const h = makeHarness();
  assert.equal(h.catSlug('  leading and trailing  '), 'leading_and_trailing');
});

// ---- truncation ----

test('catSlug: trunca em 40 caracteres', () => {
  const h = makeHarness();
  const longName = 'a'.repeat(50);
  const result = h.catSlug(longName);
  assert.equal(result.length, 40);
  assert.equal(result, 'a'.repeat(40));
});

// ---- empty / fully stripped names ----

test('catSlug: nome vazio usa fallback cat+timestamp', () => {
  const h = makeHarness(() => 1234567890);
  assert.equal(h.catSlug(''), 'cat1234567890');
});

test('catSlug: nome com apenas simbolos usa fallback cat+timestamp', () => {
  const h = makeHarness(() => 1234567890);
  assert.equal(h.catSlug('!!!'), 'cat1234567890');
});

// ---- Date.now() fallback stubado ----

test('catSlug: fallback usa Date.now() estubado', () => {
  const h = makeHarness(() => 42);
  assert.equal(h.catSlug(null), 'cat42');
});

// ---- falsy inputs ----

for (const falsyValue of [null, undefined, 0, false, NaN, '']) {
  test(`catSlug: entrada falsy (${String(falsyValue)}) usa fallback`, () => {
    const h = makeHarness(() => 999);
    assert.equal(h.catSlug(falsyValue), 'cat999');
  });
}

// ---- invalid truthy inputs (sem toLowerCase) ----

test('catSlug: objeto truthy sem toLowerCase lanca TypeError', () => {
  const h = makeHarness();
  assert.throws(() => h.catSlug({}), (err) => err.name === 'TypeError');
});

test('catSlug: array truthy sem toLowerCase lanca TypeError', () => {
  const h = makeHarness();
  assert.throws(() => h.catSlug(['a']), (err) => err.name === 'TypeError');
});

test('catSlug: numero truthy sem toLowerCase lanca TypeError', () => {
  const h = makeHarness();
  assert.throws(() => h.catSlug(5), (err) => err.name === 'TypeError');
});

// ---- canonical / public asset byte equality ----

test('canonico e asset publico sao byte-identicos', () => {
  const canonicalPath = path.join(__dirname, '..', '..', 'app', 'Modules', 'Finance', 'Frontend', 'finance-category-key-calculation.js');
  const publicPath = path.join(__dirname, '..', '..', 'assets', 'finance-category-key-calculation.js');
  const canonical = fs.readFileSync(canonicalPath);
  const publicAsset = fs.readFileSync(publicPath);
  assert.equal(Buffer.compare(canonical, publicAsset), 0);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
