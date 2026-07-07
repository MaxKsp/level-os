# Roadmap — Orby

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
- [ ] **Remover `X-Powered-By`** — versão do PHP vaza no header.
- [ ] **Expiração de sessão por inatividade** — hoje só morre no fechar do
      navegador.

## 💳 Assinatura (modelo pago)

- [x] **Esqueleto subscriptions + `require_plan()`** — tabelas
      `subscriptions`/`subscription_events`, helpers em `plan.php`
      (`user_plan`, `plan_allows`, `require_plan` → HTTP 402), leitura em
      `api/subscription.php`. Acesso lido sempre do banco, nunca do cliente.
      Plano só muda server-side. SQL em `migrations/2026-07-06-subscriptions.sql`.
- [ ] **Gateway + webhook** — checkout (Stripe/Mercado Pago), validar
      assinatura do webhook, idempotência, tratar cancelamento/falha.
      Atualiza `subscriptions`; `require_plan` já lê dela.
- [ ] **Gate nas features pagas** — aplicar `require_plan('individual')`
      nos endpoints/telas de feature paga conforme forem nascendo.

## 🔴 Fundação (destrava o resto)

- [ ] **Domínio próprio** — sair do subdomínio temporário da Hostinger.
      Destrava: e-mail confiável, recuperação de senha, URL estável pro
      Google OAuth e identidade de marca de verdade.
- [ ] **E-mail transacional confiável** — trocar `mail()` pelo SMTP da
      própria hospedagem (com SPF/DKIM configurados no domínio). Hoje a
      entrega de confirmação/aviso é loteria; depende do item acima.
- [ ] **Recuperação de senha por e-mail** — fluxo de "esqueci a senha" com
      token de uso único e expiração. Depende dos dois itens acima.

## 🟠 Funcionalidade

- [x] **Pagar fatura do cartão** — botão no cartão zera a fatura e registra
      a saída automaticamente.
- [x] **Conciliação automática** — despesa avulsa pode movimentar conta
      (debita saldo) ou cartão (soma fatura), com estorno em edição/exclusão.
- [x] **Histórico entre meses** — gráfico entradas × saídas dos últimos 6
      meses, calculado direto dos lançamentos.
- [ ] **Rendas com recorrência visível** — ocorrências de renda no mapa de
      calor e nos gráficos, como as despesas recorrentes já têm.
- [x] **Metas por categoria** — limites em "Metas do mês" com barra de
      progresso e aviso ao estourar.
- [ ] **Web Push (VAPID)** — notificação nativa com o app fechado. Exige
      lib de criptografia via composer; hoje o caminho é o aviso por e-mail.
- [ ] **Diagnóstico com IA de verdade** — endpoint PHP chamando uma API de
      LLM com os últimos 14 dias de agenda e caixa (hoje é maquete).

## 🟡 Qualidade e polimento

- [x] **Busca/filtro nos lançamentos** — em Saídas e Entradas.
- [x] **Exportar relatório em CSV** — em Perfil → Backup.
- [x] **Backup automático agendado** — aos domingos o cron envia o JSON em
      anexo pra quem tem aviso por e-mail ligado.
- [x] **Tema claro** — terceira opção de fundo no Perfil.
- [ ] **Testes automatizados** — PHPUnit pra auth/TOTP/rate-limit e um
      smoke E2E do fluxo login → lançamento → backup.
- [ ] **Trilha de auditoria** — registrar logins (data, IP, método) e
      mostrar "última atividade" no Perfil.
- [ ] **Separar `index.php` em módulos** (`style.css`, `app.js`) — o
      arquivo único já passa de 2k linhas; ruim pra diff e review.
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
