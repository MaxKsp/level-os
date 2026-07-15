/**
 * Diz se uma linha de renda está ativa em `now`. Renda não temporária (fixa,
 * variável ou tipo desconhecido) e temporária sem endDate ficam sempre ativas.
 * Temporária com endDate compara só a data (via dnum()), então o fim do dia
 * do endDate ainda conta como ativo.
 */
function isIncomeActive(line, now){
  if (line.type !== 'temporaria') return true;
  if (!line.endDate) return true;
  return dnum(new Date(line.endDate+'T00:00:00')) >= dnum(now);
}
