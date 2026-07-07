# Cutover financeiro: kv blob -> tabelas relacionais

## Pré (rodar no phpMyAdmin ANTES do deploy)
`migrations/2026-07-06-transactions.sql` — cria `transactions` + `accounts`.

## Como funciona
- Contrato de array preservado: front manda/recebe os mesmos shapes.
  `client_id` guarda o id string do front (genId) — ids não mudam.
- `finance.php`: load/save/migrate. `api/finance.php`: escrita (POST).
- `api/data.php?all=1`: migra kv->tabelas uma vez (flag `_finance_migrated`),
  depois serve o financeiro das tabelas nas MESMAS chaves kv.
- Front (`storeSet`): chaves financeiras roteiam pra `api/finance.php`;
  o resto continua no kv.
- kv antigo NÃO é apagado (fica de backup até confiarmos).

## Migração de quem já tem dado
Automática no 1º bootstrap após deploy. Idempotente. Se algo der errado,
o kv antigo ainda está lá (basta apagar a linha `_finance_migrated` do
kv_store do usuário pra re-migrar).

## Validado offline
- Round-trip save->load idêntico pros 4 sets (expense/income/income_var/accounts).
- Replace-all (salvar vazio limpa).
- Migração idempotente + flag.
- Seam do front: escrita vai pra finance.php, conciliação debita conta,
  render em Saídas ok.

## Ordem de deploy
1. Rodar o SQL.
2. Merge -> deploy.
3. Abrir o app logado: 1º load migra os dados. Conferir Financeiro intacto.

## Consultas que isso destrava (próximos itens)
```sql
-- gastos do mês por categoria (conciliação/anomalia/PDF-IR)
SELECT category, SUM(value) FROM transactions
WHERE user_id=? AND kind='expense' AND tx_date BETWEEN ? AND ?
GROUP BY category;
```
