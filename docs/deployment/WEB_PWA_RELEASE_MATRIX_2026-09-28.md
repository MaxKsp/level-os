# Level OS — Matriz de produção Web/PWA (28–29/09/2026)

Base oficial para a release: `origin/master` em `bed764c6b23588469057948d0f4b4dc6b4e093a6`. Branch isolada de integração: `release/web-pwa-20260928` derivada dessa base. O projeto `mobile/` nativo e projetos Android/iOS ficam fora do escopo de publicação, mas devem ser preservados para trabalho posterior. O site responsivo/PWA continua no escopo.

## Evidências públicas observadas (somente GET/HEAD sem login)
- `https://lvlos.com/`: HTTP 200, landing Web. Sete referências de bundles CSS/JS com hashes correspondem exatamente ao build reproduzido de `origin/master`.
- `https://lvlos.com/login.php`: HTTP 200; `/auth-client.js`, `/theme-boot.js`, `/manifest.json`, `/sw.js`: HTTP 200.
- `/api/health.php`: HTTP 200 com `database`, `crypto`, `assistant_quality`, `telemetry` todos `true` (consulta 29/09/2026 UTC).
- Sem sessão, `/api/me.php`: HTTP 401; `/config.php` e `/schema.sql`: HTTP 403; `/dev-router.php`: HTTP 404.
- `/release.json` e `/theme-init.js`: HTTP 404; são arquivos do trabalho local mais antigo, não evidência de falha da produção atual. A master usa `theme-boot.js`.

## Matriz por componente
| Área | Evidência em produção | Mudanças fora da produção / ressalvas |
|---|---|---|
| Landing e identidade visual | Bundle de landing corresponde à master | Não substituir por `frontend/dist` produzido diretamente da branch antiga mobile. |
| Login, Supabase, perfil, MFA | Página e bundle públicos respondem; backend presente na master | Testar jornadas reais autenticadas; WIP local muda revogação e sessão e exige migration prévia. |
| Financeiro / extrato / OFX | Código da master está na release atualmente publicada, inferência corroborada pelo hash do build público | OFX atualizado nesta branch: dedupe por direção, renda variável, FITID e tratamento de upload; validar importação com conta teste. |
| Rotina, treino, alimentação, progresso | Rotas e módulos no código da master | Persistência em duas abas, eventuais conflitos, cálculos e idempotência exigem ensaio autenticado; ver `docs/audit/11-achados-priorizados.md`. |
| IA e seus agentes | `assistant_quality=true` no health, módulos em master | Provedores, token, guardrails e confirmação/undo não são comprovados somente pelo health. |
| Mercado Pago / assinatura | Backend e webhook presentes na master | Checkout/sandbox, cancelamento, refund, webhook e entitlement devem ser homologados separadamente. |
| Google Calendar / Resend / Sentry | Integrações presentes em master | Redação de logs/Sentry aprimorada nesta branch; credenciais e resultados externos não foram acessados. |
| PWA Web / responsivo | Manifest e service worker públicos HTTP 200 | Validar atualização/rollback de cache, acessibilidade e dispositivos reais. |
| Mobile nativo Expo/Capacitor | Fora da sincronização pública FTPS de master | Congelado para trilha própria; não apagar fontes nem misturar no release. |

## Trabalho local identificado como ainda não incorporado à master
- Branch de origem `feature/mobile-app`: `HEAD c24048a`, com dezenas de arquivos locais modificados; remoto dessa branch está em `c174764`.
- O histórico divergiu do `origin/master` em 26 commits exclusivos do master e 16 da feature. A master contém marketing, PWA, finanças, hardening de agente e workflow de deploy que não podem ser descartados.
- Grupo autenticação/sessões: `SessionPolicy.php`, Supabase revocation, TOTP, logout, recuperação e `migrations/2026-09-13-supabase-session-revocation.sql`. **Dependente de migration, ensaio de MFA e política de timeout; não foi selecionado para a release de baixo risco.**
- Grupo backup: `UserBackupCodec.php`, alterações em `api/import.php`, `cron-notify.php` e fluxo cifrado v3. **Requer restore em alvo isolado, compatibilidade de backups antigos e confirmação do cron no painel.**
- `scripts/prepare-release.mjs` da feature foi **deliberadamente não transplantado**: a master já tem landing compilada, health, rollback e artefatos próprios; usar o antigo pacote sem adaptação troca o contrato do site.
- `theme-init.js` da feature não foi transplantado: já existe `theme-boot.js` correto na master.

## Escopo desta branch de integração
- OFX: validação de método/upload, leitura limitada, deduplicação por direção e `income_var`, FITID repetido dentro do arquivo, IDs únicos e datas válidas, com regressões PHP/React.
- Performance: modal OFX carregado sob demanda, preservando o orçamento do chunk inicial FinanceScreen.
- Segurança de telemetria: erro operacional sem conteúdo sensível; Sentry sem query, mensagem de exceção ou path absoluto, com teste regressivo.
- Dependências de desenvolvimento: atualização compatível de ferramentas, incluindo Vitest/coverage 5.0.2. `npm audit` sem alertas após correção.
- **Nenhum arquivo de `mobile/`, `frontend/android/` ou `frontend/ios/` é modificado nesta branch.**

## Portões antes de publicar
1. CI completo em PR para `master`: PHP, Vitest, typecheck, budget de bundle e scanner de segredos; confirmação dos resultados sem baixar/logar segredos.
2. Backup criptografado da produção, fora de `public_html`, com restore testado em destino isolado; registrar identificador de rollback.
3. Comparar o diff da release apenas com a master e inspecionar código de PHP/JS publicado. Não executar migrations de sessão/backup junto com este lote.
4. Homologar login, MFA, sessão, lançamento financeiro, OFX, IA, plano/checkout e PWA com contas de teste; confirmar cron/redirects se esses recursos forem alterados.
5. Publicar por workflow existente somente após gates, validar hash da release, bundles, `/api/health.php`, acesso autenticado e caminho de rollback.

**Limite do inventário:** o hash dos bundles comprova correspondência do frontend público com a master; sem identificador de release anterior no servidor, não é possível provar byte a byte cada PHP protegido por HTTP. Os resultados funcionais autenticados dependem de acesso controlado e dados sintéticos.

## Resultado da validação local da branch de integração
- PHP: **51/51** testes aprovados, incluindo contrato novo de Sentry.
- Frontend: **175/175** testes aprovados em 46 arquivos; TypeScript, build Vite e budget aprovados.
- `FinanceScreen` após code splitting: **104,6 KiB**, abaixo do orçamento de **110 KiB**; `OfxImportModal` sob demanda: **6,2 KiB**.
- `php scripts/critical-smoke.php`: aprovado; `php scripts/production-readiness.php`: **40/40** itens aprovados.
- `npm audit` (inclusive devDependencies): **0** vulnerabilidades reportadas.
- Workflow preparado para gerar `release.json` com SHA efetivo do checkout e verificar rotas públicas/identidade após deploy; ausência desse marcador na produção anterior é esperada.
- Nenhum migration ou dado remoto alterado nesta verificação. A branch de integração está separada da árvore de trabalho antiga.
