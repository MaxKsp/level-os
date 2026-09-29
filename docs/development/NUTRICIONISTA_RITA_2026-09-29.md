# Level OS | Nutricionista Rita (assistente virtual) — 29/09/2026

## Mudanças implementadas
- Persona "Nutricionista Rita" em produto, marketing, avatar de folha e chamadas do módulo. É uma **assistente virtual**, não representa profissional de saúde licenciado.
- Contrato XML seguro v2.0.0 com domínio alimentar amplo: receitas, combinações, substituições, preparo, conservação, orçamento estimado, cardápio, marmitas e ingredientes; limita recomendações clínicas e cálculos sem dados.
- Conversas agora geram texto natural pelo provedor de IA em segunda etapa SEM ferramentas e SEM ação de escrita; classificação local reconhece perguntas, ideias e seguimentos, enquanto pedidos explícitos para montar/revisar plano seguem no pipeline de prévia, orçamento validado, versão e confirmação obrigatória.
- Contexto estrutural isolado por user_id: plano ativo, origem, versão, objetivo, período, orçamento, custo estimado, dias/refeições e lista de compras, mais resumo de até cinco versões antigas; consultas preparadas pelo módulo de Nutrição.
- Últimos até quatro turnos de conversa da própria Rita fornecem continuidade; nunca mistura históricos de Finanças, Rotina ou Treino.
- Sempre diferencia custos estimados de preço de mercado e compras efetivamente realizadas. Marcação de refeições e lista comprada é localStorage, portanto **não é acessível pelo backend/IA** nesta versão.
- Novos atalhos no chat: Criar cardápio, Ideias de refeições, Meu cardápio e Organizar compras. Perguntas não geram alterações de plano silenciosas.

## Proteções verificáveis
- Escopo local bloqueia instruções de evasão e pedido de dados bancários/registro de treino; permite discutir alimentação antes/depois de exercício sem ler dados de Academia.
- Resposta gerativa recebe somente contexto nutricional autenticado. Sem tool calls, pedidos automáticos externos ou checkout.
- Resposta e histórico são cifrados pelo repositório de Assistente existente; token usage contabilizado. Nunca enviar o conteúdo de outro user_id.
- Sem histórico ou plano cadastrado, assumir somente que os dados não estão disponíveis — não inferir alergia, restrição, diagnóstico, porções consumidas ou pagamento.
- Teste do provedor simulado cobre duas perguntas sucessivas, contexto do plano, isolamento entre usuários, contagem de tokens e nenhuma mutação inesperada. Não substitui teste E2E com a conta do próprio usuário e API Key da Hostinger.
- Backend e frontend não requerem nova migração SQL.

## Próximas features recomendadas para Alimentação
1. **Despensa sincronizada:** quantidades, validade, preferência de medida, alertas de desperdício; dados editáveis e versões.
2. **Diário real + compras confirmadas no MySQL:** separar planejado, consumido e comprado; permitir consulta fiel da Rita entre dispositivos.
3. **Receitas reutilizáveis:** preparo por porção, ingredientes e substituições, escala para família e consolidação com a lista de compras.
4. **Preferências com consentimento:** ingredientes preferidos, evitados, restrições declaradas e prioridades (custo/tempo), exportar/excluir facilmente; atenção especial a alergias.
5. **Modo marmitas e agenda de preparo:** blocos de cozinha, conservação, reaproveitamento e lista semanal.
6. **Catálogo nutricional:** consulta por código de barras com Open Food Facts (licença/atribuição e dados incompletos), com dados brasileiros complementares sob licença adequada.
7. **Custos estimados vs. comprovados:** importação opcional de nota/compra e vínculo ao Financeiro mediante consentimento, sem leitura automática de saldos.
8. **Relatório semanal inteligente:** variação de escolhas, aderência autorregistrada, orçamento e desperdício sem pontuação moralizante.
