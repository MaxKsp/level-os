# Level OS — Evolução integrada Web/PWA
Data-base: 2026-09-28 | Destino oficial: Hostinger / lvlos.com
Base inicial: master `f0b0c8d`. Este documento é plano incremental, não atestado de homologação de módulos autenticados.

## Linguagem visual
- Manter o design system do Level OS: Geist, superfícies dark, aqua, hierarquia editorial, tokens, estados de foco e contraste.
- Aproveitar componentes adaptados do 21st.dev apenas por trás de componentes locais versionados, com acessibilidade e sem dependência externa em runtime.
- Toda tela: layout 320–1920 px, teclado, toque, loading, vazio, erro, retry, sucesso e movimento reduzido.
- Nenhum número demonstrativo pode passar por dado real. Não duplicar cards ou métricas só para ocupar espaço.

## Entrega 1 — Este PR, sem nova migration
- Landing: manter a jornada orbital contínua controlada pelo scroll em desktop E mobile. Reenquadramento responsivo por viewport sem apagar nós/animação.
- Navegação: testar mobile 360/390/430 px em Chromium, cinco estações, palco sticky, JS sem erros, viewport sem corte.
- Academia: centro de performance extraído das sessões reais (semana, duração, volume, dias ativos, meta se houver programa).
- Academia: iniciar ficha inteira e registrar todos os exercícios na mesma sessão, com carga/reps/séries/descanso, seleção, validação e confirmação de persistência.
- Academia: fichas passam a definir também carga e descanso alvo. Sessões mostram exercícios completos com busca e filtros.
- Segurança: manter API, sessão, storage e schema existentes, sem alterações em DB e sem incluir app mobile nativo.

## Entrega 2 — Academia operacional
- Sessão ativa com histórico por série, cronômetro de descanso, substituição de movimento, supersets e supersets relacionados.
- Carga/reps previstos vs. realizados, progressão segura e recordes por exercício calculados a partir do histórico, sem inventar indicadores.
- Biblioteca de exercícios com modalidades/equipamentos/instruções e mídias com origem/licença verificadas; filtros por grupo muscular.
- Calendário e microciclos semanais, reprogramar sem descartar histórico, gráfico por período, série e exercício.
- Corrigir TRN-01: ID de comando estável/idempotência para timeout/retry; TRN-02: exclusão e revogação de XP na mesma transação.
- Testes MySQL, concorrência, sessão repetida, timezone e atualização em outra aba; homologar com conta de teste antes da Hostinger.

## Entrega 3 — Completar os demais módulos por domínio
| Domínio | Evolução funcional | Condição de release |
| --- | --- | --- |
| Visão geral | Dashboard customizável; próximos passos consolidados, drill-down sem métricas duplicadas | Fontes verificadas, loading/empty e filtros persistentes |
| Financeiro | Reconciliar ledger/transferências, ciclos de fatura, OFX com FITID persistido, orçamento/alertas e comparativo visual | Centavos exatos, atomicidade, dedupe e testes de estorno |
| Rotina / Calendário | Drag-and-drop acessível, recorrências, agendas, lembretes, sincronização e conflitos entre abas | Revisões/ETag e timezone canônica antes de multi-dispositivo |
| Alimentação | Cardápios, custos, compras, histórico e restrições declaradas pelo usuário | Verificação de alergias, revisão humana, sem prescrição clínica |
| Progresso | Linha do tempo cruzando ações verificadas, conquistas, metas e evolução comparável | XP concedido apenas após commit real, revoke consistente |
| IA / Agentes | Personalização do Personal Léo e demais agentes, ações estruturadas e prévia antes de gravar | Escopo isolado por módulo, confirmação e proteção de dados |
| Assinaturas / Perfil | Jornada de trial, estados de pagamento/refund, configuração e exportação/backup | Webhook idempotente, smoke autenticado e restore ensaiado |
| PWA | Instalação, atualização controlada e excelente responsividade | Browser smoke, Lighthouse e aparelho real iOS/Android |

## Gates mínimos antes de cada publicação
1. PR pequena por domínio, sem desenvolver diretamente no worktree de produção.
2. Testar `npm ci && npm run validate`, `php tests/run.php`, quality gates GH e Playwright responsivo.
3. Mudança de banco: migração compatível, backup cifrado + restore isolado, MySQL real no staging e rollback documentado.
4. Homologar login/2FA, CRUD de Academia, Financeiro, IA e pagamento com conta de teste sem dados pessoais reais.
5. Publicar exclusivamente via GitHub Actions para Hostinger após revisão, confirmar `release.json` SHA, health e smoke pós-deploy.
6. App mobile **nativo** segue iniciativa separada; esta estratégia é Web/PWA.

Referência de dívida técnica a revalidar: `docs/audit/11-achados-priorizados.md` (auditoria de 2026-08-26, alguns pontos já evoluíram).
