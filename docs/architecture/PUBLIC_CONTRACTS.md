# Public Contracts

## Objetivo

Registrar o que nao pode quebrar durante a modernizacao arquitetural.

## Entradas publicas

- paginas PHP da raiz
- endpoints `api/*.php`
- cron `cron-notify.php`
- assets servidos para o navegador

## Contratos que devem permanecer estaveis

### Rotas e caminhos

- `index.php` continua sendo a shell principal
- `api/*.php` continuam existindo nos mesmos caminhos
- fluxos de login, logout, 2FA e Google OAuth mantem os caminhos atuais

### JSON e bootstrap

- respostas atuais de `api/data.php`
- respostas atuais de `api/finance.php`
- contratos consumidos por `assets/app.js`
- codigos HTTP esperados pelos fluxos atuais

### Sessao e seguranca

- cookie de sessao
- fluxo de `require_login()`
- CSRF
- rate limit
- gate `require_plan()`

### Persistencia

- schema atual
- colunas atuais
- chaves atuais de `kv_store`
- shape dos arrays esperados pelo front

### Operacao e deploy

- deploy por GitHub Actions + FTPS
- hospedagem compartilhada Hostinger
- ausencia de build step obrigatorio no servidor

## Regra de validacao

Toda fase de migracao deve declarar explicitamente:

- quais contratos publicos foram tocados internamente
- por que continuam compativeis
- como essa compatibilidade foi validada
