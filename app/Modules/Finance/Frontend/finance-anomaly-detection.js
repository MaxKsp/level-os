/* Detecta gastos fora do padrão: despesa datada do mês atual muito acima da
   média histórica da mesma categoria (meses anteriores). Puro no cliente. */
function detectAnomalies(expLines, now){
  const curMonth = monthKey(now);
  const dated = expLines.filter(e=> e.date && Number(e.value)>0);
  // baseline por categoria: valores de meses ANTERIORES ao atual
  const hist = {};
  dated.forEach(e=>{
    const m = e.date.slice(0,7);
    if (m >= curMonth) return;               // só passado
    (hist[e.categoria] = hist[e.categoria] || []).push(Number(e.value));
  });
  const out = [];
  dated.filter(e=> e.date.slice(0,7)===curMonth).forEach(e=>{
    const arr = hist[e.categoria];
    if (!arr || arr.length < 4) return;      // amostra insuficiente
    const n = arr.length;
    const mean = arr.reduce((s,v)=>s+v,0)/n;
    const std = Math.sqrt(arr.reduce((s,v)=>s+(v-mean)*(v-mean),0)/n);
    const v = Number(e.value);
    const threshold = mean + 2*std;
    if (v < 30) return;                      // ignora valores baixos
    if (v < mean*1.5) return;                // precisa ser bem acima da média
    if (v <= threshold) return;              // dentro de 2 desvios = normal
    out.push({ e, mean, pct: Math.round((v/mean-1)*100) });
  });
  return out.sort((a,b)=> Number(b.e.value)-Number(a.e.value));
}
