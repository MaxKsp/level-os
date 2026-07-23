# Roadmap — Level OS

Backlog organizado por prioridade. Cada item vira uma branch `feature/...`
própria e um PR separado.

## 🔒 Segurança (Fase 0)

- [x] **Rate limiting geral nos endpoints** — limiter reutilizável
      (`rate_ok`/`require_rate_limit` em `auth.php`, tabela `rate_hits`)
      aplicado em todos os `api/*.php`: data 200/min, export 10/min,
      import 5/min, avatar 10/min, me/prefs 60/min, totp 20/min. HTTP 429
      + `Retry-After` ao estourar. SQL em `migrations/2026-07-06-rate-limit.sql`.
- [ ] **Backup por e-mail cifrado** — o cron manda os dados financeiros em
      JSON puro; cifrar o anexo antes de ligar o cron em produção.
- [x] **Remover `X-Powered-By`** — removido em profundidade no `.htaccess` e
      `expose_php` desativado; confirmar o header no ambiente Hostinger.
- [ ] **Expiração de sessão por inatividade** — hoje só morre no fechar do
      navegador.

## 🗄️ Dados

- [x] **Financeiro relacional (transactions/accounts)** — cutover do blob
      kv pra tabelas consultáveis, contrato de array preservado. Migração
      automática no 1º bootstrap. Destrava conciliação/PDF/anomalia (queries
      por período/categoria). SQL em `migrations/2026-07-06-transactions.sql`.

## 💳 Assinatura (modelo pago)

- [x] **Esqueleto subscriptions + `require_plan()`** — tabelas
      `subscriptions`/`subscription_events`, helpers em `plan.php`
      (`user_plan`, `plan_allows`, `require_plan` → HTTP 402), leitura em
      `api/subscription.php`. Acesso lido sempre do banco, nunca do cliente.
      Plano só muda server-side. SQL em `migrations/2026-07-06-subscriptions.sql`.
- [x] **Gateway + webhook** — Mercado Pago como gateway único para Pix e
      cartão, checkout hospedado, assinatura validada e processamento
      idempotente por evento/pagamento.
- [x] **Gate nas features pagas** — escrita financeira, OFX, treino, progresso
      e Agente de IA protegidos no servidor com `require_plan('individual')`.

## 🔴 Fundação (destrava o resto)

- [ ] **Domínio próprio** — sair do subdomínio temporário da Hostinger.
      Destrava: e-mail confiável, recuperação de senha, URL estável pro
      Google OAuth e identidade de marca de verdade.
- [x] **E-mail transacional confiável** — cliente Resend via API HTTPS,
      remetente verificado, texto + HTML e idempotência nos fluxos de
      confirmação, senha e lembretes. Sem dependência de `mail()`/SMTP local.
- [x] **Recuperação de senha por e-mail** — fluxo de "esqueci a senha" com
      token de uso único, hash no banco, expiração e rate limit implementado.
      A entrega confiável em produção ainda depende do domínio/SMTP acima.
- [ ] **Supabase Auth (em ativação)** — bridge gerenciado, callback PKCE, sessão PHP,
      vinculação segura de contas antigas e recuperação integrados por feature
      flag. Falta criar/configurar o projeto externo e executar o smoke real.

## 🟠 Funcionalidade

- [x] **Pagar fatura do cartão** — botão no cartão zera a fatura e registra
      a saída automaticamente.
- [x] **Conciliação automática** — despesa avulsa pode movimentar conta
      (debita saldo) ou cartão (soma fatura), com estorno em edição/exclusão.
- [x] **Histórico entre meses** — gráfico entradas × saídas dos últimos 6
      meses, calculado direto dos lançamentos.
- [x] **Conciliação por extrato (OFX)** — importa extrato do banco, mostra
      preview com marcação de prováveis duplicados (mesma data+valor),
      categoria por saída e confirmação seletiva antes de gravar. Recurso do
      plano pago (`require_plan(individual)`). Endpoint `api/import-ofx.php`,
      parser em `ofx.php`.
- [ ] **Rendas com recorrência visível** — ocorrências de renda no mapa de
      calor e nos gráficos, como as despesas recorrentes já têm.
- [ ] **Financeiro estilo banking app** — em entrega incremental:
      - [x] P1: visão consolidada (patrimônio líquido, saldo total, fatura
        total, crédito disponível) + cheque especial por conta (limite,
        saldo negativo, alerta de uso). Coluna `accounts.cheque_especial`.
      - [x] P2: detalhe/extrato por conta — clicar num card abre o extrato
        (rendas vinculadas + saídas da conta); renda ganha "conta de
        recebimento" (reusa `transactions.account_id`, sem migração).
      - [x] P3: alternar visão "Por conta" (lista) × "Por banco" (agrupa por
        banco com subtotal de saldo/fatura). Escolha persiste em kv `acc_view`.
- [ ] **Mais features de banco** (incremental):
      - [x] Seletor: "Outro" sai do grid, vai pra dentro de "Mais bancos".
      - [x] Transferência entre contas (e pagar fatura de cartão com conta):
        ajusta saldos/fatura e aparece nos dois extratos. kv `transfers`.
      - [x] Cofrinhos / metas de guardar dentro da conta: reserva parte do
        saldo (mostra "saldo livre"), meta + barra de progresso, guardar/
        resgatar/editar/excluir. kv `vaults`.
      - [x] Projeção de saldo do fim do mês: saldo atual + rendas a receber
        (payday ainda não passou) − despesas previstas (ocorrências até o fim
        do mês). Card no topo de Contas. Puro no cliente.
      - [x] Lembrete de vencimento de fatura no painel: cartões com fatura
        aberta e vencimento em até 7 dias mostram aviso ("vence hoje/amanhã/
        em N dias") no topo de Contas. (E-mail via cron fica pra depois.)
- [x] **Front do financeiro (pacote)** — catálogo de ~87 bancos com busca e
      até 11 favoritos editáveis (estilo app de banco); dia de pagamento na
      renda; no cartão, dia de fechamento e vencimento da fatura; card de
      conta com logo em destaque, editar/excluir/reordenar e marcar principal;
      botão "+" flutuante vira menu (despesa / renda / conta / tarefa).
      Colunas novas: `transactions.payday`, `accounts.fechamento/vencimento`.
- [x] **Metas por categoria** — limites em "Metas do mês" com barra de
      progresso e aviso ao estourar.
- [x] **Alerta de gasto fora do padrão** — em Saídas, detecta despesa do mês
      muito acima da média histórica da categoria (média + 2σ, mínimo 4
      lançamentos anteriores). Card âmbar com % acima da média, toque abre a
      despesa; dispensável por mês. Puro no cliente, sem backend.
- [ ] **Web Push (VAPID)** — notificação nativa com o app fechado. Exige
      lib de criptografia via composer; hoje o caminho é o aviso por e-mail.
- [x] **Agente de IA real** — endpoint PHP com provedores compatíveis,
      ferramentas controladas, auditoria, criptografia e desfazer ação.

## 🟡 Qualidade e polimento

- [x] **Busca/filtro nos lançamentos** — em Saídas e Entradas.
- [x] **Exportar relatório em CSV** — em Perfil → Backup.
- [x] **Relatório anual (IR) em PDF** — em Perfil → Backup, gera resumo do ano
      (rendas, despesas por categoria, saldo mês a mês, contas/cartões) numa
      página de impressão limpa via `window.print()` (Salvar como PDF). Sem
      lib no servidor; puro cliente com CSS `@media print`.
- [ ] **Backup automático agendado por e-mail** — envio do JSON puro foi
      desativado; só reativar com artefato cifrado e autenticado.
- [x] **Tema claro** — terceira opção de fundo no Perfil.
- [ ] **Testes automatizados** — PHPUnit pra auth/TOTP/rate-limit e um
      smoke E2E do fluxo login → lançamento → backup.
- [ ] **Trilha de auditoria** — persistência e eventos sensíveis já existem;
      falta registrar todos os métodos de login e mostrar a última atividade
      no Perfil.
- [x] **Separar `index.php` em módulos** — `index.php` virou front controller;
      a compatibilidade legada está isolada em `app/Shared/Dashboard/` e o
      deploy continua usando o shell React gerado pelo Vite.
- [ ] **Endurecer verificação de e-mail** — hoje é só um selo; tornar
      obrigatória quando o e-mail for confiável.
- [ ] **Testar o alarme de tarefas no dia a dia** — confirmar precisão do
      disparo após as mudanças de estrutura da Agenda.

## ✅ Entregue

- Backend próprio PHP + MySQL com deploy automático (GitHub Actions + FTPS)
- Multiusuário com dados isolados, 2FA (TOTP + códigos de backup), login
  com Google
- CSRF em formulários e API, rate-limit de login/2FA/cadastro, CSP + HSTS,
  escape de conteúdo do usuário
- Bootstrap único + cache em memória (troca de aba sem rede), gzip
- Despesas recorrentes; gráficos e mapas de calor respeitando o período
- Redesign completo, temas de cor, página Perfil
- PWA instalável, notificação do navegador, aviso por e-mail via cron
- Backup/restauração em JSON

## Convenção de commits

`feat:` nova funcionalidade · `fix:` correção · `sec:` segurança ·
`chore:` manutenção · `docs:` documentação
