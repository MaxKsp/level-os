# Finance Extraction Risks

## Objetivo

Registrar os riscos reais da extracao futura do Financeiro para
`app/Modules/Finance`.

## Riscos principais

### 1. Fronteira funcional maior que a fronteira relacional

`finance.php` cobre apenas o nucleo relacional. A experiencia completa do
Financeiro depende tambem de dados em `kv_store` e de regra cliente-side em
`assets/app.js`.

Impacto:

- extrair so `finance.php` nao "leva junto" todo o modulo do produto
- uma migracao parcial pode dar falsa sensacao de conclusao

### 2. Persistencia por replace total

`finance_save_set()` apaga e reinsere o set inteiro.

Impacto:

- risco alto de regressao se a extracao assumir comportamento incremental
- risco alto de perda de campos se o mapper esquecer alguma chave

### 3. Mistura de contratos relacionais e kv no mesmo bootstrap

`api/data.php?all=1` entrega uma visao combinada:

- alguns dados do Financeiro vem das tabelas
- outros ainda vem do `kv_store`

Impacto:

- facil quebrar a compatibilidade ao isolar apenas uma parte
- dificil modularizar sem declarar claramente o que fica dentro ou fora do
  primeiro recorte

### 4. Regra de negocio significativa ainda mora no front

Hoje o front faz:

- aplicacao/estorno de movimento em conta
- pagamento de fatura
- transferencias
- cofrinhos
- projecao de saldo
- analises e anomalias
- confirmacao final da importacao OFX

Impacto:

- extrair PHP sem observar esses fluxos gera modulo "vazio" ou incompleto
- migracao sem testes de caracterizacao pode preservar endpoint e quebrar UX

### 5. Semantica de IDs do front precisa permanecer intacta

O front trabalha com ids string proprios e o back persiste isso em `client_id`.

Impacto:

- qualquer tentativa de substituir isso por ids fisicos quebra a SPA
- reorder, undo e vinculacoes entre entidades dependem dessa convencao

### 6. Ordenacao atual e detalhe observavel

`finance_load_set()` usa `ORDER BY id`.

Impacto:

- uma extracao que troque isso por `created_at`, `client_id` ou outra ordem
  pode alterar a experiencia sem mudar contrato formal

### 7. OFX e um fluxo hibrido

`api/import-ofx.php` apenas gera preview e marca `dup`; a gravacao final e
feita no cliente.

Impacto:

- facil mover o parser e esquecer o comportamento de "preview sem gravar"
- deduplicacao real nao existe hoje; nao pode ser "corrigida" por acidente

### 8. Acoplamento com assinatura e seguranca

OFX depende de:

- `require_login()`
- `require_csrf()`
- `require_rate_limit()`
- `require_plan()`

Impacto:

- extracao do Financeiro nao deve puxar `plan.php` para dentro do modulo
- interfaces futuras precisam respeitar essa fronteira transversal

## Riscos de estrategia

### Extrair grande demais cedo

Mover relacional + OFX + kv de apoio + logica visual de uma vez aumenta muito
o risco de regressao e reduz reversibilidade.

### Criar abstração cedo demais

Introduzir `Service`, `Repository`, `DTO` e `Contracts` definitivos antes da
caracterizacao completa do comportamento pode cristalizar um desenho errado.

### Misturar modernizacao com correcao de bug

O Financeiro tem comportamentos nao ideais conhecidos. Corrigir isso durante a
extracao torna impossivel saber se uma regressao veio da refatoracao ou da
mudanca funcional.

## Riscos mitigados nesta Fase 2

- fronteira do modulo agora esta documentada
- contratos publicos foram explicitados
- matriz de compatibilidade separa o que e automatico do que ainda depende de
  smoke manual
- suite minima de caracterizacao pode proteger o nucleo relacional e o parser

## Primeiro recorte recomendado

### Recomendacao

O primeiro recorte pequeno, reversivel e testavel deve ser:

**extrair somente o nucleo relacional puro de `finance.php` para uma camada
interna nova, mantendo `finance.php` como fachada integral e sem tocar em
`api/finance.php`, `api/data.php` ou `assets/app.js`.**

### O que entra nesse recorte

- `FINANCE_SETS`
- `fin_num()`
- `fin_trim_time()`
- `finance_load_set()`
- `finance_save_set()`
- `finance_migrate_if_needed()`

### O que fica explicitamente fora

- OFX
- `api/import-ofx.php`
- `plan.php`
- qualquer dado financeiro ainda em kv
- qualquer regra cliente-side do `assets/app.js`

### Por que esse recorte

- e o menor bloco coeso do Financeiro no PHP
- ja tem comportamento parcialmente caracterizado por testes
- permite rollback simples mantendo `finance.php` como adapter/fachada
- nao muda contratos publicos nem exige tocar no front
