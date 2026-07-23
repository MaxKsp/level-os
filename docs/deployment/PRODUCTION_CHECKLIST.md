# Checklist de producao

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

## Integracoes

- Mercado Pago: credenciais, planos, webhook e teste Pix/cartao
- Google OAuth/Calendar: redirect URI e chave de tokens
- Supabase Auth: migration aplicada, Site URL/redirects, Google, Resend e flag habilitados
- confirmar vinculacao de uma conta legada e criacao de uma conta nova no Supabase
- Agente de IA: chave de dados e pelo menos um provedor
- Resend: dominio verificado, variaveis de ambiente e recuperacao de senha testados
- cron habilitado somente quando o backup por e-mail estiver cifrado

## Smoke test

- cadastro, login, logout, MFA e recuperacao de senha via Supabase
- ponte Supabase -> sessao PHP, refresh da sessao e fallback de vinculacao legado
- CRUD de rotina, financeiro e treino
- OFX, parcelamentos, IR e exportacao/restauracao
- trial, paywall, checkout e confirmacao por webhook
- avatar, calendario, Agente de IA e desfazer
- claro/escuro, mobile e PWA
