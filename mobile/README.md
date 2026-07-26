# Level OS Mobile

Aplicativo nativo do Level OS para Android e iOS, desenvolvido com React Native,
Expo SDK 55 e Expo Router. Este projeto **não usa WebView** e não incorpora o
frontend web: cada tela é renderizada por componentes nativos.

## Arquitetura

- UI nativa em `src/app` e `src/components`;
- autenticação Supabase armazenada no Keychain/Keystore com SecureStore;
- ponte autenticada em `api/mobile-session.php` para reutilizar as APIs PHP;
- cookies de sessão, CSRF, rate limit e isolamento por usuário preservados;
- biometria via APIs nativas do aparelho;
- push via FCM/APNs e registro em `api/push-devices.php`;
- haptics nas ações principais.

## Configuração local

1. Copie `.env.example` para `.env.local`.
2. Informe a URL pública do backend e as chaves públicas do Supabase.
3. No Supabase, autorize o redirect `levelos://auth/callback`.
4. Coloque o `google-services.json` do app `com.lvlos.app` no caminho indicado
   em `app.json` ou ajuste `android.googleServicesFile`.
5. Aplique no MySQL a migration `migrations/2026-07-25-native-push.sql`.

## Executar no Android

```powershell
cd mobile
npm install
npm run validate
npx expo prebuild --platform android
npx expo run:android
```

O `run:android` exige um aparelho com depuração USB ou um emulador ativo. Para
push nativo, use um development build; o Expo Go não oferece todo o fluxo FCM.

## Estrutura das telas

- `login.tsx`: login, cadastro e Google OAuth nativos;
- `(app)/index.tsx`: visão geral;
- `(app)/finance.tsx`: contas e movimentações;
- `(app)/routine.tsx`: rotina com conclusão de tarefas;
- `(app)/training.tsx`: fichas e sessões;
- `(app)/profile.tsx`: plano, biometria, push e logout.

## Validação

```powershell
npm run validate
npx expo-doctor
```

As pastas `android/` e `ios/` são geradas pelo Expo e não são fonte de verdade.
