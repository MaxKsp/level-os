# Auditoria técnica — índice

> **Decisão em 2026-08-26: NO-GO para produção no estado auditado.** Não foi identificado P0 comprovado (`P0=0`), mas há múltiplos P1 de autenticação/MFA, sessão, proteção de dados, entitlement e lifecycle de pagamentos. A ausência de P0 não reduz esses bloqueadores nem prova ausência de risco desconhecido.

## Controle da auditoria

| Campo | Valor |
|---|---|
| Data de referência | `2026-08-26` |
| Repositório / remoto | `marketing-launch` / `https://github.com/MaxKsp/level-os.git` |
| Branch observada | `feature/ai-agent-guardrails`, com `origin/master` no mesmo HEAD observado |
| HEAD observado | `e600c0eb8e8e4fe417fdfb4a6b82f53e9a5d300d` |
| Estado inicial do worktree | **Sujo antes da documentação**: `M app/Modules/Email/EmailTemplates.php` e `M tests/cases/resend_mailer_test.php`. Ambos foram comparados com HEAD apenas na trilha de e-mail, tiveram conteúdo e numstats preservados e não foram sobrescritos. |
| Efeito desta entrega | Conjunto documental completo `docs/audit/00-index.md` a `13-plano-de-acao.md`; nenhum código de produto, schema, migration, configuração ou workflow foi alterado. |
| Execução | Auditoria estática + gates locais autorizados: frontend web, PHP, smoke, readiness, mobile typecheck/lint, dependency audit e GETs públicos passivos. Nenhum commit, push, merge, deploy, escrita no banco real ou chamada autenticada a provedor. |

O baseline foi capturado por `git status --short`, `git branch --show-current`, `git remote -v`, `git log -10 --oneline --decorate` e `git rev-parse HEAD`. Metadados Git e resultados de execução não possuem referência `arquivo:linha`; o ledger reproduzível está em [12 — Validações, resíduos e limitações](./12-validacoes-residuos-limitacoes.md). Todo achado técnico usa fonte versionada e referência rastreável.

## Escopo

A auditoria cobre a arquitetura PHP/MySQL, o frontend web React/Vite, o cliente mobile Expo/React Native, as superfícies API/webhook, schema e migrations, autenticação local/Google/Supabase, sessões web/mobile, CSRF, e-mail verificado, TOTP, planos/entitlements, checkout e webhook Mercado Pago, jobs e workflows, integrações, PWA e resíduos demonstráveis. O inventário consolidado contém **10 módulos PHP, 6 rotas web concretas, 35 handlers API/webhook, 36 tabelas, 25 migrations SQL e dois clientes — web + mobile**. As rotas estão materializadas no shell React (`frontend/src/App.tsx:105-113`), as tabelas no DDL (`schema.sql:6-575`) e os gates automatizados nos workflows (`.github/workflows/tests.yml:4-104`; `.github/workflows/deploy.yml:14-192`).

Ficaram fora do escopo factual: estado do banco de produção, migrations realmente aplicadas, valores de configuração, painéis e credenciais de terceiros, configuração externa de cron/WAF/TLS, histórico de CI/deploy e comportamento real dos provedores. Esses pontos são marcados como **Bloqueado por ambiente**, nunca presumidos.

## Método e hierarquia da verdade

1. **Fonte da verdade primária:** código executável, DDL/schema, migrations, testes contratuais e workflows versionados.
2. **Triangulação:** uma intenção em teste só é tratada como implementação quando o caminho executável correspondente existe; um gate no workflow não é tratado como execução verde sem histórico verificável.
3. **Fontes não usadas como prova:** README, ROADMAP e comentários. Eles podem conter intenção, mas não sustentam conclusões desta auditoria.
4. **Ausência com critério forte:** um item só é classificado como ausente/incompleto após inspeção do consumidor, do caminho referenciado e dos workflows. Compatibilidade, fachada, alias ou artefato com consumidor executável não é chamado de código morto.
5. **Execução controlada:** existência de teste não foi tratada como sucesso; os comandos autorizados foram executados e seus códigos, durações e limites estão registrados em `12-validacoes-residuos-limitacoes.md`. Testes verdes não convertem itens não cobertos em conformidade.
6. **Segredos:** nenhum valor secreto é reproduzido. Quando indispensável, apenas nomes de variáveis de configuração são citados.

## Legenda de evidência, certeza e prioridade

| Termo | Significado nesta auditoria |
|---|---|
| **Fato** | Demonstrado diretamente por código, schema, migration, teste ou workflow atual, sempre com `arquivo:linha`. |
| **Hipótese** | Consequência plausível que exige condição adicional — concorrência, XSS, resposta maliciosa, configuração específica ou estado remoto. Não é apresentada como ocorrência. |
| **Bloqueado por ambiente** | Não pode ser confirmado apenas pelo repositório: banco implantado, segredo/configuração, painel externo, infraestrutura ou histórico de execução. |
| **P0** | Comprometimento crítico imediato e comprovado. Resultado desta inspeção: **0**. |
| **P1** | Bloqueador de produção por segurança, autorização, integridade, privacidade ou operação. Há múltiplos. |
| **P2/P3** | Risco relevante ou melhoria controlável que não suplanta os P1. |

Formato de citação: `caminho/arquivo.ext:linha` ou `caminho/arquivo.ext:início-fim`. Uma faixa identifica o bloco executável mínimo necessário, não uma referência documental genérica.

## Mapa de leitura

- **Decisão executiva e release gate:** [01 — Resumo executivo](./01-resumo-executivo.md).
- **Topologia e inventário:** [02 — Arquitetura e inventário](./02-arquitetura-e-inventario.md).
- **Identidade, segurança, planos e pagamentos:** [03](./03-seguranca-auth-planos-pagamentos.md).
- **Domínios, dados, APIs e clientes:** [04](./04-dominios-e-regras.md) a [07](./07-frontend-ux-pwa-performance.md).
- **Incidente, referências visuais e IA:** [08](./08-incidente-plan-required.md) a [10](./10-agentes-ia-especialidades.md).
- **Registro canônico, evidência executada e remediação:** [11](./11-achados-priorizados.md), [12](./12-validacoes-residuos-limitacoes.md) e [13](./13-plano-de-acao.md).

## Índice dos 14 documentos

| # | Documento | Papel | Estado |
|---:|---|---|---|
| 00 | [00-index.md](./00-index.md) | Escopo, método, legenda e índice | Concluído |
| 01 | [01-resumo-executivo.md](./01-resumo-executivo.md) | Decisão, positivos, bloqueadores e métricas | Concluído |
| 02 | [02-arquitetura-e-inventario.md](./02-arquitetura-e-inventario.md) | Arquitetura, superfícies, dados, workflows e resíduos | Concluído |
| 03 | [03-seguranca-auth-planos-pagamentos.md](./03-seguranca-auth-planos-pagamentos.md) | Identidade, sessão, MFA, planos e Mercado Pago | Concluído |
| 04 | [04-dominios-e-regras.md](./04-dominios-e-regras.md) | Domínios funcionais e invariantes | Concluído |
| 05 | [05-dados-migrations-backup.md](./05-dados-migrations-backup.md) | Persistência, migrations, backup e DR | Concluído |
| 06 | [06-apis-email-integracoes-deploy.md](./06-apis-email-integracoes-deploy.md) | APIs, e-mail, terceiros e deploy | Concluído |
| 07 | [07-frontend-ux-pwa-performance.md](./07-frontend-ux-pwa-performance.md) | Web, mobile, UX, PWA, landing e desempenho | Concluído |
| 08 | [08-incidente-plan-required.md](./08-incidente-plan-required.md) | Análise estática/reprodução de `plan_required` | Concluído; causa da conta real permanece bloqueada |
| 09 | [09-referencias-visuais-wireframes.md](./09-referencias-visuais-wireframes.md) | Referências e wireframes financeiros | Concluído no escopo financeiro |
| 10 | [10-agentes-ia-especialidades.md](./10-agentes-ia-especialidades.md) | Agentes atuais, red-team e especialidades propostas | Concluído |
| 11 | [11-achados-priorizados.md](./11-achados-priorizados.md) | Matriz de regras e registro canônico P0–P3 | Concluído |
| 12 | [12-validacoes-residuos-limitacoes.md](./12-validacoes-residuos-limitacoes.md) | Comandos, resultados, resíduos e bloqueios | Concluído |
| 13 | [13-plano-de-acao.md](./13-plano-de-acao.md) | Fases, owners e critérios de GO | Concluído |
| 14 | [14-escopo-pwa-e-especificacoes.md](./14-escopo-pwa-e-especificacoes.md) | Decisão PWA-only, incidente `plan_required` resolvido e especificações 21–25 | Concluído |

## Snapshot da decisão

| Dimensão | Resultado | Evidência principal |
|---|---|---|
| Prioridade | `P0=0`; múltiplos P1 | Troca/remoção de TOTP, versão de sessão e recovery codes (`api/totp-enroll.php:27-33`; `api/totp-disable.php:27-40`; `auth.php:539-590`) |
| Release | **NO-GO** | Trial independe do status e lifecycle do provedor não atualiza entitlement (`app/Modules/Subscription/SubscriptionPolicy.php:35-45,95-108`; `app/Modules/Subscription/SubscriptionPaymentService.php:174-197`) |
| Gates | Web/backend locais passaram; mobile dependency audit falhou; isso não equivale a prontidão | `frontend/package.json:7-17`; `mobile/package.json:5-13`; cobertura e limites em [12](./12-validacoes-residuos-limitacoes.md) |
| Operação | Parcialmente bloqueada por ambiente | Estado do banco, cron, provedores, chaves, TLS e histórico não são verificáveis no código |
| PWA/mobile | Não prontos como uma única cadeia operacional | Worker sem registro executável e script `prepare-capacitor` referenciado mas ausente (`sw.js:3-31`; `frontend/package.json:7-18`) |

**Conclusão:** os controles positivos reduzem risco, mas não compensam falhas de MFA, invalidação de sessão, entitlement, lifecycle e exposição potencial de dados. O release permanece **NO-GO** até que os P1 sejam corrigidos e validados em código e ambiente.