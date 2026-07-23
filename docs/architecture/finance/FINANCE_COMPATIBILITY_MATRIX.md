# Finance Compatibility Matrix

## Objetivo

Mapear os pontos de compatibilidade que uma extracao do Financeiro precisa
preservar.

| Area | Artefato atual | Contrato a preservar | Risco de quebra | Como validar |
|---|---|---|---|---|
| Bootstrap | `api/data.php?all=1` | devolve os 4 sets relacionais nas mesmas chaves do passado | alto | snapshot de chaves/shape e smoke manual do boot |
| Persistencia relacional | `api/finance.php` | payload `{key,value}` e resposta `{"ok":true}` | alto | teste de payload invalido, limite e save/load |
| Persistencia kv de apoio | `api/data.php` | chaves auxiliares continuam fora do fluxo relacional | medio | smoke do bootstrap combinado + revisao documental |
| Mapeamento de sets | `FINANCE_SETS` em `finance.php` | roteamento exato das 4 chaves publicas | alto | teste de round-trip por set |
| Despesas | `transactions kind=expense` | shape de `expense_lines_v4` | alto | fixture e teste de round-trip |
| Rendas | `transactions kind=income` | shape de `income_lines` | alto | fixture e teste de round-trip |
| Renda variavel | `transactions kind=income_var` | shape de `ifood-entries` | medio | fixture e teste de round-trip |
| Contas/cartoes | `accounts` | shape de `accounts_v2` | alto | fixture e teste de round-trip |
| IDs do front | `client_id` | ids strings permanecem estaveis | alto | teste de persistencia sem reid no front |
| Replace total | `finance_save_set()` | salvar um set substitui o anterior por completo | alto | teste de save seguido de overwrite |
| Ordem de retorno | `ORDER BY id` | lista volta na ordem fisica atual | medio | teste de leitura apos inserts previsiveis |
| Migracao kv -> relacional | `finance_migrate_if_needed()` | idempotencia + flag `_finance_migrated` + kv legado preservado | alto | teste de migracao e remigracao bloqueada |
| OFX preview | `api/import-ofx.php` + `ofx.php` | endpoint nao grava; parser normaliza; `dup` e apenas marcador | alto | teste do parser + revisao de fluxo |
| Plano pago | `require_plan()` em OFX | OFX continua gated por plano `individual` | medio | revisao documental do endpoint |
| Simulador CLT/PJ | `income_meta` em kv | metadados continuam fora das tabelas | medio | revisao de fronteira e smoke manual |
| Cofrinhos | `vaults` em kv | saldo reservado continua fora de `finance.php` | alto | revisao documental + smoke manual |
| Transferencias | `transfers` em kv | fluxo continua cliente-side | alto | revisao documental + smoke manual |
| Metas/categorias/anomalias | `budget_goals`, `custom_categories`, `anomaly_dismissed` | continuam fora do nucleo relacional | medio | revisao documental |
| Visao por conta/banco | `acc_view` em kv | preferencia visual nao muda de lugar sem fase dedicada | baixo | smoke manual |
| Favoritos de banco | `bank_favorites` em kv | seletor continua funcionando sem tocar no relacional | baixo | smoke manual |
| Front routing | `FINANCE_KEYS` em `assets/app.js` | 4 chaves seguem roteadas para `api/finance.php` | alto | revisao de codigo e smoke manual |
| Regra cliente-side | `applyAccountMovement`, `payFaturaAccount`, projecao, analises | comportamento atual, mesmo nao ideal, segue valido | alto | smoke manual focado por fluxo |

## Leitura da matriz

- `alto`: uma mudanca interna aqui pode quebrar o produto sem mudar rota
- `medio`: tende a quebrar fluxos secundarios ou de borda
- `baixo`: impacto menor, mas ainda parte da experiencia atual

## Cobertura esperada da Fase 2

Cobertura automatizavel sem tocar producao:

- round-trip dos 4 sets relacionais
- replace total
- migracao kv -> relacional
- parser OFX

Cobertura apenas documental/manual nesta fase:

- front routing
- cofrinhos
- transferencias
- metas/categorias/anomalias
- simulador CLT/PJ
- gating por plano no endpoint OFX
