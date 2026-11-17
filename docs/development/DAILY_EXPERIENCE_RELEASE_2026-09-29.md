# Level OS — Daily Experience | Web/PWA (29/09/2026)
Base: feature/mobile-orbit-training-studio-20260928, PR #38. Esta é uma entrega incremental **empilhada**, sem deploy automático.
Design: reaproveita `SectionCard`, tipografia, tokens dark/aqua, microinterações acessíveis e a linguagem visual existente/21st.dev.
Nenhuma alteração em `mobile/`, `frontend/android/` ou `frontend/ios/`.

## Entregue nesta etapa
- Academia: treino em andamento com cronômetro de sessão e descanso baseado em relógio real, marcação e adição/remoção por série, carga e repetições efetivas; RPE e RIR opcionais e validados. Envia sessão somente após finalizar.
- Academia: histórico série a série, cálculo de recordes máximos por exercício a partir das sessões, comparação com última ficha e maior carga anterior; biblioteca local de exercícios com categorias, pistas de execução, busca sem acentos e referências externas onde existem. Nenhuma mídia ou recorde inventado.
- Backend de academia: adiciona RPE/RIR na entrada de sessão e no snapshot, compatível com banco antigo para campos ausentes; se o usuário informar esforço antes de migrar, retorna erro explicativo. Exclusão de sessão e revogação de XP passam a ser uma transação atômica (regressão de rollback).
- Financeiro: painel de integridade cadastral/pendências, datas informadas de cartões até 14 dias, patrimônio calculado, mapa de despesas datadas em 28 dias e concentração por categoria; carregamento sob demanda para preservar o limite de bundle. Isso **não** equivale a conciliação de banco confirmada ou a quitação de fatura.
- Rotina: painel de foco por prioridade, possíveis sobreposições de horário, visualização semanal real considerando recorrências, exclusões e pausas, com navegação para ocorrências existentes.
- Alimentação: orçamento estimado em centavos, custo médio por dia, plano ativo de treino contextual, lista de compras com checks por plano/usuário apenas no dispositivo, cópia dos itens pendentes e opção de reiniciar.
- Progresso/IA: linha do tempo reconstruída dos últimos 14 dias por registro datado e desbloqueio com timestamp; metas de rotina, treino e orçamento; atalhos preparam rascunhos contextuais dentro do agente correto, sem autoenvio ou escrita sem confirmação.

## Migração aditiva necessária para RPE/RIR
Arquivo: `migrations/2026-09-29-training-effort-metrics.sql`.
Adiciona duas colunas nullable à tabela `training_session_entries`: `rpe DECIMAL(3,1)` e `rir SMALLINT UNSIGNED`.
NÃO executar em produção sem backup cifrado, ensaio de restore em MySQL isolado, validação das colunas existentes, staging com migração e smoke autenticado de treino/gravação/consulta/delete/XP.
Código novo tolera tabela antiga em leituras e operações sem RPE/RIR, mas persiste os novos campos somente depois da migração.
## Próximas entregas que exigem desenho de domínio/contratos
| Área | Pendente | Motivo da separação |
| --- | --- | --- |
| Treino | Protocolo de idempotência em concorrência/retry após timeout; persistência de sessão parcialmente em andamento, progressão sugerida por exercício, substituição/superset; imagens/vídeos com licença verificável | Banco, segurança e integridade de XP exigem testes MySQL reais |
| Financeiro | Conciliação OFX persistente com FITID e correspondência por conta, ledger imutável, ciclos reais de fatura/pagamento/estorno, patrimônio com categorias de ativo/passivo | Exige schema e evitar interpretar estimativa como pagamento |
| Rotina/Calendário | ETag/CAS por revisão entre dispositivos, lembretes no servidor com aba fechada, sincronização offline e resolução de conflitos | `tasks_v6` ainda é snapshot KV last-write-wins |
| Alimentação | Status de compra sincronizado no backend, custos realizados vs. orçados, validação adicional de alergias/restrições, plano manual com versionamento | Não transferir silenciosamente orçamento ou restrições entre agentes |
| Progresso/IA | Feed permanente, derivado de eventos auditáveis e atômicos, metas customizáveis persistidas, testes E2E da aprovação por agente | Timeline atual reflete apenas itens existentes e datados |

## Portas de qualidade para publicação
1. Integrar primeiro PR #38 e somente depois esta branch, revalidando o diff da PR empilhada contra a master atual.
2. Quality gate: `npm ci`, `npm run validate`, `php tests/run.php`, `php scripts/production-readiness.php`, `git diff --check` e smoke em browser autenticado/mobile.
3. Efetuar migração em cópia isolada do MySQL da produção e testar backup + restore **antes** de aplicar no ambiente real.
4. Revisão de privacidade, acessibilidade, feedback de erro/sucesso e tela 320/360/390/430/768/1280px.
5. Publicação somente pelo workflow GitHub Actions, com confirmação do SHA em `/release.json` e saúde de `/api/health.php`.
6. Não misturar esta entrega com app nativo, alteração de contas, pagamentos ou SQL destrutivo.

Estado no momento da preparação deste documento: alteração local de desenvolvimento/PR; **não foi publicada na Hostinger**.

## Evidência de testes locais
- `npm run validate`: **56 arquivos / 200 testes aprovados**, tipagem TypeScript, Vite build e orçamento dos bundles aprovados; `FinanceControlCenter` em chunk independente, preservando limite de `FinanceScreen` (105,3 KiB / 110 KiB).
- `php tests/run.php`: **51 aprovados / 0 falhas**, incluindo RPE/RIR, schema antigo sem campos e rollback transacional de sessão se revogação XP falhar.
- `php scripts/critical-smoke.php`: concluído com sucesso.
- `php scripts/production-readiness.php`: **40 aprovados / 0 falhas**.
- `npm ci`: auditoria local retornou 0 vulnerabilidades; sem alterações nos manifests de dependências.
- GitHub CI e banco MySQL restaurado em staging **a verificar nesta nova PR**; estes gates não são substituídos pelos testes SQLite.
