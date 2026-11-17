# Level OS — Auditoria de produção + criação manual de plano alimentar
Data verificada: 29/09/2026 (America/Bahia) | Produção canônica: https://lvlos.com/ (Hostinger).

## Evidência objetiva do ambiente
- GET https://lvlos.com/ => HTTP 200.
- GET https://lvlos.com/api/health.php => HTTP 200, status ok; banco, crypto, assistant_quality e telemetry OK.
- GET https://lvlos.com/release.json => HTTP 200, commit `f0b0c8ddd8f91dea144a9b77135338c6b3b97da5`, builtAt `2026-09-29T01:02:41Z`.
- Último workflow `Deploy para Hostinger` na master: run GitHub Actions **36505851792**, conclusão SUCCESS, commit f0b0c8d.
- GET https://lvlos.com/api/nutrition.php, sem login => HTTP 401 (não acessar dados privados sem sessão).

| Mudança | PR/branch | Disponível em produção na verificação? |
| --- | --- | --- |
| Release anterior de integridade web/PWA | #37 / master f0b0c8d | SIM |
| Jornada orbital mobile + Academia | #38 / feature/mobile-orbit-training-studio-20260928 | NÃO: aberta, REVIEW_REQUIRED |
| Evolução integrada dos módulos | #39 / feature/levelos-daily-experience-20260929 | NÃO: rascunho |
| Compras assistidas (iFood/Liv Up) + check-in alimentar | #40 / feature/nutrition-purchases-20260929 | NÃO: rascunho |
| Criação/edição MANUAL de planos (esta correção) | hotfix/nutrition-manual-from-master-20260929 | NÃO: PR independente desde master |

**Check de CI em uma PR não faz deploy:** o workflow `deploy.yml` dispara em push para `master`, executa quality-gate, aguarda o ambiente `Production`, monta `release.json` e publica na Hostinger. Não usar preview de Vercel como prova de publicação.

## Problema de governança de publicação
- `master` exige um review aprovado, aprovação após o último push e três checks: `Frontend React`, `Backend PHP e scripts JS`, `Browser smoke`; proteção vale inclusive para administradores.
- O repositório retorna somente `MaxKsp` como collaborator no momento da auditoria. É necessário convidar pessoa autorizada para revisar PRs ou deliberar formalmente sobre a política. **Não fazer self-approval, push direto, workflow_dispatch para contornar gates ou remover regras silenciosamente.**
- Ambiente `Production` possui `required_reviewers` com único revisor `MaxKsp` e `prevent_self_review=true`. Rever a política de aprovadores antes da publicação seguinte para evitar bloqueio de aprovação de deploy; manter segregação legítima.
- Ordem para entregar tudo: revisão/merge #38, ensaio isolado de backup/restore e migration RPE/RIR antes da #39, depois #40; em paralelo, esta correção de Alimentação foi feita diretamente a partir de master e **não depende dessa pilha**.

## Criação manual: escopo da correção
- Novo endpoint POST autenticado `/api/nutrition.php` com `operation=save_manual_plan`, CSRF, rate limit e entitlement individual (reusa guards já existentes).
- Serviço de normalização: objetivo, período 1–30 dias, 1–30 dias-modelo sequenciais, 1–8 refeições por dia, nomes/descrições e custo válido com centavos, até 80 itens da lista.
- Custo total é **calculado no servidor** a partir do ciclo de refeições e número de dias; `estimatedCostBRL` enviado pelo browser é ignorado. `source=manual` sempre atribuído no backend.
- Versionamento existente `nutrition_activate_plan()` arquiva a versão anterior em transação, sem migração de schema.
- `manualDraftId` estável evita versão duplicada por retry após perda de resposta; `expectedActivePlanId` evita substituir plano de outra aba sem atualizar; substituição requer confirmação explícita.
- Editor no design system atual: criar, editar plano existente, duplicar/adicionar/remover dias e refeições, registrar orçamento e itens de compra, prévia de custo estimado, alerta de rascunho não salvo, erros visíveis.

## Teste e checklist de homologação
- Unit PHP: plano manual, recálculo de custo ignorando valor forjado, histórico/restauração, isolamento por usuário, confirmação, retry idempotente, erro de versão stale, validação estrita de valores/categorias.
- Unit UI: rascunho, dias, compras, confirmação e mesmo `manualDraftId` no retry. Frontend deve passar `npm ci && npm run validate`.
- Antes de merge: testar com conta individual de HOMOLOGAÇÃO, criar plano 7 dias com 2 dias-modelo, recarregar e verificar origem manual/custo, editar preservando histórico, abrir duas abas e testar 409, restaurar versão e verificar backend. NÃO usar conta real do proprietário como cobaia nem registrar dados clínicos de terceiro.
- Depois de revisão independente e merge deste hotfix: aprovar deploy de forma legítima no environment `Production`, conferir run, `release.json.commit == SHA` do merge, `api/health.php=ok` e validação autenticada do fluxo.
- Nenhum dos itens acima autoriza publicar #39 sem ensaio de migração do banco e backup/restore.

## Evidência local desta branch isolada
- `npm ci`: sem vulnerabilidades reportadas.
- `npm run validate`: **47 arquivos / 178 testes aprovados**, tipagem, build e limites de bundle; `NutritionScreen` 20,6 KiB (teto 310 KiB).
- `php tests/run.php`: **52 aprovados / zero falhas**, incluindo novo caso de persistência manual com retry e conflito.
- `php scripts/production-readiness.php` após build: **40 aprovados / zero falhas**.
- A homologação autenticada na Hostinger e o merge/deploy ainda não ocorreram; nenhum dado de usuário foi modificado em produção.
