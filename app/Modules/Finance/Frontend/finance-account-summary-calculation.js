/** Classificação e aritmética do resumo de contas/cartões (patrimônio, faturas, cheque especial). */
function calculateAccountSummary(accounts){
  const contas = accounts.filter(isContaLike);
  const cartoes = accounts.filter(a=>a.tipo==='cartao');
  const saldoTotal = contas.reduce((s,a)=>s+Number(a.saldo||0),0);
  const faturaTotal = cartoes.reduce((s,a)=>s+Number(a.fatura||0),0);
  const patrimonio = saldoTotal - faturaTotal;
  const creditoCartoes = cartoes.reduce((s,a)=>s+Math.max(0, Number(a.limite||0)-Number(a.fatura||0)),0);
  const chequeUsadoTotal = contas.reduce((s,a)=> s + (Number(a.saldo||0)<0 ? -Number(a.saldo) : 0), 0);
  const chequeDisp = contas.reduce((s,a)=>{ const ce=Number(a.chequeEspecial||0); const used=Number(a.saldo||0)<0?-Number(a.saldo):0; return s+Math.max(0, ce-used); }, 0);
  const creditoDisp = creditoCartoes + chequeDisp;
  const overdraft = contas.filter(a=>Number(a.saldo||0)<0);
  return { contas, cartoes, saldoTotal, faturaTotal, patrimonio, creditoCartoes, chequeUsadoTotal, chequeDisp, creditoDisp, overdraft };
}
