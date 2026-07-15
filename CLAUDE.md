# Orby / Painel Max

## Contexto do projeto

Orby / Painel Max e uma plataforma self-hosted de rotina e financas pessoais.
O projeto foi feito para hospedagem compartilhada comum, com PHP 8, MySQL,
JavaScript vanilla e PWA. Nao ha framework, bundler ou etapa de build.

Prioridade do produto: manter uma experiencia simples, rapida e confiavel para
agenda, financeiro, treino, autenticacao, backup e notificacoes.

## Stack real

- Back-end: PHP 8 com PDO e prepared statements.
- Banco: MySQL, schema base em `schema.sql` e alteracoes em `migrations/`.
- Front-end: HTML/CSS/JavaScript vanilla, com assets em `assets/`.
- PWA: `manifest.json` e `sw.js`.
- Auth: sessao PHP, bcrypt, CSRF, rate limit, TOTP e login com Google.
- Deploy: GitHub Actions via FTPS para Hostinger.
- Sem npm obrigatorio, sem React, sem Next, sem build step.

## Arquivos importantes

- `index.php`: app principal autenticado.
- `assets/app.js`: logica principal do front-end.
- `assets/app.css`: estilos principais.
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

Requisitos:

- PHP 8.x com `pdo_mysql`.
- MySQL acessivel.
- `config.php` criado a partir de `config.example.php`.
- Banco criado com `schema.sql` e migrations necessarias.

Comando padrao:

```bash
php -S localhost:8080
```

Se o PHP nao estiver no PATH no Windows, usar o caminho local configurado:

```powershell
C:/Users/Max/tools/php/php.exe -S localhost:8080
```

Abrir:

```text
http://localhost:8080
```

## Regras de trabalho para Claude

- Antes de editar, ler os arquivos relacionados e entender o fluxo existente.
- Fazer mudancas pequenas, coesas e faceis de revisar.
- Preservar compatibilidade com hospedagem compartilhada.
- Nao introduzir frameworks, bundlers, Composer ou npm sem pedido explicito.
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

- Manter JavaScript vanilla.
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
- Manter contratos existentes para nao quebrar `assets/app.js`.

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
