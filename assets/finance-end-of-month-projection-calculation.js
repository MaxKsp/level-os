/** Projeção de saldo até o fim do mês (rendas a receber menos despesas restantes). */
function calculateEndOfMonthProjection(saldoTotal, incLines, expLines, now){
  const today = now.getDate();
  const endMonth = new Date(now.getFullYear(), now.getMonth()+1, 0);
  const remRange = { start: addDays(new Date(now.getFullYear(), now.getMonth(), today), 1), end: endMonth };
  const aReceber = incLines.filter(l=> isIncomeActive(l,now) && l.payday && l.payday>=today)
    .reduce((s,l)=>s+Number(l.value||0),0);
  const aPagar = (today>=endMonth.getDate()) ? 0 : expLines.reduce((s,e)=>s+expenseTotalInRange(e, remRange),0);
  const projetado = saldoTotal + aReceber - aPagar;
  return { today, endMonth, remRange, aReceber, aPagar, projetado };
}
