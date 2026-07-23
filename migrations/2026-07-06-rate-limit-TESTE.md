# Teste manual — rate limiting geral

## Pré (só no servidor/homolog, NÃO rodei em produção)
Rodar `migrations/2026-07-06-rate-limit.sql` no phpMyAdmin (cria `rate_hits`).

## Lógica (validada offline)
Janela fixa por `(bucket, subject)`. subject = user_id logado, senão IP.
Teste automatizado da lógica passou: bloqueia no limite, isola por
subject/bucket, reseta após a janela.

## Teste manual em homolog (curl, logado)
Login, pegar cookie de sessão, então martelar export (limite 10/min):

```bash
BASE=https://SEU-HOMOLOG
CJ=/tmp/cj.txt
# ... login gravando cookie em $CJ ...
for i in $(seq 1 12); do
  curl -s -o /dev/null -w "$i: %{http_code}\n" -b $CJ "$BASE/api/export.php"
done
```

Esperado: 10 primeiras `200`, 11ª e 12ª `429` (com header `Retry-After: 60`).
Após 60s, volta a `200`.

## Limites por endpoint (por minuto)
| endpoint | bucket | limite |
|---|---|---|
| api/data.php | data | 200 |
| api/export.php | export | 10 |
| api/import.php | import | 5 |
| api/avatar.php | avatar | 10 |
| api/me.php | me | 60 |
| api/prefs.php | prefs | 60 |
| api/totp-*.php | totp | 20 |

`data` é alto de propósito: cobre o bootstrap + cada save do front.
