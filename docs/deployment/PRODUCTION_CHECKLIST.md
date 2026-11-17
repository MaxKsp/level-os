# Checklist de producao

## Verificacao automatizada

Execute antes de cada release:

```bash
cd frontend && npm ci && npm run validate
cd .. && php tests/run.php
php scripts/critical-smoke.php
php scripts/production-readiness.php --built
```

O workflow de testes executa os mesmos gates. O deploy faz dois ciclos de
upload FTPS quando necessario, guarda o artefato por 30 dias e consulta
`/api/health.php`. Para rollback, execute manualmente o workflow de deploy e
informe no campo `ref` o commit ou tag anterior.

## Quality gate

- branch protegida e PR revisado
- workflow `Testes automatizados` aprovado
- frontend: tipos, testes e build aprovados
- backend: `php -l`, testes PHP e testes JavaScript legados aprovados
- `npm audit` sem vulnerabilidade de producao

## Servidor

- PHP 8.2+ com `pdo_mysql`, `mbstring`, `json`, `curl`, `gd` e `sodium`
- HTTPS ativo e `APP_URL` apontando para a origem canonica
- `display_errors=Off` e `expose_php=Off`
- `uploads/avatars` gravavel e sem execucao de PHP
- remover manualmente de `public_html` copias antigas de `tests`, `docs`,
  `automation`, `migrations`, `scripts`, `tmp` e `config`

## Banco

- backup validado antes da janela de deploy
- migrations ensaiadas em copia do banco e aplicadas em ordem
- `schema.sql` e contrato de schema conferidos
- plano de rollback registrado antes de migrations destrutivas
- aplicar `2026-08-09-assistant-quality.sql`, `2026-08-22-web-vitals.sql` e
  `2026-08-22-marketing-events.sql` com o comando CLI allowlisted:
  `php scripts/apply-migration.php NOME_DO_ARQUIVO`

## Integracoes

- Mercado Pago: credenciais, planos, webhook e teste Pix/cartao
- Google OAuth/Calendar: redirect URI e chave de tokens
- Supabase Auth: migration aplicada, Site URL/redirects, Google, Resend e flag habilitados
- confirmar vinculacao de uma conta legada e criacao de uma conta nova no Supabase
- Agente de IA: chave de dados e pelo menos um provedor
- Resend: dominio verificado, variaveis de ambiente e recuperacao de senha testados
- cron habilitado somente quando o backup por e-mail estiver cifrado
- timeout de inatividade configurado em `LEVELOS_SESSION_IDLE_SECONDS`
  (padrao seguro: 43.200 segundos)

## Smoke test

- cadastro, login, logout, MFA e recuperacao de senha via Supabase
- ponte Supabase -> sessao PHP, refresh da sessao e fallback de vinculacao legado
- CRUD de rotina, financeiro e treino
- OFX, parcelamentos, IR e exportacao/restauracao
- trial, paywall, checkout e confirmacao por webhook
- avatar, calendario, Agente de IA e desfazer
- claro/escuro, mobile e PWA

## Evidencias automatizadas

- `tests/cases/backup_recovery_test.php`: backup real, restauracao em banco
  isolado, arquivo adulterado, chave incorreta e rollback transacional
- contratos de login, 2FA, Google/Supabase, financeiro e agentes em
  `tests/cases/*_test.php`
- orçamento de bundle em `frontend/scripts/check-bundle-budget.mjs`
- LCP, INP e CLS agregados sem dados pessoais em `web_vitals_daily`
