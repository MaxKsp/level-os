# Finance Public Contracts

## Objetivo

Registrar os contratos publicos do Financeiro que devem permanecer estaveis
durante a migracao para `app/Modules/Finance`.

Este documento descreve o comportamento atual, nao o comportamento desejado.

## Entradas publicas

### `GET api/data.php?all=1`

Papel atual:

- bootstrap principal da SPA
- devolve uma visao combinada de `kv_store` e dados financeiros relacionais

Contrato relevante para Finance:

- sobrescreve no payload final as chaves:
  - `expense_lines_v4`
  - `income_lines`
  - `ifood-entries`
  - `accounts_v2`
- chaves financeiras auxiliares continuam vindo do `kv_store`

Observacoes:

- a migracao kv -> tabelas pode ser disparada aqui via
  `finance_migrate_if_needed()`
- o endpoint solta o lock de sessao com `session_write_close()` em GET

### `POST api/finance.php`

Papel atual:

- persistencia dos quatro sets financeiros relacionais

Payload atual:

```json
{
  "key": "expense_lines_v4 | income_lines | ifood-entries | accounts_v2",
  "value": []
}
```

Regras atuais:

- autenticado
- exige CSRF
- rate limit `finance`, `200/60s`
- payload maximo de 4 MB
- maximo de 5000 linhas por set
- persistencia com semantica de replace total

Respostas relevantes:

- `200`: `{"ok": true}`
- `400`: `{"error": "invalid finance payload"}` ou `{"error": "too many rows"}`
- `413`: `{"error": "payload too large"}`
- `500`: `{"error": "erro ao salvar - banco atualizado? (ver migrations)"}`

### `POST api/data.php`

Papel atual no Finance:

- persiste dados financeiros auxiliares que ainda nao moram em tabelas

Chaves relevantes ao Finance:

- `vaults`
- `transfers`
- `budget_goals`
- `custom_categories`
- `anomaly_dismissed`
- `income_meta`
- `acc_view`
- `bank_favorites`

### `POST api/import-ofx.php`

Papel atual:

- preview de importacao OFX

Regras atuais:

- autenticado
- exige CSRF
- rate limit `import_ofx`, `10/60s`
- exige plano `individual`
- arquivo maximo de 5 MB

Resposta de sucesso:

```json
{
  "ok": true,
  "rows": [
    {
      "date": "YYYY-MM-DD|null",
      "value": 0,
      "kind": "expense|income",
      "desc": "string",
      "fitid": "string|null",
      "dup": true
    }
  ]
}
```

Observacao importante:

- `dup` indica apenas duplicidade provavel por `(date,value)`
- o endpoint nao grava nada
- a importacao final e feita no cliente via `storeSet()`

## Chaves publicas de Finance no bootstrap

### Relacionais

#### `expense_lines_v4`

Shape observado:

- `id`: string
- `label`: string
- `value`: number
- `date`: `YYYY-MM-DD|null`
- `time`: `HH:MM|null`
- `recorrencia`: `none|mensal|null`
- `categoria`: string|null
- `method`: string|null
- `bank`: string|null
- `accountId`: string|null
- `parcelas`: int|null
- `createdAt`: int|null

#### `income_lines`

Shape observado:

- `id`: string
- `label`: string
- `value`: number
- `type`: `fixa|variavel|temporaria|null`
- `endDate`: `YYYY-MM-DD|null`
- `payday`: int|null
- `accountId`: string|null
- `createdAt`: int|null

Observacao:

- `regime` nao vem das tabelas; parametros do simulador vivem em `income_meta`

#### `ifood-entries`

Shape observado:

- `date`: `YYYY-MM-DD|null`
- `valor`: number
- `km`: int|null

#### `accounts_v2`

Shape observado:

- `id`: string
- `label`: string
- `tipo`: `conta|poupanca|cartao|...`
- `saldo`: number
- `chequeEspecial`: number
- `limite`: number
- `fatura`: number
- `fechamento`: int|null
- `vencimento`: int|null
- `bank`: string|null
- `principal`: bool
- `createdAt`: int|null

### Finance auxiliares em kv

Shape de alto nivel observado:

- `vaults`: array de objetos de cofrinho
- `transfers`: array de transferencias/pagamentos
- `budget_goals`: objeto por categoria
- `custom_categories`: array
- `anomaly_dismissed`: string
- `income_meta`: objeto indexado por id de renda
- `acc_view`: `conta|banco`
- `bank_favorites`: array

## Regras comportamentais publicas

### Roteamento de persistencia no front

`assets/app.js` trata estas chaves como financeiras relacionais:

- `expense_lines_v4`
- `income_lines`
- `ifood-entries`
- `accounts_v2`

Elas devem continuar indo para `api/finance.php` enquanto a compatibilidade
externa for exigida.

### Replace total

Salvar qualquer um dos quatro sets relacionais substitui integralmente o set
anterior do usuario.

Este comportamento e parte do contrato atual, mesmo sendo arriscado.

### Contrato de ids do front

- `client_id` preserva o id string do front
- o front continua tratando `id` como string propria
- ids fisicos das tabelas nao fazem parte do contrato publico

### Bootstrap combinado

O front assume que um unico `GET api/data.php?all=1` devolve tudo o que ele
precisa para renderizar o Financeiro:

- dados relacionais principais
- dados auxiliares ainda em kv

## Contratos fora de escopo do modulo, mas acoplados

- `require_login()` e cookie de sessao
- `require_csrf()`
- `require_rate_limit()`
- `require_plan()` para OFX
- schema e colunas atuais de `transactions` e `accounts`

## O que nao pode mudar nesta caracterizacao

- caminhos dos endpoints
- nomes das chaves publicas
- shape dos arrays devolvidos ao front
- semantica de replace total
- uso de OFX como preview antes de gravacao
