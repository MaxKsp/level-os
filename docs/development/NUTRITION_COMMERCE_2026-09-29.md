# Level OS — Alimentação, compras e rotina alimentar (29/09/2026)

Branch: `feature/nutrition-purchases-20260929`, baseada em `feature/levelos-daily-experience-20260929` (PR #39, que depende da #38). Nada publicado automaticamente.

## Implementado agora — sem simular pedidos
- **iFood Mercado**: exportar itens que ainda faltam na lista do plano, abrir portal oficial, orientar utilização de “Mercados → Lista de Compras” e comparação por preço/disponibilidade. O usuário seleciona manualmente os produtos na loja. Não há API de compra de consumidor autorizada nesta branch.
- **Liv Up**: abrir loja oficial, copiar cupom **max6f466d9a**, exibir a alegação de **15% fornecida pelo solicitante** sempre como não verificada e simular matematicamente desconto a partir do subtotal digitado, sem frete/taxas. Exporta ideias textuais de almoço e jantar para comparação de produtos; não garante equivalência de prato, macro ou catálogo. Código é inserido pelo usuário no checkout da Liv Up; disponibilidade, validade e percentual efetivo só podem ser confirmados por ela.
- **Orçamento inteligente**: soma do custo estimado das refeições ao longo do período e da repetição do ciclo, comparação com orçamento/estimativa declarada e alerta quando há diferença superior a R$5. Não confunde custos estimados com compras efetuadas.
- **Check-in por refeição**: marcação voluntária “realizada/não realizada/pendente”, sem inferir consumo real a partir do planejamento; guarda apenas status de slots, por plano/usuário no navegador quando há identidade válida. Não é sincronizado entre dispositivos e não é registro clínico ou contagem nutricional.
- **Chef Rita**: botões para rever orçamento, otimizar preparo, sugerir substituições mais econômicas e comparar opções de marmitas. Preparação da mensagem no agente; não envia sozinho nem altera dados sem consentimento.

## Limites oficiais de API
1. iFood Developer: https://developer.ifood.com.br/pt-BR — Merchant API orientada a lojistas/restaurantes/mercados/PDV, eventos, catálogo e pedidos de estabelecimentos. **Não é uma API pública demonstrada para terceiros criarem carrinho/checkout em contas pessoais de consumidores**. A automação real da compra exigiria um acordo específico com iFood, documentação/autorização correspondente e consentimento do usuário; não usar endpoints privados, scraping ou tokens de contas pessoais.
2. Guia oficial da Lista de Compras no iFood: https://institucional.ifood.com.br/consumidores/lista-de-compras-de-supermercado/
3. Liv Up: https://www.livup.com.br/ ; cupom aplicado na etapa final do site/app, conforme https://ajuda.livup.com.br/hc/pt-br/articles/360035579932-Como-usar-um-cupom-de-desconto-no-meu-pedido .
4. Parcerias Liv Up: https://www.livup.com.br/parceiros-liv-up/seja-um-parceiro — cupons e descontos são negociados; parceria de comissionamento é analisada separadamente. **Não foi encontrada/contratada API pública de criação de pedidos para consumo externo.**

## Evolução do produto — sem atalhos inseguros

| Etapa | Capability | Dados/critério |
| --- | --- | --- |
| 2 | Despensa inteligente: quantidade, unidade, validade, evitar dupla compra e agregação por receita | Backend próprio, edição por usuário, sincronização e exportação |
| 2 | Preparação semanal: calendário de refeições e marmitas, tarefas de cozinhar/congelar, substituições aprovadas | Relacionar com Rotina; não assumir validade sanitária de alimento sem fonte |
| 2 | Banco nutricional por código de barras | Avaliar Open Food Facts API (v3, identificação User-Agent, licença ODbL e atribuição), TBCA/TACO para alimentos brasileiros; dados podem ser incompletos, revisar unidades e origem |
| 2 | Nutrição real vs. planejada: porções, custos pagos, lista de alimentos e restrições sob controle do usuário | Persistência autenticada e isolamento; não estimar macros a partir de texto livre |
| 2 | Pedidos manuais de fornecedores, comprovante opcional e reconciliação financeira após confirmação | Status **declarado pelo usuário**, nunca inferir pagamento só por abrir loja |
| 3 | Carrinho compartilhado/checkout nativo iFood ou Liv Up, se fornecida API de consumidor via contrato | OAuth/credenciais no backend, escopos mínimos, homologação, disponibilidade, cotação real, confirmação dupla, idempotência, webhook assinado, LGPD |
| 3 | Notificações de estoque/refeições e sincronização entre dispositivos | Servidor agendador + consentimento para push; evitar lembretes invasivos |

### Regras de qualidade
- Não usar logos/imagens protegidas sem autorização; os cartões atuais usam texto e ícones próprios.
- Nenhum subtotal da Liv Up é obtido via API; o usuário digita e a porcentagem é uma hipótese. Código promocional configurado em `nutritionCommerce.ts` para manutenção posterior.
- Não acessar/armazenar sessão, senha, cartão ou endereço do iFood ou Liv Up. Links usam `target=_blank rel=noopener noreferrer`, e a lista só sai mediante clique em copiar.
- Na eventual integração nutricional, identificar origem dos dados, revisar licenciamento e evitar sugestões sobre alergias ou saúde sem confirmação das informações pelo usuário.
- Validar UI mobile (320/360/390/430), teclado, estados vazios, clipboard sem permissão, conversão de moeda e plano sem lista de compras.
- Esta entrega é **Web/PWA**, sem migração de banco adicional e sem alterar mobile nativo, pagamento ou deployment de produção.

## Evidências locais
- `npm ci`: instaladas 573 dependências/transitivas; 0 vulnerabilidades na auditoria resultante.
- `npm run validate`: **61 arquivos, 211 testes aprovados**, TypeScript, build Vite/clients e orçamento de bundles (NutritionScreen 30,1 KiB / 310 KiB).
- `php tests/run.php`: **51 aprovados, 0 falhas**; este branch não altera endpoints PHP.
- `php scripts/production-readiness.php`: 39 verificações aprovadas antes do build desta worktree; executar novamente após a compilação para incluir o gate do build.
- Testes específicos de promo, links e simulação, exportação de lista pendente, análise do orçamento e check-in por conta aprovados.
- Browser smoke e validação em MySQL de staging dependem da pipeline da PR e do fluxo de publicação protegido. **Nenhuma compra real nem validação do cupom foi executada.**
- Nova execução de `php scripts/production-readiness.php` **após o build**: **40 aprovadas, 0 falhas**. `git diff --check`: sem problemas.
