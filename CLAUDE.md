# Level OS

## Contexto do projeto

Level OS e uma plataforma self-hosted de rotina e financas pessoais.
O backend usa PHP 8 e MySQL. O frontend canonico usa React 19, TypeScript,
Vite e Tailwind CSS v4 dentro de `frontend/`.

Prioridade do produto: manter uma experiencia simples, rapida e confiavel para
agenda, financeiro, treino, autenticacao, backup e notificacoes.

## Stack real

- Back-end: PHP 8 com PDO e prepared statements.
- Banco: MySQL, schema base em `schema.sql` e alteracoes em `migrations/`.
- Front-end canonico: React 19 + TypeScript + Vite + Tailwind v4 em `frontend/`.
- Front-end legado: view isolada em `app/Shared/Dashboard/LegacyDashboardView.php`
  + `assets/app.*`, mantida temporariamente para compatibilidade e testes.
- PWA: `manifest.json` e `sw.js`.
- Auth: sessao PHP, bcrypt, CSRF, rate limit, TOTP e login com Google.
- Deploy: GitHub Actions via FTPS para Hostinger.
- Build: npm em `frontend/`; `frontend/dist/` e gerado e nunca e fonte.

## Arquivos importantes

- `frontend/src/main.tsx`: entrada unica do frontend React.
- `frontend/src/App.tsx`: providers e rotas do aplicativo.
- `frontend/src/modules/`: telas e estado por dominio.
- `frontend/public/`: assets estaticos fonte do React.
- `frontend/dist/`: artefato gerado; nao editar nem versionar.
- `frontend/scripts/build-php-shell.mjs`: gera o shell PHP autenticado do deploy.
- `index.php`: front controller pequeno; autentica e delega a renderizacao.
- `app/Shared/DashboardView.php`: adaptador da view legada local.
- `app/Shared/Dashboard/LegacyDashboardView.php` e `assets/app.*`: legado de
  migracao; nao adicionar UI nova aqui.
- `assets/auth.css`: estilos de login/cadastro.
- `auth.php`: login, sessao, CSRF, rate limit e helpers de seguranca.
- `db.php`: conexao PDO.
- `finance.php`: regras e persistencia do financeiro relacional.
- `plan.php`: planos, assinaturas e gates de recursos pagos.
- `api/*.php`: endpoints JSON autenticados.
- `schema.sql`: estrutura inicial do banco.
- `migrations/*.sql`: mudancas incrementais de banco.
- `README.md`: setup, deploy e descricao do produto.
- `ROADMAP.md`: prioridades e backlog.
- `config.php`: credenciais locais, nunca versionar nem expor.
- `config.example.php`: modelo seguro para configuracao.

## Como rodar localmente

Preview visual do frontend:

```bash
cd frontend
npm ci
npm run dev
```

Validacao do frontend:

```bash
cd frontend
npm run validate
```

O ambiente integrado com sessao continua exigindo PHP/MySQL. O build de deploy
gera `frontend/dist/index.php`, que requer `auth.php` e injeta o CSRF.

```text
http://localhost:8080
```

## Regras de trabalho para Claude

- Antes de editar, ler os arquivos relacionados e entender o fluxo existente.
- Fazer mudancas pequenas, coesas e faceis de revisar.
- Preservar compatibilidade com hospedagem compartilhada.
- Nao criar outro app (`web/`, outro `src/`, Next.js ou outro lockfile).
- Toda UI nova deve entrar no frontend React canonico em `frontend/`.
- Nao remover funcionalidades existentes sem explicar impacto.
- Nao alterar `config.php` com valores reais.
- Nao expor tokens, senhas, secrets, e-mails sensiveis ou dados financeiros.
- Preferir PHP simples, JS vanilla e SQL claro.
- Manter o estilo visual existente e a experiencia PWA.
- Ao tocar financeiro, auth, assinatura ou backup, tratar como area critica.

## Seguranca

Este projeto lida com dados financeiros e autenticacao. Sempre verificar:

- Todo POST sensivel deve exigir CSRF quando aplicavel.
- Endpoints autenticados devem usar `require_login()`.
- Endpoints com abuso possivel devem usar rate limit.
- SQL deve usar prepared statements.
- Dados do usuario devem ser isolados por `user_id`.
- Respostas JSON nao devem vazar detalhes internos.
- Upload/importacao devem validar tamanho, tipo e conteudo.
- Nunca confiar em dados vindos do cliente para plano, usuario ou permissoes.
- Recursos pagos devem ser validados server-side com `require_plan()`.

## Banco de dados

- Mudancas estruturais devem ir em novo arquivo em `migrations/`.
- Atualizar `schema.sql` quando a mudanca tambem fizer parte da instalacao nova.
- Preservar dados existentes em migrations.
- Evitar mudancas destrutivas sem plano de migracao.
- Manter queries filtradas pelo usuario autenticado.

## Front-end

- Manter React/TypeScript/Vite/Tailwind dentro de `frontend/`.
- Nao editar `frontend/dist/`; sempre reconstruir com npm.
- Nao criar telas novas no `index.php` ou nas views PHP; o frontend canonico
  fica em `frontend/src/`.
- Remover residuos legados somente depois de comprovar equivalencia no React.
- Evitar dependencias novas sem necessidade real.
- Preservar responsividade mobile e desktop.
- Validar estados vazios, loading, erro e sucesso.
- Nao duplicar regras financeiras importantes apenas no cliente quando elas
  tambem precisam proteger dados no servidor.
- Ao alterar UI financeira, conferir contas, cartoes, faturas, transferencias,
  cofrinhos, rendas, despesas e importacao OFX.

## API

- Endpoints devem retornar JSON com `Content-Type: application/json`.
- Usar codigos HTTP coerentes: 400, 401, 402, 403, 405, 413, 429, 500.
- Validar payload antes de gravar.
- Limitar tamanho de payload quando houver risco de abuso.
- Manter contratos existentes para nao quebrar os stores e adapters React.

## Validacao antes de finalizar

Quando possivel, executar:

```bash
php -l arquivo.php
```

Para varios arquivos PHP no PowerShell:

```powershell
Get-ChildItem -Recurse -Filter *.php | ForEach-Object { php -l $_.FullName }
```

Se `php` nao estiver no PATH:

```powershell
Get-ChildItem -Recurse -Filter *.php | ForEach-Object { C:/Users/Max/tools/php/php.exe -l $_.FullName }
```

Tambem validar manualmente no navegador:

- Cadastro, login e logout.
- Fluxo de 2FA quando alterado.
- Dashboard principal.
- Criar/editar/excluir despesa, renda, conta e cartao.
- Backup/exportacao/importacao quando alterado.
- Responsividade mobile.

## Deploy

Deploy automatico ocorre por GitHub Actions em push para `master`, via FTPS.
Nao depender de comandos de build no servidor.

Antes de mexer em deploy:

- Conferir `.github/workflows/deploy.yml`.
- Nao versionar secrets.
- Nao sobrescrever `config.php` de producao.
- Lembrar que arquivos na raiz podem ir para `public_html` se nao forem
  excluidos no workflow.

## Commits e branches

- Workflow permanente: ver `docs/development/`.
- Branches curtas por assunto: `feature/`, `fix/`, `refactor/`, `docs/`
  e `review/`.
- Commits: `feat:`, `fix:`, `refactor:`, `test:`, `sec:`, `chore:`, `docs:`.
- Priorizar itens de `ROADMAP.md`.

## Resposta final esperada

Ao terminar uma tarefa, responder com:

- O que mudou.
- Arquivos alterados.
- Como validar.
- Riscos ou pontos de atencao, se houver.
