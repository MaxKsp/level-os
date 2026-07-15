/* ---- Confirmação final de importação de extrato OFX ---- */
async function confirmOfxImport(rows, picked, categoryFor){
  if (!picked.length){ toast('Nada selecionado.', {error:true}); return; }
  const expLines = await getExpenseLines();
  const incLines = await getIncomeLines();
  let nExp=0, nInc=0;
  picked.forEach(i=>{
    const r = rows[i];
    if (r.kind==='expense'){
      expLines.push({ id: genId(), label: r.desc || 'Importado', value: r.value, date: r.date,
        time: '12:00', recorrencia: 'none', categoria: categoryFor(i) || 'outros',
        method: 'outro', bank: 'outro', accountId: null, createdAt: Date.now() });
      nExp++;
    } else {
      incLines.push({ id: genId(), label: r.desc || 'Importado', value: r.value, type: 'variavel', endDate: null, createdAt: Date.now() });
      nInc++;
    }
  });
  if (nExp) await storeSet('expense_lines_v4', expLines);
  if (nInc) await storeSet('income_lines', incLines);
  document.getElementById('ofxModalOverlay').classList.remove('open');
  renderFinance();
  toast(`${nExp+nInc} lançamento(s) importado(s)`);
}
