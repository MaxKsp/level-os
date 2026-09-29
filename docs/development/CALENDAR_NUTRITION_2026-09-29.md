# Level OS — Calendário unificado e Alimentação / Prioridades

Data: 29/09/2026 | Base: master 5a7d1b4 (PRs #44 e #45 integrados).
Destino: Hostinger — https://lvlos.com.

## Problema identificado nos seletores de data

O PR #44 padronizou a moldura de `LevelDateInput`, mas ainda usava `input type="date"` visível,
com `showPicker()`: o popup era renderizado pelo sistema operacional/navegador,
sem obedecer ao design system do Level OS.

## Correção estrutural

- `LevelDateInput` abre um diálogo Radix customizado; nunca invoca o picker nativo.
- Apresentação do Level OS: superfícies dark, bordas, cor primary, tipografia, foco e botões coerentes.
- Datas: dias, navegação por mês, digitação direta do ano, ano anterior/futuro, destaque do dia atual, data selecionada,
  limites `min`/`max`, botão Hoje e Limpar quando permitido.
- Horário: seleção 24h de hora e minuto, validação e confirmação; aplica-se também a `datetime-local`.
- Atributos `value`, `name`, `required`, `disabled`, `min`, `max`, `ref` e callbacks existentes preservados.
- Quando o preenchimento obrigatório está vazio, o calendário abre em vez de deixar um campo invisível sem orientação.
- Diálogo acima de formulários/modais atuais, com foco e saída por Escape gerenciados pelo Radix.
- Alterar o componente compartilhado corrige as telas que já utilizam `LevelDateInput`: Financeiro, Rotina, Academia,
  Alimentação e Perfil, sem divergência entre telas.
## Alimentação — aba Prioridades

Nova central operacional construída a partir de registros do workspace da própria conta.
- Estoque: separa vencidos e itens com vencimento até três dias; não conta quantidade zero como disponível.
- Lista do plano: contagem de itens marcados no carrinho versus ainda pendentes, sem presumir pagamento.
- Cruzamento cauteloso de nomes de ingredientes da lista com itens não vencidos da despensa;
  a quantidade suficiente continua sujeita a conferência manual.
- Compras registradas: total dos últimos sete dias, com decomposição por categoria e intervalo visível.
- Orçamento e custo do plano completo só são exibidos com rótulo próprio; não são comparados
  automaticamente a compras de intervalo diferente.
- Receitas próprias cuja estimativa de preparo cabe nas preferências da conta.
- Acesso contextual à Nutricionista Rita depende de consentimento salvo `shareWithRita`;
  sem permissão, o CTA leva à aba de preferências.
- Botões conduzem diretamente às abas da despensa, compras e receitas.
- Dados pessoais não são enviados a terceiros pela nova central; tudo deriva do workspace autenticado já existente.

## Entregas futuras sugeridas (fora deste incremento)

1. Preparação semanal de marmitas com porções efetivas, rendimento por receita e cronograma editável.
2. Reserva/redução de estoque ligada às receitas, mas somente mediante confirmação explícita da quantidade real.
3. Comparação de orçamento versus compra comprovada dentro do mesmo período escolhido.
4. Exportação dos registros alimentares, histórico de consumo e lista de compras filtrável.
5. Catálogo de receitas por ingredientes disponíveis e preferências, sempre com revisão humana das sugestões da IA.

## Verificações de release

Sem migração SQL, mudanças em pagamentos, credenciais ou alterações no backend.
Executar typecheck, testes unitários e integração de calendário aninhado, build/budgets,
smoke browser desktop/mobile e checagem de release SHA/health após o merge protegido.
