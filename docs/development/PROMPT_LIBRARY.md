# Prompt Library

## Purpose

These prompt templates reduce repeated context while keeping instructions
precise.

Use them as starting points. Replace bracketed fields only.

## 1. Architecture Review

```text
Revise a proposta em [arquivos ou docs].

Leia:
- [docs relevantes]

Objetivo:
- validar escopo, compatibilidade e rollback

Nao altere arquivos.

Retorne somente:
1. aprovacao ou reprovacao;
2. riscos;
3. pontos de atencao;
4. criterios de aceite.
```

## 2. Implementation Request

```text
Implemente [objetivo].

Leia primeiro:
- [arquivos]
- [docs/architecture relevantes]
- [docs/development relevantes]

Restricoes:
- [restricoes]

Ao finalizar:
- execute [testes]
- mostre git diff --stat
- informe arquivos alterados
- nao faca commit
```

## 3. Diff Review

```text
Revise somente o diff atual.

Leia:
- [docs relevantes]

Verifique:
- [itens de compatibilidade]

Nao altere arquivos.

Retorne somente:
1. aprovacao ou reprovacao;
2. problemas por severidade;
3. correcoes obrigatorias;
4. confirmacao dos arquivos alterados;
5. recomendacao de commit.
```

## 4. Characterization Phase

```text
Caracterize o comportamento atual de [dominio] antes de qualquer extracao.

Leia:
- [arquivos reais]
- [docs de arquitetura]

Restricoes:
- nao mover codigo
- nao alterar comportamento
- nao corrigir bugs

Entregas:
- fronteiras
- contratos publicos
- matriz de compatibilidade
- riscos
- suite minima de testes, se viavel sem alterar producao
```

## 5. Documentation Work

```text
Crie documentacao permanente para [tema].

Considere:
- [docs existentes]
- [codigo ou testes relevantes]

Objetivos:
- evitar duplicacao
- transformar decisoes atuais em regras permanentes
- referenciar docs canonicos quando possivel

Nao altere codigo de producao.

Ao final:
- mostre a arvore criada
- explique uso de cada documento
- execute git diff --stat
```

## 6. Use Context7

```text
Use obrigatoriamente o Context7 para consultar a documentacao atual de
[biblioteca/API/ferramenta].

Nao use pesquisa web.
Nao altere arquivos.

Informe:
- library id escolhido
- ferramentas chamadas
- resposta objetiva com base na documentacao
```

## 7. Use Serena

```text
Use obrigatoriamente a Serena.

1. Ative o projeto atual.
2. Localize o simbolo [nome].
3. Liste todas as referencias.

Nao use busca textual como fallback.
Nao altere arquivos.

Informe exatamente:
- ferramentas chamadas
- arquivos encontrados
```

## 8. Test Review

```text
Revise somente os testes novos de [area].

Verifique se cobrem:
- [itens]

Nao altere arquivos.
Retorne aprovacao ou problemas.
```

## Prompt Hygiene Rules

- Prefer file lists over long narrative.
- Prefer explicit constraints over broad warnings.
- Reuse `docs/architecture/` and `docs/development/` instead of re-explaining
  the project.
- Ask for exact output format when review consistency matters.
