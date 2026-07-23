# Auditoria React ↔ backend — 2026-07-17

> Atualização 2026-07-19: este documento registra o corte original. Desde
> então, treinos/medidas, perfil/2FA/avatar/backup, salário CLT/PJ, pagamento,
> progresso, assinatura, calendário e Agente de IA ganharam integração React
> e endpoints dedicados. O legado continua somente como compatibilidade local
> e suíte de caracterização; produção recebe o shell React gerado pelo Vite.

## Integrado no frontend React

| Recurso | Contrato PHP | Situação |
|---|---|---|
| Bootstrap financeiro | `GET /api/data.php?all=1` | Contas, rendas, despesas, renda variável, cofrinhos, transferências e preferências auxiliares são carregados no build autenticado. |
| Persistência financeira | `POST /api/finance.php` | Os quatro conjuntos relacionais são salvos com CSRF, debounce e apenas quando o conjunto muda. |
| Preferências bancárias | `bank_favorites` via `POST /api/data.php` | Até cinco favoritos são persistidos; o seletor pesquisa o catálogo BancosBrasileiros e mantém SVG local para marcas suportadas. |
| Transferências | `transfers` via `POST /api/data.php` | Fluxo React transfere entre contas, atualiza os saldos relacionais e inclui a operação no extrato unificado. |
| Importação OFX | `POST /api/import-ofx.php` | Preview autenticado respeita limite, rate limit e bloqueio por plano. O parser local existe somente no Vite. |
| Imposto de renda | Dados do bootstrap financeiro | Tela React disponível na aba **Imposto de renda**. |
| Rotina no frontend | Estado compartilhado React | Visão geral, busca, modal de nova tarefa e calendário agora usam a mesma fonte; não há mais duas listas divergentes na sessão. |

## Backend existente ainda não portado integralmente

| Área | Chaves/endpoints existentes | Lacuna no React |
|---|---|---|
| Rotina recorrente | `tasks_v6`, `checklist_v6` | O legado modela recorrência e conclusão por ocorrência. O React ainda usa o modelo local simplificado; exige migração explícita de shape. |
| Treinos e medidas | `workouts`, `workout_log`, `body_log`, `body_height` | CRUD de modelos existe no React, mas execução, cargas e histórico corporal ainda usam o protótipo local. |
| Planejamento financeiro | `budget_goals`, `custom_categories`, `anomaly_dismissed` | Metas, categorias personalizadas e anomalias ainda não possuem telas React equivalentes. |
| Renda avançada | `income_meta` | Simuladores CLT/PJ e benefícios do legado ainda não foram conectados às novas telas. |
| Pagamento de faturas | contas e despesas | Transferências já estão conectadas; ainda falta um fluxo transacional específico para pagar fatura e zerar/baixar o valor do cartão. |
| Perfil e segurança | `/api/me.php`, `/api/avatar.php`, `/api/prefs.php`, `/api/totp-*` | A tela visual ainda usa dados locais para perfil/preferências e não expõe todo o fluxo de avatar/2FA. |
| Backup da conta | `/api/export.php`, `/api/import.php` | O React atual oferece backup local do Preview; o fluxo autenticado do servidor ainda precisa substituir essa implementação. |

## Duplicidade e descarte

- O estado financeiro antigo e sem consumidores foi removido de `frontend/src/context/AppContext.tsx`.
- A lista local paralela da Rotina foi removida; calendário, busca e criação compartilham `AppContext`.
- Os pares `app/Modules/Finance/Frontend/finance-*.js` e `assets/finance-*.js` são duplicatas **intencionais**: fonte canônica e cópia pública de deploy. Não devem ser apagados enquanto `index.php` legado carregar `assets/`.
- Os assets legados da raiz continuam necessários apenas para o fallback local
  e para testes de caracterização. O deploy React não os usa como interface
  principal; sua remoção definitiva exige retirar primeiro esses testes.

## Próxima fatia segura

1. Formalizar os contratos de `tasks_v6`/`checklist_v6` e migrar Rotina sem perder recorrências.
2. Portar `workouts`/`workout_log`/`body_log` para um único store React.
3. Ligar Perfil aos endpoints de conta, 2FA, avatar e backup.
4. Portar `income_meta`, metas, categorias personalizadas e pagamento de fatura.
