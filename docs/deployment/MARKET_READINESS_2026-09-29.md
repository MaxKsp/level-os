# Level OS — avaliação de entrada no mercado (29/09/2026)

**Origem:** `origin/master` no SHA `dc76982`, branch isolada `feature/market-readiness-20260929`.
**Escopo:** código de web/PWA, backend PHP, contratos de autenticação e pagamento, testes e documentação. Sem deploy, sem mutação de dados/credenciais de produção.
**Decisão:** NÃO lançar comercialmente para o público geral antes dos gates abaixo. As melhorias deste lote não equivalem a homologação de terceiros nem a auditoria jurídica.

## Correções implementadas nesta branch

1. TOTP: cadastrar um QR não desativa fator existente; confirmação vincula o segredo validado e incrementa `session_version`, revogando sessões anteriores.
2. Desativação do 2FA: senha atual obrigatória quando existente; conta passwordless exige TOTP ou recovery code; rotação de versão da sessão.
3. Recovery codes: consumo atômico com `used_at IS NULL` e verificação de `rowCount()`; evita sucesso simultâneo com um mesmo código.
4. Tokens mobile: além dos 30 dias absolutos, recusa tokens inativos por sete dias; atualização/limpeza respeitam as mesmas condições.
5. Assinatura: trial apenas para `free/active`; não recupera acesso de contrato cancelado, inadimplente ou pago expirado.
6. Checkout: HTTPS e hosts explícitos do Mercado Pago, sem usuário, senha, porta ou fragmento; URLs persistidas antigas são filtradas antes de chegar ao cliente.
7. Cadastro: quota atômica por IP para todo POST (inclusive inválidos/usuários novos): cinco/minuto e vinte/hora.
8. Test runner: filtro inexistente e suíte vazia são erros, não aprovações; smoke crítico passou a executar contratos de MFA, sessão mobile, plano e checkout.

## Evidências locais

- Configuração sintética gerada a partir de `config.example.php`, sem segredos reais.
- PHP: suíte completa 56/56 após correções; sintaxe dos arquivos editados sem erros.
- Frontend: `npm run validate` (tipos, Vitest 70 arquivos/233 testes, build Vite e budgets) concluído com código 0.
- `npm audit --omit=dev`: nenhuma vulnerabilidade reportada neste lockfile e ambiente.
- `scripts/critical-smoke.php` ampliado (9 jornadas) e `scripts/production-readiness.php --built`: aprovados; 40/40 itens de prontidão estática.
- Testes locais não simulam concorrência MySQL real, provedor externo ou interação E2E em navegador/dispositivo.

## Bloqueadores restantes antes da venda pública

| Prioridade | Item e evidência no código | Critério de aceite |
|---|---|---|
| P1 | Ciclo de assinatura Mercado Pago: `subscription_record_provider_status()` altera `subscription_payments`, mas não reconcilia integralmente `subscriptions` no cancelamento/inadimplência/estorno. | Máquina de estados aprovada; testes sandbox approve/renew/cancel/past_due/refund/chargeback, notificações fora de ordem e repetidas; respeitar período já pago. |
| P1 | Banco e release: migração `2026-09-29-training-effort-metrics.sql` não é aplicada pelo deploy FTPS, como previsto na release integrada. | Backup verificável, restore isolado em MySQL, ledger de schema, migração prévia, smoke autenticado e rollback ensaiado. |
| P1 | Jornadas de autenticação/MFA e recuperação ainda sem E2E em ambiente equivalente e contas sintéticas. | Login legado, Google/Supabase, enrollment, disable, recuperação, revogação mobile/browser e troca concorrente de fator validados sem regressão. |
| P1 | Política de privacidade, termos, canais de suporte, procedimentos de direitos do titular, exclusão da conta e cancelamento comercial não foram localizados como fluxos públicos finalizados. | Textos aprovados pelo responsável/jurídico, identidade do operador, links acessíveis, pedidos de exportação/exclusão e ciclo de assinatura documentados e testados. |
| P1 | Recuperação de desastre e reconciliação de backups em produção não demonstradas nesta auditoria. | RPO/RTO definidos, backup cifrado externo, custódia de chave, restore MySQL testado e alertas operacionais. |
| P1 | App nativo Expo fora do escopo do deploy FTPS, com PR #33 separado. | Não comercializar app nativo antes de pipeline próprio, revisão das dependências, testes em dispositivos e política de publicação. |
| P2 | Responsividade, scroll animado, acessibilidade, desempenho e instalação/atualização PWA em ambiente real. | Jornada em 320/390/768/1440 px, teclado e leitor de tela, `prefers-reduced-motion`, Lighthouse e Core Web Vitals com evidência. |
| P2 | IA aplicada a finanças/treino/alimentação: contexto, precisão, guardrails e expectativas da marca. | Testes hostis E2E, limites de custo, retenção/minimização de dados e comunicação clara de que orientações não substituem especialistas. |

## Gates de lançamento

1. PR revisado e protegido, PHP 8.2 / Node 22 no CI oficial, sem falhas nem advisory crítico de produção.
2. Mesmo SHA identificado no build, migrações, artefato e endpoint de health; nenhuma sobreposição PHP/assets entre versões.
3. Homologação real em staging: conta nova e legada, sessão/2FA, financeiro, academia, nutrição, rotina, IA, PWA, assinatura e pagamento.
4. Testes de rollback, observabilidade (sem PII/tokens), alertas de falha em e-mail, cron, webhooks, backup e banco.
5. Documentos jurídicos publicados após aprovação e instruções de suporte/cancelamento legíveis.
6. Piloto controlado com dados sintéticos e depois aceite documentado antes de disponibilizar a todos.

**Limite:** nenhum GET público ou teste unitário prova que a assinatura, o banco de produção ou a restauração de dados estão corretos em situações reais.
