# Roadmap — Painel Max

Backlog organizado por prioridade. Cada item deve virar uma branch
`feature/...` própria e um PR separado.

## 🔴 Crítico (risco de perda de dado)

- [ ] **Exportar/importar backup em JSON** — botão em Configurações que baixa
      um `.json` com tudo (rendas, despesas, contas, tarefas) e outro que
      restaura a partir de um arquivo. Enquanto não migramos pra um banco de
      dados de verdade (Supabase/VPS), isso é a rede de segurança.
- [ ] **Migração pra Supabase na VPS** — ver `painel-max-app/DEPLOY.md` do
      projeto original. Isso tira a dependência de o dado viver só num
      artefato do Claude.

## 🟠 Funcionalidade importante

- [x] **Despesas recorrentes mensais** — `feature/despesas-recorrentes` (PR já aberto)
- [ ] **Rendas com recorrência mais clara** — hoje "Fixa" e "Temporária" já
      são recorrentes por natureza, mas não aparecem no mapa de calor nem
      geram "ocorrências" visíveis como as despesas agora geram.
- [ ] **Pagar fatura do cartão** — botão na conta tipo "Cartão" que zera a
      fatura atual e, opcionalmente, registra o pagamento como uma despesa
      (saída) na conta que pagou.
- [ ] **Histórico entre meses** — hoje tudo é "do mês atual". Guardar um
      fechamento mensal (snapshot de saldo) permite comparar mês a mês.
- [ ] **Diagnóstico com IA de verdade** — hoje é só maquete. Só funciona
      depois que a Edge Function do Gemini estiver publicada na VPS.
- [ ] **Testar o alarme de tarefas** — confirmar que ainda dispara certinho
      depois de tantas mudanças de estrutura na Agenda.

## 🟡 Polimento

- [ ] **Metas por categoria** — ex: limite de R$300 em Lazer, com barra de
      progresso mostrando quanto já foi gasto.
- [ ] **Busca/filtro nos lançamentos** — hoje só dá pra rolar a lista.
- [ ] **Exportar relatório em CSV** — pra abrir numa planilha.
- [ ] **Separar `index.html` em arquivos** (`style.css`, `app.js`) — hoje
      tudo está num arquivo só; bom pra simplicidade, ruim pra diffs de PR
      conforme o projeto cresce.

## Convenção de commits

- `feat: ...` — nova funcionalidade
- `fix: ...` — correção de bug
- `chore: ...` — manutenção, sem mudança de comportamento
- `docs: ...` — documentação
