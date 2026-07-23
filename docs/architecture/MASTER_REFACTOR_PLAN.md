# Master Refactor Plan

## Objetivo

Modernizar a arquitetura do Level OS de forma incremental, preservando 100% da
compatibilidade com a aplicacao atual durante a migracao.

Esta modernizacao e estrutural. Ela nao autoriza mudancas funcionais por si
so.

## Estado atual

A aplicacao roda hoje com:

- PHP 8 procedural
- MySQL
- endpoints publicos em `api/*.php`
- shell principal em `index.php`
- autenticacao/sessao em `auth.php`
- regras financeiras centrais em `finance.php`
- deploy por GitHub Actions + FTPS para Hostinger

## Estrutura alvo aprovada

```text
app/
|-- Core/
|-- Shared/
`-- Modules/
```

Estrutura esperada no medio prazo:

```text
app/
|-- Core/
|   |-- Application.php
|   |-- Config.php
|   |-- ModuleLoader.php
|   `-- FeatureFlags/
|-- Shared/
|   |-- Database/
|   |-- Http/
|   |-- Security/
|   |-- Validation/
|   |-- Contracts/
|   |-- DTO/
|   |-- Exceptions/
|   `-- Support/
`-- Modules/
    |-- Finance/
    |-- Subscription/
    |-- Auth/
    |-- Agenda/
    |-- Workout/
    `-- Profile/
```

## Principios

1. Compatibilidade publica total durante a migracao.
2. Nenhum framework sera introduzido como pre-requisito da arquitetura nova.
3. Nenhum build step obrigatorio sera adicionado ao deploy da Hostinger.
4. Arquivo legado pode delegar, mas nao pode receber regra nova.
5. Todo codigo novo da migracao nasce em `app/`.
6. `Core` e `Shared` comecam magros e so crescem sob demanda real.

## Estrategia

1. Documentar contratos publicos e fronteiras do legado.
2. Criar estrutura `app/` sem mover regra.
3. Criar adapters finos quando a extracao comecar.
4. Migrar modulos por dominio, com `Finance` como piloto.
5. Eliminar adapters antigos apenas na fase final.

## Criterios de sucesso

- `index.php`, `api/*.php`, cookies, sessoes, cron e JSONs publicos seguem
  compativeis durante a migracao.
- O legado perde responsabilidade progressivamente sem deixar de operar.
- Novas regras passam a nascer nos modulos novos, nao nos arquivos antigos.
- Cada fase deixa documentado o que mudou e o que permanece legado.
