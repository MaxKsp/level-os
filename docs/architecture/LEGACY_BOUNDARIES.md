# Legacy Boundaries

## Objetivo

Definir o que e legado durante a migracao e como esse legado deve se comportar.

## Arquivos legados publicos

Estes arquivos continuam sendo a superficie publica da aplicacao durante a
migracao:

- `index.php`
- `login.php`
- `register.php`
- `logout.php`
- `verify-email.php`
- `auth-google-start.php`
- `auth-google-callback.php`
- `cron-notify.php`
- `api/*.php`

## Arquivos legados internos relevantes

- `auth.php`
- `db.php`
- `finance.php`
- `plan.php`
- `ofx.php`
- `totp.php`

## Regra de comportamento do legado

- continua responsavel pela compatibilidade externa
- pode delegar para `app/`
- nao recebe regra nova da migracao
- nao e removido antes da fase final correspondente

## Adapters temporarios

Quando uma migracao comecar, o arquivo legado podera virar adapter temporario:

- recebe request no caminho antigo
- chama a implementacao nova em `app/`
- devolve a mesma resposta publica

## Condicao para aposentadoria do legado

Um arquivo legado so pode ser removido quando:

1. a implementacao nova cobrir integralmente seu comportamento
2. a compatibilidade externa deixar de depender dele
3. a fase correspondente prever sua retirada explicitamente
