/**
 * Soma o valor de cada despesa dentro do período, agrupado pela chave de keyFn.
 * Despesas com data contam pelo número real de ocorrências no período; despesas
 * sem data (fixas mensais sem dia definido) entram prorateadas pro período,
 * do mesmo jeito que já acontece no resumo do topo.
 */
function bucketPeriodTotals(expLines, range, period, keyFn, now){
  const totals = {};
  expLines.forEach(e=>{
    const key = keyFn(e);
    if (e.date){
      const occ = expenseOccurrencesInRange(e, range).length;
      if (occ>0) totals[key] = (totals[key]||0) + occ*Number(e.value||0);
    } else {
      totals[key] = (totals[key]||0) + prorateElapsed(Number(e.value||0), period, now);
    }
  });
  return totals;
}
