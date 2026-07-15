/** "parcela X/N": qual parcela cai no mês de 'now' (clampado 1..N). */
function parcelaLabel(exp, now){
  if (!exp.parcelas || !exp.date) return '';
  const a = new Date(exp.date+'T00:00:00');
  let n = (now.getFullYear()-a.getFullYear())*12 + (now.getMonth()-a.getMonth()) + 1;
  n = Math.max(1, Math.min(exp.parcelas, n));
  return 'parcela ' + n + '/' + exp.parcelas;
}
