# Level OS — Release integrada #41 + #38 + #39 + #40
Data 29/09/2026. Destino único: **Hostinger lvlos.com**; `Vercel` continua desligado.

## Origem e integração
- Base: `master` no commit `f0b0c8d`.
- #41: criação/edição manual de cardápios, versionamento, segurança de gravação.
- #38: landing orbital responsiva e Studio de Academia.
- #39: live workout, recordes, biblioteca, painéis Financeiro/Rotina/Alimentação/Progresso e IA contextual.
- #40: handoff de compras iFood/Liv Up, cupom informado, análise de custos e check-in voluntário.
- Mesclagem em worktree isolado, mantendo todos os commits anteriores; único conflito foi resolvido em `NutritionScreen.tsx` e **preservou tanto editor manual quanto módulos de compras e check-in**.
- PR #33 (app nativo) e outros trabalhos no worktree original estão fora desta entrega.

## Migração de Academia — gate de segurança
- Esta versão detecta dinamicamente as colunas `rpe`/`rir`. Sem elas, o front desabilita exclusivamente estes dois inputs com informação clara; continua permitindo salvar séries, carga, repetições, cronômetro e descanso.
- A migração `migrations/2026-09-29-training-effort-metrics.sql` acrescenta colunas nullable e **não é executada pelo deploy FTPS**.
- Executar a migração em Hostinger apenas após backup criptografado verificável, teste de restore em banco MySQL isolado, validação de schema, janela planejada e smoke autenticado pós-migração. Depois da migração, os campos se habilitam dinamicamente na consulta da API.
- Não afirmar que a migração ocorreu apenas porque o CI passou. Nunca lançar alteração de produção fora do mecanismo explícito/autorizado.

## Governance / Deploy
- Branch protection original: 1 review externo, last-push approval=true; 3 checks obrigatórios.
- `Production`: único revisor MaxKsp, `prevent_self_review=true`, `can_admins_bypass=false`.
- Autorizar publicação com credenciais do dono **somente conforme autorização explícita neste atendimento**. Qualquer alteração temporária de regra deve ser restaurada imediatamente e conferida antes de declarar concluído.
- Publicar exclusivamente por GitHub Actions `deploy.yml` (push em `master`), confirmar `release.json.commit`, `api/health.php`, chunks e rotas após aprovação do ambiente.
