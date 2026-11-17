# Level OS Mobile

## Arquitetura da primeira versão

O app nativo usa Capacitor 8 dentro do mesmo projeto React/Vite do frontend.
Não existe um segundo frontend, outro `src` ou outro lockfile.

Nesta primeira etapa o WebView abre `https://lvlos.com` para preservar a sessão
PHP, os cookies seguros, o Google OAuth, o Mercado Pago e todas as rotas já
existentes. A URL pode ser sobrescrita durante desenvolvimento:

```powershell
$env:LEVELOS_MOBILE_APP_URL = "https://staging.lvlos.com"
npm run mobile:sync
```

O `server.url` do Capacitor é adequado apenas para esta fase de shell interno.
Antes de publicar nas lojas, migrar a autenticação mobile para tokens curtos
com refresh rotativo e empacotar o frontend localmente. Isso evita depender de
um site remoto dentro do WebView e reduz o risco de rejeição nas lojas.

## Pré-requisitos

- Node.js 22 ou superior.
- Java 21.
- Android Studio e Android SDK para Android.
- macOS com Xcode para compilar e assinar iOS.

## Comandos

```bash
cd frontend
npm ci
npm run mobile:sync
npm run mobile:android
```

No macOS:

```bash
cd frontend
npm ci
npm run mobile:ios
```

## Roadmap mobile

1. Shell Android/iOS e navegação segura no domínio Level OS.
2. Autenticação mobile por access token curto e refresh token rotativo.
3. Bundle React local com API remota versionada.
4. Notificações push e lembretes nativos.
5. Biometria para desbloqueio local.
6. Links universais para OAuth, redefinição de senha e pagamentos.
7. Testes em dispositivo, assinatura e publicação nas lojas.
