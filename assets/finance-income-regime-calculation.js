/* ---- Cálculo CLT / PJ (estimativa de líquido) ---- */
// Tabelas 2025: INSS progressivo e IRRF mensal.
function calcINSS(gross){
  const cap = 8157.41; const g = Math.min(Math.max(0, gross), cap);
  const t = [[1518,0.075],[2793.88,0.09],[4190.83,0.12],[8157.41,0.14]];
  let prev=0, tax=0;
  for (const [top,rate] of t){ if (g>prev){ tax += (Math.min(g,top)-prev)*rate; prev=top; } else break; }
  return tax;
}
function irrfFromBase(base){
  const t = [[2259.20,0,0],[2826.65,0.075,169.44],[3751.05,0.15,381.44],[4664.68,0.225,662.77],[Infinity,0.275,896.00]];
  for (const [top,rate,ded] of t){ if (base<=top) return Math.max(0, base*rate - ded); }
  return 0;
}
function computeCLT(p){
  const sal = Number(p.bruto||0);
  const horaBase = sal/220;
  const extras = (Number(p.he50||0)*horaBase*1.5) + (Number(p.he100||0)*horaBase*2);
  const brutoTotal = sal + extras;
  const inss = calcINSS(brutoTotal);
  const deps = Number(p.deps||0)*189.59;
  const baseLegal = Math.max(0, brutoTotal - inss - deps);
  const baseSimpl = Math.max(0, brutoTotal - 564.80);
  const irrf = Math.min(irrfFromBase(baseLegal), irrfFromBase(baseSimpl));
  const convMed=Number(p.convMed||0), convOdo=Number(p.convOdo||0), outros=Number(p.outros||0);
  const liquido = brutoTotal - inss - irrf - convMed - convOdo - outros;
  return { sal, extras, brutoTotal, inss, irrf, convMed, convOdo, outros, liquido,
    fgts: brutoTotal*0.08, decimo: sal, ferias: sal + sal/3 };
}
function computePJ(p){
  const bruto = Number(p.bruto||0);
  const impostos = bruto * (Number(p.imposto||0)/100);
  const conv = Number(p.conv||0), outros = Number(p.outros||0);
  return { bruto, impostos, conv, outros, liquido: bruto - impostos - conv - outros };
}
