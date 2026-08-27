# 13 — Plano de ação e critérios de saída

**Data-base:** 2026-08-26
**Decisão vigente:** **NO-GO**
**Regra de mudança:** somente aprovação explícita transforma este plano em branches/correções. Não corrigir diretamente em `master`; usar branches curtas e temáticas, PR, gates e rollback.

## 1. Condição de GO

Produção só pode mudar para **GO** quando, cumulativamente:

1. `P0=0` e nenhum P1 de [11](./11-achados-priorizados.md) estiver aberto.
2. P2 remanescente tiver aceite formal com owner, risco residual, prazo e controle compensatório.
3. O mesmo SHA tiver sido testado, migrado, empacotado, publicado e identificado no health/readiness.
4. Baseline + migrations forem reproduzíveis em MySQL equivalente à produção.
5. Backup full e restore em alvo isolado tiverem sido ensaiados; RPO/RTO medidos e dentro da meta.
6. Web e mobile passarem gates próprios; advisories mobile tiverem upgrade ou aceite por reachability.
7. Supabase, Google, Mercado Pago, Resend, LLM, Sentry, push e cron críticos tiverem evidência em sandbox/staging.
8. E2E de auth/MFA, entitlement, pagamento, finanças, backup, IA e jornadas públicas estiver verde.
9. Acessibilidade, performance, PWA/claims e privacidade tiverem critérios mensuráveis atendidos.
10. Controles positivos listados em `11` não tiverem regredido.

## 2. Governança de execução

Cada ação deve produzir: PR temática; IDs de achado; decisão de produto; migration expand/contract quando aplicável; testes; evidência de `12`; plano de rollout; rollback; observabilidade; aceite do owner. Mudança de MFA/sessão, entitlement, dinheiro ou restore exige revisão Security + Backend/Data. Dependência mobile deve respeitar a documentação versionada do Expo 55 antes de editar.

**Owners por papel:**

- **SEC:** Security/Auth/Privacy.
- **BE:** Backend PHP/domínios/API.
- **DATA:** DBA/dados/migrations/backup.
- **WEB:** React/PWA/landing/acessibilidade.
- **MOB:** Expo/React Native/release mobile.
- **PLAT:** CI/CD/Hostinger/observabilidade.
- **QA:** automação, E2E, regressão e evidência.
- **PROD:** produto, regras, legal/claims e aceite de risco.

## 3. Antes de qualquer deploy

| ACT-ID | Ação | Achados | Owner | Dependências | Rollout/rollback | Validação/saída |
|---|---|---|---|---|---|---|
| ACT-000 | Manter freeze de produção e decisão NO-GO | todos P1 | PROD+PLAT | nenhuma | nenhum deploy; revert administrativo não se aplica | pacote 00–13 aprovado |
| ACT-001 | Triar advisories mobile sem `--force` | MOB-DEP-01 | MOB+SEC | docs Expo 55, lockfile | upgrade incremental; rollback de lock/package | audit sem high ou aceite reachability documentado; build device |
| ACT-002 | Inventariar DB/infra somente leitura | DB-01/02/03, BAK-01, DR-01 | DATA+PLAT | staging/clone anonimizado | nenhuma escrita em produção | relatório de schema/migrations/sql_mode/timezone/backup age |
| ACT-003 | Proteger artefatos locais e segredos | DATA-01, OBS-01 | SEC+WEB+PLAT | classificação de dados | feature flags; scrubber reversível | nenhum token/financeiro/query em storage/telemetria indevidos |
| ACT-004 | Resolver SHA único no workflow antes de dispatch | DEP-01 | PLAT | Actions | manter push atual desabilitado até PR; rollback do YAML | quality gate e pacote usam o mesmo SHA |
| ACT-005 | Confirmar branch protection/environment approvals | DEP-01/03 | PLAT | acesso GitHub | mudança de ruleset reversível | required checks + approval Production comprovados |

## 4. Próximas 24 horas após aprovação

| ACT-ID | Ação | Achados | Owner | Dependências | Rollout/rollback | Validação/saída |
|---|---|---|---|---|---|---|
| ACT-010 | Definir state machine de identidade/MFA | AUTH-01/02/03/04/05 | SEC+BE+PROD | decisão recent-auth/idle | feature flag e revogação controlada | matriz enroll/replace/disable/recovery/sessões aprovada |
| ACT-011 | Definir state machine de plano/pagamento | SUB-01/02/03/04, PAY-01 | PROD+BE+DATA | contratos MP | shadow reconciliation antes de enforce | trial/paid/cancel/past_due/refund/chargeback documentados |
| ACT-012 | Definir modelo financeiro canônico | FIN-01/02/03/04 | PROD+BE+DATA | cents, ledger, parcelas, FITID | dual-read/dual-write temporário | ADR com invariantes e estratégia de migração |
| ACT-013 | Reconciliar 36 tabelas e classes de backup | DB-01, BAK-01 | DATA+BE | inventário ambiental | apenas contrato em PR; sem aplicar | schema/contract/backup 36/36 |
| ACT-014 | Definir RPO/RTO/custódia de chave | DR-01 | PROD+PLAT+SEC | hosting/offsite | manter artefatos atuais | owner, scheduler, retenção, escrow e metas aprovados |
| ACT-015 | Definir contrato de UX `plan_required` | INC-01, FE-01 | WEB+BE+PROD | erro tipado | flag no fluxo novo | 16 casos de `08` com oracle aprovado |
| ACT-016 | Criar plano de testes mobile/E2E | TEST-01/02, CAL-01 | QA+MOB+WEB | dispositivos/staging | suíte nova não bloqueia até estabilizar | matriz de jornadas, fixtures e pipeline aprovados |

## 5. Próximos 7 dias — correções bloqueadoras

### 5.1 Identidade, sessão e abuso

| ACT-ID | Implementação | Achados | Validações obrigatórias | Saída |
|---|---|---|---|---|
| ACT-100 | Enrollment em duas fases, step-up passwordless e bump de versão | AUTH-01/02/03 | TOTP antigo válido até confirmação; AAL1/AAL2; sessões web/mobile revogadas | nenhum downgrade e nenhum P1 MFA |
| ACT-101 | Recovery code por CAS/transação | AUTH-04 | duas confirmações simultâneas; exatamente uma vence | uso único atômico |
| ACT-102 | Idle mobile/rotação e rate limit de cadastro completo | AUTH-05/06 | relógio congelado, logout, identidades únicas/invalidas | políticas aprovadas e testadas |

### 5.2 Entitlement e pagamento

| ACT-ID | Implementação | Achados | Validações obrigatórias | Saída |
|---|---|---|---|---|
| ACT-110 | Policy explícita para trial/status/grants | SUB-01/02/03, AUTH-07 | matriz de estados e migração sem grant pessoal | nenhum acesso implícito indevido |
| ACT-111 | Reconciliador lifecycle MP e allowlist checkout | SUB-04, PAY-01 | sandbox approve/renew/cancel/refund/replay/host hostil | provider e DB convergem idempotentemente |

### 5.3 Dados, migrations e DR

| ACT-ID | Implementação | Achados | Dependências/rollback | Saída |
|---|---|---|---|---|
| ACT-120 | Baseline versionado + `schema_migrations` + runner/checksum/lock | DB-01/02 | expand/contract; backup antes; forward fix | instalação limpa + upgrade reproduzíveis |
| ACT-121 | Migration no deploy com compatibilidade | DB-03/04/05 | ACT-120; app N/N-1; rollback explícito | schema pronto antes do código dependente |
| ACT-122 | Corrigir contratos/limites e post-validation | BAK-01/02, RST-01 | formato versionado; alvo descartável | full backup/restore 36/36 sem commit inválido |
| ACT-123 | Job full, retenção/offsite e drill | DR-01, TEST-DB-01 | chave recuperável; MySQL staging | RPO/RTO medidos e alertas ativos |

### 5.4 Release

| ACT-ID | Implementação | Achados | Rollback | Saída |
|---|---|---|---|---|
| ACT-130 | Release directory + promoção atômica possível | DEP-02 | manter release anterior; manutenção se symlink indisponível | usuário nunca vê PHP/frontend mistos |
| ACT-131 | Workflow rollback real e readiness SHA/schema | DEP-03 | app + forward DB compatível | rollback ensaiado e health identifica versão |

## 6. Antes da abertura pública — integridade de domínios

| ACT-ID | Ação | Achados | Owner | Validação/saída |
|---|---|---|---|---|
| ACT-200 | Comando financeiro transacional/ledger/cents/FITID/parcelas | FIN-01/02/03/04 | BE+DATA+PROD | falhas parciais, replay, estorno, OFX e fórmulas web/mobile/IA verdes |
| ACT-201 | Corrigir optimistic save e erro tipado | INC-01 | WEB+BE+QA | 16 casos `plan_required`; sem fantasma/ressurreição |
| ACT-202 | Revision/CAS e timezone em Rotina | ROT-01/02 | BE+WEB+MOB | duas abas/device e virada do dia |
| ACT-203 | XP pós-commit, ref server-trusted e revoke uniforme | ROT-03, PROG-01, FIN-05, PROG-02 | BE+PROD | ação real exatamente uma vez; estorno documentado |
| ACT-204 | Calendar mobile POST e budgets de timeout | CAL-01/02 | MOB+BE | connect/disconnect/sync lento em device |
| ACT-205 | Idempotency key e delete+revoke transacional em Treino | TRN-01/02 | BE+MOB+WEB | timeout/replay/falha injetada |
| ACT-206 | Safety declarada e keep/replace em Nutrição | NUT-01/03 | PROD+BE+Legal | alergia/restrição fail-closed; histórico preservado; sem diagnóstico |
| ACT-207 | Padronizar API method/body/cache/error | API-01/02/03 | BE+SEC | matriz 35 endpoints com 400/401/402/403/405/409/413/422/429/503 |
| ACT-208 | Outbox transacional para e-mail e origem única | MAIL-01/02 | BE+DATA+PLAT | falha/timeout/backoff/idempotência; staging/prod links corretos |
| ACT-209 | Implementar sender push ou remover promessa | PUSH-01 | MOB+BE+PROD | entrega/revogação/token em sandbox |

## 7. IA segura antes de novas especialidades

| ACT-ID | Ação | Achados | Validação/saída |
|---|---|---|---|
| ACT-300 | Categoria fechada, parser de data e clarificação | AI-01 | `1.234,56`, datas inválidas/relativas e enum real; sem default silencioso |
| ACT-301 | Hash canônico por request e state completo | AI-02 | mesmo ID/corpo igual idempotente; corpo diferente 409; dupla confirmação |
| ACT-302 | Contexto persistido de baixa autoridade | AI-03 | stored injection em conta/tarefa/treino/ingrediente não muda action/tool/user |
| ACT-303 | Limite único e metadata redigida | AI-04/05 | 31/32/33/64 KiB, provider oculto, summary sem PII |
| ACT-304 | Governança de provider | bloqueios de `10` | DPA/retention/residência/model/version/budget aprovados |

Nenhuma especialidade proposta em `10` deve ganhar mutação antes de ACT-300–304. Read-only local pode ser avaliado depois, com schema, fallback e testes próprios.

## 8. Web, PWA, landing, acessibilidade e mobile

| ACT-ID | Ação | Achados | Owner | Validação/saída |
|---|---|---|---|---|
| ACT-400 | Tema/CSP/foco/contraste | FE-02, A11Y-01 | WEB+SEC+Design | CSP efetiva; tema sem FOUC; WCAG AA/3:1 foco |
| ACT-401 | Estados neutros e gate visual seguro | FE-01/03 | WEB+QA | loading/error/offline/empty/paywall sem demo ou escrita prematura |
| ACT-402 | Contrato PWA ou remoção de claim | PWA-01 | WEB+PROD | install/update/offline/privacy em perfil limpo |
| ACT-403 | Budget por experiência | PERF-01 | WEB+PLAT | total por rota, gzip/Brotli, requests, long tasks, LCP/INP/CLS |
| ACT-404 | Landing prerender/legal/claims/analytics | LAND-01 | WEB+PROD+Legal | crawler sem JS, links, claims com fonte, UTM allowlist |
| ACT-405 | Reproduzir hero vazio | VAL-UI-01 | WEB+QA | Playwright com wait/network/console em desktop/mobile; causa corrigida ou evidência de falso positivo |
| ACT-406 | Completar tabs/dialog/safe-area/reduced motion | A11Y-01/TEST-02 | WEB+QA | teclado, screen reader, zoom 200/400%, coarse targets, device notch |
| ACT-407 | Pipeline e release Expo | MOB-DEP-01, TEST-01 | MOB+PLAT+QA | typecheck/lint/test/build Android+iOS, audit e smoke device |

## 9. Integrações e operação

| ACT-ID | Integração | Evidência exigida antes de GO |
|---|---|---|
| ACT-500 | Supabase | login/link/AAL1/AAL2/revogação/redirect com contas sintéticas |
| ACT-501 | Google | login e Calendar grant/read-only/revoke/refresh/erro sem bloquear rotina |
| ACT-502 | Mercado Pago | checkout hosted, Pix/card, webhook HMAC/replay/valor/moeda/collector/lifecycle |
| ACT-503 | Resend | domínio, sender/reply-to, outbox, entrega/falha, links one-shot, sem token em log |
| ACT-504 | LLM | fallback, quota, red-team, minimização, retenção e custo sem revelar provider |
| ACT-505 | Sentry/analytics | payload redigido, consentimento/retention, query removida, alertas úteis |
| ACT-506 | Push/cron/backup | sender, scheduler CLI, rotação condicional do cron secret, idade/alerta do backup |
| ACT-507 | Hostinger/FTPS | document root, deny rules, AllowOverride, release atômico e rollback em staging |

## 10. Horizonte temporal resumido

### Antes de qualquer deploy

ACT-000–005. Nenhum deploy enquanto MFA/entitlement/migrations/backup/dependency mobile permanecerem sem decisão e owner.

### Próximas 24 horas após aprovação

ACT-010–016: decisões de arquitetura/produto, inventário ambiental, owners e testes. Não aplicar migration ou fix automático em produção.

### Próximos 7 dias

ACT-100–131: auth, entitlement, dados, backup e release. Só abrir PRs temáticas; mudanças de alto risco usam feature flag, expand/contract e runbook.

### Antes da abertura pública

ACT-200–209, ACT-300–304, ACT-400–407 e ACT-500–507. E2E, a11y, performance, mobile, provider sandboxes e DR devem gerar evidência em `12`.

### Melhorias posteriores

- especialidades de IA read-only locais;
- virtualização após medir listas;
- refinamentos dos wireframes financeiros;
- provenance de referências visuais;
- P2/P3 formalmente aceitos e monitorados.

## 11. Estratégia de branches sugerida

Uma branch por risco coeso, por exemplo:

- `fix/mfa-state-transitions`
- `fix/subscription-lifecycle`
- `feat/migration-runner`
- `fix/backup-contract-restore`
- `fix/finance-atomic-commands`
- `fix/assistant-replay-context`
- `fix/mobile-dependency-audit`
- `fix/release-sha-atomicity`

Não misturar mudança de schema, redesign e refactor amplo na mesma PR. Não usar `--no-verify`, force push ou alteração direta em `master`. Cada PR referencia `ACT-*`, `ACHADO-*` de `11`, validações de `12` e rollback.

## 12. Aceite de risco

Um P2/P3 só pode permanecer aberto com:

- owner nominal e área responsável;
- cenário/impacto e evidência;
- controle compensatório;
- prazo/data de expiração do aceite;
- métrica/alerta;
- condição que força reavaliação.

P1 não é aceito para abertura pública neste plano. Item **BLOQUEADO** não é automaticamente aceito: deve ser validado ou explicitamente retirado do escopo do release.

## 13. Decisão final operacional

**Hoje: NO-GO.** Web/backend locais verdes são sinal positivo, mas coexistem com P1 de auth, entitlement, dados/migrations/DR, integridade de domínio, deploy e dependências mobile. O próximo passo não é publicar: é aprovar este plano, atribuir owners e executar branches temáticas na ordem acima.