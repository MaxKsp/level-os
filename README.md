# Orby (ex-Painel Max)

App pessoal de rotina (Agenda) e finanças (Financeiro). Front-end de página
única (`index.php`, HTML + CSS + JS) com um backend PHP + MySQL simples por
trás, pensado pra rodar em hospedagem compartilhada (Hostinger).

## Rodando localmente

Requer PHP (8.x) e um MySQL acessível.

```bash
cp config.example.php config.php   # preencha com as credenciais do seu MySQL local
# rode schema.sql no seu banco e insira o usuário (veja comentários no arquivo)
php -S localhost:8080
```

Depois abra `http://localhost:8080` — vai cair na tela de login.

Para os logos dos bancos aparecerem, a pasta `assets/bancos/` precisa estar
ao lado do `index.php` (já vem inclusa neste repositório).

## Estrutura

```
index.php               – app inteiro (HTML + CSS + JS em um arquivo só, atrás de login)
login.php/logout.php    – autenticação por sessão (senha, 2FA, botão Google)
register.php            – cadastro de novos usuários (multiusuário)
verify-email.php        – confirmação de e-mail (best-effort, ver nota abaixo)
auth.php                – helpers de sessão, CSRF, rate-limit e 2FA
totp.php                – implementação do TOTP (RFC 6238) em PHP puro, sem libs
auth-google-start.php    – inicia o login OAuth com Google
auth-google-callback.php – recebe o retorno do Google e cria/loga o usuário
db.php/config.php        – conexão MySQL (config.php não vai pro git)
schema.sql               – criação/atualização das tabelas (rodar no phpMyAdmin)
api/data.php             – get/set de chave-valor usado pelo front-end (com bootstrap ?all=1)
api/export.php           – gera o backup em JSON
api/import.php           – restaura um backup em JSON
api/me.php               – dados básicos do usuário logado (usado pela tela de Segurança)
api/totp-*.php           – ativar/confirmar/desativar 2FA
assets/bancos/*.svg      – logos dos bancos usados no seletor de conta/despesa
assets/qrcode.min.js     – lib de QR code vendorizada (gera o QR do 2FA sem depender de serviço externo)
ROADMAP.md               – backlog priorizado de melhorias
```

## Stack

- Vanilla JS, sem framework, + [Chart.js](https://www.chartjs.org/) via CDN
- Backend: PHP + MySQL (PDO, prepared statements)
- Multiusuário: cada usuário só enxerga seus próprios dados (`kv_store` particionado por `user_id`)
- Login: senha com hash, 2FA (TOTP + códigos de backup), login com Google (OAuth), CSRF token e rate-limit
- Persistência: tabela `kv_store` no MySQL, uma linha por chave usada pelo front-end. O front-end carrega
  tudo de uma vez no login (`api/data.php?all=1`) e mantém em cache em memória — trocar de aba não faz
  requisição nova, só escrever dado de fato.

## Deploy na Hostinger

### Passo único (manual, feito uma vez)

1. Crie o banco MySQL pelo hPanel e rode `schema.sql` no phpMyAdmin.
2. Gere o hash da sua senha: `php -r "echo password_hash('SUA_SENHA', PASSWORD_DEFAULT), PHP_EOL;"`
   e insira o usuário na tabela `users` (exemplo comentado no `schema.sql`).
3. Crie `config.php` **direto no servidor** (File Manager do hPanel) com as
   credenciais reais do banco — copie o conteúdo de `config.example.php` e
   preencha. Esse arquivo nunca é commitado nem enviado pelo deploy
   automático, então essa etapa só precisa ser feita uma vez.
4. Confirme que o SSL grátis da Hostinger está ativo — o `.htaccess` força HTTPS.

**Atualizando uma instalação que já existia antes do multiusuário/2FA/Google**:
o `schema.sql` só cria tabelas que não existem (`CREATE TABLE IF NOT EXISTS`),
então num banco que já tinha a tabela `users` da versão anterior, as colunas
novas (`email`, `google_id`, `totp_secret`, etc.) não aparecem sozinhas —
rode os comandos `ALTER TABLE` comentados no final de cada bloco do
`schema.sql` pra atualizar.

### Deploy automático (a cada push na `master`)

O workflow [.github/workflows/deploy.yml](.github/workflows/deploy.yml) sobe
o conteúdo do repositório pro `public_html` via FTPS a cada push na `master`
(ou manualmente pela aba Actions do GitHub). Ele **não** sobe `config.php`
nem `README.md`/`ROADMAP.md`/`.github`/`.claude` — o `config.php` do servidor
(criado no passo manual acima) nunca é sobrescrito nem apagado.

Configure em **Settings → Secrets and variables → Actions** do repositório
no GitHub:

| Secret            | Valor                                                    |
|-------------------|-----------------------------------------------------------|
| `FTP_SERVER`      | Host de FTP da Hostinger (hPanel → Arquivos → Contas FTP) |
| `FTP_USERNAME`    | Usuário FTP                                                |
| `FTP_PASSWORD`    | Senha FTP                                                  |
| `FTP_SERVER_DIR`  | Pasta de destino, normalmente `/public_html/`              |

Depois disso, `git push` na `master` já publica direto no site.

## Login com Google

Pra habilitar o botão "Entrar com Google":

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/) e crie
   um projeto novo (ou use um existente).
2. Vá em **APIs e serviços → Tela de consentimento OAuth**, escolha
   "Externo", preencha nome do app/e-mail de suporte e publique (pode ficar
   em modo "Teste" enquanto for só você usando).
3. Vá em **APIs e serviços → Credenciais → Criar credenciais → ID do cliente
   OAuth**, tipo **Aplicativo da Web**.
4. Em **URIs de redirecionamento autorizados**, adicione:
   `https://SEU-DOMINIO/auth-google-callback.php`
5. Copie o **Client ID** e o **Client Secret** gerados e cole no `config.php`
   do servidor:
   ```php
   define('GOOGLE_CLIENT_ID', 'xxxxxxxx.apps.googleusercontent.com');
   define('GOOGLE_CLIENT_SECRET', 'xxxxxxxx');
   ```

**Atenção**: se o domínio do site mudar depois (ex: sair do
`.hostingersite.com` temporário pra um domínio próprio), a URI de
redirecionamento precisa ser atualizada no passo 4 também, senão o login
com Google para de funcionar.

## E-mail (cadastro e verificação)

O cadastro em `register.php` pede um e-mail e tenta mandar uma mensagem de
confirmação via `mail()` nativo do PHP. Enquanto o site estiver no domínio
temporário da Hostinger, essa entrega **não é confiável** (pode cair em
spam ou nem sair) — por isso a verificação é só um selo extra, não bloqueia
o cadastro nem o login. Recuperação de senha por e-mail ainda não existe;
fica pro próximo ciclo, quando houver um domínio próprio conectado.

## Notificações

- **No navegador**: ative em Perfil → Notificações. O site pede permissão e
  avisa quando uma tarefa da agenda começa (funciona com o app aberto ou
  instalado como PWA — no celular, use "Adicionar à tela inicial").
- **Por e-mail** (funciona com o app fechado): ative o toggle em Perfil e
  configure o cron na Hostinger:
  1. Gere um token: `php -r "echo bin2hex(random_bytes(24)), PHP_EOL;"`
  2. Coloque no `config.php` do servidor: `define('CRON_SECRET', 'seu_token');`
  3. hPanel → Avançado → Cron Jobs → novo job a cada 10 minutos:
     `php /home/SEU_USUARIO/public_html/cron-notify.php seu_token`
- Push nativo com o app fechado (Web Push/VAPID) fica pra um ciclo futuro —
  ver ROADMAP.

## Backup

Dentro do app, o ícone de engrenagem no topo abre "Configurações", com botões
pra baixar um backup completo em `.json` e restaurar a partir de um arquivo.
Vale rodar o backup antes de qualquer mudança grande nos dados.

## Fluxo de contribuição

1. Crie uma branch a partir de `master`: `git checkout -b feature/nome-da-melhoria`
2. Faça as alterações em `index.php` (ou nos arquivos do backend)
3. Teste localmente (veja seção acima)
4. Commit e push da branch
5. Abra um Pull Request pra `master` no GitHub

Cada melhoria do `ROADMAP.md` deve virar uma branch/PR separada — evita
misturar mudanças não relacionadas num commit só e facilita reverter algo
específico se der problema.
