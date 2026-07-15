# Migration Phases

## Fase 1 - Preparacao documental e estrutural

Entrega desta fase:

- criar `app/`, `app/Core/`, `app/Shared/` e `app/Modules/`
- criar a documentacao de arquitetura em `docs/architecture/`
- congelar principios, contratos e fronteiras

Nao faz:

- nao migra modulos
- nao move regra de negocio
- nao altera rotas, JSON, cookies, sessao ou deploy

Definicao de pronto:

- estrutura base presente no repositorio
- documentos canonicos de migracao criados
- regras de compatibilidade formalizadas

## Fase 2 - Bootstrap e adapters minimos

Objetivo:

- preparar a entrada da arquitetura nova sem mover dominio ainda

Escopo esperado:

- bootstrap interno minimo em `app/Core/`
- primeiros adapters de delegacao, sem alterar comportamento

## Fase 3 - Migrar Finance

Objetivo:

- usar `Finance` como modulo piloto

Escopo esperado:

- extrair regras e persistencia do financeiro para `app/Modules/Finance/`
- manter `finance.php` e `api/finance.php` como fachadas compativeis

## Fase 4 - Migrar Subscription

Objetivo:

- isolar plano, gates e fluxo de assinatura

## Fase 5 - Migrar Auth

Objetivo:

- extrair autenticacao com cautela extra por ser area critica

## Fase 6 - Migrar Agenda

Objetivo:

- mover a logica de dominio da agenda para modulo proprio

## Fase 7 - Migrar Workout

Objetivo:

- mover a logica de treinos para modulo proprio

## Fase 8 - Migrar Profile

Objetivo:

- mover preferencias, avatar e demais fluxos de perfil

## Fase 9 - Modularizar app.js

Objetivo:

- quebrar a organizacao do front sem alterar comportamento nem contrato

## Fase 10 - Modularizar index.php

Objetivo:

- reduzir acoplamento da shell principal preservando a renderizacao atual

## Fase 11 - Remover adapters legados

Objetivo:

- eliminar as fachadas temporarias apenas quando a arquitetura nova cobrir
  integralmente o comportamento antigo
