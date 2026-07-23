# App Architecture Staging

Esta pasta prepara a arquitetura alvo do Level OS sem alterar o comportamento
atual da aplicacao.

## Objetivo da Fase 1

- Criar a estrutura base `Core`, `Shared` e `Modules`.
- Definir fronteiras da migracao.
- Garantir que todo codigo novo da modernizacao nasca aqui.

## Regras

- Nenhuma regra de negocio e movida nesta fase.
- Nenhum arquivo legado deixa de funcionar como hoje.
- Nenhum contrato publico muda nesta fase.

## Estrutura alvo

```text
app/
|-- Core/
|-- Shared/
`-- Modules/
```

Os detalhes de migracao vivem em `../docs/architecture/`.
