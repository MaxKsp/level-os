# 07 — Frontend, UX, PWA e performance

**Data da inspeção:** 2026-08-26
**Escopo:** inspeção estática + `npm ci`, typecheck, 130 testes Vitest, build, budget, dependency audit web, validação mobile e browser público passivo. Lighthouse, leitor de tela, E2E autenticado e dispositivo nativo não foram executados.
**Legenda:** **EXISTENTE** = comprovado no código; **PROPOSTA** = recomendação, ainda não implementada; **BLOQUEADO POR AMBIENTE** = depende de credencial, dispositivo, servidor ou artefato externo.

## Resumo executivo

A base é uma aplicação híbrida PHP + React 19/Vite 6, com shell autenticado, landing separada, rotas lazy, navegação adaptativa, tokens de tema, estados de carregamento e diversas práticas positivas de acessibilidade. O gate web executado passou com 38 arquivos/130 testes, build e budgets. Os riscos prioritários são:

1. **EXISTENTE — P2:** o gate visual de assinatura é fail-open durante `loading` e `error`: a aplicação só bloqueia quando o status chega a `ready` e `access` é falso. O preview inicial mantém `access: true`, inclusive após erro de carga (`frontend/src/App.tsx:49-65`; `frontend/src/modules/subscription/store.tsx:18-38,57-76`). Isso não prova bypass de backend, mas expõe controles e permite tentativas que o servidor ainda precisa negar.
2. **EXISTENTE — P2:** no tema claro, `#31e6d4` sobre `#f7f9f9` mede aproximadamente **1,5:1** por cálculo estático. O override escurece apenas `.text-primary`; foco, bordas e ícones ainda podem usar o token claro (`frontend/src/index.css:12-81,106-137,509-516`).
3. **EXISTENTE — P1:** o bootstrap inline de tema usa a chave antiga `orby_theme`, enquanto o runtime usa `level-os:theme`; a CSP declara `script-src 'self'` e não autoriza o script inline (`frontend/index.html:6-19`; `frontend/src/lib/theme.ts:1-35`; `.htaccess:29-42`). Há risco de script bloqueado e flash de tema.
4. **EXISTENTE — P1:** há `manifest.json` e `sw.js`, mas não há referência ao manifest nos shells React/landing nem registro de service worker no fonte. O SW, mesmo registrado externamente, só trata assets em `/assets/`, não shell, navegação, API ou os chunks Vite em `/frontend-assets/` (`frontend/index.html:1-29`; `frontend/landing.html:1-38`; `manifest.json:1-17`; `sw.js:1-36`).
5. **EXISTENTE — P1:** o progresso remoto inicia com dados demo e pode piscar nível/XP fictícios antes do fetch; todos os providers de domínio são montados de forma eager (`frontend/src/modules/progress/store.tsx:42-52,77-132`; `frontend/src/App.tsx:1-26,128-161`).
6. **EXISTENTE — P2:** o budget mede bytes brutos por arquivo isolado; não mede total inicial/por rota nem gzip/Brotli (`frontend/scripts/check-bundle-budget.mjs:5-28`).

## 1. Arquitetura, entradas, rotas e navegação

### EXISTENTE

- O front controller entrega `frontend/dist/landing.html` a visitante e o shell React a usuário autenticado; se o build não estiver disponível, há resposta 503 legível (`index.php:5-23`; `app/Shared/DashboardView.php:18-89`).
- Vite possui duas entradas, `index.html` e `landing.html`, e separa React/router, Motion, Radix e ícones em chunks manuais (`frontend/vite.config.ts:6-29`).
- As telas `/`, `/financeiro`, `/agenda`, `/treinos`, `/alimentacao` e `/perfil` são lazy. O fallback tem skeleton com `aria-busy`; rota desconhecida dentro da SPA redireciona a `/` (`frontend/src/App.tsx:29-47,49-116`).
- O fallback Apache cobre somente as cinco rotas não raiz declaradas; uma URL arbitrária acessada diretamente não é um catch-all do React (`.htaccess:13-25`).
- A navegação principal é centralizada e dividida em sidebar/topbar no desktop e bottom-nav no mobile; prefetch por hover/foco existe na navegação desktop, mas não na bottom-nav (`frontend/src/app/nav.ts:1-17`; `frontend/src/app/routeLoaders.ts:1-20`; `frontend/src/components/Dashboard/TopNavBar.tsx:25-112`; `frontend/src/components/Dashboard/BottomNav.tsx:8-46`).
- O shell usa topbar/bottom-nav abaixo de `md`, sidebar em `md+`, padding responsivo e largura máxima de conteúdo (`frontend/src/App.tsx:85-126`; `frontend/src/index.css:90-104,199-248`).

### PROPOSTA

- Preservar as rotas atuais e adicionar teste de deep link para cada uma, inclusive 404 direto no servidor.
- Aplicar prefetch também a foco/toque intencional na bottom-nav, sem baixar todos os módulos antecipadamente em rede limitada.
- Definir matriz de viewports mínima: 320, 360, 390, 768, 1024, 1280 e 1440 px, portrait e landscape.

### BLOQUEADO POR AMBIENTE

Layout real, overflow, teclado virtual, zoom, latência dos chunks, fallback Apache efetivo e comportamento de deep links dependem de navegador/servidor.

## 2. Tema, CSP e contraste

### EXISTENTE

- O tema escuro é padrão; o claro troca fundos/superfícies, mas mantém o aqua de marca. `#31e6d4` sobre `#f7f9f9` resulta em contraste aproximado de 1,5:1. O texto `.text-primary` recebe `#087c72`, porém `--color-primary`, `--color-ring`, outlines, fundos e SVGs permanecem claros (`frontend/src/index.css:12-81,106-137`).
- O foco global usa outline de 2 px em `var(--color-primary)`, portanto herda o contraste insuficiente no tema claro (`frontend/src/index.css:509-516`).
- O HTML contém script inline de bootstrap, mas tanto a meta CSP quanto o header Apache declaram `script-src 'self'` sem nonce/hash. O script lê `orby_theme`; o runtime lê e persiste `level-os:theme` (`frontend/index.html:6-19`; `.htaccess:29-42`; `frontend/src/lib/theme.ts:1-35`).
- Há conformidades de defesa em profundidade: `object-src 'none'`, `frame-ancestors 'none'`, HSTS, `nosniff`, `DENY`, Permissions-Policy e escape dos metadados injetados no shell (`.htaccess:27-42`; `app/Shared/DashboardView.php:32-67`).

### PROPOSTA

- Criar token semântico `--color-focus`/`--color-primary-interactive` com pelo menos 3:1 contra cada superfície; reservar o aqua claro para marca/decorativo.
- Externalizar o bootstrap de tema ou autorizá-lo com hash/nonce gerado pelo shell. Usar uma única chave (`level-os:theme`) antes da primeira pintura.
- Verificar contraste de texto em 4,5:1 e componentes/foco em 3:1 em todos os estados: normal, hover, focus, disabled, error e selected.

### BLOQUEADO POR AMBIENTE

A CSP final depende de Apache/mod_headers/CDN; contraste após transparência/composição e existência de FOUC exigem inspeção renderizada.

## 3. Acessibilidade, movimento, tabs, alvos e safe-area

### Conformidades EXISTENTES

- Skip links existem no app e na landing; navegações têm nomes acessíveis (`frontend/src/App.tsx:85-87`; `frontend/src/marketing/LandingPage.tsx:226-230`).
- `MotionConfig reducedMotion="user"` envolve o app; CSS reduz animações/transições; landing omite barra de progresso e animações relevantes quando solicitado (`frontend/src/App.tsx:128-131`; `frontend/src/index.css:545-590`; `frontend/src/marketing/LandingPage.tsx:87-108,135-189`).
- O Product Tour implementa `tablist`, `tab`, `tabpanel`, `aria-controls`, roving `tabIndex` e setas com wrap de foco (`frontend/src/marketing/MarketingProductSections.tsx:236-270`).
- Em ponteiro coarse, botões, inputs e links da bottom-nav recebem altura mínima de 44 px (`frontend/src/index.css:518-543`).
- O canvas decorativo é `aria-hidden`; skeletons e vários erros usam `aria-busy`, `role=status` ou `role=alert` (`frontend/src/components/ui/ShaderBackground.tsx:265-274`; `frontend/src/App.tsx:41-47`).

### Lacunas EXISTENTES

- As tabs dos agentes têm roles e relacionamento, mas não roving `tabIndex` nem navegação por setas (`frontend/src/marketing/LandingPage.tsx:269-294`).
- Tabs de Nutrição/Treino não têm o padrão completo de `id`/`aria-controls`/tabpanel/setas; em Nutrição os alvos são `min-h-10` (`frontend/src/modules/nutrition/NutritionScreen.tsx:92-111`; `frontend/src/modules/training/TrainingScreen.tsx:33-54`).
- O lightbox trata Escape e foca o botão fechar, mas não há trap nem restauração explícita ao gatilho (`frontend/src/marketing/MarketingProductSections.tsx:179-197`).
- Safe-area aparece somente no `padding-bottom` da bottom-nav; não cobre topo, laterais, landscape ou CTA sticky (`frontend/src/index.css:236-248`).
- Reduced motion desacelera o shader para 20 FPS e 28% da velocidade, mas não o congela/desliga (`frontend/src/components/ui/ShaderBackground.tsx:185-274`).

### PROPOSTA

Usar o Product Tour como implementação canônica de tabs; garantir 44×44 px também em ponteiro fine; aplicar `env(safe-area-inset-*)` nos quatro lados; restaurar foco em diálogos; em reduced motion, renderizar um frame estático do shader ou apenas o gradiente.

## 4. Estados loading, empty, error e paywall

### EXISTENTE

- Há skeleton de rota acessível, 503 explícito sem build e estados empty/error/retry em vários módulos (`frontend/src/App.tsx:41-47`; `app/Shared/DashboardView.php:81-89`; `frontend/src/modules/nutrition/NutritionScreen.tsx:58-76`; `frontend/src/modules/training/TrainingScreen.tsx:28-38`).
- Nutrição inicia `loading` com `plan=null`, mas a tela não distingue esse estado e pode mostrar “Nenhuma dieta montada” antes da resposta (`frontend/src/modules/nutrition/store.tsx:52-73`; `frontend/src/modules/nutrition/NutritionScreen.tsx:58-76`).
- Suspense de modais, assistente e onboarding usa `fallback=null`, gerando espera silenciosa (`frontend/src/App.tsx:117-124`).
- O paywall só é ativado em `status === 'ready' && !subscription.access`. Em `loading`, as rotas/controles são exibidos; em erro, o estado preview com acesso permanece e o shell não apresenta erro global. Isso é **fail-open visual** (`frontend/src/App.tsx:49-65,85-125`; `frontend/src/modules/subscription/store.tsx:18-38,57-76`).
- Quando `ready` sem acesso, o paywall substitui rotas, bottom-nav e overlays, e oferece checkout/export/logout com alerta (`frontend/src/modules/subscription/ExpiredPaywall.tsx:7-48`).

### PROPOSTA

- Gate visual **fail-closed para escrita**: durante `loading` ou `error`, permitir somente leitura já carregada e desabilitar ações mutáveis com mensagem humana e retry. O backend continua sendo autoridade.
- Não renderizar empty state enquanto `status=loading`; usar skeleton. Dar fallback visível a chunks de modal/assistente.
- Diferenciar `loading`, `empty`, `stale`, `offline`, `locked`, `forbidden` e `error`, com ação de recuperação específica.

### BLOQUEADO POR AMBIENTE

O achado prova exposição visual, não bypass: enforcement de cada endpoint, respostas reais e reconciliação após falha exigem teste integrado.

## 5. Progresso demo, providers, listas e Nutrição

### EXISTENTE

- `ProgressProvider` inicia usuário remoto com `DEMO_PROGRESS` (nível 7/5.920 XP) e status `loading`; a UI não é ocultada até a resposta. Há janela de flash de dados demo (`frontend/src/modules/progress/store.tsx:42-52,77-132`).
- Telas são lazy, mas Identity, Preferences, Subscription, Progress, AppContext, Search, Calendar, Finance, Training, Nutrition e Assistant são importados/montados em toda rota. Subscription e Progress fazem carga no mount (`frontend/src/App.tsx:1-26,128-161`; `frontend/src/modules/subscription/store.tsx:57-76`; `frontend/src/modules/progress/store.tsx:103-132`).
- Não há biblioteca de virtualização nas dependências e as listas relevantes usam `.map()` direto. O parser limita lista de compras a 80 itens, mas não há estratégia geral para históricos extensos (`frontend/package.json:20-42`; `frontend/src/modules/nutrition/store.tsx:31-43`; `frontend/src/modules/nutrition/NutritionScreen.tsx:92-148,184-207`).
- **Nutrition double refresh, qualificação:** o provider não chama `refresh` no mount; `NutritionScreen` chama uma vez. Em desenvolvimento, `StrictMode` pode repetir o efeito de mount, e `refresh` não deduplica/aborta; em produção é uma chamada por mount/retorno à rota. Não há refresh duplo estrutural provider+tela (`frontend/src/main.tsx:49-61`; `frontend/src/modules/nutrition/store.tsx:50-100`; `frontend/src/modules/nutrition/NutritionScreen.tsx:37-39`).

### PROPOSTA

- Estado remoto de progresso deve começar neutro/skeleton, nunca demo; demo somente em modo explicitamente local.
- Montar providers por rota/domínio ou separar contextos leves de efeitos de rede.
- Virtualizar apenas após medir, começando por extrato/históricos; antes disso, paginação/limites e render incremental.
- Deduplicar fetch de Nutrição por Promise em voo + `AbortController`; não usar a duplicação de dev como evidência de problema em produção.

## 6. Budgets, shader e performance

### EXISTENTE

- Rotas lazy, chunks manuais, Sentry após `load` e Web Vitals em idle são boas medidas (`frontend/vite.config.ts:11-29`; `frontend/src/main.tsx:20-54`; `frontend/src/lib/webVitals.ts:1-36`).
- O budget lê `stat().size` de cada arquivo e compara com limite bruto. Não soma entry + dependências, não mede gzip/Brotli e não falha por chunk esperado ausente (`frontend/scripts/check-bundle-budget.mjs:5-28`).
- O shader limita DPR, pede GPU low-power, usa 30 FPS/20 FPS, pausa em invisibilidade/scroll, observa tema, libera recursos e tem fallback CSS (`frontend/src/components/ui/ShaderBackground.tsx:96-274`). Ainda monta em todas as rotas e continua animado em reduced motion (`frontend/src/App.tsx:85-88`; `frontend/src/components/ui/ShaderBackground.tsx:185-274`).
- O RUM mede CLS/INP/LCP apenas no app autenticado; a landing não inicia Web Vitals (`frontend/src/lib/webVitals.ts:1-36`; `frontend/src/marketing/main.tsx:1-21`).

### PROPOSTA

- Budget por experiência: total inicial, JS/CSS por rota, gzip/Brotli, número de requests, long tasks e baseline de regressão.
- Shader opt-in por capacidade: estático em reduced motion e low-power; medir custo GPU/energia; não montar se invisível por design.
- Adicionar RUM first-party da landing com amostragem e sem query sensível.

### Validação executada em 2026-08-26

Após a correção da landing, `npm.cmd run validate` passou com **41 arquivos / 151 testes**, typecheck, build e budgets. O artefato gerou `landing-BfzQ62LB.js` com 43,00 kB (gzip 12,89 kB), sem referência ao chunk `motionFeatures`; esse chunk permanece somente para outros caminhos do app. Os maiores chunks continuaram dentro dos limites (`vendor-motion` 92,49 kB bruto / 32,61 kB gzip; `vendor-react` 233,13 kB / 74,66 kB).

Capturas do build servido localmente confirmaram o hero completo em desktop 1440×1000 e mobile emulado por CDP 390×844. No mobile real emulado: `innerWidth=clientWidth=scrollWidth=390`, H1/descrição/CTAs dentro do viewport, fontes carregadas e opacidade computada `1` para `.hero-copy` e `.hero-product`. O Vite Preview isolado retornou 404 apenas para `/manifest.json`, que fica na raiz do deploy e não dentro de `frontend/dist`; o contrato de referência desse arquivo continua coberto por teste. Evidências: `.playwright-mcp/landing-visible-desktop.png` e `.playwright-mcp/landing-visible-mobile-cdp.png`.

### Cartões e faturas — slice 1 (2026-08-26)

A aba Contas passou a distinguir fato de estimativa por cartão: fatura atual informada, limite informado e disponível calculado ficam separados de “após fechamento · estimativa” e “parcelas futuras · estimativa”, com aviso quando lançamentos no próprio dia do fechamento não podem ser classificados. Estimativas não são somadas à fatura nem descontadas do limite, e o excedente aparece como “Excedente”. A barra de uso expõe `role="meter"` com `aria-valuetext` em reais. Detalhes, fórmulas e o limite de “fatura confirmada” estão em [14](./14-escopo-pwa-e-especificacoes.md#91-cartões-e-faturas--slice-1-entregue). Gate após a mudança: 43 arquivos / 157 testes, build e budgets verdes.

### BLOQUEADO POR AMBIENTE

Compressão/cache do servidor, Web Vitals reais, GPU/energia e renderização autenticada não foram medidos. Lighthouse, trace, leitor de tela e dispositivo nativo permanecem pendentes.

## 7. PWA

> **Atualização 2026-08-26 — PWA-01 corrigido.** Com o escopo PWA-only, a cadeia foi fechada: `manifest.json` passou a ser referenciado por `frontend/index.html` e `frontend/landing.html`; `frontend/src/lib/pwa.ts` registra `/sw.js` no escopo `/` após o `load`, com atualização ao voltar à aba e um único reload por sessão quando a nova versão assume; `sw.js` subiu para `level-os-static-v4`, passou a cachear `/frontend-assets/` como cache-first (hash imutável), manteve `/assets/` em network-first, ignora navegação/documento/query/API e tolera asset ausente no precache em vez de abortar a instalação. O bootstrap de tema saiu do inline bloqueado pela CSP para `/theme-boot.js`, agora lendo `level-os:theme` — o que também resolve **FE-02**. Contrato declarado: **instalável e online-first**; nenhum HTML autenticado ou resposta de API é cacheado, portanto offline completo do painel não é prometido. Cobertura: `frontend/src/test/PwaContract.test.ts`, 11 casos. Instalação real, atualização em dispositivo e Lighthouse seguem pendentes.

### EXISTENTE

- `manifest.json` declara `standalone`, `start_url`, cores e ícones (`manifest.json:1-17`).
- O shell de autenticação referencia o manifest, mas `frontend/index.html` e `frontend/landing.html` não. A busca estática não encontrou `navigator.serviceWorker.register` no fonte (`app/Shared/AuthView.php:25-28`; `frontend/index.html:1-29`; `frontend/landing.html:1-38`).
- `sw.js` pré-cacheia somente `auth.css` e dois ícones, intercepta GET same-origin cujo path contém `/assets/`, usa network-first e nunca cacheia PHP/API. Chunks em `/frontend-assets/` também ficam fora (`sw.js:1-36`; `.htaccess:55-61`).
- A opção é prudente para dados privados, mas não cria app shell offline. `addAll` faz a instalação falhar se um único item faltar (`sw.js:5-13`).

### PROPOSTA

1. Referenciar manifest nos documentos que devem ser instaláveis.
2. Registrar o SW explicitamente com fluxo de atualização e telemetria não sensível.
3. Decidir produto: PWA apenas instalável/online ou shell offline. Se online, comunicar falha de rede claramente; se offline, cachear apenas assets públicos versionados, nunca respostas autenticadas/API.
4. Alinhar `scope`, `start_url`, ícones, atalhos e theme-color aos caminhos reais.

### BLOQUEADO POR AMBIENTE

Installability, controle por SW legado, atualização, escopo e comportamento offline exigem perfil limpo no navegador. Claims de PWA não estão validados por esta inspeção.

## 8. Landing: renderização, SEO, legal, claims, funil, analytics e performance

### EXISTENTE

- A landing é client-only: o body contém apenas `#landing-root` + módulo JS. Sem JavaScript não há conteúdo nem funil (`frontend/landing.html:1-38`).
- Há metadados estáticos úteis: description, canonical, OpenGraph/Twitter, preload e JSON-LD (`frontend/landing.html:5-35`).
- CTAs de cadastro/login são URLs absolutas de produção; isso dá destino claro, mas não preserva query/hash no destino e força produção em preview/staging (`frontend/src/marketing/LandingPage.tsx:212-264,307-316`; `frontend/src/marketing/MarketingProductSections.tsx:236-310`).
- O footer só oferece Entrar/Criar conta; não há links visíveis de Privacidade/Termos (`frontend/src/marketing/LandingPage.tsx:312-316`).
- A demo é rotulada como local/dados de demonstração e há disclaimer profissional no FAQ (`frontend/src/marketing/LandingPage.tsx:119-133,269-299`; `frontend/src/marketing/MarketingProductSections.tsx:138-145,199-220`).
- Claims como “130 testes”, “4 integrações”, “PWA instalável”, período/preço/recursos precisam de evidência operacional; o código apenas os apresenta (`frontend/src/marketing/MarketingProductSections.tsx:293-310`).
- Analytics first-party preserva `pathname + search + hash` no campo `path` do evento, limitado a 160 caracteres, e envia `cta_click` + `signup_started` no clique para cadastro. O destino do CTA, porém, não recebe query/hash; `signup_started` significa intenção de clique, não início comprovado do formulário (`frontend/src/marketing/analytics.ts:1-25`; `api/marketing-event.php:7-47`).
- Se `sendBeacon` existir e retornar `false`, não há fallback para `fetch` (`frontend/src/marketing/analytics.ts:3-11`).

### PROPOSTA

- Pré-render/SSR da mensagem essencial, pricing, FAQ e links legais; progressive enhancement para demos.
- Definir matriz de claims com owner, fonte, data de validade e comportamento quando não comprovado.
- Propagar somente parâmetros UTM allowlisted ao cadastro; nunca query arbitrária. Separar `cta_clicked`, `registration_viewed` e `registration_submitted`.
- Adicionar Privacidade, Termos, contato e informação de limites profissionais no footer.
- Medir a landing separadamente e carregar seções pesadas abaixo da dobra sob demanda.

### BLOQUEADO POR AMBIENTE

Indexação real, headers, consentimento/retensão de analytics, Core Web Vitals, conversão e veracidade operacional dos claims não são inferíveis apenas do fonte. Em Chrome headless isolado, as capturas iniciais desktop (1440×900) e mobile (390×844) mostraram navegação/logo, grid de fundo e área principal vazia; as imagens fornecidas na sessão confirmam esse estado. Como a captura ocorreu em ~1,2 s e a tentativa com espera de 5 s travou no harness, a causa e persistência ficam **inconclusivas** até teste Playwright/Lighthouse reproduzível (`VAL-UI-01` em [12](./12-validacoes-residuos-limitacoes.md)).

## 9. Matriz de conformidade e cobertura proposta

| Superfície | EXISTENTE / conformidade | Lacuna observada | PROPOSTA de verificação | BLOQUEADO POR AMBIENTE |
|---|---|---|---|---|
| Desktop 1280/1440 | Sidebar, max-width, grids e rotas lazy | providers eager; listas extensas | sidebar aberta/fechada, seis rotas, deep links, loading/error/paywall | pixels, overflow, rede |
| Desktop teclado | skip link; Product Tour com setas | tabs de agentes/Nutrição incompletas; lightbox sem trap/restore | Tab/Shift+Tab/setas/Escape/retorno de foco | leitor de tela/foco real |
| Mobile 320/360/390 | topbar + bottom-nav; alvo coarse 44 px | safe-area só inferior; prefetch ausente; tabs 40 px | notch nos quatro lados, landscape, teclado virtual, menu/CTA | dispositivo/browser |
| Tablet 768/1024 | breakpoint estrutural `md` | transição entre navs não validada | rotação, zoom 200%, split view | renderização |
| Tema escuro | tokens e contraste visual provável | não medido em composição | estados/foco/gráficos | medição renderizada |
| Tema claro | `.text-primary` escurecido | aqua ~1,5:1 em foco/ícone/borda | tokens semânticos 3:1/4,5:1 | composição final |
| Reduced motion | MotionConfig + CSS global | shader continua em 20 FPS | frame estático e nenhum auto-motion | CPU/GPU real |
| Loading/empty/error | skeletons, alerts e empty states | Nutrição pisca empty; fallbacks nulos | matriz uniforme por domínio | timing real |
| Paywall | bloqueio completo em `ready` sem acesso | loading/error fail-open visual | read-only fail-closed para escrita | guards dos endpoints |
| PWA | manifest e SW mínimo | sem link/registro; sem shell offline | perfil limpo, install/update/offline/privacy | Lighthouse/browser |
| Performance | lazy/chunks/RUM app | budget bruto isolado; sem RUM landing | total/gzip/Brotli/Web Vitals/baseline | build e produção |
| SEO/legal | metadata/JSON-LD/disclaimer | client-only; sem links legais | pré-render + links + claims versionados | crawler/produção |

## 10. Ordem recomendada

A ordem abaixo preserva a classificação global **P0=0**; prioridade é do risco existente, não da proposta.

1. **P1:** unificar bootstrap de tema e CSP sem inline não autorizado.
2. **P1:** decidir e completar o contrato PWA; até lá, remover/qualificar claims de instalabilidade.
3. **P1:** impedir flash demo de progresso e empty prematuro de Nutrição.
4. **P2:** tornar escrita visual fail-closed em assinatura `loading/error`, mantendo toda autorização no servidor.
5. **P2:** corrigir tokens de contraste/foco no tema claro e completar tabs/foco/safe-area/reduced-motion.
6. **P2:** substituir budget por experiência, medir landing/app separadamente e reproduzir `VAL-UI-01` com browser controlado.

As propostas não são funcionalidades existentes. Resultados executados e limitações estão em [12](./12-validacoes-residuos-limitacoes.md).