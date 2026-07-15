'use strict';

/**
 * Teste focal de detectAnomalies() (Fase 14). Roda com node puro, sem
 * framework nem bundler.
 *
 * detectAnomalies() depende apenas de monthKey(now), global definida em
 * assets/app.js. Aqui montamos um sandbox vm com um stub de monthKey pra
 * isolar so o calculo de assets/finance-anomaly-detection.js.
 *
 * Rodar: node tests/js/finance_anomaly_detection_test.js
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const filePath = path.join(__dirname, '..', '..', 'assets', 'finance-anomaly-detection.js');
const code = fs.readFileSync(filePath, 'utf8');

function monthKeyOf(dateStr){ return dateStr.slice(0,7); }

function makeHarness(){
  const sandbox = {
    monthKey: (now) => monthKeyOf(now.iso),
  };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: filePath });
  return sandbox.detectAnomalies;
}

function now(iso){ return { iso }; }

function exp(id, categoria, value, date){
  return { id, categoria, value, date };
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

const detectAnomalies = makeHarness();
const CUR = now('2026-07-14');

test('amostra historica insuficiente (menos de 4) nao gera anomalia', () => {
  const lines = [
    exp('h1','mercado',100,'2026-06-01'),
    exp('h2','mercado',100,'2026-06-02'),
    exp('h3','mercado',100,'2026-06-03'),
    exp('c1','mercado',500,'2026-07-01'),
  ];
  assert.deepEqual(Array.from(detectAnomalies(lines, CUR)), []);
});

test('exclui despesas de meses futuros e do mes atual do historico', () => {
  const lines = [
    exp('h1','mercado',100,'2026-06-01'),
    exp('h2','mercado',100,'2026-05-01'),
    exp('h3','mercado',100,'2026-04-01'),
    exp('h4','mercado',100,'2026-03-01'),
    exp('fut','mercado',9999,'2026-08-01'),  // futuro: nao entra no historico nem eh testado
    exp('c1','mercado',500,'2026-07-01'),
  ];
  const out = detectAnomalies(lines, CUR);
  assert.equal(out.length, 1);
  assert.equal(out[0].e.id, 'c1');
});

test('ignora despesas sem data ou com valor nao positivo', () => {
  const lines = [
    exp('h1','mercado',100,'2026-06-01'),
    exp('h2','mercado',100,'2026-05-01'),
    exp('h3','mercado',100,'2026-04-01'),
    exp('h4','mercado',100,'2026-03-01'),
    exp('nodate','mercado',500,null),
    exp('neg','mercado',-500,'2026-07-01'),
    exp('zero','mercado',0,'2026-07-01'),
  ];
  assert.deepEqual(Array.from(detectAnomalies(lines, CUR)), []);
});

test('isola historico e deteccao por categoria', () => {
  const lines = [
    exp('h1','mercado',100,'2026-06-01'),
    exp('h2','mercado',100,'2026-05-01'),
    exp('h3','mercado',100,'2026-04-01'),
    exp('h4','mercado',100,'2026-03-01'),
    exp('h5','lazer',100,'2026-06-01'),
    exp('h6','lazer',100,'2026-05-01'),
    exp('h7','lazer',100,'2026-04-01'),
    exp('h8','lazer',100,'2026-03-01'),
    exp('c1','mercado',500,'2026-07-01'),
    exp('c2','lazer',10,'2026-07-01'),
  ];
  const out = detectAnomalies(lines, CUR);
  assert.equal(out.length, 1);
  assert.equal(out[0].e.id, 'c1');
});

test('valor abaixo de 30 nunca eh anomalia mesmo bem acima da media', () => {
  const lines = [
    exp('h1','mercado',1,'2026-06-01'),
    exp('h2','mercado',1,'2026-05-01'),
    exp('h3','mercado',1,'2026-04-01'),
    exp('h4','mercado',1,'2026-03-01'),
    exp('c1','mercado',29,'2026-07-01'),
  ];
  assert.deepEqual(Array.from(detectAnomalies(lines, CUR)), []);
});

test('valor igual a 30 pode ser anomalia (limite inclusivo)', () => {
  const lines = [
    exp('h1','mercado',1,'2026-06-01'),
    exp('h2','mercado',1,'2026-05-01'),
    exp('h3','mercado',1,'2026-04-01'),
    exp('h4','mercado',1,'2026-03-01'),
    exp('c1','mercado',30,'2026-07-01'),
  ];
  const out = detectAnomalies(lines, CUR);
  assert.equal(out.length, 1);
  assert.equal(out[0].e.id, 'c1');
});

test('valor igual a 1.5x a media (sem exceder) nao eh anomalia', () => {
  // mean=100, std=0 (historico constante) -> threshold = 100
  // v = 150 = mean*1.5 exatamente, mas 150 > threshold(100) entao dispara
  // por 2std; testamos o limite de 1.5x com desvio que empurra o threshold
  // acima de 1.5x, forcando a regra "v < mean*1.5" a decidir sozinha.
  const lines = [
    exp('h1','mercado',50,'2026-06-01'),
    exp('h2','mercado',150,'2026-05-01'),
    exp('h3','mercado',50,'2026-04-01'),
    exp('h4','mercado',150,'2026-03-01'),
    // mean = 100, std = 50, threshold = mean + 2*std = 200
    exp('c1','mercado',149,'2026-07-01'), // < mean*1.5 (150) -> nao anomalia
  ];
  assert.deepEqual(Array.from(detectAnomalies(lines, CUR)), []);
});

test('valor acima de 1.5x a media mas dentro de 2 desvios nao eh anomalia', () => {
  const lines = [
    exp('h1','mercado',50,'2026-06-01'),
    exp('h2','mercado',150,'2026-05-01'),
    exp('h3','mercado',50,'2026-04-01'),
    exp('h4','mercado',150,'2026-03-01'),
    // mean = 100, std = 50, threshold = 200
    exp('c1','mercado',200,'2026-07-01'), // v <= threshold -> nao anomalia
  ];
  assert.deepEqual(Array.from(detectAnomalies(lines, CUR)), []);
});

test('valor acima de mean + 2*std dispara anomalia', () => {
  const lines = [
    exp('h1','mercado',50,'2026-06-01'),
    exp('h2','mercado',150,'2026-05-01'),
    exp('h3','mercado',50,'2026-04-01'),
    exp('h4','mercado',150,'2026-03-01'),
    // mean = 100, std = 50, threshold = 200
    exp('c1','mercado',201,'2026-07-01'),
  ];
  const out = detectAnomalies(lines, CUR);
  assert.equal(out.length, 1);
  assert.equal(out[0].e.id, 'c1');
  assert.equal(out[0].mean, 100);
  assert.equal(out[0].pct, Math.round((201/100-1)*100));
});

test('desvio padrao zero (historico constante) ainda detecta acima de 1.5x', () => {
  const lines = [
    exp('h1','mercado',100,'2026-06-01'),
    exp('h2','mercado',100,'2026-05-01'),
    exp('h3','mercado',100,'2026-04-01'),
    exp('h4','mercado',100,'2026-03-01'),
    // mean = 100, std = 0, threshold = 100
    exp('c1','mercado',151,'2026-07-01'),
  ];
  const out = detectAnomalies(lines, CUR);
  assert.equal(out.length, 1);
  assert.equal(out[0].pct, 51);
});

test('mantem referencia original da despesa (e) e formato { e, mean, pct }', () => {
  const c1 = exp('c1','mercado',500,'2026-07-01');
  const lines = [
    exp('h1','mercado',100,'2026-06-01'),
    exp('h2','mercado',100,'2026-05-01'),
    exp('h3','mercado',100,'2026-04-01'),
    exp('h4','mercado',100,'2026-03-01'),
    c1,
  ];
  const out = detectAnomalies(lines, CUR);
  assert.equal(out.length, 1);
  assert.equal(out[0].e, c1); // mesma referencia de objeto
  assert.deepEqual(Object.keys(out[0]).sort(), ['e','mean','pct']);
});

test('valor como string numerica ainda eh comparado corretamente', () => {
  const lines = [
    exp('h1','mercado','100','2026-06-01'),
    exp('h2','mercado','100','2026-05-01'),
    exp('h3','mercado','100','2026-04-01'),
    exp('h4','mercado','100','2026-03-01'),
    exp('c1','mercado','500','2026-07-01'),
  ];
  const out = detectAnomalies(lines, CUR);
  assert.equal(out.length, 1);
  assert.equal(out[0].e.id, 'c1');
});

test('ordena resultado por valor decrescente, mesmo com empates', () => {
  const lines = [
    exp('h1','mercado',100,'2026-06-01'),
    exp('h2','mercado',100,'2026-05-01'),
    exp('h3','mercado',100,'2026-04-01'),
    exp('h4','mercado',100,'2026-03-01'),
    exp('h5','lazer',100,'2026-06-01'),
    exp('h6','lazer',100,'2026-05-01'),
    exp('h7','lazer',100,'2026-04-01'),
    exp('h8','lazer',100,'2026-03-01'),
    exp('h9','viagem',100,'2026-06-01'),
    exp('h10','viagem',100,'2026-05-01'),
    exp('h11','viagem',100,'2026-04-01'),
    exp('h12','viagem',100,'2026-03-01'),
    exp('low','mercado',500,'2026-07-01'),
    exp('high','lazer',900,'2026-07-01'),
    exp('tie','viagem',500,'2026-07-02'),
  ];
  const out = detectAnomalies(lines, CUR);
  assert.deepEqual(Array.from(out, a=>a.e.id), ['high','low','tie']);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
