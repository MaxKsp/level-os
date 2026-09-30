# Level OS — Alimentação: entrega de experiência, dados e continuidade
Atualização: 29/09/2026 · branch `fix/platform-date-picker-20260929`, PR #48 · base inicial `origin/master` `dc76982`.
Escopo: Web/PWA e API de alimentação. Os projetos nativos não foram modificados nem lançados neste lote.

## Jornada disponível
1. Criar ou revisar cardápio por conta própria ou com a Rita (aprovação obrigatória).
2. Conferir a lista por unidade e quantidade real registrada na despensa; cópia dos faltantes sugeridos, sem mascarar medidas incompatíveis.
3. Marcar o carrinho separadamente; não confundir item separado com compra paga/recebida.
4. Selecionar um item da lista e **confirmar manualmente** entrada na despensa com quantidade, unidade, categoria e validade opcional.
5. Registrar compra efetivamente concluída no histórico financeiro alimentar (sem sincronização bancária automática).
6. Registrar refeição realmente consumida no diário e, quando aplicável, dar baixa explícita da despensa.
7. Visualizar estatísticas de registros e despesas declaradas nos intervalos de 7 ou 30 dias; check-in do cardápio permanece status do ciclo, não prova de consumo.

## Melhoria de calendário e controles
- `LevelDateInput`: apenas modal próprio do Level OS; valor transmitido em input hidden, sem seletor nativo exibido.
- Respeita mínimo/máximo, horário, teclado, campos obrigatórios e funcionamento sobre outro modal.
- Não colocar botões da data dentro de `label`; consumidores ajustados em Alimentação, Financeiro, Academia e Rotina.
- Datas da rotina alimentar exibidas no padrão brasileiro, armazenadas na API como ISO YYYY-MM-DD.
- `ConfirmIconAction` aceita `disabled`; exclusões em Alimentação exigem confirmação personalizada, não `window.confirm`.
## Dados e regras implementadas
- `nutritionInventory.ts`: comparação por nome normalizado **exato**; não considera sal = salmão, nem arroz = arroz integral.
- Conversões permitidas apenas kg↔g, L↔ml e unidades/pacotes da mesma base. Sem equivalência arbitrária entre pacote, unidade e massa.
- Exclui saldos zero e itens vencidos; para medidas sem parse confiável exibe "Conferir unidade/quantidade".
- Estados: suficiente, parcial, ausente e revisão. Déficits quantificáveis exportados em unidade base; marcados no carrinho não entram na cópia.
- `NutritionInventoryBridge.tsx`: registrar item **recebido**, sem supor pagamento; salva nova linha por meio de `save_pantry`, revisão otimista.
- `NutritionWorkspacePanel.tsx`: editar diário, despensa, receitas e compras **sem trocar o ID**; cancelar alterações; baixa parcial com limite de saldo; confirmações nas exclusões; entrada do estoque separada do check-in.
- Favoritos e itens a evitar passam a ter rascunhos controlados para não perder vírgulas enquanto se digita e refletir reset pós-sincronização.
- `NutritionWeeklySnapshot.tsx`: alternância 7/30 dias, total declarado de compras, dias preenchidos e barras por registro datado. Não atribui caloria/proteína sem informação confiável.
- `api/nutrition-workspace.php`: mensagem validada de erro 422 para preenchimento incorreto; mantém autenticação, permissão, CSRF, rate limit e bloqueio de revisão conflitante 409.
- `NutritionWorkspaceService.php`: segue impondo limites de tamanho, quantidades não negativas, IDs únicos, isolamento por conta e formato de datas. Nenhuma nova tabela ou migration neste lote.

### Garantias e limites de interpretação
O usuário precisa confirmar quantidades reais. Entrada no carrinho, clique em loja, leitura de código de barras, check-in no cardápio e foto NÃO alteram estoque/compra/diário automaticamente. Dados do Open Food Facts são colaborativos e devem ser confrontados com a embalagem.
## Estado das melhorias do módulo
| Frente | Resultado nesta entrega | Pendência futura |
|---|---|---|
| Registros editáveis | Implementado em diário, despensa, receitas e compras | Paginação e eventual histórico de alterações |
| Lista × despensa | Cobertura numérica e cópia de faltantes implementadas; registro manual de entrada e baixa | Conversões avançadas por produto, movimentação auditável, conciliação por ingrediente/receita |
| Compras × orçamento | Histórico, categorias, períodos 7/30 dias e comparação declarativa | Associar cada produto ao recibo/preço real, sem confundir compra e pagamento |
| Diário quantitativo | Registro declarativo datado/porção/texto | Alimentação em gramas, macros com fonte documentada e validação humana |
| Aderência temporal | Dias do diário são reais; check-ins seguem slots do ciclo | Associar cada check-in a uma data, sem reescrever check-ins históricos |
| Relatório | 7 e 30 dias, tendência de registros e despesas reais declaradas | Custos por refeição, desperdício e filtros avançados |
| Qualidade release | Testes automatizados e build local | Verificação manual em aparelhos, banco de homologação, rede instável e restauração |

## Verificações de aceite manual
- Plano 1 kg de frango, despensa 500 g: indicar falta estimada de 500 g. Despensa 1 kg: suficiente. Pacote incompatível: conferir; estoque vencido: ausente.
- Produto "sal" não equivale a "salmão"; unidade ou descrição ambígua não deve produzir déficit fictício.
- Marcar carrinho: não altera despensa, gastos, nem consumo. Entrada recebida: exigir seleção, valor positivo e confirmação.
- Baixa de 0,5 kg em saldo 1,5 kg → 1 kg; baixa de 2 kg deve ser recusada sem mutação.
- Editar registro preserva seu ID; excluir pede confirmação. Erro 409 exige atualização, sem reaplicação silenciosa.
- Resumo 7/30 dias usa exclusivamente datas reais dos registros. Plano/check-in não viram automaticamente calorias consumidas.
- Verificar fluxo desktop/mobile 320/360/390/430 px, modal de data, foco/teclado, leitor de tela, conta isolada e desconexão temporária.
## Arquivos centrais e responsabilidade
- `frontend/src/modules/nutrition/NutritionScreen.tsx`: integração visual e lista de compras.
- `nutritionInventory.ts` e `nutritionInventory.test.ts`: regra pura compartilhável no futuro app.
- `NutritionInventoryBridge.tsx` e `NutritionInventoryBridge.test.tsx`: entrada confirmada e cobertura.
- `NutritionWorkspacePanel.tsx` e `NutritionWorkspacePanel.test.tsx`: CRUD e baixa manual.
- `NutritionActionCenter.tsx`, `NutritionWeeklySnapshot.tsx` e testes: ações e estatísticas fiéis aos dados.
- `frontend/src/components/ui/LevelDateInput.tsx` e `IconAction.tsx`: padrão visual/validação de seleção e exclusão.
- `api/nutrition-workspace.php` e `app/Modules/Nutrition/NutritionWorkspaceService.php`: persistência protegida.

## App com câmera — preparação, não implementação
Consultar `docs/mobile/CAMERA_ROADMAP_2026-09-29.md` para sequência de recursos de leitura GTIN/EAN, recibos, validade e fotos de refeições; contratos de confirmação, privacidade, permissões e testes. O app nativo `mobile/` é Expo/React Native; `docs/MOBILE_NATIVE.md` também descreve ponte Capacitor em `frontend/`, que deve ser alinhada antes de repetir recursos.
**Não publicar por fora das revisões protegidas:** PR #48 depende de aprovação conforme branch protection e testes de GitHub. Aprovação/merge/deploy real são evidências distintas; validar `lvlos.com` após publicação.

## Evidências de validação local (sem dados pessoais)
- `npm run validate`: TypeScript, 72 arquivos / 243 testes, produção Vite e bundle budget aprovados.
- `php tests/run.php`: 54 aprovados, zero falhas usando `config.example.php` copiado para `config.php` **ignorado** apenas nesta worktree.
- `php scripts/critical-smoke.php`: cenários críticos concluídos com sucesso.
- `php scripts/production-readiness.php --built`: 40 verificações, zero falhas.
- A primeira execução PHP sem configuração local falhou por dependência de `config.php`; a execução final corrigida foi verde. Nenhuma credencial de produção foi adicionada ao Git.
- Falta evidência de teste E2E com sessão real, MySQL em homologação e deploy Hostinger; CI GitHub será reexecutado ao atualizar a PR.
