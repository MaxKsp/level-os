'use strict';

/**
 * Teste focal de calcINSS(), irrfFromBase(), computeCLT() e computePJ()
 * (Fase 15). Roda com node puro, sem framework nem bundler.
 *
 * Rodar: node tests/js/finance_income_regime_calculation_test.js
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const filePath = path.join(__dirname, '..', '..', 'assets', 'finance-income-regime-calculation.js');
const code = fs.readFileSync(filePath, 'utf8');

function makeHarness(){
  const sandbox = {};
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

const { calcINSS, irrfFromBase, computeCLT, computePJ } = makeHarness();

// ---- calcINSS ----

test('calcINSS: primeira faixa (abaixo de 1518)', () => {
  assert.equal(calcINSS(1000), 1000 * 0.075);
});

test('calcINSS: exatamente no limite da primeira faixa', () => {
  assert.equal(calcINSS(1518), 1518 * 0.075);
});

test('calcINSS: segunda faixa (progressivo)', () => {
  const expected = 1518 * 0.075 + (2793.88 - 1518) * 0.09;
  assert.equal(calcINSS(2793.88), expected);
});

test('calcINSS: terceira faixa (progressivo)', () => {
  const expected = 1518 * 0.075 + (2793.88 - 1518) * 0.09 + (4190.83 - 2793.88) * 0.12;
  assert.equal(calcINSS(4190.83), expected);
});

test('calcINSS: quarta faixa ate o teto', () => {
  const expected = 1518 * 0.075 + (2793.88 - 1518) * 0.09 + (4190.83 - 2793.88) * 0.12 + (8157.41 - 4190.83) * 0.14;
  assert.equal(calcINSS(8157.41), expected);
});

test('calcINSS: acima do teto e limitado ao teto', () => {
  assert.equal(calcINSS(999999), calcINSS(8157.41));
});

test('calcINSS: valores negativos sao tratados como zero', () => {
  assert.equal(calcINSS(-500), 0);
});

// ---- irrfFromBase ----

test('irrfFromBase: faixa isenta', () => {
  assert.equal(irrfFromBase(2259.20), 0);
  assert.equal(irrfFromBase(1000), 0);
});

test('irrfFromBase: segunda faixa', () => {
  assert.equal(irrfFromBase(2826.65), Math.max(0, 2826.65 * 0.075 - 169.44));
});

test('irrfFromBase: terceira faixa', () => {
  assert.equal(irrfFromBase(3751.05), Math.max(0, 3751.05 * 0.15 - 381.44));
});

test('irrfFromBase: quarta faixa', () => {
  assert.equal(irrfFromBase(4664.68), Math.max(0, 4664.68 * 0.225 - 662.77));
});

test('irrfFromBase: faixa final (acima de 4664.68)', () => {
  assert.equal(irrfFromBase(10000), Math.max(0, 10000 * 0.275 - 896.00));
});

test('irrfFromBase: resultado nunca fica negativo', () => {
  assert.equal(irrfFromBase(2259.21), Math.max(0, 2259.21 * 0.075 - 169.44));
});

// ---- computeCLT ----

test('computeCLT: sem horas extras nem descontos, campos basicos', () => {
  const p = { bruto: 3000 };
  const c = computeCLT(p);
  assert.equal(c.sal, 3000);
  assert.equal(c.extras, 0);
  assert.equal(c.brutoTotal, 3000);
  assert.equal(c.inss, calcINSS(3000));
  const baseLegal = Math.max(0, 3000 - calcINSS(3000) - 0);
  const baseSimpl = Math.max(0, 3000 - 564.80);
  assert.equal(c.irrf, Math.min(irrfFromBase(baseLegal), irrfFromBase(baseSimpl)));
  assert.equal(c.convMed, 0);
  assert.equal(c.convOdo, 0);
  assert.equal(c.outros, 0);
  assert.equal(c.liquido, c.brutoTotal - c.inss - c.irrf);
  assert.equal(c.fgts, c.brutoTotal * 0.08);
  assert.equal(c.decimo, 3000);
  assert.equal(c.ferias, 3000 + 3000 / 3);
});

test('computeCLT: horas extras 50% e 100% somam ao bruto total', () => {
  const p = { bruto: 2200, he50: 10, he100: 5 };
  const c = computeCLT(p);
  const horaBase = 2200 / 220;
  const extras = (10 * horaBase * 1.5) + (5 * horaBase * 2);
  assert.equal(c.extras, extras);
  assert.equal(c.brutoTotal, 2200 + extras);
});

test('computeCLT: dependentes reduzem a base legal do IRRF', () => {
  const p = { bruto: 5000, deps: 2 };
  const c = computeCLT(p);
  const inss = calcINSS(5000);
  const baseLegal = Math.max(0, 5000 - inss - 2 * 189.59);
  const baseSimpl = Math.max(0, 5000 - 564.80);
  assert.equal(c.irrf, Math.min(irrfFromBase(baseLegal), irrfFromBase(baseSimpl)));
});

test('computeCLT: convenios e outros descontos reduzem o liquido', () => {
  const p = { bruto: 4000, convMed: 100, convOdo: 50, outros: 30 };
  const c = computeCLT(p);
  assert.equal(c.convMed, 100);
  assert.equal(c.convOdo, 50);
  assert.equal(c.outros, 30);
  assert.equal(c.liquido, c.brutoTotal - c.inss - c.irrf - 100 - 50 - 30);
});

test('computeCLT: valores ausentes sao coagidos para zero', () => {
  const c = computeCLT({});
  assert.equal(c.sal, 0);
  assert.equal(c.extras, 0);
  assert.equal(c.brutoTotal, 0);
  assert.equal(c.inss, 0);
});

test('computeCLT: campos de string numerica sao coagidos', () => {
  const p = { bruto: '3000', he50: '2', he100: '1', deps: '1', convMed: '10', convOdo: '5', outros: '2' };
  const c = computeCLT(p);
  const c2 = computeCLT({ bruto: 3000, he50: 2, he100: 1, deps: 1, convMed: 10, convOdo: 5, outros: 2 });
  assert.deepEqual(c, c2);
});

test('computeCLT: retorna exatamente as chaves esperadas', () => {
  const c = computeCLT({ bruto: 1000 });
  assert.deepEqual(Object.keys(c).sort(), ['brutoTotal','convMed','convOdo','decimo','extras','ferias','fgts','inss','irrf','liquido','outros','sal'].sort());
});

// ---- computePJ ----

test('computePJ: calculo basico de imposto percentual', () => {
  const p = { bruto: 10000, imposto: 15 };
  const c = computePJ(p);
  assert.equal(c.bruto, 10000);
  assert.equal(c.impostos, 1500);
  assert.equal(c.conv, 0);
  assert.equal(c.outros, 0);
  assert.equal(c.liquido, 10000 - 1500);
});

test('computePJ: convenio e outros descontos reduzem o liquido', () => {
  const p = { bruto: 8000, imposto: 6, conv: 200, outros: 50 };
  const c = computePJ(p);
  assert.equal(c.impostos, 8000 * 0.06);
  assert.equal(c.liquido, 8000 - 8000 * 0.06 - 200 - 50);
});

test('computePJ: valores ausentes sao coagidos para zero', () => {
  const c = computePJ({});
  assert.deepEqual(Object.assign({}, c), { bruto: 0, impostos: 0, conv: 0, outros: 0, liquido: 0 });
});

test('computePJ: campos de string numerica sao coagidos', () => {
  const c1 = computePJ({ bruto: '5000', imposto: '10', conv: '20', outros: '5' });
  const c2 = computePJ({ bruto: 5000, imposto: 10, conv: 20, outros: 5 });
  assert.deepEqual(c1, c2);
});

test('computePJ: retorna exatamente as chaves esperadas', () => {
  const c = computePJ({ bruto: 1000 });
  assert.deepEqual(Object.keys(c).sort(), ['bruto','conv','impostos','liquido','outros'].sort());
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
