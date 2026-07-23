# Frontend Level OS

Frontend modular em React 19, TypeScript, Vite e Tailwind CSS v4. O backend PHP e as APIs ficam na mesma origem.

## Desenvolvimento

```bash
npm ci
npm run dev
```

O Preview do Vite usa mocks e `localStorage`, porque não possui sessão PHP. No
build autenticado, o módulo Financeiro detecta `window.CSRF_TOKEN`, carrega o
bootstrap real em `GET /api/data.php?all=1` e persiste os quatro conjuntos
relacionais por `POST /api/finance.php`. O OFX também usa o preview protegido
de `/api/import-ofx.php`; o parser local existe somente para desenvolvimento.

## Validação

```bash
npm run validate
```

Esse comando executa TypeScript, Vitest e o build de produção.

## Integração PHP e CSRF

O build executa `scripts/build-php-shell.mjs`, converte o HTML do Vite em `dist/index.php` e injeta:

- `require_login_page()` para proteger o aplicativo;
- `window.CSRF_TOKEN`, gerado por `csrf_token()`;
- os assets versionados do Vite.

As demais mutations React devem reutilizar esse token e a sessão da mesma
origem. Recursos auxiliares ainda não portados para as telas React permanecem
no frontend legado durante a migração.

## Rotas

- `/` — Visão Geral
- `/agenda`
- `/financeiro`
- `/treinos`
- `/perfil`

O `BrowserRouter` usa caminhos limpos. Em produção, o `.htaccess` envia somente essas rotas inexistentes para `index.php`; arquivos, páginas PHP e APIs reais não são interceptados.

## Deploy

O workflow da Hostinger executa `npm ci`, testes e build. Primeiro publica o backend PHP e depois publica `frontend/dist/`, substituindo o `index.php` legado pelo shell React autenticado. Não envie `frontend/src` para a hospedagem.
