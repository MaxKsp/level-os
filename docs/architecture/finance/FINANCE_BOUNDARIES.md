# Finance Boundaries

## Objetivo

Registrar a fronteira atual do Financeiro do Level OS antes de qualquer extracao
para `app/Modules/Finance`.

Este documento descreve o comportamento atual como referencia de compatibilidade,
 mesmo quando a implementacao atual nao for ideal.

## Resumo executivo

Hoje o "Financeiro" do Level OS nao e um bloco unico.

Ele se divide em duas zonas:

1. **Financeiro relacional no back-end**
   - persistido em `transactions` e `accounts`
   - exposto ao front nas mesmas chaves que antes viviam em `kv_store`
   - escrito por `api/finance.php`
   - lido por `api/data.php?all=1`

2. **Financeiro de apoio ainda em kv**
   - cofrinhos, transferencias, metas, categorias customizadas, favoritos,
     preferencia de visao, anomalias dispensadas, metadados do simulador
   - escrito/lido por `api/data.php`
   - consumido pelo mesmo fluxo visual do Financeiro em `assets/app.js`

Conclusao importante: **a fronteira funcional do Financeiro no produto e maior
do que a fronteira relacional atual em `finance.php`.**

## Superficie publica que nao pode quebrar

### Entradas HTTP

- `GET api/data.php?all=1`
- `POST api/finance.php`
- `POST api/data.php`
- `POST api/import-ofx.php`

### Chaves publicas consumidas pelo front

Relacionais, roteadas para `api/finance.php`:

- `expense_lines_v4`
- `income_lines`
- `ifood-entries`
- `accounts_v2`

Financeiras, mas ainda em `kv_store` via `api/data.php`:

- `vaults`
- `transfers`
- `budget_goals`
- `custom_categories`
- `anomaly_dismissed`
- `income_meta`
- `acc_view`
- `bank_favorites`

### Regras de compatibilidade

- caminhos publicos permanecem os mesmos
- shape dos arrays permanece o mesmo
- `assets/app.js` continua dono do contrato visual atual
- `index.php` continua shell principal

## Arquivos na fronteira do Financeiro

### Back-end legado central

- `finance.php`
  - define `FINANCE_SETS`
  - faz `load`, `save` e migracao kv -> tabelas
  - e o centro tecnico atual do Financeiro relacional

- `api/finance.php`
  - escrita autenticada dos sets financeiros relacionais
  - payload: `{ key, value }`
  - usa `require_login`, `require_rate_limit`, `require_csrf`

- `api/data.php`
  - bootstrap do front
  - em `?all=1` chama `finance_migrate_if_needed()`
  - carrega `kv_store` e depois sobrescreve as chaves financeiras com dados
    vindos das tabelas

- `api/import-ofx.php`
  - feature paga
  - usa `require_plan($uid, 'individual')`
  - nao grava no banco; apenas devolve preview normalizado com sinalizacao de
    duplicidade provavel

- `ofx.php`
  - parser OFX
  - normaliza linhas para `{ date, value, kind, desc, fitid }`

- `plan.php`
  - nao pertence ao Financeiro, mas participa da fronteira porque o OFX e
    controlado por plano

### Front-end na fronteira

- `assets/app.js`
  - roteia persistencia financeira entre `api/finance.php` e `api/data.php`
  - agrega regras visuais, calculos cliente-side e fluxos de mutacao que nao
    existem no back-end

### Persistencia e schema

- `schema.sql`
- `migrations/2026-07-06-transactions.sql`
- `migrations/2026-07-08-cheque-especial.sql`
- `migrations/2026-07-08-financeiro-front.sql`
- `migrations/2026-07-08-parcelas.sql`
- `migrations/2026-07-08-grant-max-individual.sql`

### Documentacao de apoio

- `.claude/memory/architecture.md`
- `.claude/memory/patterns.md`
- `.claude/reference/database.md`
- `.claude/reference/modules.md`

## Fronteira relacional atual

### Constante de roteamento

`finance.php` define:

```php
const FINANCE_SETS = [
    'expense_lines_v4' => 'expense',
    'income_lines'     => 'income',
    'ifood-entries'    => 'income_var',
    'accounts_v2'      => 'accounts',
];
```

Ela e o elo entre:

- chaves publicas conhecidas do front
- tipo logico do set
- tabela de persistencia

### Tabelas envolvidas

#### `transactions`

Representa:

- despesas: `kind='expense'`
- rendas cadastradas: `kind='income'`
- renda variavel estilo iFood/entrega: `kind='income_var'`

Campos relevantes para o Financeiro:

- `client_id`
- `label`
- `value`
- `tx_date`
- `tx_time`
- `category`
- `method`
- `bank`
- `recurrence`
- `income_type`
- `end_date`
- `account_id`
- `km`
- `payday`
- `parcelas`
- `created_at`

#### `accounts`

Representa contas correntes, poupancas e cartoes.

Campos relevantes:

- `client_id`
- `label`
- `tipo`
- `saldo`
- `cheque_especial`
- `limite`
- `fatura`
- `fechamento`
- `vencimento`
- `bank`
- `principal`
- `created_at`

## Shapes publicos atuais

### `expense_lines_v4`

Lido pelo front como array de objetos com:

- `id`
- `label`
- `value`
- `date`
- `time`
- `recorrencia`
- `categoria`
- `method`
- `bank`
- `accountId`
- `parcelas`
- `createdAt`

### `income_lines`

- `id`
- `label`
- `value`
- `type`
- `endDate`
- `payday`
- `accountId`
- `createdAt`

Observacao importante: o front ainda guarda `regime` de simulador CLT/PJ no
objeto em memoria, mas o back-end relacional nao persiste isso. Os parametros
do simulador ficam em `income_meta` no kv.

### `ifood-entries`

- `date`
- `valor`
- `km`

### `accounts_v2`

- `id`
- `label`
- `tipo`
- `saldo`
- `chequeEspecial`
- `limite`
- `fatura`
- `fechamento`
- `vencimento`
- `bank`
- `principal`
- `createdAt`

## Responsabilidades do back-end hoje

### `finance_load_set()`

Responsavel por reconstruir o shape esperado pelo front a partir das tabelas.

Caracteristicas importantes:

- ordena por `id` fisico da tabela, nao por `created_at`
- converte snake_case para camelCase onde o front espera
- devolve arrays completos por set
- trata `accounts`, `expense`, `income` e `income_var` com mapeamentos distintos

### `finance_save_set()`

Responsavel por substituir completamente um set do usuario.

Caracteristicas importantes:

- semantica de **replace total**
- apaga todas as linhas do set do usuario e reinsere tudo
- opera em transacao quando necessario
- preserva `client_id` vindo do front
- descarta silenciosamente campos sem coluna mapeada
- gera `uniqid()` quando um id nao vier no payload

### `finance_migrate_if_needed()`

Caracteristicas importantes:

- roda no bootstrap `api/data.php?all=1`
- usa `_finance_migrated` em `kv_store` para idempotencia
- migra so uma vez por usuario
- nao apaga o kv legado; ele fica como backup

## Responsabilidades do front hoje

O front nao e apenas consumidor de dados. Ele concentra regra relevante do
Financeiro.

### Persistencia roteada

`assets/app.js` define:

- `storeGet()`
- `storeSet()`
- `FINANCE_KEYS`

As chaves em `FINANCE_KEYS` vao para `api/finance.php`; o restante vai para
`api/data.php`.

### Mutacoes com logica cliente-side

O front hoje executa logica que nao existe no back-end, por exemplo:

- aplicar ou estornar movimento em conta/cartao via
  `applyAccountMovement()`
- pagar fatura e criar uma despesa derivada no cliente
- transferir entre contas e registrar `transfers` em kv
- manter `vaults` e saldo reservado
- calcular projecao de saldo, anomalias e agregacoes analiticas
- importar preview OFX e transformar linhas confirmadas em lancamentos

Conclusao importante: **a extracao do modulo Finance nao pode assumir que toda
regra do Financeiro ja esta no PHP. Hoje parte importante dela mora no JS.**

## Subareas do Financeiro no front

### Relacionais

- despesas
- rendas
- renda variavel `ifood-entries`
- contas e cartoes

### Financeiras, mas ainda em kv

- `income_meta`
  - parametros de simulador CLT x PJ por renda

- `vaults`
  - cofrinhos e valores reservados

- `transfers`
  - transferencias entre contas e pagamentos de fatura por conta

- `budget_goals`
  - metas por categoria

- `custom_categories`
  - categorias criadas pelo usuario

- `anomaly_dismissed`
  - estado de dismiss do alerta de anomalia

- `acc_view`
  - alternancia "por conta" x "por banco"

- `bank_favorites`
  - favoritos do seletor de bancos

## Fluxos atuais na fronteira

### Bootstrap principal

1. `app.js` chama `GET api/data.php?all=1`
2. `api/data.php` chama `finance_migrate_if_needed()`
3. `api/data.php` le todo o `kv_store`
4. `api/data.php` sobrescreve as chaves financeiras com `finance_load_set()`
5. `__cache` passa a conter uma visao combinada de kv + relacional

### Escrita de set relacional

1. front chama `storeSet(key, value)`
2. se `key` esta em `FINANCE_KEYS`, destino = `api/finance.php`
3. `api/finance.php` valida key, tamanho de payload e quantidade de linhas
4. `finance_save_set()` substitui o set inteiro

### Escrita de set financeiro ainda em kv

1. front chama `storeSet(key, value)`
2. se `key` nao esta em `FINANCE_KEYS`, destino = `api/data.php`
3. `api/data.php` faz upsert em `kv_store`

### Preview OFX

1. front envia arquivo para `api/import-ofx.php`
2. endpoint exige login, CSRF, rate limit e plano `individual`
3. `ofx.php` normaliza linhas
4. endpoint marca `dup=true` quando `(date,value)` ja existe nas linhas atuais
5. front mostra preview e decide o que gravar
6. a gravacao final e feita no front via `storeSet()`

## Dependencias externas da fronteira

### Seguranca

- `auth.php`
  - `require_login()`
  - `require_csrf()`
  - `require_rate_limit()`

### Banco

- `db.php`
  - `get_db()`

### Plano

- `plan.php`
  - `require_plan()` para OFX

## Comportamentos nao ideais que precisam ser preservados por enquanto

- `finance_save_set()` faz replace total do set inteiro
- ordenacao de `finance_load_set()` segue `ORDER BY id`
- OFX apenas marca duplicidade provavel; nao impede importacao
- parte relevante da regra de negocio ainda vive no `assets/app.js`
- varios dados do Financeiro continuam em `kv_store`, apesar de a experiencia
  do usuario parecer um unico modulo

## O que esta dentro da fronteira de extracao futura

Para `app/Modules/Finance`, o candidato natural de extracao futura inclui:

- `finance.php`
- `api/finance.php`
- a parte financeira de `api/data.php`
- `api/import-ofx.php`
- `ofx.php`
- contratos publicos dos quatro sets relacionais
- documentacao e testes de compatibilidade da fronteira

## O que esta acoplado, mas nao deve ser extraido cegamente junto

- `plan.php` como modulo de assinatura, nao de Finance
- `auth.php` e `db.php` como infraestrutura transversal
- `assets/app.js` inteiro; nele existem responsabilidades financeiras, mas
  misturadas com renderizacao e estado global da SPA

## Regra operacional para as proximas fases

Nenhuma extracao de `Finance` deve assumir que:

- todo o Financeiro ja esta no back-end
- tudo que a UI financeira usa esta em `finance.php`
- todo dado financeiro relevante esta nas tabelas relacionais

Primeiro sera necessario caracterizar contratos e comportamento; depois,
separar o que e:

- dominio relacional do Financeiro
- finance support ainda em kv
- logica visual e analitica que hoje esta no front
