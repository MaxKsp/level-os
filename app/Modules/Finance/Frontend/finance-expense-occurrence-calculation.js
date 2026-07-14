function clampDayOfMonth(year, month, day){
  const lastDay = new Date(year, month+1, 0).getDate();
  return Math.min(day, lastDay);
}
/**
 * Retorna as datas em que uma despesa efetivamente ocorre dentro de um período.
 * Despesas sem recorrência: só a própria data, se cair no período.
 * Despesas mensais: uma ocorrência por mês do período, no mesmo dia (ajustado se o mês for mais curto).
 */
function expenseOccurrencesInRange(exp, range){
  if (!exp.date) return [];
  const anchor = new Date(exp.date+'T00:00:00');
  // parcelado: N ocorrências mensais a partir da 1ª parcela
  if (exp.parcelas >= 2){
    const dom = anchor.getDate();
    const occ = [];
    for (let i=0;i<exp.parcelas;i++){
      const m = new Date(anchor.getFullYear(), anchor.getMonth()+i, 1);
      const od = new Date(m.getFullYear(), m.getMonth(), clampDayOfMonth(m.getFullYear(), m.getMonth(), dom));
      if (dnum(od) >= dnum(range.start) && dnum(od) <= dnum(range.end)) occ.push(od);
    }
    return occ;
  }
  if (exp.recorrencia !== 'mensal'){
    return inRange(exp.date, range) ? [anchor] : [];
  }
  const dayOfMonth = anchor.getDate();
  const occurrences = [];
  let cursor = new Date(range.start.getFullYear(), range.start.getMonth(), 1);
  const endCursor = new Date(range.end.getFullYear(), range.end.getMonth(), 1);
  let guard = 0;
  while (dnum(cursor) <= dnum(endCursor) && guard < 600){
    guard++;
    const occDay = clampDayOfMonth(cursor.getFullYear(), cursor.getMonth(), dayOfMonth);
    const occDate = new Date(cursor.getFullYear(), cursor.getMonth(), occDay);
    if (dnum(occDate) >= dnum(anchor) && dnum(occDate) >= dnum(range.start) && dnum(occDate) <= dnum(range.end)){
      occurrences.push(occDate);
    }
    cursor.setMonth(cursor.getMonth()+1);
  }
  return occurrences;
}
function expenseTotalInRange(exp, range){
  return expenseOccurrencesInRange(exp, range).length * Number(exp.value||0);
}
/** Lista achatada de {exp, date} pra cada ocorrência de cada despesa dentro do período (só despesas com data). */
function expenseOccurrenceEntries(expLines, range){
  const out = [];
  expLines.forEach(e=>{
    if (!e.date) return;
    expenseOccurrencesInRange(e, range).forEach(date=> out.push({ exp: e, date }));
  });
  return out;
}
