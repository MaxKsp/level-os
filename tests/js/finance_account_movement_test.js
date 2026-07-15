'use strict';

/**
 * Teste focal de applyAccountMovement() (Fase 10). Roda com node puro,
 * sem framework nem bundler: carrega o arquivo extraido num contexto vm
 * isolado (a funcao nao toca DOM), igual quem carrega assets/*.js direto
 * pela tag <script> em index.php.
 *
 * Rodar: node tests/js/finance_account_movement_test.js
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const filePath = path.join(__dirname, '..', '..', 'assets', 'finance-account-movement.js');
const code = fs.readFileSync(filePath, 'utf8');
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(code, sandbox, { filename: filePath });
const applyAccountMovement = sandbox.applyAccountMovement;

function freshAccounts() {
  return [
    { id: 'acc1', tipo: 'conta', saldo: 1000, fatura: 0 },
    { id: 'card1', tipo: 'cartao', saldo: 0, fatura: 200 },
    { id: 'acc2', tipo: 'conta', saldo: 500, fatura: 0 },
  ];
}

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`[PASS] ${name}`);
  } catch (err) {
    failed++;
    console.log(`[FAIL] ${name}`);
    console.log(`  ${err.message}`);
  }
}

test('applyAccountMovement deve estar definida como funcao', () => {
  assert.equal(typeof applyAccountMovement, 'function');
});

test('conta comum: debito (sign +1) subtrai do saldo', () => {
  const accounts = freshAccounts();
  applyAccountMovement(accounts, 'acc1', 150, +1);
  assert.equal(accounts[0].saldo, 850, 'saldo deve debitar o valor');
  assert.equal(accounts[0].fatura, 0, 'conta comum nao deve mexer em fatura');
});

test('conta comum: credito/estorno (sign -1) devolve ao saldo', () => {
  const accounts = freshAccounts();
  applyAccountMovement(accounts, 'acc1', 150, +1);
  applyAccountMovement(accounts, 'acc1', 150, -1);
  assert.equal(accounts[0].saldo, 1000, 'saldo deve voltar ao valor original apos estorno');
});

test('cartao: debito (sign +1) soma na fatura', () => {
  const accounts = freshAccounts();
  applyAccountMovement(accounts, 'card1', 80, +1);
  assert.equal(accounts[1].fatura, 280, 'fatura deve somar o valor');
  assert.equal(accounts[1].saldo, 0, 'cartao nao deve mexer em saldo');
});

test('cartao: credito/estorno (sign -1) subtrai da fatura', () => {
  const accounts = freshAccounts();
  applyAccountMovement(accounts, 'card1', 80, +1);
  applyAccountMovement(accounts, 'card1', 80, -1);
  assert.equal(accounts[1].fatura, 200, 'fatura deve voltar ao valor original apos estorno');
});

test('conta inexistente: nao lanca erro e nao muda nenhuma conta', () => {
  const accounts = freshAccounts();
  const before = JSON.parse(JSON.stringify(accounts));
  assert.doesNotThrow(() => applyAccountMovement(accounts, 'nao-existe', 999, +1));
  assert.deepEqual(accounts, before, 'nenhuma conta deve mudar quando o id nao existe');
});

test('sem mutacao indevida em outras contas', () => {
  const accounts = freshAccounts();
  const card1Before = { ...accounts[1] };
  const acc2Before = { ...accounts[2] };
  applyAccountMovement(accounts, 'acc1', 150, +1);
  assert.deepEqual(accounts[1], card1Before, 'card1 nao deve ser tocado ao movimentar acc1');
  assert.deepEqual(accounts[2], acc2Before, 'acc2 nao deve ser tocada ao movimentar acc1');
});

console.log('');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total:  ${passed + failed}`);
process.exit(failed === 0 ? 0 : 1);
