# 05 — Dados, migrations, backup e recuperação

**Data da auditoria:** 2026-08-26
**Escopo:** worktree atual de `marketing-launch`, branch `feature/ai-agent-guardrails`, HEAD `e600c0eb8e8e4fe417fdfb4a6b82f53e9a5d300d`.
**Método:** contagem e leitura direta de schema, 25 SQLs de migration, contratos, CLIs, APIs, testes e workflows. README não foi usado como prova. A suíte local passou em SQLite/fakes, mas MySQL/hosting, replay e restore ambiental não foram acessados; detalhes em [12](./12-validacoes-residuos-limitacoes.md).
**Classificação:** **Conforme** = controle demonstrado no código; **Risco/NC** = divergência ou falha demonstrável; **Bloqueado** = depende do ambiente.

## Veredito executivo

Há bons controles criptográficos e de preflight, mas o repositório não sustenta migrations reproduzíveis nem DR completo. O baseline contém **36 tabelas** e a pasta contém **25 migrations SQL**, porém o contrato de schema tem 31 entradas: omite seis tabelas reais e inclui a inexistente `schema_migrations`. O contrato ainda referencia um `MigrationRunner` ausente. O deploy não aplica migrations e o único aplicador aceita só três SQLs. O full backup inclui `schema_migrations`, logo tende a falhar numa instalação criada somente por `schema.sql`; ao mesmo tempo, omite dados de seis tabelas reais. Restore autentica e transaciona a carga, mas faz commit antes da pós-validação. Não há prova em MySQL real, scheduler versionado do full backup, retenção/offsite, cutover ou RPO/RTO observados.

## Inventário comprovado

### Baseline: 36 tabelas

Contagem direta das 36 declarações `CREATE TABLE IF NOT EXISTS` em `schema.sql:6-565`:

1. `users`; 2. `register_attempts`; 3. `totp_backup_codes`; 4. `kv_store`; 5. `login_attempts`; 6. `password_reset_tokens`; 7. `rate_hits`; 8. `push_devices`; 9. `mobile_sessions`; 10. `audit_events`; 11. `subscriptions`; 12. `subscription_events`; 13. `transactions`; 14. `accounts`; 15. `user_progress`; 16. `subscription_payments`; 17. `google_calendar_tokens`; 18. `google_calendar_events`; 19. `nutrition_plans`; 20. `body_measurements`; 21. `training_workouts`; 22. `training_workout_exercises`; 23. `training_programs`; 24. `training_program_workouts`; 25. `training_sessions`; 26. `training_session_entries`; 27. `assistant_actions`; 28. `assistant_route_cache`; 29. `assistant_history`; 30. `assistant_usage_daily`; 31. `assistant_quality_daily`; 32. `web_vitals_daily`; 33. `marketing_events_daily`; 34. `xp_events`; 35. `achievements`; 36. `user_achievements`.

O próprio baseline é operacional/manual: manda rodar no phpMyAdmin e selecionar ALTERs ainda não aplicados (`schema.sql:1-4`). Isso é snapshot final, não um baseline versionado ligado a um ledger de migrations.

### Migrations: 25 SQLs

A pasta tem 28 artefatos: **25 `.sql`** e três `.md`. SQLs enumerados diretamente:

- 2026-07-06: `rate-limit`, `subscriptions`, `transactions`;
- 2026-07-08: `cheque-especial`, `financeiro-front`, `grant-max-individual`, `parcelas`;
- 2026-07-17: `level-os-progress`, `password-reset`;
- 2026-07-18: `assistant-training-expansion`, `finance-salary-details`, `google-calendar-readonly`, `level-os-achievements`, `platform-hardening`, `subscription-mercadopago`;
- 2026-07-19: `level-os-achievements-pack`;
- 2026-07-20: `supabase-auth`;
- 2026-07-22: `ai-plan-versions`, `assistant-history`;
- 2026-07-24: `encrypt-totp-secrets`;
- 2026-07-25: `native-push`;
- 2026-07-28: `mobile-sessions`;
- 2026-08-09: `assistant-quality`;
- 2026-08-22: `marketing-events`, `web-vitals`.

## Conformidades demonstradas

| Controle | Estado | Evidência exata |
|---|---|---|
| Baseline InnoDB/utf8mb4 com PKs, índices e FKs | Conforme no arquivo | Finanças `schema.sql:167-217`; pagamentos `schema.sql:227-251`; Calendar `schema.sql:254-292`; telemetria `schema.sql:500-535` |
| Cents na aplicação financeira | Conforme na conversão; dual-write permanece risco | Parser textual sem float e leitura `_cents` em `FinanceRead.php:13-42`; escrita em `FinanceWrite.php:26-91`; backfill em `migrations/2026-07-18-platform-hardening.sql:19-40` |
| Relógio central | Conforme no PHP | São Paulo para negócio e UTC para persistência em `app/Core/Clock.php:4-29` |
| Full backup usa snapshot consistente MySQL | Conforme por desenho | `REPEATABLE READ` + `START TRANSACTION WITH CONSISTENT SNAPSHOT` em `DatabaseBackup.php:261-298`; streaming/contagem em `DatabaseBackup.php:301-455` |
| Destino de backup fora do repositório e publicação protegida | Conforme por desenho | `DatabaseBackup.php:149-257`; `scripts/backup.php:62-112` |
| Secretstream autenticado | Conforme estaticamente | XChaCha20-Poly1305 secretstream, frame final, validação de chave e falha fechada em `BackupCrypto.php:5-36`, `BackupCrypto.php:65-93`, `BackupCrypto.php:105-158`, `BackupCrypto.php:179-248` |
| Restore valida alvo isolado/artefato/schema antes de escrever | Conforme até o preflight | nome/confirm em `DatabaseRestore.php:26-49`; marcador `:99-114`; primeira passagem `:123-237`; schema/tabelas vazias `:244-263` |
| Inserção do restore é transacional | Conforme antes do commit | DELETE+INSERT, contagens e rollback em `DatabaseRestore.php:270-366` |
| Quality gate precede upload | Conforme para código | `.github/workflows/deploy.yml:14-24` |

## Baseline + replay e gestão de migrations

### Não há replay determinístico

Executar as 25 migrations sobre o baseline final não é seguro. Migrations antigas fazem `ADD COLUMN` sem guarda para colunas já presentes:

- `migrations/2026-07-08-cheque-especial.sql:1-5`;
- `migrations/2026-07-08-financeiro-front.sql:1-12`;
- `migrations/2026-07-08-parcelas.sql:1-5`.

Os comentários instruem ignorar erro do phpMyAdmin, o oposto de replay automatizado/fail-closed. Não existe ponto de corte que diga “baseline X já contém migrations até Y”.

### `schema_migrations` e `MigrationRunner`: exigidos, mas ausentes

O contrato declara `schema_migrations` com checksum, status, timestamps, duração e erro, e cita `app/Core/MigrationRunner.php` (`config/schema-contract.php:626-640`). O backup também a classifica como persistente e a coloca por último (`config/backup-contract.php:31-57`, `config/backup-contract.php:183-189`). Porém:

- `schema.sql:1-624` não cria `schema_migrations`;
- nenhum dos 25 SQLs a cria;
- não existe `app/Core/MigrationRunner.php` no worktree;
- `DatabaseBackup::summarizeMigrationState()` transforma a ausência em lista vazia ao capturar `PDOException` (`DatabaseBackup.php:398-410`).

Resultado: não há ledger, checksum enforcement, lock, ordenação coordenada, registro de falha ou replay automático.

### `apply-migration.php` cobre somente três

A allowlist contém apenas `2026-08-09-assistant-quality.sql`, `2026-08-22-web-vitals.sql` e `2026-08-22-marketing-events.sql`; o script lê o arquivo e chama `PDO::exec`, sem ledger/checksum/lock/rollback (`scripts/apply-migration.php:8-38`). As outras 22 migrations não têm runner versionado.

### Deploy não aplica migration

O workflow exclui `migrations/**`, `scripts/**` e `schema.sql` dos dois uploads PHP e não possui etapa de banco (`.github/workflows/deploy.yml:57-128`). O health posterior não corrige nem reverte schema (`.github/workflows/deploy.yml:173-180`; `api/health.php:7-38`). Assim, código pode ser publicado antes da tabela/coluna necessária.

## Migrations destrutivas e dados hardcoded

| Migration | Mutação | Risco | Evidência |
|---|---|---|---|
| Password reset | Apaga duplicatas antigas antes do UNIQUE; pode remover índice legado | Perda deliberada sem down migration | `migrations/2026-07-17-password-reset.sql:43-47`, `:61-72` |
| Mercado Pago | Reescreve legados, converte `family`→`individual`, estreita ENUMs, remove índices e quatro colunas após cópia | DDL/DML destrutivo, sem rollback provado | `migrations/2026-07-18-subscription-mercadopago.sql:81-145`, `:130-145` |
| Hardening financeiro | Backfill global com `ROUND(decimal*100)` | Conversão irreversível sem relatório de discrepância | `migrations/2026-07-18-platform-hardening.sql:19-40` |
| Grant Max | Concede plano a `user_id=1` até data fixa | Seed pessoal/ambiental dentro da história genérica; ID 1 pode ser outra pessoa | `migrations/2026-07-08-grant-max-individual.sql:1-16` |

## Contrato de schema, índices, FKs e ownership

### Divergência 36 × 31

`config/schema-contract.php` contém **31 entradas**, não 36: 30 tabelas reais + a fantasma `schema_migrations`. Ele omite seis tabelas do baseline:

- `push_devices` (`schema.sql:93-107`);
- `nutrition_plans` (`schema.sql:294-316`);
- `training_programs` (`schema.sql:367-386`);
- `training_program_workouts` (`schema.sql:387-398`);
- `assistant_history` (`schema.sql:472-488`);
- `assistant_usage_daily` (`schema.sql:489-499`).

O contrato também exige UNIQUE `idx_users_email_verify_token` (`config/schema-contract.php:48-59`), mas o baseline só declara a coluna, sem esse índice (`schema.sql:6-25`), e os SQLs inspecionados não o criam. Um banco novo do baseline não satisfaz integralmente o próprio auditor.

### FKs/ownership são parciais

Há FKs individuais para owner e recurso, mas não compostas que garantam ambos pertencerem ao mesmo usuário. Exercício pode, em escrita direta defeituosa, referenciar workout de A e `user_id` B; o mesmo vale para programa/workout e sessão/workout (`schema.sql:345-438`). `nutrition_plans.replaces_id` não força o mesmo owner (`schema.sql:294-316`). `transactions.account_id` é `client_id` textual sem FK a `accounts` (`schema.sql:167-217`). As queries de aplicação filtram ownership; o banco não fecha toda a invariante.

### Cents: fonte canônica, mas dual-write divergente

`transactions` e `accounts` conservam DECIMAL e BIGINT `_cents`, sem CHECK/trigger de equivalência (`schema.sql:167-217`). A leitura prefere `_cents` sempre que não NULL (`FinanceRead.php:31-42`); como o baseline usa default zero, código novo sem backfill aplicado pode mostrar zero apesar de DECIMAL não zero. A ausência de migration no deploy torna o risco operacional.

### Timezone não está fechado de ponta a ponta

O PHP define São Paulo/UTC (`app/Core/Clock.php:4-29`) e o cron fixa São Paulo (`cron-notify.php:27-30`), mas `get_db()` não executa `SET time_zone` (`db.php:7-17`). O schema mistura `TIMESTAMP`, `DATETIME`, `DATE`, `TIME` e epoch BIGINT (`schema.sql:6-574`). `CURRENT_TIMESTAMP` depende da sessão MySQL; a intenção de persistência UTC não é garantia do canal de banco.

### `web_vitals.last_rating VARCHAR(16)`

Schema, migration e contrato usam 16 caracteres (`schema.sql:521-535`; `migrations/2026-08-22-web-vitals.sql:1-15`; `config/schema-contract.php:565-585`), mas o endpoint aceita `needs-improvement`, com 17 (`api/web-vitals.php:31-60`). Em strict mode a gravação pode falhar e retornar best-effort 202; em modo permissivo pode truncar. O resultado exato depende do `sql_mode`, bloqueado por ambiente.

## Backup contract: cobertura e omissões

`backup_contract_validate()` compara o backup somente ao `schema-contract`, não ao baseline nem ao `information_schema` de origem (`DatabaseBackup.php:40-120`). Logo, a promessa de “nenhuma tabela ignorada” é circular: as seis omissões acima não entram na comparação. O teste de contrato cruza os dois arrays, mas não descobre tabelas fora do contrato (`tests/cases/backup_recovery_test.php:260-284`).

Consequências:

1. `table_order` inclui `schema_migrations` (`config/backup-contract.php:31-57`), e `exportTable()` faz `SELECT COUNT(*)` sem tolerância (`DatabaseBackup.php:411-455`). Num banco criado só por `schema.sql`, o full backup falha antes de `TAG_FINAL`.
2. Planos nutricionais, programas/vínculos de treino, histórico e uso do assistente não são exportados/classificados. `push_devices` poderia ser efêmero, mas nem essa classificação existe.
3. O restore também exige schema compatível com a tabela fantasma (`DatabaseRestore.php:244-263`).

## Formatos: full versus portable

| Fluxo | Formato/conteúdo | Proteção | Limites/consumidor | Evidência |
|---|---|---|---|---|
| Export portátil web | JSON `level-os-user-backup` v2; KV público + quatro sets financeiros | Sessão, e-mail verificado; plaintext no download | Sem teto agregado de saída; `api/import.php` | `api/export.php:8-35` |
| Backup portátil por e-mail | Mesmo JSON v2, chunks de 256 KiB em container secretstream `.lvbk`; mensal e opt-in | Chave ambiental + Resend | Import web até 10 MiB | `cron-notify.php:171-250`; `api/import.php:31-70` |
| Full CLI | Manifesto, registros por tabela e trailer secretstream | Snapshot consistente, chave externa, destino fora do repo | `DatabaseRestore`; não intercambiável com JSON portátil | `DatabaseBackup.php:344-455`; `DatabaseRestore.php:123-366` |

Os dois containers cifrados compartilham magic/versão/algoritmo, mas não têm `artifact kind` público. A distinção depende do consumidor e do plaintext interno. O portátil não é DR de conta/banco: não inclui identidade, assinatura completa, TOTP, progresso, treino relacional, planos, auditoria e telemetria (`api/export.php:8-35`; `api/import.php:67-127`).

## Secretstream e limites incompatíveis

**Conforme:** chave base64 estrita do tamanho esperado, sem fallback para senha do banco; versão/algoritmo, frames autenticados e `TAG_FINAL`; rejeição de truncamento, frame gigante, alteração e bytes extras (`BackupCrypto.php:35-93`, `BackupCrypto.php:105-158`, `BackupCrypto.php:179-248`).

**Riscos:**

1. Frame máximo é 1 MiB (`BackupCrypto.php:35-36`, `BackupCrypto.php:125-130`). O full põe uma linha JSON inteira por frame (`DatabaseBackup.php:432-448`), enquanto o schema admite `LONGTEXT` em KV, transações e assistente (`schema.sql:54-62`, `schema.sql:167-194`, `schema.sql:440-488`). Linha válida grande não é fragmentada.
2. Import recusa bruto/plaintext acima de 10 MiB (`api/import.php:31-54`), enquanto o mailer aceita até 20 MiB de base64 de anexos (`ResendMailer.php:60-74`). Um `.lvbk` pode ser entregue e ser impossível de reimportar.
3. Export portátil não limita tamanho de saída (`api/export.php:8-35`).
4. O RPO de 24 h é só constante/meta (`DatabaseBackup.php:16-22`); a única automação localizada é portátil, mensal e opt-in (`cron-notify.php:185-250`).

## Restore: commit antes da pós-validação

`restore()` valida contagens/trailer e chama `commit()` (`DatabaseRestore.php:270-366`, commit em `:348`). Só depois `run()` chama `postValidate()` (`DatabaseRestore.php:379-426`). Se pós-validação falhar, o comando reporta erro, mas os dados permanecem commitados. O teste afirma esse comportamento (`tests/cases/backup_recovery_test.php:1130-1178`, especialmente `:1164-1174`). O alvo isolado reduz o blast radius, mas não há rollback compensatório/limpeza.

Também não existe provisionamento do marcador `orby_restore_target` fora dos testes: a implementação apenas o lê (`DatabaseRestore.php:99-114`); a criação aparece em `tests/cases/backup_recovery_test.php:232-235`.

## Ausência de prova em MySQL real

O teste declara explicitamente SQLite, temporários e introspectores fake: “Nunca MySQL real” (`tests/cases/backup_recovery_test.php:5-24`, `:222-245`). O workflow instala `pdo_sqlite`, não `pdo_mysql`, e não provisiona serviço MySQL (`.github/workflows/tests.yml:41-49`). Testes de migration encontrados verificam texto, não executam baseline + 25 SQLs em servidor real. Permanecem sem prova: DDL/ENUM/FKs InnoDB, `information_schema`, SQL mode, timezone, multi-statements, consistent snapshot e restore real.

## Matriz consolidada: conformidade, risco e bloqueado

| Tema | Conforme | Risco/NC | Bloqueado por ambiente |
|---|---|---|---|
| Inventário | 36 tabelas e 25 SQLs contados diretamente | Contratos 31/36 e tabela fantasma | Schema realmente instalado |
| Migrations | Três SQLs têm aplicador CLI limitado | Sem runner/ledger/checksum/replay; deploy não aplica; DDL/DML destrutivo | Quais SQLs foram aplicados manualmente |
| Integridade financeira | Conversão cents robusta na aplicação | Dual-write sem CHECK; backfill pode não ter rodado | Divergência de dados real |
| Índices/FKs | Índices/FKs úteis no baseline | Índice de verify token ausente; ownership relacional não composto | Drift real do banco |
| Timezone | Clock PHP central | Sessão MySQL não fixada; tipos mistos | timezone e `sql_mode` reais |
| Web Vitals | Endpoint valida allowlist | 17 chars em coluna 16 | Falha vs truncamento depende do modo MySQL |
| Full backup | Snapshot/stream/contagens/secretstream | Contrato omite seis e exige tabela ausente; linha >1 MiB | Volumes e maior linha reais |
| Portable | Escopo e confirmação explícitos | Não é DR; limites 10/20 MiB incompatíveis | Entrega/import reais |
| Restore | Alvo isolado, duas passagens e transação | Commit anterior à pós-validação; marcador/cutover sem automação | Banco alvo e ensaio real |
| Testes | Cobertura extensa com fakes | Nenhum MySQL real | Compatibilidade com versão da produção |

## Critérios de DR

| Critério | Veredito em 2026-08-26 | Evidência/condição de aceite |
|---|---|---|
| Inventário completo | **NC** | Reconciliar 36 tabelas entre baseline, schema-contract e backup-contract |
| Backup full executável | **NC no baseline limpo** | Criar/versionar `schema_migrations` ou removê-la do contrato de forma coerente; cobrir todas as tabelas |
| Confidencialidade/integridade | **Conforme estaticamente** | Secretstream e chave externa; falta provar custódia/recuperação da chave |
| Snapshot consistente | **Conforme por desenho, não provado** | Ensaio MySQL compatível com produção |
| RPO 24 h | **Somente declarado** | Scheduler full, monitorado, retenção e idade do último backup |
| RTO 1 h | **Somente declarado** | `RTO_TARGET_SECONDS=3600` em `DatabaseRestore.php:17-23`; medir provisionamento, restore, validação e cutover completos |
| Retenção/rotação/offsite | **Não encontrada para full** | Política e evidência operacional versionada/monitorada |
| Restore periódico | **NC** | Exercício automatizado em MySQL, corrupção e pós-validação |
| Falha atômica | **Parcial** | Mover validações críticas antes do commit ou implementar compensação |
| Observabilidade | **Parcial** | CLIs emitem métricas; não foi localizado alerta/SLI do full/restore |
| Cutover/rollback | **Não encontrado** | Runbook e automação de promoção; rollback de aplicação e banco compatíveis |
| Recuperação da chave | **B** | Provar escrow, rotação/versionamento e disponibilidade pós-desastre sem expor valor |

## Bloqueado por ambiente

A leitura do worktree não permite afirmar: versão/quantidade de tabelas em produção; migrations aplicadas; existência informal de `schema_migrations`; índices/FKs/drift; versão, `sql_mode`, timezone e privilégios MySQL; volumes e tamanho máximo de linhas; agenda do hPanel; idade/retenção/offsite dos backups; chave recuperável; restore já ensaiado; nem RPO/RTO observado. Esses itens exigem introspecção e exercício controlado, não realizados nesta auditoria.

## Critérios de correção prioritários

A ordem abaixo não altera a classificação global da auditoria: **P0=0**; estes itens são bloqueadores **P1**.

1. **P1:** reconciliar baseline, schema-contract e backup-contract e decidir um baseline versionado/ponto de corte.
2. **P1:** implementar `schema_migrations` + runner com checksum, lock, estado de falha e replay; integrar migration compatível ao deploy antes do código.
3. **P1:** retirar seed pessoal `user_id=1` da cadeia genérica e definir rollback/compatibilidade para migrations destrutivas.
4. **P1:** classificar as 36 tabelas no backup, formalizar formatos full/portable e tornar o full executável num baseline limpo.
5. **P1:** alinhar limites, fragmentar linhas grandes e mover pós-validação crítica para antes do commit ou compensar falha.
6. **P1:** fixar timezone de sessão MySQL, corrigir `VARCHAR(16)`, reforçar ownership composto e equivalência cents/DECIMAL.
7. **P1:** ensaiar baseline + replay + backup + corrupção + restore + cutover em MySQL equivalente à produção e medir RPO/RTO.