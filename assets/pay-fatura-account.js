/**
 * Pagamento de fatura de cartão a partir do detalhe da conta (Fase 11,
 * recorte 1). Extraído de assets/app.js sem mudar assinatura,
 * comportamento ou chamadores: mesma função global, mesmas chamadas de
 * storeSet(), mesmo shape de accounts_v2/expense_lines_v4. Depende de
 * getAccounts, getExpenseLines, storeSet, refreshDetail, renderFinance,
 * toast, genId, dkey, pad e fmtMoney, todas definidas em assets/app.js —
 * por isso este arquivo precisa ser carregado junto (mesmo escopo global
 * de <script>), não isolado. Carregado antes de assets/app.js em
 * index.php.
 */

async function payFaturaAccount(acc){
  if (acc.tipo!=='cartao' || Number(acc.fatura)<=0) return;
  const valor = Number(acc.fatura);
  if (!confirm(`Pagar a fatura de ${fmtMoney(valor)} do cartão "${acc.label}"?\n\nZera a fatura e registra a saída de hoje nas despesas.`)) return;
  const accounts = await getAccounts();
  const a = accounts.find(x=>x.id===acc.id); if (!a) return;
  a.fatura = 0;
  const lines = await getExpenseLines();
  lines.push({ id: genId(), label: 'Pagamento fatura — ' + a.label, value: valor,
    date: dkey(new Date()), time: pad(new Date().getHours())+':'+pad(new Date().getMinutes()),
    recorrencia: 'none', categoria: 'outros', method: 'pix', bank: a.bank, createdAt: Date.now() });
  await storeSet('accounts_v2', accounts);
  await storeSet('expense_lines_v4', lines);
  await refreshDetail(); renderFinance();
  toast('Fatura paga');
}
