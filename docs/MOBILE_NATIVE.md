# Recursos nativos do Level OS

O app Capacitor usa a aplicação HTTPS de produção e adiciona capacidades nativas
sem armazenar senha, sessão ou token de autenticação no `localStorage`.

## Recursos implementados

- feedback háptico ao concluir ou reabrir uma tarefa;
- bloqueio biométrico local, com fallback para o código seguro do aparelho;
- permissão, registro e remoção do token de push nativo;
- token push isolado por usuário no backend;
- deep links push limitados às rotas conhecidas do Level OS.

As preferências locais de biometria e push são apenas booleanos, usam namespace
por usuário e não concedem acesso ao backend.

## Banco de dados

Execute uma vez:

```sql
SOURCE migrations/2026-07-25-native-push.sql;
```

No phpMyAdmin, abra a migration e execute o conteúdo diretamente.

## Android: Firebase Cloud Messaging

O plugin compila sem credenciais, mas não registra nem recebe notificações até o
Firebase estar configurado:

1. crie um projeto no Firebase;
2. registre um app Android com o package `com.lvlos.app`;
3. baixe `google-services.json`;
4. coloque o arquivo em `frontend/android/app/google-services.json`;
5. execute `cd frontend && npm run mobile:sync`;
6. gere novamente o APK pelo Android Studio.

`google-services.json` não deve conter segredo de servidor, mas deve ser mantido
no ambiente correto para evitar misturar desenvolvimento e produção.

## iOS: APNs

No Xcode:

1. ative `Push Notifications` em Signing & Capabilities;
2. ative `Background Modes > Remote notifications`;
3. configure uma chave APNs no provedor que enviará as notificações;
4. mantenha `NSFaceIDUsageDescription` no `Info.plist`.

## Validação

```powershell
cd frontend
npm run validate
npm run mobile:sync
cd android
.\gradlew.bat assembleDebug
```

O APK de debug é gerado em:

`frontend/android/app/build/outputs/apk/debug/app-debug.apk`

## Limite atual

O app registra os dispositivos, mas o envio automático ainda precisa de um
worker/cron que leia os lembretes e entregue mensagens via FCM/APNs. Web Push
VAPID é uma integração separada e ainda não está implementada.
