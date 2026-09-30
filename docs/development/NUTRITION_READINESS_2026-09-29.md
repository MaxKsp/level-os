# Level OS — Alimentação: diagnóstico por módulo (29/09/2026)

Base: `origin/master` `dc76982`; branch `fix/platform-date-picker-20260929`. Revisão de código e testes, sem acesso a dados pessoais em produção.

## Cobertura implementada

- Cardápio manual e por IA, com edição/versionamento e revisão pela Rita antes da aplicação.
- Metas/orçamento, cálculo do custo estimado por dia, lista de compras e comparação de estimativas.
- Diário alimentar declarativo, check-ins de refeições do plano, resumo semanal e prioridade contextual.
- Despensa com quantidades, unidades, vencimento e comparação aproximada por nome com itens planejados.
- Receitas reaproveitáveis, preparo de marmitas, multiplicador de porções familiares.
- Compras concluídas declaradas, histórico de gastos, exportação orientada para iFood e comparação Liv Up.
- Consulta de EAN/GTIN com informações colaborativas do Open Food Facts; leitura por foto somente onde suportada.
- Preferências alimentares voluntárias e permissão explícita para a Rita consultar o contexto.
- Sincronização por conta, revisão otimista e resposta 409 para atualização concorrente no workspace.

**Decisão de produto:** cobre planejamento e organização pessoal, mas ainda não é um diário nutricional quantitativo completo nem um gestor automatizado de estoque/compras.

## Correção de experiência deste PR

O `LevelDateInput` usava `input type=date/time/datetime-local` nativo oculto; alguns consumidores o envolviam em um `label`, capaz de ativar o controle do navegador. Agora o armazenamento do valor usa `input type=hidden`, mantendo um único calendário/horário próprio, acessível por botão, em pt-BR. Como input hidden não participa de constraint validation, o componente intercepta submits com campo obrigatório vazio e abre o modal de escolha. Os consumidores deixam de aninhar botões em labels. Registros da Alimentação apresentam as datas em DD/MM/AAAA, preservando YYYY-MM-DD na API.

## Próximas entregas dentro de Alimentação

| Ordem | Frente | Limitação atual e critério de aceite |
|---|---|---|
| 1 | Registros editáveis | Diário, compras, despensa e receitas priorizam inclusão/exclusão; oferecer edição, confirmação de descarte e estados de erro claros. |
| 2 | Integração lista ↔ despensa | Correspondência atual usa semelhança de nomes, não saldo real; implementar quantidades convertíveis, unidade, baixa voluntária por receita e aviso de insuficiência. |
| 3 | Compras ↔ orçamento | Gastos declarados têm datas e categoria, mas não são vinculados item a item à lista, estoque ou conta financeira; conciliar apenas compras confirmadas. |
| 4 | Diário com porções e origem | Campo livre não permite obter macro/caloria confiável; registrar alimento, unidade/gramas e fonte identificada quando houver, sem inventar informação clínica. |
| 5 | Aderência temporal | Check-ins são slots da sequência do cardápio, não refeições comprovadas em um calendário; relacionar uma data real ao planejamento e manter distinção entre planejado/realizado. |
| 6 | Relatório de evolução | Criar tendências semanais/mensais de adesão, orçamento e desperdício, a partir de dados realmente registrados, com filtros de período. |
| 7 | Acessibilidade e confiabilidade | Exercitar os fluxos no navegador real, teclado, leitor de tela, 320–430 px, rede instável, offline e duas abas/dispositivos. |

### Provas locais deste lote

- `npm run validate`: TypeScript, 69 arquivos / 233 testes, build e bundle budget aprovados.
- Novos testes verificam inexistência de input date/time nativo, preservação de valor e interceptação de data obrigatória vazia.
- Sem mudanças em schema ou API, sem migração nem alteração de produção neste commit.
