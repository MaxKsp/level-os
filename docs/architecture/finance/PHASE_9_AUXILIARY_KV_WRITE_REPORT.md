# Phase 9 Auxiliary KV Write Report

Data: 2026-07-14

## Objetivo executado

Extrair apenas a persistencia das oito chaves financeiras auxiliares do
`POST api/data.php` para `app/Modules/Finance/FinanceAuxiliaryKv.php`,
mantendo `api/data.php` como endpoint publico e adapter.

## Escopo desta extracao

Criado `app/Modules/Finance/FinanceAuxiliaryKv.php` com:

- `const FINANCE_AUX_KV_KEYS` — as oito chaves autorizadas: `vaults`,
  `transfers`, `budget_goals`, `custom_categories`, `anomaly_dismissed`,
  `income_meta`, `acc_view`, `bank_favorites`
- `finance_auxiliary_kv_save(PDO $db, int $uid, string $key, $value): void`
  — mesmo `UPSERT` que ja existia inline em `api/data.php`
  (`INSERT ... ON DUPLICATE KEY UPDATE data_value = VALUES(data_value)`),
  byte a byte

Nenhuma dessas chaves foi migrada para tabela. Elas continuam em
`kv_store`, com o mesmo nome, mesmo shape e mesmo local de armazenamento.

## api/data.php apos a extracao

O `POST` ganhou uma unica bifurcacao depois da validacao de payload
(inalterada):

```php
if (in_array($key, FINANCE_AUX_KV_KEYS, true)) {
    finance_auxiliary_kv_save($db, $uid, $key, $body['value']);
} else {
    $stmt = $db->prepare('INSERT INTO kv_store (user_id, data_key, data_value) VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE data_value = VALUES(data_value)');
    $stmt->execute([$uid, $key, json_encode($body['value'])]);
}
echo json_encode(['ok' => true]);
exit;
```

O ramo `else` e o caminho generico original, preservado literalmente —
qualquer chave fora da lista autorizada (inclusive as quatro chaves
relacionais e qualquer chave de outro dominio, como `workouts`) continua
passando por ele, sem tocar no modulo novo.

Nada mais mudou: bootstrap, `require_login()`, `require_rate_limit('data',
200, 60)`, `require_csrf()`, limite de 2 MB, validacao de payload, `GET`
(incluindo `?all=1` e `?key=`) e `405` seguem exatamente como estavam.

## O que foi preservado

- rota: `POST api/data.php`
- payload: `{ "key": "...", "value": ... }`
- `200 {"ok": true}`
- `400 {"error": "invalid payload"}`
- `413 {"error": "payload too large"}`
- `405 {"error": "method not allowed"}`
- `require_login()`, `require_rate_limit('data', 200, 60)`,
  `require_csrf()`, nesta ordem
- limite de 2 MB de payload bruto
- `UPSERT` atual em `kv_store` (mesma query, mesmo comportamento de
  substituicao total do valor da chave)
- nomes, shapes e local de armazenamento (`kv_store`) das oito chaves
- caminho generico atual para chaves nao financeiras (codigo original
  preservado no `else`)
- `GET ?all=1` intacto: mesmo filtro `NOT LIKE '\_%'`, mesma sobrescrita
  das quatro chaves relacionais por cima do kv

## O que nao foi tocado

- `assets/app.js`
- `api/import-ofx.php`
- `ofx.php`
- `api/finance.php`
- `finance.php`
- `app/Modules/Finance/FinanceRead.php`
- `app/Modules/Finance/FinanceWrite.php`
- `app/Modules/Finance/FinanceMigration.php`
- `app/Modules/Finance/FinanceApi.php`
- `app/Modules/Finance/FinanceDataBootstrap.php`
- `app/Modules/Finance/FinanceOfxPreview.php`
- `schema.sql`
- `migrations/`
- `auth.php`
- `db.php`
- `plan.php`

Nao houve migracao de nenhuma das oito chaves para tabela. Nao houve
extracao do `POST` inteiro (a validacao de payload, o limite de tamanho e
a resposta continuam em `api/data.php`). A leitura generica do `kv_store`
(`GET` sem `?all=1`, e o `SELECT` de `?all=1`) nao foi tocada.

## Sem abstracoes novas

Nenhuma classe, service, repository, DTO ou container foi criado.
`FinanceAuxiliaryKv.php` e uma constante e uma funcao global simples, no
mesmo estilo procedural dos demais modulos de `app/Modules/Finance/`.

## Arquivos alterados

- `api/data.php` (modificado: `POST` bifurca pra `finance_auxiliary_kv_save()`
  quando a chave e uma das oito autorizadas; caminho generico preservado
  no `else`)
- `app/Modules/Finance/FinanceAuxiliaryKv.php` (novo)
- `tests/cases/finance_auxiliary_kv_test.php` (novo)
- `docs/architecture/finance/PHASE_9_AUXILIARY_KV_WRITE_REPORT.md` (novo)

## Testes

`tests/cases/finance_auxiliary_kv_test.php` (unitario, sqlite em memoria,
sem HTTP) cobre:

- contrato: `FINANCE_AUX_KV_KEYS` lista exatamente as oito chaves
  autorizadas, na ordem documentada
- chave financeira valida delegada ao modulo: `finance_auxiliary_kv_save()`
  persiste em `kv_store` com o `data_key`/`data_value` esperados
- `UPSERT` preservado: salvar a mesma chave duas vezes atualiza uma unica
  linha (sem duplicar), com o valor mais recente
- valor persistido e relido sem alteracao: um valor com shape aninhado,
  `null`, booleano e lista sobrevive ao round-trip `json_encode`/
  `json_decode` sem mudanca
- chave generica nao financeira continua no fluxo legado: `workouts`,
  `workout_log`, `body_log`, `section_order` e `expense_lines_v4` (chave
  relacional) nao estao em `FINANCE_AUX_KV_KEYS`, ou seja, continuam
  roteadas pro `else` inline em `api/data.php`
- `GET ?all=1` sem regressao: uma funcao auxiliar local ao teste
  (`fakv_simulate_get_all()`) reproduz o mesmo algoritmo de merge do
  endpoint (le o `kv_store`, exclui chaves com prefixo `_`, sobrescreve com
  `finance_data_bootstrap()`) usando as funcoes reais do modulo — confirma
  que uma chave financeira auxiliar e uma chave generica convivem no
  merge, que chaves internas continuam excluidas, e que as quatro chaves
  relacionais continuam presentes

### Sobre a cobertura do merge do `GET ?all=1`

Essa cobertura preenche uma lacuna deixada pela correcao de infraestrutura
da Fase 7: o smoke test HTTP de `api/data.php` foi reduzido, naquela
correcao, a um unico cenario (`401` sem sessao), porque `get_db()` nao pode
mais ser sobrescrita a partir dos testes e nao ha MySQL real acessivel
neste ambiente — qualquer requisicao autenticada esbarra em `get_db()` de
verdade antes de chegar em qualquer logica de negocio. O teste de merge
desta fase reconstroi o algoritmo com as funcoes reais e um `PDO` sqlite
injetado, sem depender de HTTP nem de `auth.php`/`db.php`.

## Validacao

- `php -l api/data.php`: sem erro de sintaxe
- `php -l app/Modules/Finance/FinanceAuxiliaryKv.php`: sem erro de sintaxe
- `php -l tests/cases/finance_auxiliary_kv_test.php`: sem erro de sintaxe
- `tests/run.php` antes da extracao: 12/12 passou
- `tests/run.php` depois da extracao: 13/13 passou, em tres execucoes
  seguidas (sem flakiness observada)
- `git diff --stat`: `api/data.php` com 8 insercoes, 3 remocoes; nenhum
  arquivo da lista de "nao alterar" foi tocado

## Lacunas HTTP/E2E remanescentes

Mesma restricao estrutural documentada nas Fases 7 e 8: `db.php` nao pode
ser alterado nem ter `get_db()` sobrescrita a partir dos testes, e nao ha
MySQL real acessivel neste ambiente. Em `api/data.php`, `$db = get_db();`
roda incondicionalmente logo apos `require_rate_limit()` (que tambem
depende de `get_db()`), antes de qualquer bifurcacao por metodo. Ou seja,
**todo** status code deste endpoint — `200`, `400`, `413`, `405`, e o corpo
completo de `GET ?all=1` — depende de um banco de verdade pra ser
alcancado via HTTP real; so o guard de autenticacao (`401`, ja coberto por
`finance_data_adapter_test.php` desde a Fase 7) e alcancavel sem banco.

Por isso, `200`/`400`/`413`/`405`/`GET ?all=1` desta fase sao garantidos
por dois pilares, nao por um teste HTTP de ponta a ponta:

1. **Diff minimo e cirurgico**: `git diff api/data.php` mostra que os
   blocos que produzem esses status codes/corpo (`400 invalid payload`,
   `413 payload too large`, `405 method not allowed`, o `GET` inteiro)
   nao foram tocados — so o miolo do `POST`, entre a validacao de payload
   e o `echo json_encode(['ok' => true])`, ganhou a bifurcacao.
2. **Teste comportamental do merge** (`fakv_simulate_get_all()` em
   `finance_auxiliary_kv_test.php`), cobrindo a logica de `GET ?all=1` com
   as funcoes reais, sem depender do transporte HTTP.

Validar manualmente login real + `POST`/`GET` reais em `api/data.php`
antes de qualquer mudanca futura que toque essas chaves, CSRF, rate limit
ou o shape do `?all=1`, conforme a Manual Validation Policy de
`DEFINITION_OF_DONE.md`.

## Garantias desta fase

- nenhum contrato publico foi alterado
- nenhuma rota, metodo HTTP, status code ou shape JSON mudou
- nenhuma das oito chaves foi migrada para tabela
- o `POST` nao foi extraido por completo; so a persistencia das chaves
  financeiras auxiliares foi delegada
- a leitura generica do `kv_store` nao foi tocada
- nenhuma regra de negocio nova foi introduzida
- nenhuma abstracao nova foi criada
- rollback trivial: reverter `api/data.php` e remover
  `app/Modules/Finance/FinanceAuxiliaryKv.php`

## Estado do piloto Finance apos a Fase 9

O piloto `Finance` cobre agora: nucleo relacional (`FinanceRead`), escrita
(`FinanceWrite`), migracao (`FinanceMigration`), adapter de
`api/finance.php` (`FinanceApi`), bootstrap financeiro de `api/data.php`
(`FinanceDataBootstrap`), preview de OFX (`FinanceOfxPreview`) e, agora,
persistencia das chaves financeiras auxiliares ainda em kv
(`FinanceAuxiliaryKv`). O que resta puramente client-side — cofrinhos e
transferencias como fluxo de UI, projecao de saldo, analises, aplicacao de
movimento em conta — segue fora de escopo, conforme `FINANCE_BOUNDARIES.md`
e `FINANCE_EXTRACTION_RISKS.md`.
