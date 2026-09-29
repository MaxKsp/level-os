# Level OS — Incremento por modulo | 29/09/2026

Base: master 82bd09b (PR #43, Nutricionista Rita e workspace).
Branch: feature/module-experience-20260929.
Destino Web/PWA: Hostinger / lvlos.com. Sem alteracao de schema, credenciais, assinatura ou migracao de dados.

## Alimentacao — etapa incremental
- Check-in das refeicoes e estado do carrinho conectados as operacoes autenticadas `mark_meal` e `mark_cart` ja existentes.
- O backend passa a ser fonte do status em celulares e desktops autenticados, isolando cada usuario e plano.
- Durante carga remota, a interface nao aceita gravacoes locais ilusoriamente sincronizadas.
- Migracao legada do armazenamento local executada apenas uma vez por plano/usuario, sem sobrepor registros remotos.
- Painel "Sua semana alimentar" com contagens de registro voluntario, compras declaradas na mesma janela de 7 dias, validade proxima e check-in da sequencia ativa.
- Nao inferir ingestao nutricional, valor pago de extrato, necessidades clinicas nem comprovar consumo por check-in.

## Landing mobile
- Preserva o mapeamento cinematografico das cinco estacoes por scroll, a mesma historia do desktop.
- Impede cartao de captar o gesto de rolagem em telefones de altura usual; telefones baixos conservam a rolagem de conteudo.
- Ajusta o ultimo capitulo para evitar corte no fim da jornada e mantem suporte a movimento reduzido.
- Teste automatizado nas larguras 360, 390 e 430 px, viewport, cinco capitulos, palco sticky e ausencia de overflow horizontal.
## Academia
- "Proxima ficha sugerida" usa a ordem do programa ativo e o ultimo treino registrado; se nao ha programa, percorre as fichas criadas.
- Atalho de iniciar destaca a ficha selecionada, com explicacao transparente da sugestao.
- Nao calcula aptidao fisica, recuperacao ou necessidade de treino a partir da rotacao simples.
- Preserva o Modo Treino, exercicios/sessao, RPE/RIR (somente se schema habilitado), descanso, historico e recordes implementados nos PRs anteriores.

## Engenharia e qualidade
- Splitting de dependencias: react-router em vendor-router e React/DOM em vendor-react; nenhum teto de bundle foi aumentado.
- Verificar lint, testes unitarios frontend/backend, build, budgets, browser smoke desktop/mobile e scroll cinematografico.
- Qualquer deploy deve ser feito somente via PR revisada e GitHub Actions para Hostinger, com comparacao do release.json.
- Nenhum teste com conta autenticada real, compras reais, pagamentos ou recomendacao medica foi efetuado neste incremento.

## Proximas entregas por modulo, sem prometer implementacao neste PR
1. Alimentacao: planejamento de marmitas com consolidacao de ingredientes/porcoes; custo estimado versus comprovado; preferencia de avisos de validade; diarios e compras exportaveis.
2. Academia: calendario de microciclos e reprogramacao; registro de superset e substituicao, filtros por equipamento, mais series temporais, idempotencia/concorrencia na API.
3. Rotina/Calendario: conflitos de horario, recorrencias, lembretes e sincronizacao por revisao.
4. Financeiro: conciliacao robusta, comprovacao de transferencias e filtros comparativos.
5. Visao Geral e Progresso: painel configuravel e linha do tempo sem XP ou resultados ficticios.
6. Agentes: supervisao, escopo de dados por persona, consentimento e aprovacao antes de mutacao.
