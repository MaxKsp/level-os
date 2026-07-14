/**
 * Transferência entre contas, incluindo pagamento de fatura de cartão via
 * transferência (Fase 12, recorte 1). Extraído do corpo de
 * document.getElementById('trSave').onclick em assets/app.js, sem mudar
 * comportamento, validações ou o shape de accounts_v2/transfers. O
 * handler de clique continua em assets/app.js: só lê os campos do modal
 * (trFrom/trTo/trValue/trDate) e delega pra esta função.
 *
 * Depende de getAccounts, getTransfers, storeSet, renderFinance, toast e
 * genId, todas definidas em assets/app.js — por isso precisa do mesmo
 * escopo global de <script>. Carregado antes de assets/app.js em
 * index.php.
 */
async function transferBetweenAccounts(fromId, toId, value, date){
  if (!fromId || !toId || fromId===toId){ toast('Escolha contas diferentes.', {error:true}); return; }
  if (value<=0){ toast('Valor inválido.', {error:true}); return; }
  const accounts = await getAccounts();
  const from = accounts.find(a=>a.id===fromId), to = accounts.find(a=>a.id===toId);
  if (!from || !to) return;
  const toCard = to.tipo==='cartao';
  from.saldo = Number(from.saldo||0) - value;
  if (toCard) to.fatura = Math.max(0, Number(to.fatura||0) - value);
  else to.saldo = Number(to.saldo||0) + value;
  const tr = { id: genId(), fromId, toId, value, date, kind: toCard?'payment':'transfer', createdAt: Date.now() };
  const transfers = await getTransfers(); transfers.push(tr);
  await storeSet('accounts_v2', accounts);
  await storeSet('transfers', transfers);
  document.getElementById('transferModalOverlay').classList.remove('open');
  renderFinance();
  toast(toCard?'Fatura paga por transferência':'Transferência feita', { undo: async ()=>{
    const accs = await getAccounts();
    const f = accs.find(a=>a.id===fromId), t = accs.find(a=>a.id===toId);
    if (f) f.saldo = Number(f.saldo||0) + value;
    if (t){ if (toCard) t.fatura = Number(t.fatura||0) + value; else t.saldo = Number(t.saldo||0) - value; }
    let trs = await getTransfers(); trs = trs.filter(x=>x.id!==tr.id);
    await storeSet('accounts_v2', accs); await storeSet('transfers', trs);
    renderFinance();
  }});
}
