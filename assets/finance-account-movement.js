/**
 * Movimento de conta/cartão ao lançar, editar ou excluir uma despesa
 * (Fase 10, recorte 1). Extraído de assets/app.js sem mudar assinatura,
 * comportamento ou chamadores: mesma função global, mesmo shape de
 * accounts_v2. Carregado antes de assets/app.js em index.php.
 */

/** sign +1 aplica a despesa na conta (debita saldo / soma fatura); -1 estorna. */
function applyAccountMovement(accounts, accountId, value, sign){
  const a = accounts.find(x=>x.id===accountId);
  if (!a) return;
  if (a.tipo==='cartao') a.fatura = Number(a.fatura||0) + sign*value;
  else a.saldo = Number(a.saldo||0) - sign*value;
}
