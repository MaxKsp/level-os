function irMonthRange(year, m){ return { start:new Date(year,m,1), end:new Date(year,m+1,0) }; }
function buildIrData(year, expLines, incLines, entries){
  const months = [], catTotals = {};
  let annualExp=0, annualInc=0, incFixed=0, incVar=0, incTemp=0, incIfood=0;
  for (let m=0;m<12;m++){
    const range = irMonthRange(year,m);
    const mkey = year+'-'+pad(m+1);
    let mExp=0;
    expLines.forEach(e=>{
      const v = expenseTotalInRange(e, range);
      if (v>0){ mExp+=v; catTotals[e.categoria]=(catTotals[e.categoria]||0)+v; }
    });
    let mInc=0;
    incLines.forEach(l=>{
      if (l.createdAt){ const cd=new Date(l.createdAt); const ckey=cd.getFullYear()+'-'+pad(cd.getMonth()+1); if (ckey > mkey) return; }  // ainda não existia neste mês
      if (!isIncomeActive(l, range.start)) return;
      const val=Number(l.value||0); mInc+=val;
      if (l.type==='variavel') incVar+=val; else if (l.type==='temporaria') incTemp+=val; else incFixed+=val;
    });
    const mIfood = entries.filter(en=> en.date && en.date.slice(0,7)===mkey).reduce((s,en)=>s+Number(en.valor||0),0);
    mInc+=mIfood; incIfood+=mIfood;
    annualExp+=mExp; annualInc+=mInc;
    months.push({ label: MONTH_ABBR[m], inc:mInc, exp:mExp, saldo:mInc-mExp });
  }
  return { months, catTotals, annualExp, annualInc, incFixed, incVar, incTemp, incIfood };
}
