# Esqueleto de assinatura — como usar

## Pré
Rodar `migrations/2026-07-06-subscriptions.sql` no phpMyAdmin
(cria `subscriptions` + `subscription_events`).

## Modelo
- Sem row em `subscriptions` = plano **free** (padrão).
- Planos: `free` < `individual` < `family` (hierárquico).
- `user_plan(uid)` retorna free se: sem row, status ≠ active, ou período
  pago expirado. Só retorna pago se `active` E dentro de `current_period_end`.

## Gate numa feature paga (backend)
```php
require_once __DIR__ . '/../auth.php';
require_once __DIR__ . '/../plan.php';
$uid = require_login();
require_plan($uid, 'individual');   // 402 se free
// ... feature paga ...
```

## UI saber o plano
`GET api/subscription.php` → `{plan, status, current_period_end}`.
Front usa pra mostrar/esconder botão de feature paga (cosmético — o
bloqueio real é sempre o `require_plan` no backend).

## Regra não-negociável
Plano **nunca** muda por request do cliente. Só o webhook do gateway
(server-to-server, assinatura validada) escreve em `subscriptions`.
Todo controle de acesso lê dessa tabela, nunca do estado da tela.

## Dar plano manual (teste)
```sql
INSERT INTO subscriptions (user_id, plan, status, current_period_end)
VALUES (SEU_UID, 'individual', 'active', '2027-01-01 00:00:00')
ON DUPLICATE KEY UPDATE plan=VALUES(plan), status=VALUES(status),
  current_period_end=VALUES(current_period_end);
```
