# Painel Max

App pessoal de rotina (Agenda) e finanças (Financeiro), rodando como uma
página única (`index.html`) com todos os dados salvos no armazenamento do
próprio navegador/artefato.

## Rodando localmente

```bash
python3 -m http.server 8080
# ou: npx serve .
```

Depois abra `http://localhost:8080`.

Para os logos dos bancos aparecerem, a pasta `assets/bancos/` precisa estar
ao lado do `index.html` (já vem inclusa neste repositório).

## Estrutura

```
index.html          – app inteiro (HTML + CSS + JS em um arquivo só)
assets/bancos/*.svg  – logos dos bancos usados no seletor de conta/despesa
ROADMAP.md           – backlog priorizado de melhorias
```

## Stack

- Vanilla JS, sem framework
- [Chart.js](https://www.chartjs.org/) via CDN, pros gráficos do dashboard
- Persistência: `window.storage` (armazenamento do artefato/navegador)

## Fluxo de contribuição

1. Crie uma branch a partir de `master`: `git checkout -b feature/nome-da-melhoria`
2. Faça as alterações em `index.html`
3. Teste localmente (veja seção acima)
4. Commit e push da branch
5. Abra um Pull Request pra `master` no GitHub

Cada melhoria do `ROADMAP.md` deve virar uma branch/PR separada — evita
misturar mudanças não relacionadas num commit só e facilita reverter algo
específico se der problema.
