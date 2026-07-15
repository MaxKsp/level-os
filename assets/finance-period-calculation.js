function periodRange(period, now){
  if (period==='day') return { start:new Date(now.getFullYear(),now.getMonth(),now.getDate()), end:new Date(now.getFullYear(),now.getMonth(),now.getDate()) };
  if (period==='week'){ const s=startOfWeek(now); return { start:s, end:addDays(s,6) }; }
  if (period==='year') return { start:new Date(now.getFullYear(),0,1), end:new Date(now.getFullYear(),11,31) };
  return { start:new Date(now.getFullYear(),now.getMonth(),1), end:new Date(now.getFullYear(),now.getMonth()+1,0) };
}
function prorate(monthlyValue, period){
  if (period==='day') return monthlyValue/30;
  if (period==='week') return monthlyValue/4.345;
  if (period==='year') return monthlyValue*12;
  return monthlyValue;
}
function inRange(dateStr, range){
  const d = new Date(dateStr+'T00:00:00');
  return dnum(d) >= dnum(range.start) && dnum(d) <= dnum(range.end);
}
/**
 * Totais e gráficos consideram o compromisso do período corrente, sem
 * inflar com meses futuros: Dia/Semana/Mês mostram o período completo
 * (inclusive o que ainda vai cair até o fim dele), e o Ano é cortado no
 * fim do MÊS atual — agosto em diante só entra quando chegar.
 */
function clampRangeToToday(range, now){
  const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth()+1, 0);
  if (dnum(range.end) <= dnum(endOfCurrentMonth)) return range;
  return { start: range.start, end: endOfCurrentMonth };
}
/** Prorata de valores mensais sem data, respeitando só o tempo já decorrido do período. */
function prorateElapsed(monthlyValue, period, now){
  if (period==='year') return monthlyValue * (now.getMonth() + 1);
  return prorate(monthlyValue, period);
}
