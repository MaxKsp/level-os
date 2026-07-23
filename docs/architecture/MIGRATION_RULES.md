# Migration Rules

## Regras inviolaveis

1. Nunca quebrar API publica existente.
2. Nunca alterar o shape de JSON publico durante a migracao.
3. Nunca alterar rotas publicas durante a migracao.
4. Nunca alterar cookies, sessao ou fluxo de autenticacao sem fase dedicada.
5. Nunca alterar o deploy atual da Hostinger como efeito colateral.
6. Nenhum codigo novo da modernizacao entra nos arquivos legados.
7. Arquivo legado pode delegar, mas nao pode ganhar regra nova.
8. Toda extracao deve preservar compatibilidade publica.
9. Toda extracao deve registrar validacao manual ou documentada de
   compatibilidade.
10. `Core` e `Shared` so recebem implementacao quando houver necessidade real.

## Regras para codigo novo

- Todo codigo novo da migracao nasce em `app/`.
- Todo modulo novo nasce em `app/Modules/`.
- Utilitarios sem dono de dominio vao para `app/Shared/`.
- Orquestracao minima vai para `app/Core/`.

## Regras para migracao incremental

- Primeiro extrair, depois delegar, por ultimo remover legado.
- Uma fase nao abre outra implicitamente.
- Area critica exige escopo menor e validacao reforcada.
- Compatibilidade vale mais do que elegancia arquitetural durante a transicao.
