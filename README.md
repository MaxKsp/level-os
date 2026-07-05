# Orby

Rotina e finanças pessoais em um único painel.

O Orby junta duas coisas que normalmente vivem em apps separados: a agenda
da sua rotina diária e o controle do seu dinheiro. A proposta é abrir uma
tela só de manhã e saber o que fazer e como está o caixa — sem planilha,
sem três assinaturas diferentes.

Construído de propósito para rodar em hospedagem compartilhada comum
(PHP + MySQL): sem framework, sem etapa de build, sem dependência de
serviços pagos. Um front-end vanilla e uma API PHP enxuta.

## Funcionalidades

**Agenda**
- Rotina semanal com horários e categorias (treino, trabalho, estudo...)
- Checklist do dia, sequência de dias cumpridos e taxa de conclusão
- Mapa de calor de conclusão e gráficos dos últimos 30 dias
- Alarme de tarefa com notificação do navegador

**Financeiro**
- Contas e cartões com saldo e fatura
- Despesas avulsas e recorrentes mensais, com data e horário
- Rendas fixas, temporárias e variáveis (com lançamento diário)
- Gráficos por banco, categoria e forma de pagamento, filtrados por
  dia / semana / mês / ano
- Mapa de calor de gastos que muda de granularidade com o período
  (hora → dia → mês)

**Plataforma**
- Multiusuário: cadastro com e-mail, dados totalmente isolados por conta
- Verificação em duas etapas (TOTP) com QR code e códigos de backup
- Login com Google (OAuth 2.0)
- Temas de cor e preferências sincronizadas entre dispositivos
- PWA instalável no celular
- Backup e restauração completos em JSON
- Aviso de tarefa por e-mail via cron, para quando o app está fechado

## Stack

| Camada | Escolha |
|---|---|
| Front-end | Vanilla JS + Chart.js (CDN), arquivo único |
| Back-end | PHP 8 + MySQL, PDO com prepared statements |
| Auth | Sessão PHP, bcrypt, TOTP (RFC 6238) implementado sem libs |
| Infra | Hospedagem compartilhada (Hostinger), deploy via GitHub Actions + FTPS |

Decisões de segurança: CSRF token em todo POST, rate-limit de login/2FA/
cadastro por IP, CSP + HSTS + headers de proteção via `.htaccess`,
`config.php` fora do versionamento, gzip e cache de assets.

Performance: o front-end carrega todos os dados do usuário em uma única
requisição no login e mantém cache em memória — navegar entre abas não
toca a rede.

## Rodando localmente

Requer PHP 8.x com `pdo_mysql` e um MySQL acessível.

```bash
cp config.example.php config.php   # credenciais do seu MySQL local
# rode schema.sql no banco (e os ALTERs comentados, se estiver atualizando)
php -S localhost:8080
```

Abra `http://localhost:8080` e crie uma conta em "Criar conta".

## Deploy

O workflow [.github/workflows/deploy.yml](.github/workflows/deploy.yml)
publica o repositório no `public_html` via FTPS a cada push na `master`.
Secrets necessários (Settings → Secrets and variables → Actions):

| Secret | Valor |
|---|---|
| `FTP_SERVER` | host FTP da hospedagem |
| `FTP_USERNAME` | usuário FTP |
| `FTP_PASSWORD` | senha FTP |
| `FTP_SERVER_DIR` | normalmente `/public_html/` |

Configuração única no servidor (nunca versionada nem sobrescrita pelo
deploy):

1. Criar o banco e rodar `schema.sql` no phpMyAdmin
2. Criar `config.php` a partir do `config.example.php`
3. Ativar o SSL da hospedagem (o `.htaccess` força HTTPS)

### Login com Google

Crie um OAuth Client ID (tipo Web) no
[Google Cloud Console](https://console.cloud.google.com/), com redirect
`https://SEU-DOMINIO/auth-google-callback.php`, e preencha
`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` no `config.php`. Se o domínio
mudar, atualize o redirect no Google Cloud também.

### Aviso de tarefas por e-mail

1. Gere um token: `php -r "echo bin2hex(random_bytes(24)), PHP_EOL;"`
2. Defina `CRON_SECRET` no `config.php`
3. Crie um Cron Job a cada 10 minutos:
   `php /home/SEU_USUARIO/public_html/cron-notify.php SEU_TOKEN`

O usuário ativa/desativa o aviso em Perfil → Notificações.

## Estrutura

```
index.php                 app inteiro (HTML + CSS + JS), atrás de login
login.php / register.php  autenticação: senha, 2FA e Google
auth.php                  sessão, CSRF, rate-limit, fluxo de 2FA
totp.php                  TOTP (RFC 6238) em PHP puro, validado contra os
                          vetores de teste da RFC
api/data.php              chave-valor do usuário (bootstrap ?all=1)
api/export|import.php     backup completo em JSON
api/totp-*.php            ativar / confirmar / desativar 2FA
api/me.php, api/prefs.php dados e preferências do usuário
cron-notify.php           aviso de tarefas por e-mail (protegido por token)
manifest.json, sw.js      PWA
schema.sql                criação e migração das tabelas
```

## Contribuindo

Uma branch `feature/...` por melhoria, PR contra a `master`. O backlog
priorizado vive no [ROADMAP.md](ROADMAP.md).

Convenção de commits: `feat:`, `fix:`, `sec:`, `chore:`, `docs:`.
