
const CATS = { treino:'Treino', trabalho:'Trabalho', estudo:'Estudo', ifood:'iFood', descanso:'Descanso', deslocamento:'Deslocamento' };
const BANKS = [
  {id:'nubank', name:'Nubank', color:'#8A05BE', initials:'NU'},
  {id:'itau', name:'Itaú', color:'#EC7000', initials:'IT'},
  {id:'bradesco', name:'Bradesco', color:'#CC092F', initials:'BR'},
  {id:'bb', name:'Banco do Brasil', color:'#F0B429', initials:'BB'},
  {id:'caixa', name:'Caixa', color:'#0070AD', initials:'CX'},
  {id:'santander', name:'Santander', color:'#EC0000', initials:'SA'},
  {id:'inter', name:'Inter', color:'#FF7A00', initials:'IN'},
  {id:'c6', name:'C6 Bank', color:'#4A4A4A', initials:'C6'},
  {id:'sicoob', name:'Sicoob', color:'#00A651', initials:'SI'},
  {id:'picpay', name:'PicPay', color:'#21C25E', initials:'PP'},
  {id:'mercadopago', name:'Mercado Pago', color:'#00A7DB', initials:'MP'},
  {id:'abcbrasil', name:"ABC Brasil"},
  {id:'ailos', name:"Ailos"},
  {id:'almahconta', name:"Almah Conta"},
  {id:'artta', name:"Artta"},
  {id:'asaasipsa', name:"Asaas IP"},
  {id:'bkbank', name:"BK Bank"},
  {id:'bnpparipas', name:"BNP Paribas"},
  {id:'brbbancodebrasilia', name:"BRB - Banco de Brasília"},
  {id:'bancoarbi', name:"Banco Arbi"},
  {id:'bancobmg', name:"Banco BMG"},
  {id:'bancobmp', name:"Banco BMP"},
  {id:'bancobs2sa', name:"Banco BS2"},
  {id:'bancobtgpacutal', name:"BTG Pactual"},
  {id:'bancodaycoval', name:"Banco Daycoval"},
  {id:'bancoindustrialdobrasilsa', name:"Banco Industrial do Brasil"},
  {id:'bancomercantildobrasilsa', name:"Banco Mercantil do Brasil"},
  {id:'bancooriginalsa', name:"Banco Original"},
  {id:'bancopan', name:"Banco Pan"},
  {id:'bancopaulista', name:"Banco Paulista"},
  {id:'bancopine', name:"Banco Pine"},
  {id:'bancorendimento', name:"Banco Rendimento"},
  {id:'bancosafrasa', name:"Banco Safra"},
  {id:'bancosofisa', name:"Banco Sofisa"},
  {id:'bancotopazio', name:"Banco Topázio"},
  {id:'bancotriangulotribanco', name:"Tribanco"},
  {id:'bancovotorantim', name:"Banco Votorantim"},
  {id:'bancodaamazoniasa', name:"Banco da Amazônia"},
  {id:'bancodoestadodoespiritosanto', name:"Banestes"},
  {id:'bancodoestadodopara', name:"Banpará"},
  {id:'bancodoestadodosergipe', name:"Banese"},
  {id:'bancodonordestedobrasilsa', name:"Banco do Nordeste"},
  {id:'bankofamerica', name:"Bank of America"},
  {id:'banrisul', name:"Banrisul"},
  {id:'beesbank', name:"Bees Bank"},
  {id:'capitual', name:"Capitual"},
  {id:'contasimplessolucoesempagamentos', name:"Conta Simples"},
  {id:'contbank', name:"Contbank"},
  {id:'corasociedadecreditodiretosa', name:"Cora"},
  {id:'credisis', name:"Credisis"},
  {id:'cresol', name:"Cresol"},
  {id:'dock', name:"Dock"},
  {id:'duepay', name:"DuePay"},
  {id:'efigerencianet', name:"Efí (Gerencianet)"},
  {id:'grafeno', name:"Grafeno"},
  {id:'ifoodpago', name:"iFood Pago"},
  {id:'infinitepay', name:"InfinitePay"},
  {id:'ip4y', name:"Ip4y"},
  {id:'iugo', name:"Iugo"},
  {id:'letsbanksa', name:"Lets Bank"},
  {id:'linker', name:"Linker"},
  {id:'mufg', name:"MUFG"},
  {id:'magalupay', name:"MagaluPay"},
  {id:'modobank', name:"ModoBank"},
  {id:'multiplobank', name:"Múltiplo Bank"},
  {id:'neon', name:"Neon"},
  {id:'omiecash', name:"Omie.Cash"},
  {id:'omni', name:"Omni"},
  {id:'orionpay', name:"OrionPay"},
  {id:'pagsegurointernetsa', name:"PagSeguro"},
  {id:'paycash', name:"PayCash"},
  {id:'pinbank', name:"PinBank"},
  {id:'qualitydigitalbank', name:"Quality Digital Bank"},
  {id:'recargapay', name:"RecargaPay"},
  {id:'sicredi', name:"Sicredi"},
  {id:'sisprime', name:"Sisprime"},
  {id:'squidsolucoesfinanceiras', name:"Squid"},
  {id:'starbank', name:"StarBank"},
  {id:'stonepagamentossa', name:"Stone"},
  {id:'sulcredi', name:"Sulcredi"},
  {id:'transfera', name:"Transfera"},
  {id:'unicred', name:"Unicred"},
  {id:'uniprime', name:"Uniprime"},
  {id:'uzzipay', name:"UzziPay"},
  {id:'xpinvestimentos', name:"XP Investimentos"},
  {id:'zemobank', name:"Zemo Bank"},
  {id:'outro', name:'Outro', color:'#5A5A5A', initials:'--'},
];
const DEFAULT_BANK_FAVORITES = ['nubank','itau','bradesco','bb','caixa','santander','inter','c6','sicoob','picpay','mercadopago'];
const BANK_PALETTE = ['#4F8DF9','#8B5CF6','#4FB07A','#E15C56','#F59E0B','#EC4899','#00A7DB','#9C7CE0'];
function bankInitials(b){
  if (b.initials) return b.initials;
  const parts = (b.name||'?').replace(/[^A-Za-zÀ-ÿ0-9 ]/g,'').trim().split(/\s+/).filter(Boolean);
  if (parts.length>=2) return (parts[0][0]+parts[1][0]).toUpperCase();
  return (b.name||'?').slice(0,2).toUpperCase();
}
function bankColor(b){
  if (b.color) return b.color;
  let h=0; for (const c of (b.id||'')) h=(h*31+c.charCodeAt(0))>>>0;
  return BANK_PALETTE[h % BANK_PALETTE.length];
}
const METHODS = { pix:'Pix', debito:'Débito', credito:'Crédito', ted:'TED' };
const METHOD_ICONS = {
  pix: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/></svg>',
  debito: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18"/></svg>',
  credito: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18M7 15h4"/></svg>',
  ted: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 10l4-4 4 4M7 6v9M21 14l-4 4-4-4M17 18V9"/></svg>',
};
function renderMethodPicker(containerId, hiddenInputId, selectedId){
  const box = document.getElementById(containerId);
  box.innerHTML = Object.keys(METHODS).map(k=>`
    <div class="methodpick-item ${k===selectedId?'selected':''}" data-method="${k}">
      ${METHOD_ICONS[k]}
      <div class="mpname">${METHODS[k]}</div>
    </div>`).join('');
  box.querySelectorAll('.methodpick-item').forEach(item=>{
    item.onclick = ()=>{
      box.querySelectorAll('.methodpick-item').forEach(x=>x.classList.remove('selected'));
      item.classList.add('selected');
      document.getElementById(hiddenInputId).value = item.dataset.method;
      if (hiddenInputId==='emMethod') onExpenseMethodChange();
    };
  });
}
// despesa: método crédito prioriza cartões no "movimentar conta"
function onExpenseMethodChange(){
  const sel = document.getElementById('emAccount');
  if (!sel) return;
  const credito = document.getElementById('emMethod').value === 'credito';
  const hint = document.getElementById('emAccountHint');
  if (credito){
    hint.textContent = 'Crédito: escolha o cartão pra somar na fatura (o limite disponível cai junto).';
  } else {
    hint.textContent = 'Conta: desconta do saldo · Cartão: soma na fatura. Indisponível pra despesa recorrente.';
  }
}
function bankById(id){ return BANKS.find(b=>b.id===id) || BANKS[BANKS.length-1]; }
function bankAvatarHtml(bankId, size){
  const bank = bankById(bankId);
  const sz = size ? `style="width:${size}px;height:${size}px;"` : '';
  return `<div class="bankavatar" ${sz}>
    <img src="assets/bancos/${bank.id}.svg" alt="${bank.name}"
      onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
    <div class="fallback-initials" style="display:none;background:${bankColor(bank)}">${bankInitials(bank)}</div>
  </div>`;
}
let __bankFavorites = DEFAULT_BANK_FAVORITES.slice();
let __bankChooserCtx = null;   // {containerId, hiddenInputId}
function favoriteBankIds(){
  const favs = (__bankFavorites||[]).filter(id=> BANKS.some(b=>b.id===id));
  return favs.length ? favs : DEFAULT_BANK_FAVORITES.slice();
}
function renderBankPicker(containerId, hiddenInputId, selectedId){
  const box = document.getElementById(containerId);
  let ids = favoriteBankIds().slice(0, 11);
  // "Outro" sai do grid principal: só aparece dentro de "Mais bancos".
  if (selectedId && selectedId!=='outro' && !ids.includes(selectedId)) ids = [selectedId, ...ids];
  const tiles = ids.map(id=>{ const b = bankById(id); return `
    <div class="bankpick-item ${id===selectedId?'selected':''}" data-bank="${id}">
      ${bankAvatarHtml(id)}
      <div class="bpname">${esc(b.name)}</div>
    </div>`; }).join('');
  box.innerHTML = tiles + `
    <div class="bankpick-item bankpick-more" data-more="1">
      <div class="bankmore-ic">+</div><div class="bpname">Mais bancos</div>
    </div>`;
  box.querySelectorAll('.bankpick-item').forEach(item=>{
    item.onclick = ()=>{
      if (item.dataset.more){ openBankChooser(containerId, hiddenInputId); return; }
      box.querySelectorAll('.bankpick-item').forEach(x=>x.classList.remove('selected'));
      item.classList.add('selected');
      document.getElementById(hiddenInputId).value = item.dataset.bank;
    };
  });
}
function openBankChooser(containerId, hiddenInputId){
  __bankChooserCtx = { containerId, hiddenInputId };
  const cur = document.getElementById(hiddenInputId).value;
  document.getElementById('bankSearch').value = '';
  renderBankChooserList('', cur);
  document.getElementById('bankChooserOverlay').classList.add('open');
  setTimeout(()=> document.getElementById('bankSearch').focus(), 50);
}
function renderBankChooserList(query, selectedId){
  const q = (query||'').toLowerCase().trim();
  const favs = new Set(favoriteBankIds());
  // banco "Outro" (não listado) sempre por último; não é favoritável.
  const named = BANKS.filter(b=> b.id!=='outro' && (!q || b.name.toLowerCase().includes(q)));
  const outro = BANKS.find(b=>b.id==='outro');
  const showOutro = !q || 'outro não listado'.includes(q);
  const box = document.getElementById('bankChooserList');
  const rowHtml = (b, star)=>`
    <div class="bankrow ${b.id===selectedId?'selected':''}" data-bank="${b.id}">
      ${bankAvatarHtml(b.id)}
      <div class="brname">${esc(b.id==='outro'?'Outro / não listado':b.name)}</div>
      ${star?`<button class="brstar ${favs.has(b.id)?'on':''}" data-star="${b.id}" title="Favoritar">${favs.has(b.id)?'★':'☆'}</button>`:''}
    </div>`;
  const body = named.map(b=>rowHtml(b,true)).join('') + (showOutro?rowHtml(outro,false):'');
  box.innerHTML = body || '<div class="empty">Nenhum banco encontrado.</div>';
  box.querySelectorAll('.bankrow').forEach(row=>{
    row.onclick = (ev)=>{
      if (ev.target.closest('[data-star]')) return;
      if (!__bankChooserCtx) return;
      document.getElementById(__bankChooserCtx.hiddenInputId).value = row.dataset.bank;
      renderBankPicker(__bankChooserCtx.containerId, __bankChooserCtx.hiddenInputId, row.dataset.bank);
      document.getElementById('bankChooserOverlay').classList.remove('open');
    };
  });
  box.querySelectorAll('[data-star]').forEach(btn=>{
    btn.onclick = async (ev)=>{
      ev.stopPropagation();
      const id = btn.dataset.star;
      let favs = favoriteBankIds();
      if (favs.includes(id)) favs = favs.filter(x=>x!==id);
      else { if (favs.length>=11){ toast('Máximo de 11 favoritos. Remova um antes.', {error:true}); return; } favs = [...favs, id]; }
      __bankFavorites = favs;
      await storeSet('bank_favorites', favs);
      renderBankChooserList(document.getElementById('bankSearch').value, selectedId);
      if (__bankChooserCtx) renderBankPicker(__bankChooserCtx.containerId, __bankChooserCtx.hiddenInputId, document.getElementById(__bankChooserCtx.hiddenInputId).value);
    };
  });
}
const WEEKDAY_ABBR = ['DOM.','SEG.','TER.','QUA.','QUI.','SEX.','SÁB.'];
const MONTH_NAMES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const MONTH_ABBR = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

function pad(n){ return n.toString().padStart(2,'0'); }
function dkey(d){ return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
function monthKey(d){ d = d||new Date(); return d.getFullYear()+'-'+pad(d.getMonth()+1); }
function timeToMin(t){ const [h,m]=t.split(':').map(Number); return h*60+m; }
function minToTime(m){ m=((m%1440)+1440)%1440; return pad(Math.floor(m/60))+':'+pad(m%60); }
let __hideVals = localStorage.getItem('pm_hidevals') === '1';
function fmtMoney(v){
  if (__hideVals) return 'R$ ••••';
  return 'R$ ' + (v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
}
function toast(msg, opts){
  opts = opts||{};
  let box = document.getElementById('toastBox');
  if (!box){ box = document.createElement('div'); box.id='toastBox'; document.body.appendChild(box); }
  const el = document.createElement('div');
  el.className = 'toast' + (opts.error?' err':'');
  const span = document.createElement('span'); span.textContent = msg; el.appendChild(span);
  if (opts.undo){
    const b = document.createElement('button'); b.textContent = 'Desfazer';
    b.onclick = ()=>{ el.remove(); opts.undo(); };
    el.appendChild(b);
  }
  box.appendChild(el);
  setTimeout(()=>{ el.style.transition='opacity .25s'; el.style.opacity='0'; setTimeout(()=>el.remove(), 260); }, opts.undo?8000:3500);
}
function emptyCta(msg, btnLabel, targetId){
  return `<div class="empty empty-cta"><div>${msg}</div><button class="btn-primary" data-open="${targetId}">${btnLabel}</button></div>`;
}
function relDate(dateStr){
  if (!dateStr) return 'sem data';
  const today = dkey(new Date());
  if (dateStr === today) return 'hoje';
  if (dateStr === dkey(addDays(new Date(), -1))) return 'ontem';
  return dateStr.split('-').reverse().join('/');
}
function esc(s){ return String(s??'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function genId(){ return 't' + Date.now() + Math.random().toString(36).slice(2,7); }
function dnum(d){ return d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate(); }
function addDays(d,n){ const r=new Date(d); r.setDate(r.getDate()+n); return r; }
function startOfWeek(d){ const r=new Date(d); r.setDate(r.getDate()-r.getDay()); r.setHours(0,0,0,0); return r; }

let __cache = null;
const __bootstrap = (async ()=>{
  try{
    const r = await fetch('api/data.php?all=1');
    if (r.status === 401){ location.href = 'login.php'; return; }
    __cache = r.ok ? await r.json() : {};
  } catch(e){ __cache = {}; }
})();
async function storeGet(key, fallback){
  await __bootstrap;
  if (!__cache || !(key in __cache) || __cache[key] === null || __cache[key] === undefined) return fallback;
  return __cache[key];
}
// chaves financeiras vao pras tabelas relacionais (api/finance.php),
// nao pro kv. O bootstrap ja traz elas das tabelas nas mesmas chaves.
const FINANCE_KEYS = new Set(['expense_lines_v4','income_lines','ifood-entries','accounts_v2']);
async function storeSet(key, value){
  await __bootstrap;
  if (__cache) __cache[key] = value;
  const endpoint = FINANCE_KEYS.has(key) ? 'api/finance.php' : 'api/data.php';
  try{
    const r = await fetch(endpoint, {
      method: 'POST',
      headers: {'Content-Type':'application/json', 'X-CSRF-Token': window.CSRF_TOKEN},
      body: JSON.stringify({key, value})
    });
    if (r.status === 401) location.href = 'login.php';
  } catch(e){ console.error(e); }
}

let tasks = [];
let checklist = {};

async function ensureSeeded(){
  // conta nova começa vazia — cada usuário constrói a própria rotina
  tasks = await storeGet('tasks_v6', []);
  checklist = await storeGet('checklist_v6', {});
}

function isTaskOnDate(task, d){
  const anchor = new Date(task.date+'T00:00:00');
  if (task.recurrence === 'none') return dnum(anchor) === dnum(d);
  if (task.recurrence === 'weekly'){
    if (d.getDay() !== anchor.getDay()) return false;
    if (dnum(d) < dnum(anchor)) return false;
    if (task.weeksCount && task.weeksCount>0){
      const weeksDiff = Math.floor((d-anchor)/(7*86400000));
      if (weeksDiff >= task.weeksCount) return false;
    }
    return true;
  }
  if (task.recurrence === 'yearly'){
    if (d.getMonth()!==anchor.getMonth() || d.getDate()!==anchor.getDate()) return false;
    return dnum(d) >= dnum(anchor);
  }
  return false;
}
function tasksOnDate(d){ return tasks.filter(t=>isTaskOnDate(t,d)).sort((a,b)=> a.time.localeCompare(b.time)); }
function occId(task,d){ return task.id+':'+dkey(d); }

let calView = 'home';
let viewDate = new Date();
let firedAlarms = {};

document.querySelectorAll('#calSubnav .apill').forEach(b=>{
  b.onclick = ()=>{
    document.querySelectorAll('#calSubnav .apill').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    calView = b.dataset.view;
    renderAgenda();
  };
});
document.querySelectorAll('#agendaSubnav .apill').forEach(b=>{
  b.onclick = ()=>{
    document.querySelectorAll('#agendaSubnav .apill').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    document.querySelectorAll('#page-agenda .apage').forEach(x=>x.classList.remove('active'));
    document.getElementById('apage-'+b.dataset.asub).classList.add('active');
    if (b.dataset.asub==='inicio') renderHomeCharts();
    else renderAgenda();
  };
});
document.getElementById('btnToday').onclick = ()=>{ viewDate = new Date(); renderAgenda(); };
document.getElementById('btnPrev').onclick = ()=> shift(-1);
document.getElementById('btnNext').onclick = ()=> shift(1);
function shift(dir){
  if (calView==='day') viewDate = addDays(viewDate, dir);
  else if (calView==='week') viewDate = addDays(viewDate, dir*7);
  else if (calView==='year') { const d=new Date(viewDate); d.setFullYear(d.getFullYear()+dir); viewDate=d; }
  else { const d=new Date(viewDate); d.setMonth(d.getMonth()+dir); viewDate=d; }
  renderAgenda();
}

function renderAgenda(){
  const today = new Date();
  const body = document.getElementById('calBody');

  if (calView==='year'){
    document.getElementById('agendaTitle').textContent = viewDate.getFullYear();
    document.getElementById('agendaSub').textContent = viewDate.getDate() + ' de ' + MONTH_NAMES[viewDate.getMonth()] + ' selecionado';
    body.innerHTML = buildYearHtml();
    bindYearClicks(body);
  } else if (calView==='month'){
    document.getElementById('agendaTitle').textContent = MONTH_NAMES[viewDate.getMonth()];
    document.getElementById('agendaSub').textContent = viewDate.getFullYear() + ((viewDate.getMonth()===today.getMonth() && viewDate.getFullYear()===today.getFullYear()) ? ' · mês atual' : '');
    body.innerHTML = buildMonthHtml();
    bindMonthClicks(body);
  } else if (calView==='week'){
    const s = startOfWeek(viewDate), e = addDays(s,6);
    document.getElementById('agendaTitle').textContent = s.getDate()+' '+MONTH_ABBR[s.getMonth()]+' – '+e.getDate()+' '+MONTH_ABBR[e.getMonth()];
    document.getElementById('agendaSub').textContent = (dnum(s)<=dnum(today) && dnum(today)<=dnum(e)) ? 'semana atual' : '';
    body.innerHTML = buildWeekHtml();
    bindWeekClicks(body);
  } else {
    document.getElementById('agendaTitle').textContent = viewDate.getDate()+' de '+MONTH_NAMES[viewDate.getMonth()];
    document.getElementById('agendaSub').textContent = dnum(viewDate)===dnum(today) ? 'hoje' : WEEKDAY_ABBR[viewDate.getDay()];
    body.innerHTML = '';
  }
  renderAgendaList();
  renderHero();
}

/* ---------- Início da Agenda: dashboard de conclusão ---------- */
/* Cores dos gráficos seguem o tema escolhido no Perfil (variáveis CSS). */
function accentHex(){ return (getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()) || '#4F8DF9'; }
function themeVar(name, fallback){ return (getComputedStyle(document.documentElement).getPropertyValue(name).trim()) || fallback; }
function chartGridCol(){ return themeVar('--line', '#1E1E1E'); }
function chartTickCol(){ return themeVar('--text-3', '#6A6A6E'); }
function accentRGBStr(){
  let h = accentHex().replace('#','');
  if (h.length===3) h = h.split('').map(c=>c+c).join('');
  const n = parseInt(h,16);
  return ((n>>16)&255)+','+((n>>8)&255)+','+(n&255);
}
let chartTaskLine=null, chartTaskCat=null;

function last30Days(now){ const days=[]; for(let i=29;i>=0;i--){ const d=new Date(now); d.setDate(now.getDate()-i); days.push(d); } return days; }
function dayCompletion(d){
  const scheduled = tasksOnDate(d);
  if (scheduled.length===0) return null;
  const done = scheduled.filter(t=>checklist[occId(t,d)]).length;
  return done/scheduled.length;
}
function currentStreak(now){
  let streak = 0;
  let d = new Date(now);
  while (true){
    const comp = dayCompletion(d);
    if (comp===null){ d = addDays(d,-1); if (dnum(d) < dnum(now)-3650) break; continue; }
    if (comp>=1){ streak++; d = addDays(d,-1); }
    else break;
  }
  return streak;
}

function renderTaskHeatmap(now){
  const wrap = document.getElementById('wrapTaskHeat');
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const gridStart = new Date(first); gridStart.setDate(gridStart.getDate() - gridStart.getDay());
  let html = '<div class="heatgrid">' + WEEKDAY_MIN.map(d=>`<div class="heat-head">${d}</div>`).join('');
  for (let i=0;i<42;i++){
    const d = new Date(gridStart); d.setDate(gridStart.getDate()+i);
    const inMonth = d.getMonth()===now.getMonth();
    if (!inMonth && i>=35) continue;
    const comp = dnum(d) <= dnum(now) ? dayCompletion(d) : null;
    const isToday = dnum(d)===dnum(now);
    let bg = 'var(--surface-2)';
    let textColor = '';
    if (comp!==null && comp>0){
      const t = 0.12 + 0.85*comp;
      bg = `rgba(${accentRGBStr()},${t.toFixed(2)})`;
      textColor = t > 0.42 ? '#fff' : 'var(--text)';
    }
    const title = comp===null ? `${d.getDate()}/${d.getMonth()+1}: sem tarefas` : `${d.getDate()}/${d.getMonth()+1}: ${Math.round(comp*100)}% cumprido`;
    html += `<div class="heatcell ${inMonth?'':'outmonth'} ${isToday?'today':''}" style="background:${bg};${textColor?`color:${textColor};font-weight:600;`:''}" title="${title}">${d.getDate()}</div>`;
  }
  html += '</div>';
  wrap.innerHTML = html;
}

function renderHomeCharts(){
  const now = new Date();
  renderTaskHeatmap(now);

  const days = last30Days(now);
  const comps = days.map(d=>dayCompletion(d));
  const validComps = comps.filter(c=>c!==null);
  const avg = validComps.length ? Math.round(validComps.reduce((s,c)=>s+c,0)/validComps.length*100) : 0;
  const streak = currentStreak(now);

  document.getElementById('agendaStatRow').innerHTML = `
    <div class="fc"><div class="v" style="color:var(--accent-text)">${avg}%</div><div class="l">Taxa média (30 dias)</div></div>
    <div class="fc"><div class="v" style="color:var(--sage)">${streak} ${streak===1?'dia':'dias'}</div><div class="l">Sequência atual</div></div>
    <div class="fc"><div class="v">${tasks.length}</div><div class="l">Tarefas cadastradas</div></div>`;

  if (typeof Chart === 'undefined'){
    ['wrapTaskLine','wrapTaskCat'].forEach(id=>{
      document.getElementById(id).innerHTML = '<div class="dashempty">Não consegui carregar a biblioteca de gráficos agora.<br>Verifique sua conexão e recarregue a página.</div>';
    });
    return;
  }
  if (chartTaskLine) { chartTaskLine.destroy(); chartTaskLine=null; }
  if (chartTaskCat) { chartTaskCat.destroy(); chartTaskCat=null; }

  const wrapLine = document.getElementById('wrapTaskLine');
  wrapLine.innerHTML = '<canvas id="chartTaskLine"></canvas>';
  try {
    chartTaskLine = new Chart(document.getElementById('chartTaskLine'), {
      type:'line',
      data:{ labels: days.map(d=>pad(d.getDate())+'/'+pad(d.getMonth()+1)),
        datasets:[{ data: comps.map(c=>c===null?null:Math.round(c*100)), borderColor: accentHex(), backgroundColor: `rgba(${accentRGBStr()},0.18)`, fill:true, tension:0.35, pointRadius:0, borderWidth:2, spanGaps:true }] },
      options: chartBaseOptions({ scales:{ x:{ grid:{display:false}, ticks:{color:chartTickCol(), font:{size:9}, maxTicksLimit:8} }, y:{ grid:{color:chartGridCol()}, ticks:{color:chartTickCol(), font:{size:10}}, min:0, max:100 } } })
    });
  } catch(err){ console.error('chartTaskLine falhou', err); wrapLine.innerHTML = '<div class="dashempty">Não consegui desenhar este gráfico agora.</div>'; }

  const wrapCat = document.getElementById('wrapTaskCat');
  wrapCat.innerHTML = '<canvas id="chartTaskCat"></canvas>';
  try {
    const catKeys = Object.keys(CATS);
    const catPct = catKeys.map(cat=>{
      let scheduled=0, done=0;
      days.forEach(d=>{
        tasksOnDate(d).filter(t=>t.cat===cat).forEach(t=>{ scheduled++; if (checklist[occId(t,d)]) done++; });
      });
      return scheduled>0 ? Math.round(done/scheduled*100) : 0;
    });
    chartTaskCat = new Chart(document.getElementById('chartTaskCat'), {
      type:'bar',
      data:{ labels: catKeys.map(k=>CATS[k]), datasets:[{ data: catPct, backgroundColor: accentHex(), borderRadius:6, maxBarThickness:50 }] },
      options: chartBaseOptions({ scales:{ x:{ grid:{display:false}, ticks:{color:chartTickCol(), font:{size:10}} }, y:{ grid:{color:chartGridCol()}, ticks:{color:chartTickCol(), font:{size:10}}, min:0, max:100 } } })
    });
  } catch(err){ console.error('chartTaskCat falhou', err); wrapCat.innerHTML = '<div class="dashempty">Não consegui desenhar este gráfico agora.</div>'; }
}

function buildMonthHtml(){
  const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const gridStart = startOfWeek(first);
  const today = new Date();
  let html = '<div class="monthgrid-heads">' + WEEKDAY_ABBR.map(d=>`<div>${d[0]}</div>`).join('') + '</div><div class="monthgrid-rows">';
  for (let i=0;i<42;i++){
    const d = addDays(gridStart, i);
    const inMonth = d.getMonth()===viewDate.getMonth();
    const isToday = dnum(d)===dnum(today);
    const isSelected = dnum(d)===dnum(viewDate);
    const isWeekend = d.getDay()===0 || d.getDay()===6;
    const hasTasks = tasksOnDate(d).length>0;
    html += `<div class="mcell ${inMonth?'':'outmonth'} ${isToday?'today':''} ${isSelected?'selected':''} ${isWeekend?'weekend':''}" data-date="${dkey(d)}">
      <div class="dnum">${d.getDate()}</div>${hasTasks?'<div class="dot"></div>':''}
    </div>`;
  }
  return html + '</div>';
}
function bindMonthClicks(box){
  box.querySelectorAll('.mcell').forEach(c=>{
    c.onclick = ()=>{ viewDate = new Date(c.dataset.date+'T00:00:00'); renderAgenda(); };
  });
}

function buildWeekHtml(){
  const s = startOfWeek(viewDate);
  const today = new Date();
  let html = '<div class="weekstrip">';
  for (let i=0;i<7;i++){
    const d = addDays(s,i);
    const isToday = dnum(d)===dnum(today);
    const isSelected = dnum(d)===dnum(viewDate);
    const hasTasks = tasksOnDate(d).length>0;
    html += `<div class="wcell ${isSelected?'selected':''} ${isToday?'today':''}" data-date="${dkey(d)}">
      <div class="wn">${WEEKDAY_ABBR[d.getDay()].slice(0,3)}</div>
      <div class="wd">${d.getDate()}</div>
      ${hasTasks?'<div class="dot"></div>':'<div class="dot" style="visibility:hidden;"></div>'}
    </div>`;
  }
  return html + '</div>';
}
function bindWeekClicks(box){
  box.querySelectorAll('.wcell').forEach(c=>{
    c.onclick = ()=>{ viewDate = new Date(c.dataset.date+'T00:00:00'); renderAgenda(); };
  });
}

function buildYearHtml(){
  const year = viewDate.getFullYear();
  const today = new Date();
  let html = '<div class="yeargrid">';
  for (let m=0;m<12;m++){
    const first = new Date(year, m, 1);
    const gridStart = startOfWeek(first);
    html += `<div class="miniMonth" data-month="${m}"><div class="mm-title">${MONTH_ABBR[m]}</div><div class="mm-heads">${WEEKDAY_ABBR.map(d=>`<div>${d[0]}</div>`).join('')}</div><div class="mm-days">`;
    for (let i=0;i<42;i++){
      const d = addDays(gridStart,i);
      const inMonth = d.getMonth()===m;
      if (!inMonth && i>=35) continue;
      const isToday = dnum(d)===dnum(today);
      const isSelected = dnum(d)===dnum(viewDate);
      const isWeekend = d.getDay()===0 || d.getDay()===6;
      html += `<div class="mm-day ${inMonth?'':'outmonth'} ${isToday?'today':''} ${isSelected?'selected':''} ${isWeekend?'weekend':''}" data-date="${dkey(d)}">${d.getDate()}</div>`;
    }
    html += '</div></div>';
  }
  return html + '</div>';
}
function bindYearClicks(box){
  box.querySelectorAll('.mm-day').forEach(c=>{
    c.onclick = ()=>{
      // seleciona o dia sem sair da visão de ano; a lista de tarefas
      // abaixo do calendário passa a mostrar o dia escolhido
      viewDate = new Date(c.dataset.date+'T00:00:00');
      renderAgenda();
    };
  });
}

async function renderAgendaList(){
  const label = document.getElementById('agendaListLabel');
  const today = new Date();
  label.textContent = dnum(viewDate)===dnum(today) ? 'Hoje' : (WEEKDAY_ABBR[viewDate.getDay()] + ' · ' + viewDate.getDate() + ' ' + MONTH_ABBR[viewDate.getMonth()]);
  const dayTasks = tasksOnDate(viewDate);
  const box = document.getElementById('agendaList');
  if (dayTasks.length===0){ box.innerHTML = emptyCta('Nenhuma tarefa nesse dia.', '+ Nova tarefa', 'btnNewTask'); return; }
  box.innerHTML = dayTasks.map(t=>{
    const isDone = !!checklist[occId(t,viewDate)];
    const endTime = minToTime(timeToMin(t.time)+t.duration);
    return `<div class="taskcard cat-${t.cat} ${isDone?'done':''}" data-id="${t.id}">
      <div class="dot"></div>
      <div class="info"><div class="ttl">${esc(t.title)}</div><div class="tm">${t.time}–${endTime}</div></div>
      <button class="del" data-id="${t.id}">✕</button>
    </div>`;
  }).join('');
  box.querySelectorAll('.taskcard').forEach(card=>{
    card.onclick = async (e)=>{
      if (e.target.closest('.del')) return;
      const id = card.dataset.id;
      const key = id+':'+dkey(viewDate);
      checklist[key] = !checklist[key];
      await storeSet('checklist_v6', checklist);
      renderAgendaList(); renderAgenda();
    };
  });
  box.querySelectorAll('.del').forEach(btn=>{
    btn.onclick = async (e)=>{
      e.stopPropagation();
      const removed = tasks.find(t=>t.id===btn.dataset.id);
      tasks = tasks.filter(t=>t.id!==btn.dataset.id);
      await storeSet('tasks_v6', tasks);
      renderAgenda();
      toast('Tarefa excluída', { undo: async ()=>{
        tasks.push(removed);
        await storeSet('tasks_v6', tasks);
        renderAgenda();
      }});
    };
  });
}

function renderHero(){
  const now = new Date();
  const hero = document.getElementById('hero');
  const todays = tasksOnDate(now);
  const nowMin = now.getHours()*60+now.getMinutes();
  let activeIdx=-1, nextIdx=-1;
  for(let i=0;i<todays.length;i++){
    const start = timeToMin(todays[i].time);
    const end = (i+1<todays.length) ? timeToMin(todays[i+1].time) : 24*60;
    if(nowMin>=start && nowMin<end){ activeIdx=i; nextIdx = i+1<todays.length ? i+1 : -1; }
  }
  if (activeIdx===-1) nextIdx = 0;
  if (activeIdx>-1){
    document.getElementById('heroLabel').textContent = 'Agora — ' + CATS[todays[activeIdx].cat];
    document.getElementById('heroTitle').textContent = todays[activeIdx].title;
  } else {
    document.getElementById('heroLabel').textContent = 'Fora da agenda programada';
    document.getElementById('heroTitle').textContent = todays[0] ? 'Próxima: ' + todays[0].title : 'Nenhuma tarefa hoje';
  }
  if (nextIdx>-1 && todays[nextIdx]){
    const nextStart = timeToMin(todays[nextIdx].time);
    let diff = nextStart - nowMin; if (diff<0) diff += 24*60;
    const h = Math.floor(diff/60), m = diff%60;
    document.getElementById('nextIn').textContent = (h>0?h+'h ':'') + m + 'min';
    if (diff===0){
      const ak = dkey(now)+':'+todays[nextIdx].id;
      if (!firedAlarms[ak]){
        firedAlarms[ak]=true;
        hero.classList.add('alarm'); setTimeout(()=>hero.classList.remove('alarm'),8000);
        if ('Notification' in window && Notification.permission==='granted' && localStorage.getItem('pm_notif')==='1'){
          try{ new Notification('Hora de: ' + todays[nextIdx].title, { body: todays[nextIdx].time + ' — Orby', icon: 'assets/icon-192.png', tag: ak }); }catch(e){}
        }
      }
    }
  } else { document.getElementById('nextIn').textContent = '--'; }
  const doneN = todays.filter(t=>checklist[occId(t,now)]).length;
  document.getElementById('doneCount').textContent = doneN + '/' + todays.length;
}

const modalOverlay = document.getElementById('modalOverlay');
document.getElementById('btnNewTask').onclick = ()=>{
  document.getElementById('mTitle').value = '';
  document.getElementById('mDate').value = dkey(viewDate);
  document.getElementById('mTime').value = '08:00';
  document.getElementById('mCat').value = 'trabalho';
  document.getElementById('mDuration').value = 30;
  document.getElementById('mRepeat').value = 'none';
  document.getElementById('mWeeks').value = 12;
  document.getElementById('mWeeksField').style.display = 'none';
  modalOverlay.classList.add('open');
};
document.getElementById('btnCancelModal').onclick = ()=> modalOverlay.classList.remove('open');
document.getElementById('mRepeat').onchange = (e)=>{
  document.getElementById('mWeeksField').style.display = e.target.value==='weekly' ? '' : 'none';
};
document.getElementById('btnSaveModal').onclick = async ()=>{
  const title = document.getElementById('mTitle').value.trim();
  if (!title) return;
  tasks.push({
    id: genId(), title,
    date: document.getElementById('mDate').value,
    time: document.getElementById('mTime').value,
    cat: document.getElementById('mCat').value,
    duration: Number(document.getElementById('mDuration').value||30),
    recurrence: document.getElementById('mRepeat').value,
    weeksCount: Number(document.getElementById('mWeeks').value||0),
  });
  await storeSet('tasks_v6', tasks);
  modalOverlay.classList.remove('open');
  renderAgenda();
  toast('Tarefa criada');
};

document.querySelectorAll('.sectiontab').forEach(t=>{
  t.onclick = ()=>{
    document.querySelectorAll('.sectiontab').forEach(x=>x.classList.remove('active'));
    document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));
    t.classList.add('active');
    document.getElementById('page-'+t.dataset.page).classList.add('active');
    if(t.dataset.page==='financeiro') renderFinance();
    if(t.dataset.page==='perfil') renderPerfil();
    if(t.dataset.page==='agenda') renderHomeCharts();
    if(t.dataset.page==='treinos') renderTreinos();
  };
});

/* ============ Treinos ============ */
let treinoSub = 'hoje';
document.querySelectorAll('#treinosSubnav .tsub').forEach(b=>{
  b.onclick = ()=>{
    document.querySelectorAll('#treinosSubnav .tsub').forEach(x=>x.classList.remove('active'));
    document.querySelectorAll('#page-treinos .tpage').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    treinoSub = b.dataset.tsub;
    document.getElementById('tpage-'+treinoSub).classList.add('active');
    renderTreinos();
  };
});
async function getWorkouts(){ return await storeGet('workouts', []); }
async function getWorkoutLog(){ return await storeGet('workout_log', {}); }

/* ---- Gerador de treino: biblioteca, splits e esquemas ---- */
const EX_DB = {
  peito:   ['Supino reto', 'Supino inclinado', 'Crucifixo', 'Crossover', 'Flexão de braço'],
  costas:  ['Puxada frontal', 'Remada curvada', 'Remada baixa', 'Barra fixa', 'Pulldown'],
  ombro:   ['Desenvolvimento', 'Elevação lateral', 'Elevação frontal', 'Remada alta'],
  biceps:  ['Rosca direta', 'Rosca alternada', 'Rosca martelo', 'Rosca scott'],
  triceps: ['Tríceps corda', 'Tríceps testa', 'Tríceps francês', 'Mergulho no banco'],
  perna:   ['Agachamento livre', 'Leg press', 'Cadeira extensora', 'Mesa flexora', 'Stiff', 'Panturrilha em pé'],
  abdomen: ['Prancha', 'Abdominal supra', 'Elevação de pernas'],
};
const SPLIT_DAYS = {
  2: [['Full Body A', ['peito','costas','perna','ombro']], ['Full Body B', ['perna','costas','peito','abdomen']]],
  3: [['Push (empurrar)', ['peito','ombro','triceps']], ['Pull (puxar)', ['costas','biceps']], ['Legs (pernas)', ['perna','abdomen']]],
  4: [['Upper A', ['peito','costas','ombro','triceps']], ['Lower A', ['perna','abdomen']], ['Upper B', ['costas','peito','ombro','biceps']], ['Lower B', ['perna','abdomen']]],
  5: [['Push', ['peito','ombro','triceps']], ['Pull', ['costas','biceps']], ['Legs', ['perna','abdomen']], ['Upper', ['peito','costas','ombro']], ['Lower', ['perna','abdomen']]],
  6: [['Push A', ['peito','ombro','triceps']], ['Pull A', ['costas','biceps']], ['Legs A', ['perna','abdomen']], ['Push B', ['ombro','peito','triceps']], ['Pull B', ['costas','biceps']], ['Legs B', ['perna','abdomen']]],
};
const GOAL_SCHEME = {
  hipertrofia: { sets:4, reps:10, label:'Hipertrofia' },
  forca:       { sets:5, reps:5,  label:'Força' },
  definicao:   { sets:3, reps:12, label:'Definição' },
  resistencia: { sets:3, reps:15, label:'Resistência' },
};
const SPLIT_NAME = { 2:'Full Body', 3:'Push / Pull / Legs', 4:'Upper / Lower', 5:'PPL + Upper/Lower', 6:'PPL (2x)' };

function buildGeneratedWorkouts(days, goal, level){
  const scheme = GOAL_SCHEME[goal] || GOAL_SCHEME.hipertrofia;
  const perGroup = level==='iniciante' ? 1 : (level==='avancado' ? 2 : 1);
  const maxEx = level==='iniciante' ? 5 : (level==='avancado' ? 8 : 6);
  const template = SPLIT_DAYS[days] || SPLIT_DAYS[3];
  return template.map(([dayName, groups])=>{
    const exercises = [];
    // distribui exercícios pelos grupos do dia, sem repetir
    let gi = 0, guard = 0;
    const used = {};
    while (exercises.length < maxEx && guard < 40){
      guard++;
      const g = groups[gi % groups.length]; gi++;
      const pool = EX_DB[g] || [];
      used[g] = used[g] || 0;
      if (used[g] >= Math.min(perGroup+1, pool.length)) continue;
      const ex = pool[used[g]];
      used[g]++;
      if (ex && !exercises.some(e=>e.name===ex)){
        exercises.push({ id: genId(), name: ex, sets: scheme.sets, reps: scheme.reps });
      }
      if (Object.keys(used).length>=groups.length && groups.every(g=>(used[g]||0)>=Math.min(perGroup+1, (EX_DB[g]||[]).length))) break;
    }
    return { id: genId(), name: dayName, exercises, createdAt: Date.now() };
  });
}
function renderGenPreview(){
  const days = Number(document.getElementById('genDays').value);
  const goal = document.getElementById('genGoal').value;
  const level = document.getElementById('genLevel').value;
  const workouts = buildGeneratedWorkouts(days, goal, level);
  const scheme = GOAL_SCHEME[goal];
  const box = document.getElementById('genPreview');
  box.innerHTML = `<div style="background:var(--surface-2);border:1px solid var(--line);border-radius:12px;padding:12px 14px;margin-top:6px;">
    <div style="font-size:12px;color:var(--text-2);margin-bottom:8px;">Divisão recomendada: <b style="color:var(--text);">${SPLIT_NAME[days]}</b> · ${scheme.sets}×${scheme.reps} (${scheme.label})</div>
    ${workouts.map(w=>`<div style="font-size:12.5px;margin-bottom:6px;"><b>${esc(w.name)}</b> <span style="color:var(--text-3);">— ${w.exercises.map(e=>esc(e.name)).join(', ')}</span></div>`).join('')}
  </div>`;
  return workouts;
}
document.getElementById('btnGenWorkout').onclick = ()=>{
  document.getElementById('genModalOverlay').classList.add('open');
  renderGenPreview();
};
['genDays','genGoal','genLevel'].forEach(id=> document.getElementById(id).addEventListener('change', renderGenPreview));
document.getElementById('genCancel').onclick = ()=> document.getElementById('genModalOverlay').classList.remove('open');
document.getElementById('genConfirm').onclick = async ()=>{
  const generated = renderGenPreview();
  const workouts = await getWorkouts();
  generated.forEach(w=> workouts.push(w));
  await storeSet('workouts', workouts);
  document.getElementById('genModalOverlay').classList.remove('open');
  renderTreinos();
  toast(generated.length + ' treinos adicionados');
};
function exMeta(ex){ return (ex.sets||'?') + ' × ' + (ex.reps||'?'); }

/** peso mais recente registrado pra um exercício antes de hoje (progressão) */
function lastLoad(log, exId, beforeKey){
  const keys = Object.keys(log).filter(k=>k < beforeKey).sort().reverse();
  for (const k of keys){
    const l = log[k];
    if (l && l.loads && l.loads[exId] != null && l.loads[exId] !== '') return l.loads[exId];
  }
  return null;
}
function isTrainedDay(log, k){ const l = log[k]; return !!(l && l.done && l.done.length>0); }
function renderWorkoutStats(log, nWorkouts, now){
  const monthTrained = Object.keys(log).filter(k=>k.startsWith(monthKey(now)) && isTrainedDay(log,k)).length;
  document.getElementById('workoutStatRow').innerHTML = `
    <div class="fc"><div class="v">${workoutStreak(log, now)}</div><div class="l">Dias seguidos</div></div>
    <div class="fc"><div class="v">${monthTrained}</div><div class="l">Treinos no mês</div></div>
    <div class="fc"><div class="v">${nWorkouts}</div><div class="l">Treinos cadastrados</div></div>`;
}
function workoutStreak(log, now){
  let streak = 0; let d = new Date(now);
  // se hoje ainda não treinou, começa a contar de ontem
  if (!isTrainedDay(log, dkey(d))) d = addDays(d, -1);
  let guard = 0;
  while (isTrainedDay(log, dkey(d)) && guard < 3660){ streak++; d = addDays(d, -1); guard++; }
  return streak;
}

async function renderTreinos(){
  const now = new Date();
  if (treinoSub === 'medidas'){ await renderMedidas(now); return; }

  const workouts = await getWorkouts();
  const log = await getWorkoutLog();
  const todayKey = dkey(now);
  const todayEntry = log[todayKey] || null;

  if (treinoSub === 'hoje'){
    const sel = document.getElementById('todayWorkout');
    const selectedId = (todayEntry && todayEntry.workoutId) || '';
    sel.innerHTML = '<option value="">— escolher treino —</option>' +
      workouts.map(w=>`<option value="${w.id}">${esc(w.name)}</option>`).join('');
    sel.value = selectedId;
    if (sel.__syncPick) sel.__syncPick();
    renderTodayExercises(workouts, log, now);
    renderWorkoutStats(log, workouts.length, now);
    renderWorkoutHeatmap(log, now);
    return;
  }

  // treinoSub === 'treinos'
  const box = document.getElementById('workoutList');
  if (workouts.length===0){
    box.innerHTML = emptyCta('Sem treinos ainda. Gere um automático pelo objetivo ou crie o seu.', '⚡ Gerar treino', 'btnGenWorkout');
  } else {
    box.innerHTML = workouts.map(w=>{
      const doneToday = todayEntry && todayEntry.workoutId===w.id && todayEntry.done && todayEntry.done.length>0;
      return `<div class="wocard" data-id="${w.id}">
        <div class="wo-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 6.5l11 11M4 8v8M8 4v16M16 4v16M20 8v8"/></svg></div>
        <div class="info"><div class="ttl">${esc(w.name)}</div><div class="sub">${(w.exercises||[]).length} exercício${(w.exercises||[]).length===1?'':'s'}</div></div>
        ${doneToday?'<span class="wo-done-badge">feito hoje</span>':''}
      </div>`;
    }).join('');
    box.querySelectorAll('.wocard').forEach(card=>{
      card.onclick = async ()=>{ const w = (await getWorkouts()).find(x=>x.id===card.dataset.id); if (w) openWorkoutEdit(w); };
    });
  }
}

async function renderTodayExercises(workouts, log, now){
  const wrap = document.getElementById('todayExercises');
  const todayKey = dkey(now);
  const sel = document.getElementById('todayWorkout');
  const wId = sel.value;
  if (!wId){ wrap.innerHTML = '<div style="font-size:12.5px;color:var(--text-3);">Escolha um treino acima pra marcar os exercícios do dia.</div>'; return; }
  const workout = workouts.find(w=>w.id===wId);
  if (!workout || !(workout.exercises||[]).length){ wrap.innerHTML = '<div style="font-size:12.5px;color:var(--text-3);">Esse treino ainda não tem exercícios. Edite ele em "Meus treinos".</div>'; return; }
  const entry = log[todayKey] && log[todayKey].workoutId===wId ? log[todayKey] : { workoutId:wId, done:[], loads:{} };
  wrap.innerHTML = workout.exercises.map(ex=>{
    const done = entry.done.includes(ex.id);
    const load = entry.loads[ex.id] ?? '';
    const prev = lastLoad(log, ex.id, todayKey);
    return `<div class="ex-row ${done?'done':''}" data-ex="${ex.id}">
      <button class="ex-check" data-check="${ex.id}">✓</button>
      <div class="ex-info"><div class="ex-name">${esc(ex.name)}</div><div class="ex-meta">${exMeta(ex)}</div></div>
      ${prev!=null?`<span class="ex-last">últ: ${esc(String(prev))}kg</span>`:''}
      <input type="number" class="ex-load" data-load="${ex.id}" placeholder="kg" value="${load}" step="0.5" min="0">
    </div>`;
  }).join('');

  async function persist(){
    const l = await getWorkoutLog();
    if (entry.done.length===0 && Object.keys(entry.loads).length===0) delete l[todayKey];
    else l[todayKey] = entry;
    await storeSet('workout_log', l);
  }
  wrap.querySelectorAll('[data-check]').forEach(btn=>{
    btn.onclick = async ()=>{
      const id = btn.dataset.check;
      const i = entry.done.indexOf(id);
      if (i>=0) entry.done.splice(i,1); else entry.done.push(id);
      btn.closest('.ex-row').classList.toggle('done', entry.done.includes(id));
      await persist();
      // atualiza stats/heatmap sem redesenhar a lista (não perde foco)
      const l = await getWorkoutLog();
      renderWorkoutStats(l, (await getWorkouts()).length, now);
      renderWorkoutHeatmap(l, now);
    };
  });
  wrap.querySelectorAll('[data-load]').forEach(inp=>{
    inp.onchange = async ()=>{
      const id = inp.dataset.load;
      if (inp.value==='') delete entry.loads[id]; else entry.loads[id] = Number(inp.value);
      await persist();
    };
  });
}
document.getElementById('todayWorkout').addEventListener('change', async ()=>{
  const workouts = await getWorkouts();
  const log = await getWorkoutLog();
  const now = new Date();
  renderTodayExercises(workouts, log, now);
  renderWorkoutStats(log, workouts.length, now);
  renderWorkoutHeatmap(log, now);
});

function renderWorkoutHeatmap(log, now){
  const wrap = document.getElementById('wrapWorkoutHeat');
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const gridStart = new Date(first); gridStart.setDate(gridStart.getDate() - gridStart.getDay());
  let html = '<div class="heatgrid">' + WEEKDAY_MIN.map(d=>`<div class="heat-head">${d}</div>`).join('');
  for (let i=0;i<42;i++){
    const d = new Date(gridStart); d.setDate(gridStart.getDate()+i);
    const inMonth = d.getMonth()===now.getMonth();
    if (!inMonth && i>=35) continue;
    const k = dkey(d);
    const trained = dnum(d) <= dnum(now) && isTrainedDay(log, k);
    const isToday = k===dkey(now);
    let bg = 'var(--surface-2)', textColor='';
    if (trained){ bg = `rgba(${accentRGBStr()},0.85)`; textColor = '#fff'; }
    html += `<div class="heatcell ${inMonth?'':'outmonth'} ${isToday?'today':''}" style="background:${bg};${textColor?`color:${textColor};font-weight:600;`:''}" title="${d.getDate()}/${d.getMonth()+1}: ${trained?'treinou':'—'}">${d.getDate()}</div>`;
  }
  html += '</div>';
  wrap.innerHTML = html;
}

/* ---- modal criar/editar treino ---- */
let editingWorkoutId = null;
function exEditRow(ex){
  ex = ex || { name:'', sets:'', reps:'' };
  return `<div class="exedit-row">
    <input type="text" class="exe-name" placeholder="Exercício" value="${esc(ex.name||'')}">
    <input type="number" class="exe-num exe-sets" placeholder="séries" value="${ex.sets||''}" min="0">
    <span class="exe-x">×</span>
    <input type="number" class="exe-num exe-reps" placeholder="reps" value="${ex.reps||''}" min="0">
    <button type="button" class="goal-del exe-del" title="Remover">✕</button>
  </div>`;
}
document.getElementById('btnNewWorkout').onclick = ()=>{
  editingWorkoutId = null;
  document.getElementById('workoutModalTitle').textContent = 'Novo treino';
  document.getElementById('woName').value = '';
  document.getElementById('woExercises').innerHTML = exEditRow() + exEditRow() + exEditRow();
  document.getElementById('woDelete').style.display = 'none';
  document.getElementById('workoutModalOverlay').classList.add('open');
};
function openWorkoutEdit(w){
  editingWorkoutId = w.id;
  document.getElementById('workoutModalTitle').textContent = 'Editar treino';
  document.getElementById('woName').value = w.name;
  document.getElementById('woExercises').innerHTML = (w.exercises||[]).map(exEditRow).join('') || exEditRow();
  document.getElementById('woDelete').style.display = '';
  document.getElementById('workoutModalOverlay').classList.add('open');
}
document.getElementById('woAddEx').onclick = ()=>{
  document.getElementById('woExercises').insertAdjacentHTML('beforeend', exEditRow());
  const rows = document.querySelectorAll('#woExercises .exe-name');
  rows[rows.length-1]?.focus();
};
document.getElementById('woExercises').addEventListener('click', (e)=>{
  if (e.target.closest('.exe-del')) e.target.closest('.exedit-row').remove();
});
document.getElementById('woCancel').onclick = ()=> document.getElementById('workoutModalOverlay').classList.remove('open');
document.getElementById('woSave').onclick = async ()=>{
  const name = document.getElementById('woName').value.trim();
  if (!name){ toast('Dê um nome pro treino', {error:true}); return; }
  const exercises = [];
  document.querySelectorAll('#woExercises .exedit-row').forEach(row=>{
    const exName = row.querySelector('.exe-name').value.trim();
    if (!exName) return;
    exercises.push({
      id: genId(),
      name: exName,
      sets: Number(row.querySelector('.exe-sets').value)||'',
      reps: Number(row.querySelector('.exe-reps').value)||'',
    });
  });
  let workouts = await getWorkouts();
  if (editingWorkoutId){
    const w = workouts.find(x=>x.id===editingWorkoutId);
    if (w){
      // preserva ids de exercícios que continuaram (por nome) pra não perder histórico de carga
      const byName = {}; (w.exercises||[]).forEach(e=>{ byName[e.name.toLowerCase()] = e.id; });
      exercises.forEach(e=>{ const old = byName[e.name.toLowerCase()]; if (old) e.id = old; });
      w.name = name; w.exercises = exercises;
    }
  } else {
    workouts.push({ id: genId(), name, exercises, createdAt: Date.now() });
  }
  await storeSet('workouts', workouts);
  document.getElementById('workoutModalOverlay').classList.remove('open');
  renderTreinos();
  toast(editingWorkoutId ? 'Treino atualizado' : 'Treino criado');
};
document.getElementById('woDelete').onclick = async ()=>{
  if (!editingWorkoutId) return;
  let workouts = await getWorkouts();
  const removed = workouts.find(w=>w.id===editingWorkoutId);
  workouts = workouts.filter(w=>w.id!==editingWorkoutId);
  await storeSet('workouts', workouts);
  document.getElementById('workoutModalOverlay').classList.remove('open');
  renderTreinos();
  toast('Treino excluído', { undo: async ()=>{
    const cur = await getWorkouts();
    cur.push(removed);
    await storeSet('workouts', cur);
    renderTreinos();
  }});
};

/* ---- Medidas corporais + IMC ---- */
let chartWeight = null;
const MEASURE_FIELDS = [['weight','Peso','kg'],['chest','Peito','cm'],['waist','Cintura','cm'],['hip','Quadril','cm'],['arm','Braço','cm'],['thigh','Coxa','cm'],['calf','Panturrilha','cm']];
function bmiClass(bmi){
  if (bmi < 18.5) return { label:'Abaixo do peso', color:'#F59E0B' };
  if (bmi < 25) return { label:'Peso normal', color:'var(--sage)' };
  if (bmi < 30) return { label:'Sobrepeso', color:'#F59E0B' };
  return { label:'Obesidade', color:'var(--brick)' };
}
async function renderMedidas(now){
  const height = await storeGet('body_height', null);
  const logs = (await storeGet('body_log', [])).slice().sort((a,b)=> (a.date||'').localeCompare(b.date||''));
  const latest = logs[logs.length-1] || null;
  const prev = logs[logs.length-2] || null;

  // ---- card IMC ----
  const card = document.getElementById('bmiCard');
  if (!latest){
    card.innerHTML = emptyCta('Registre seu peso e medidas pra calcular o IMC e acompanhar a evolução.', '+ Registrar medidas', 'btnNewMeasure');
  } else {
    let bmiHtml = '';
    if (height && latest.weight){
      const bmi = latest.weight / Math.pow(height/100, 2);
      const c = bmiClass(bmi);
      bmiHtml = `<div style="display:flex;align-items:baseline;gap:10px;">
        <div class="big" style="color:${c.color};">${bmi.toFixed(1)}</div>
        <div><div style="font-weight:600;color:${c.color};">${c.label}</div><div style="font-size:11px;color:var(--text-3);">IMC · ${latest.weight}kg / ${height}cm</div></div>
      </div>`;
    } else {
      bmiHtml = `<div style="font-size:12.5px;color:var(--text-2);">Informe peso e altura pra calcular o IMC.</div>`;
    }
    const chips = MEASURE_FIELDS.filter(([k])=> latest[k]!=null && latest[k]!=='').map(([k,label,unit])=>{
      let delta = '';
      if (prev && prev[k]!=null && prev[k]!==''){
        const d = Number(latest[k]) - Number(prev[k]);
        if (Math.abs(d) >= 0.05) delta = `<span style="color:${d>0?'var(--sage)':'var(--brick)'};font-size:10px;"> ${d>0?'▲':'▼'}${Math.abs(d).toFixed(1)}</span>`;
      }
      return `<div class="measchip"><div class="mv">${latest[k]}<span class="mu">${unit}</span>${delta}</div><div class="ml">${label}</div></div>`;
    }).join('');
    card.innerHTML = `<div class="dashcard"><div class="dashcard-title" style="margin-bottom:12px;">Situação atual</div>${bmiHtml}<div class="measgrid">${chips}</div></div>`;
  }

  // ---- gráfico de peso ----
  const wrap = document.getElementById('wrapWeight');
  const weightPts = logs.filter(l=>l.weight!=null && l.weight!=='');
  if (typeof Chart==='undefined' || weightPts.length<1){
    wrap.innerHTML = '<div class="dashempty">Registre pelo menos um peso pra ver a evolução.</div>';
  } else {
    wrap.innerHTML = '<canvas id="chartWeight"></canvas>';
    if (chartWeight){ chartWeight.destroy(); chartWeight=null; }
    try{
      chartWeight = new Chart(document.getElementById('chartWeight'), {
        type:'line',
        data:{ labels: weightPts.map(l=>l.date.split('-').reverse().slice(0,2).join('/')),
          datasets:[{ data: weightPts.map(l=>Number(l.weight)), borderColor: accentHex(), backgroundColor:`rgba(${accentRGBStr()},0.15)`, fill:true, tension:.35, pointRadius:3, borderWidth:2 }] },
        options: chartBaseOptions({ scales:{ x:{ grid:{display:false}, ticks:{color:chartTickCol(), font:{size:9}, maxTicksLimit:8} }, y:{ grid:{color:chartGridCol()}, ticks:{color:chartTickCol(), font:{size:10}} } } })
      });
    }catch(e){ wrap.innerHTML = '<div class="dashempty">Não consegui desenhar o gráfico agora.</div>'; }
  }

  // ---- histórico ----
  const list = document.getElementById('measureList');
  if (logs.length===0){ list.innerHTML=''; }
  else {
    list.innerHTML = logs.slice().reverse().map(l=>{
      const parts = MEASURE_FIELDS.filter(([k])=>l[k]!=null && l[k]!=='').map(([k,label,unit])=>`${label} ${l[k]}${unit}`);
      return `<div class="wocard" data-mid="${l.id}">
        <div class="info"><div class="ttl">${relDate(l.date)}</div><div class="sub">${parts.join(' · ')||'sem dados'}</div></div>
      </div>`;
    }).join('');
    list.querySelectorAll('[data-mid]').forEach(card=>{
      card.onclick = async ()=>{ const l = (await storeGet('body_log', [])).find(x=>x.id===card.dataset.mid); if (l) openMeasureEdit(l); };
    });
  }
}

let editingMeasureId = null;
function setMeasureFields(l, height){
  document.getElementById('meDate').value = (l&&l.date) || dkey(new Date());
  document.getElementById('meHeight').value = height || '';
  document.getElementById('meWeight').value = (l&&l.weight) || '';
  document.getElementById('meChest').value = (l&&l.chest) || '';
  document.getElementById('meWaist').value = (l&&l.waist) || '';
  document.getElementById('meHip').value = (l&&l.hip) || '';
  document.getElementById('meArm').value = (l&&l.arm) || '';
  document.getElementById('meThigh').value = (l&&l.thigh) || '';
  document.getElementById('meCalf').value = (l&&l.calf) || '';
}
document.getElementById('btnNewMeasure').onclick = async ()=>{
  editingMeasureId = null;
  document.getElementById('measureModalTitle').textContent = 'Registrar medidas';
  setMeasureFields(null, await storeGet('body_height', null));
  document.getElementById('meDelete').style.display = 'none';
  document.getElementById('measureModalOverlay').classList.add('open');
};
async function openMeasureEdit(l){
  editingMeasureId = l.id;
  document.getElementById('measureModalTitle').textContent = 'Editar medidas';
  setMeasureFields(l, await storeGet('body_height', null));
  document.getElementById('meDelete').style.display = '';
  document.getElementById('measureModalOverlay').classList.add('open');
}
document.getElementById('meCancel').onclick = ()=> document.getElementById('measureModalOverlay').classList.remove('open');
function numOrNull(id){ const v = document.getElementById(id).value; return v==='' ? null : Number(v); }
document.getElementById('meSave').onclick = async ()=>{
  const height = numOrNull('meHeight');
  if (height) await storeSet('body_height', height);
  const entry = {
    id: editingMeasureId || genId(),
    date: document.getElementById('meDate').value || dkey(new Date()),
    weight: numOrNull('meWeight'), chest: numOrNull('meChest'), waist: numOrNull('meWaist'),
    hip: numOrNull('meHip'), arm: numOrNull('meArm'), thigh: numOrNull('meThigh'), calf: numOrNull('meCalf'),
  };
  let logs = await storeGet('body_log', []);
  if (editingMeasureId){ const i = logs.findIndex(x=>x.id===editingMeasureId); if (i>=0) logs[i] = entry; }
  else logs.push(entry);
  await storeSet('body_log', logs);
  document.getElementById('measureModalOverlay').classList.remove('open');
  renderMedidas(new Date());
  toast(editingMeasureId ? 'Medidas atualizadas' : 'Medidas registradas');
};
document.getElementById('meDelete').onclick = async ()=>{
  if (!editingMeasureId) return;
  let logs = await storeGet('body_log', []);
  const removed = logs.find(x=>x.id===editingMeasureId);
  logs = logs.filter(x=>x.id!==editingMeasureId);
  await storeSet('body_log', logs);
  document.getElementById('measureModalOverlay').classList.remove('open');
  renderMedidas(new Date());
  toast('Registro excluído', { undo: async ()=>{
    const cur = await storeGet('body_log', []);
    cur.push(removed);
    await storeSet('body_log', cur);
    renderMedidas(new Date());
  }});
};

async function getExpenseLines(){
  return await storeGet('expense_lines_v4', []);
}
async function getIncomeLines(){
  return await storeGet('income_lines', []);
}
function isIncomeActive(line, now){
  if (line.type !== 'temporaria') return true;
  if (!line.endDate) return true;
  return dnum(new Date(line.endDate+'T00:00:00')) >= dnum(now);
}
const TYPE_LABEL = {fixa:'Fixa', variavel:'Variável', temporaria:'Temporária'};


document.querySelectorAll('.fsub').forEach(t=>{
  t.onclick = ()=>{
    document.querySelectorAll('.fsub').forEach(x=>x.classList.remove('active'));
    document.querySelectorAll('.fpage').forEach(x=>x.classList.remove('active'));
    t.classList.add('active');
    document.getElementById('fpage-'+t.dataset.fsub).classList.add('active');
    renderFinance();
  };
});

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
const imV = id => Number(document.getElementById(id).value||0);
function cltParamsFromForm(){ return { bruto:imV('imBruto'), deps:imV('imDeps'), he50:imV('imHe50'), he100:imV('imHe100'), convMed:imV('imConvMed'), convOdo:imV('imConvOdo'), outros:imV('imOutros') }; }
function pjParamsFromForm(){ return { bruto:imV('imPjBruto'), imposto:imV('imPjImposto'), conv:imV('imPjConv'), outros:imV('imPjOutros') }; }
function recalcRegime(){
  const r = document.getElementById('imRegime').value;
  if (r==='clt'){
    const c = computeCLT(cltParamsFromForm());
    document.getElementById('imCltResult').innerHTML = `
      <div class="clt-line"><span>Bruto${c.extras>0?' + extras':''}</span><b>${fmtMoney(c.brutoTotal)}</b></div>
      ${c.extras>0?`<div class="clt-line info"><span>Horas extras</span><b>+${fmtMoney(c.extras)}</b></div>`:''}
      <div class="clt-line neg"><span>INSS</span><b>−${fmtMoney(c.inss)}</b></div>
      <div class="clt-line neg"><span>IRRF</span><b>−${fmtMoney(c.irrf)}</b></div>
      ${c.convMed>0?`<div class="clt-line neg"><span>Convênio médico</span><b>−${fmtMoney(c.convMed)}</b></div>`:''}
      ${c.convOdo>0?`<div class="clt-line neg"><span>Convênio odonto</span><b>−${fmtMoney(c.convOdo)}</b></div>`:''}
      ${c.outros>0?`<div class="clt-line neg"><span>Outros descontos</span><b>−${fmtMoney(c.outros)}</b></div>`:''}
      <div class="clt-line total"><span>Líquido</span><b>${fmtMoney(c.liquido)}</b></div>
      <div class="clt-info">FGTS ${fmtMoney(c.fgts)}/mês · 13º ≈ ${fmtMoney(c.decimo)} · férias ${fmtMoney(c.ferias)}</div>`;
    if (c.liquido>0) document.getElementById('imValue').value = c.liquido.toFixed(2);
  } else if (r==='pj'){
    const c = computePJ(pjParamsFromForm());
    document.getElementById('imPjResult').innerHTML = `
      <div class="clt-line"><span>Bruto</span><b>${fmtMoney(c.bruto)}</b></div>
      ${c.impostos>0?`<div class="clt-line neg"><span>Impostos</span><b>−${fmtMoney(c.impostos)}</b></div>`:''}
      ${c.conv>0?`<div class="clt-line neg"><span>Convênio/plano</span><b>−${fmtMoney(c.conv)}</b></div>`:''}
      ${c.outros>0?`<div class="clt-line neg"><span>Outros descontos</span><b>−${fmtMoney(c.outros)}</b></div>`:''}
      <div class="clt-line total"><span>Líquido</span><b>${fmtMoney(c.liquido)}</b></div>`;
    if (c.liquido>0) document.getElementById('imValue').value = c.liquido.toFixed(2);
  }
}
function toggleRegime(){
  const r = document.getElementById('imRegime').value;
  document.getElementById('imCltPanel').style.display = r==='clt' ? 'block' : 'none';
  document.getElementById('imPjPanel').style.display = r==='pj' ? 'block' : 'none';
  document.getElementById('imValueLbl').textContent = r==='nenhum' ? 'Valor mensal (R$)' : 'Valor mensal líquido (R$)';
  if (r!=='nenhum') recalcRegime();
}
['imBruto','imDeps','imHe50','imHe100','imConvMed','imConvOdo','imOutros','imPjBruto','imPjImposto','imPjConv','imPjOutros'].forEach(id=>{
  document.getElementById(id).addEventListener('input', recalcRegime);
});
async function getIncomeMeta(){ return await storeGet('income_meta', {}); }

/* ---- Modal de renda (novo / editar) ---- */
let editingIncomeId = null;
document.getElementById('imRegime').onchange = toggleRegime;
document.getElementById('imType').onchange = (e)=>{
  document.getElementById('imEndField').style.display = e.target.value==='temporaria' ? '' : 'none';
};
function resetRegimeFields(){
  ['imBruto','imDeps','imHe50','imHe100','imConvMed','imConvOdo','imOutros','imPjBruto','imPjImposto','imPjConv','imPjOutros'].forEach(id=> document.getElementById(id).value='');
  document.getElementById('imCltResult').innerHTML=''; document.getElementById('imPjResult').innerHTML='';
}
async function fillIncomeAccountSelect(selectedId){
  const accounts = (await getAccounts()).filter(isContaLike);
  const sel = document.getElementById('imAccount');
  sel.innerHTML = '<option value="">Não vincular a uma conta</option>' +
    accounts.map(a=>`<option value="${a.id}">${esc(a.label)}</option>`).join('');
  sel.value = selectedId || '';
}
document.getElementById('btnOpenIncModal').onclick = async ()=>{
  editingIncomeId = null;
  document.getElementById('incomeModalTitle').textContent = 'Nova renda';
  document.getElementById('imLabel').value = '';
  document.getElementById('imValue').value = '';
  document.getElementById('imType').value = 'fixa';
  document.getElementById('imEnd').value = '';
  document.getElementById('imPayday').value = '';
  document.getElementById('imEndField').style.display = 'none';
  document.getElementById('imDelete').style.display = 'none';
  document.getElementById('imRegime').value = 'nenhum';
  resetRegimeFields(); toggleRegime();
  await fillIncomeAccountSelect('');
  document.getElementById('incomeModalOverlay').classList.add('open');
};
document.getElementById('imCancel').onclick = ()=> document.getElementById('incomeModalOverlay').classList.remove('open');
document.getElementById('imSave').onclick = async ()=>{
  const label = document.getElementById('imLabel').value.trim();
  if (!label) return;
  const value = Number(document.getElementById('imValue').value||0);
  const type = document.getElementById('imType').value;
  const endDate = document.getElementById('imEnd').value || null;
  const pdRaw = parseInt(document.getElementById('imPayday').value, 10);
  const payday = (pdRaw>=1 && pdRaw<=31) ? pdRaw : null;
  const accountId = document.getElementById('imAccount').value || null;
  const regime = document.getElementById('imRegime').value;
  let lines = await getIncomeLines();
  let id = editingIncomeId;
  if (editingIncomeId){
    const l = lines.find(x=>x.id===editingIncomeId);
    if (l){ l.label=label; l.value=value; l.type=type; l.endDate = type==='temporaria'?endDate:null; l.payday=payday; l.accountId=accountId; l.regime = regime==='nenhum'?null:regime; }
  } else {
    id = genId();
    lines.push({ id, label, value, type, endDate: type==='temporaria'?endDate:null, payday, accountId, regime: regime==='nenhum'?null:regime, createdAt: Date.now() });
  }
  await storeSet('income_lines', lines);
  // parâmetros do cálculo CLT/PJ ficam em kv separado (não passam pela tabela)
  const meta = await getIncomeMeta();
  if (regime==='clt') meta[id] = { regime, ...cltParamsFromForm() };
  else if (regime==='pj') meta[id] = { regime, ...pjParamsFromForm() };
  else delete meta[id];
  await storeSet('income_meta', meta);
  document.getElementById('incomeModalOverlay').classList.remove('open');
  renderFinance();
  toast(editingIncomeId ? 'Renda atualizada' : 'Renda cadastrada');
};
document.getElementById('imDelete').onclick = async ()=>{
  if (!editingIncomeId) return;
  let lines = await getIncomeLines();
  const removed = lines.find(l=>l.id===editingIncomeId);
  lines = lines.filter(l=>l.id!==editingIncomeId);
  await storeSet('income_lines', lines);
  document.getElementById('incomeModalOverlay').classList.remove('open');
  renderFinance();
  toast('Renda excluída', { undo: async ()=>{
    const cur = await getIncomeLines();
    cur.push(removed);
    await storeSet('income_lines', cur);
    renderFinance();
  }});
};
async function openIncomeEdit(line){
  editingIncomeId = line.id;
  document.getElementById('incomeModalTitle').textContent = 'Editar renda';
  document.getElementById('imLabel').value = line.label;
  document.getElementById('imValue').value = line.value;
  document.getElementById('imType').value = line.type;
  document.getElementById('imEnd').value = line.endDate || '';
  document.getElementById('imPayday').value = line.payday || '';
  document.getElementById('imEndField').style.display = line.type==='temporaria' ? '' : 'none';
  // recarrega parâmetros CLT/PJ do kv
  resetRegimeFields();
  const meta = (await getIncomeMeta())[line.id];
  const regime = meta && meta.regime ? meta.regime : 'nenhum';
  document.getElementById('imRegime').value = regime;
  if (regime==='clt'){
    document.getElementById('imBruto').value = meta.bruto||''; document.getElementById('imDeps').value = meta.deps||'';
    document.getElementById('imHe50').value = meta.he50||''; document.getElementById('imHe100').value = meta.he100||'';
    document.getElementById('imConvMed').value = meta.convMed||''; document.getElementById('imConvOdo').value = meta.convOdo||'';
    document.getElementById('imOutros').value = meta.outros||'';
  } else if (regime==='pj'){
    document.getElementById('imPjBruto').value = meta.bruto||''; document.getElementById('imPjImposto').value = meta.imposto||'';
    document.getElementById('imPjConv').value = meta.conv||''; document.getElementById('imPjOutros').value = meta.outros||'';
  }
  toggleRegime();
  document.getElementById('imValue').value = line.value;  // mantém o valor salvo
  await fillIncomeAccountSelect(line.accountId || '');
  document.getElementById('imDelete').style.display = '';
  document.getElementById('incomeModalOverlay').classList.add('open');
}

/* ---- Modal de despesa (novo / editar) ---- */
let editingExpenseId = null;

async function fillAccountSelect(selectedId){
  const accounts = await getAccounts();
  const sel = document.getElementById('emAccount');
  sel.innerHTML = '<option value="">Não movimentar nenhuma conta</option>' +
    accounts.map(a=>`<option value="${a.id}">${esc(a.label)}${a.tipo==='cartao'?' (cartão)':''}</option>`).join('');
  sel.value = selectedId || '';
  syncAccountSelectState();
}
function syncAccountSelectState(){
  const rec = document.getElementById('emRecorrente').checked;
  const sel = document.getElementById('emAccount');
  sel.disabled = rec;
  if (rec) sel.value = '';
}
document.getElementById('emRecorrente').onchange = syncAccountSelectState;

/** sign +1 aplica a despesa na conta (debita saldo / soma fatura); -1 estorna. */
function applyAccountMovement(accounts, accountId, value, sign){
  const a = accounts.find(x=>x.id===accountId);
  if (!a) return;
  if (a.tipo==='cartao') a.fatura = Number(a.fatura||0) + sign*value;
  else a.saldo = Number(a.saldo||0) - sign*value;
}

document.getElementById('btnOpenExpModal').onclick = async ()=>{
  editingExpenseId = null;
  document.getElementById('expenseModalTitle').textContent = 'Nova despesa';
  document.getElementById('emLabel').value = '';
  document.getElementById('emValue').value = '';
  document.getElementById('emDate').value = dkey(new Date());
  document.getElementById('emTime').value = pad(new Date().getHours())+':'+pad(new Date().getMinutes());
  document.getElementById('emRecorrente').checked = false;
  fillCategorySelect(document.getElementById('emCategoria'), 'outros');
  document.getElementById('emMethod').value = 'pix';
  renderMethodPicker('emMethodPicker', 'emMethod', 'pix');
  document.getElementById('emBank').value = 'outro';
  renderBankPicker('emBankPicker', 'emBank', 'outro');
  document.getElementById('emDelete').style.display = 'none';
  await fillAccountSelect('');
  onExpenseMethodChange();
  document.getElementById('expenseModalOverlay').classList.add('open');
};
document.getElementById('emCancel').onclick = ()=> document.getElementById('expenseModalOverlay').classList.remove('open');
document.getElementById('emSave').onclick = async ()=>{
  const label = document.getElementById('emLabel').value.trim();
  if (!label) return;
  const value = Number(document.getElementById('emValue').value||0);
  const date = document.getElementById('emDate').value || null;
  const time = document.getElementById('emTime').value || '12:00';
  const recorrencia = document.getElementById('emRecorrente').checked ? 'mensal' : 'none';
  const categoria = document.getElementById('emCategoria').value;
  const method = document.getElementById('emMethod').value;
  const bank = document.getElementById('emBank').value;
  const accountId = recorrencia==='none' ? (document.getElementById('emAccount').value || null) : null;
  let lines = await getExpenseLines();
  const accounts = await getAccounts();
  let accountsTouched = false;
  if (editingExpenseId){
    const l = lines.find(x=>x.id===editingExpenseId);
    if (l){
      // se mudou a conta ou o valor: estorna o movimento antigo e aplica o novo
      const movementChanged = (l.accountId||null)!==accountId || Number(l.value||0)!==value;
      if (movementChanged){
        if (l.accountId){ applyAccountMovement(accounts, l.accountId, Number(l.value||0), -1); accountsTouched = true; }
        if (accountId){ applyAccountMovement(accounts, accountId, value, +1); accountsTouched = true; }
      }
      l.label=label; l.value=value; l.date=date; l.time=time; l.recorrencia=recorrencia;
      l.categoria=categoria; l.method=method; l.bank=bank; l.accountId=accountId;
    }
  } else {
    if (accountId){
      applyAccountMovement(accounts, accountId, value, +1);
      accountsTouched = true;
    }
    lines.push({ id: genId(), label, value, date, time, recorrencia, categoria, method, bank, accountId, createdAt: Date.now() });
  }
  if (accountsTouched) await storeSet('accounts_v2', accounts);
  await storeSet('expense_lines_v4', lines);
  document.getElementById('expenseModalOverlay').classList.remove('open');
  renderFinance();
  toast(editingExpenseId ? 'Despesa atualizada' : 'Despesa registrada');
};
document.getElementById('emDelete').onclick = async ()=>{
  if (!editingExpenseId) return;
  let lines = await getExpenseLines();
  const removed = lines.find(l=>l.id===editingExpenseId);
  if (removed && removed.accountId){
    const accounts = await getAccounts();
    applyAccountMovement(accounts, removed.accountId, Number(removed.value||0), -1);
    await storeSet('accounts_v2', accounts);
  }
  lines = lines.filter(l=>l.id!==editingExpenseId);
  await storeSet('expense_lines_v4', lines);
  document.getElementById('expenseModalOverlay').classList.remove('open');
  renderFinance();
  toast('Despesa excluída', { undo: async ()=>{
    const cur = await getExpenseLines();
    cur.push(removed);
    if (removed.accountId){
      const accounts = await getAccounts();
      applyAccountMovement(accounts, removed.accountId, Number(removed.value||0), +1);
      await storeSet('accounts_v2', accounts);
    }
    await storeSet('expense_lines_v4', cur);
    renderFinance();
  }});
};
function openExpenseEdit(line){
  editingExpenseId = line.id;
  document.getElementById('expenseModalTitle').textContent = 'Editar despesa';
  document.getElementById('emLabel').value = line.label;
  document.getElementById('emValue').value = line.value;
  document.getElementById('emDate').value = line.date || '';
  document.getElementById('emTime').value = expenseTimeOf(line);
  document.getElementById('emRecorrente').checked = line.recorrencia === 'mensal';
  fillCategorySelect(document.getElementById('emCategoria'), line.categoria || 'outros');
  document.getElementById('emMethod').value = line.method;
  renderMethodPicker('emMethodPicker', 'emMethod', line.method);
  document.getElementById('emBank').value = line.bank;
  renderBankPicker('emBankPicker', 'emBank', line.bank);
  document.getElementById('emDelete').style.display = '';
  fillAccountSelect(line.accountId || '');
  onExpenseMethodChange();
  document.getElementById('expenseModalOverlay').classList.add('open');
}


/* ---- Contas ---- */
async function getAccounts(){
  return await storeGet('accounts_v2', []);
}
const TIPO_CONTA_LABEL = { conta:'Conta corrente', poupanca:'Poupança', cartao:'Cartão de crédito' };
function accTipoLabel(a){ return TIPO_CONTA_LABEL[a.tipo] || 'Conta corrente'; }
function isContaLike(a){ return a.tipo !== 'cartao'; }  // corrente e poupança
let __accView = 'conta';
let __reservedByAcc = {};
function accountCardHtml(a, reorder, idx, total){
  const isCartao = a.tipo==='cartao';
  const saldoNeg = !isCartao && Number(a.saldo||0)<0;
  let fatBadge = '';
  if (isCartao && a.fechamento){
    const closed = new Date().getDate() >= a.fechamento;
    fatBadge = `<span class="fatbadge ${closed?'closed':'open'}">${closed?'Fatura fechada':'Fatura aberta'}</span>`;
  }
  const reorderBtns = reorder ? `
      <button class="accact" data-act="up" data-id="${a.id}" title="Subir" ${idx===0?'disabled':''}>↑</button>
      <button class="accact" data-act="down" data-id="${a.id}" title="Descer" ${idx===total-1?'disabled':''}>↓</button>` : '';
  // faixa inferior estilo app de banco: duas colunas de valores
  let footHtml, subTxt, barHtml = '';
  if (isCartao){
    const limite = Number(a.limite||0), fatura = Number(a.fatura||0);
    const disp = Math.max(0, limite - fatura);
    const pct = limite>0 ? Math.min(100, Math.round(fatura/limite*100)) : 0;
    if (limite>0) barHtml = `<div class="accbar"><div style="width:${pct}%"></div></div>`;
    subTxt = `Cartão de crédito · ${bankById(a.bank).name}${a.vencimento?' · vence dia '+a.vencimento:''}`;
    footHtml = `
      <div><div class="af-l">Valor da fatura</div><div class="af-v brick">${fmtMoney(fatura)}</div></div>
      <div class="af-r"><div class="af-l">Disponível</div><div class="af-v">${fmtMoney(disp)}</div></div>`;
  } else {
    const ce = Number(a.chequeEspecial||0);
    const reserved = Number(__reservedByAcc[a.id]||0);
    const extras = [];
    if (saldoNeg) extras.push('no cheque especial');
    if (reserved>0) extras.push('guardado '+fmtMoney(reserved));
    subTxt = `${accTipoLabel(a)} · ${bankById(a.bank).name}${extras.length?' · '+extras.join(' · '):''}`;
    footHtml = `
      <div><div class="af-l">Saldo disponível</div><div class="af-v ${saldoNeg?'brick':'sage'}">${fmtMoney(a.saldo)}</div></div>
      <div class="af-r"><div class="af-l">${ce>0?'Cheque especial':'Guardado'}</div><div class="af-v">${ce>0?fmtMoney(ce):fmtMoney(reserved)}</div></div>`;
  }
  return `<div class="acccard bankstyle" data-id="${a.id}">
    <div class="acc-toprow">
      <div class="bankavatar acc-logo">
        <img src="assets/bancos/${bankById(a.bank).id}.svg" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
        <div class="fallback-initials" style="display:none;background:${bankColor(bankById(a.bank))}">${bankInitials(bankById(a.bank))}</div>
      </div>
      <div class="info"><div class="ttl">${esc(a.label)} ${a.principal?'<span class="badge b-principal">Principal</span>':''}${fatBadge}</div>
        <div class="sub">${subTxt}</div>
      </div>
      <div class="accacts">
        ${reorderBtns}
        <button class="accact ${a.principal?'on':''}" data-act="star" data-id="${a.id}" title="Tornar principal">★</button>
        <button class="accact" data-act="edit" data-id="${a.id}" title="Editar">✎</button>
        <button class="accact danger" data-act="del" data-id="${a.id}" title="Excluir">🗑</button>
      </div>
      <span class="acc-chev">›</span>
    </div>
    ${barHtml}
    <div class="acc-foot">${footHtml}</div>
  </div>`;
}
function wireAccountCards(container, accounts){
  container.querySelectorAll('.accact').forEach(btn=> btn.onclick = (ev)=>{ ev.stopPropagation(); accountAction(btn.dataset.act, btn.dataset.id); });
  container.querySelectorAll('.acccard').forEach(card=>{
    card.onclick = ()=>{ const a = accounts.find(x=>x.id===card.dataset.id); if (a) openAccountDetail(a); };
  });
}
let __detailAccId = null;
async function openAccountDetail(acc){
  __detailAccId = acc.id;
  const expLines = await getExpenseLines();
  const incLines = await getIncomeLines();
  const allAccounts = await getAccounts();
  const transfers = await getTransfers();
  const vaults = await getVaults();
  const accVaults = vaults.filter(v=>v.accountId===acc.id);
  const reserved = accVaults.reduce((s,v)=>s+Number(v.saved||0),0);
  const isCartao = acc.tipo==='cartao';
  const saldoNeg = !isCartao && Number(acc.saldo||0)<0;
  const tiedExp = expLines.filter(e=>e.accountId===acc.id);
  const tiedInc = incLines.filter(l=>l.accountId===acc.id);
  const now = new Date();
  let statsHtml, subLine, statusBadge = '', actionsHtml;
  if (isCartao){
    const disp = Math.max(0, Number(acc.limite||0)-Number(acc.fatura||0));
    const closed = acc.fechamento ? now.getDate() >= acc.fechamento : false;
    if (acc.fechamento) statusBadge = `<span class="fat-status ${closed?'closed':'open'}">${closed?'Fatura fechada':'Fatura aberta'}</span>`;
    const melhor = acc.fechamento ? (acc.fechamento>=31 ? 1 : acc.fechamento+1) : null;
    subLine = [acc.vencimento?('Vence dia '+acc.vencimento):'', melhor?('melhor dia de compra: '+melhor):''].filter(Boolean).join(' · ');
    statsHtml = `
      <div><div class="ds-l">Valor da fatura</div><div class="ds-v brick">${fmtMoney(acc.fatura)}</div></div>
      <div><div class="ds-l">Disponível</div><div class="ds-v sage">${fmtMoney(disp)}</div></div>`;
    actionsHtml = `
      <button class="det-act" data-detact="payfatura" ${Number(acc.fatura)<=0?'disabled':''}><span class="da-ic">💳</span>Pagar fatura</button>
      <button class="det-act" data-detact="transfer"><span class="da-ic">⇄</span>Transferir</button>
      <button class="det-act" data-detact="edit"><span class="da-ic">✎</span>Editar</button>`;
  } else {
    const ce = Number(acc.chequeEspecial||0);
    const used = saldoNeg ? -Number(acc.saldo) : 0;
    let col2Lbl, col2Val, col2Cls;
    if (ce>0){ col2Lbl='Cheque especial'; col2Val=fmtMoney(Math.max(0,ce-used))+' livre'; col2Cls=''; }
    else if (reserved>0){ col2Lbl='Guardado em cofrinhos'; col2Val=fmtMoney(reserved); col2Cls=''; }
    else { col2Lbl='Disponível'; col2Val=fmtMoney(Number(acc.saldo||0)); col2Cls='sage'; }
    subLine = reserved>0 ? ('Livre pra usar: '+fmtMoney(Number(acc.saldo||0)-reserved)) : '';
    statsHtml = `
      <div><div class="ds-l">Saldo${saldoNeg?' (negativo)':''}</div><div class="ds-v ${saldoNeg?'brick':'sage'}">${fmtMoney(acc.saldo)}</div></div>
      <div><div class="ds-l">${col2Lbl}</div><div class="ds-v ${col2Cls}">${col2Val}</div></div>`;
    actionsHtml = `
      <button class="det-act" data-detact="transfer"><span class="da-ic">⇄</span>Transferir</button>
      <button class="det-act" data-detact="cofrinho"><span class="da-ic">🐷</span>Cofrinho</button>
      <button class="det-act" data-detact="edit"><span class="da-ic">✎</span>Editar</button>`;
  }
  document.getElementById('adHeader').innerHTML = `
    <div class="det-top">
      <div class="bankavatar acc-logo">
        <img src="assets/bancos/${bankById(acc.bank).id}.svg" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
        <div class="fallback-initials" style="display:none;background:${bankColor(bankById(acc.bank))}">${bankInitials(bankById(acc.bank))}</div>
      </div>
      <div style="flex:1;min-width:0;">
        <h3 style="margin:0;">${esc(acc.label)} ${acc.principal?'<span class="badge b-principal">Principal</span>':''}</h3>
        <div style="font-size:11.5px;color:var(--text-3);margin-top:3px;">${bankById(acc.bank).name} · ${accTipoLabel(acc)}</div>
      </div>
      ${statusBadge}
    </div>
    <div class="det-stats">${statsHtml}</div>
    ${subLine?`<div class="det-subline">${subLine}</div>`:''}
    <div class="det-actions">${actionsHtml}</div>`;
  document.querySelectorAll('#adHeader .det-act').forEach(b=> b.onclick = ()=> detailAction(b.dataset.detact, acc.id));
  const incHtml = tiedInc.length ? `
    <div class="ad-sec">Rendas que caem aqui</div>
    ${tiedInc.map(l=>`<div class="ad-row"><div class="adi"><div class="adl">${esc(l.label)}</div>
      <div class="adm">${TYPE_LABEL[l.type]||''}${l.payday?' · todo dia '+l.payday:''}</div></div>
      <div class="adv sage">+${fmtMoney(l.value).replace('R$ ','')}</div></div>`).join('')}` : '';
  const expSorted = [...tiedExp].sort((a,b)=> (b.date||'').localeCompare(a.date||''));
  const expHtml = tiedExp.length ? `
    <div class="ad-sec">Saídas desta conta</div>
    ${expSorted.map(e=>`<div class="ad-row"><div class="adi"><div class="adl">${esc(e.label)}</div>
      <div class="adm">${relDate(e.date)} · ${esc(catLabel(e.categoria))}${e.recorrencia==='mensal'?' · mensal':''}</div></div>
      <div class="adv brick">-${fmtMoney(e.value).replace('R$ ','')}</div></div>`).join('')}` : '';
  const tiedTr = transfers.filter(t=>t.fromId===acc.id || t.toId===acc.id)
    .sort((a,b)=> (b.date||'').localeCompare(a.date||''));
  const trHtml = tiedTr.length ? `
    <div class="ad-sec">Transferências</div>
    ${tiedTr.map(t=>{
      const out = t.fromId===acc.id;
      const other = out ? accLabelById(allAccounts, t.toId) : accLabelById(allAccounts, t.fromId);
      const lbl = out ? (t.kind==='payment'?'Pagamento de fatura para '+other:'Transferência para '+other) : 'Transferência de '+other;
      return `<div class="ad-row"><div class="adi"><div class="adl">${esc(lbl)}</div>
        <div class="adm">${relDate(t.date)}</div></div>
        <div class="adv ${out?'brick':'sage'}">${out?'-':'+'}${fmtMoney(t.value).replace('R$ ','')}</div></div>`;
    }).join('')}` : '';
  let vaultHtml = '';
  if (!isCartao){
    vaultHtml = `
      <div class="ad-sec" style="display:flex;align-items:center;">Cofrinhos
        <button class="btn-ghost" id="vkNewBtn" style="margin-left:auto;padding:3px 10px;font-size:11px;">+ Novo cofrinho</button></div>` +
      (accVaults.length ? accVaults.map(v=>{
        const goal = Number(v.goal||0);
        const pct = goal>0 ? Math.min(100, Math.round(Number(v.saved||0)/goal*100)) : 0;
        return `<div class="vaultcard">
          <div class="vaulttop"><div class="vaultname" data-vkedit="${v.id}">${esc(v.name)}</div>
            <div class="vaultval">${fmtMoney(v.saved)}${goal>0?' <span style="color:var(--text-3)">/ '+fmtMoney(goal)+'</span>':''}</div></div>
          ${goal>0?`<div class="vaultbar"><div style="width:${pct}%"></div></div>`:''}
          <div class="vaultacts">
            <button class="btn-ghost vk-act" data-vkin="${v.id}" style="padding:4px 10px;font-size:11px;">Guardar</button>
            <button class="btn-ghost vk-act" data-vkout="${v.id}" style="padding:4px 10px;font-size:11px;">Resgatar</button>
          </div>
        </div>`;
      }).join('') : '<div class="empty" style="padding:10px;">Nenhum cofrinho. Reserve uma parte do saldo pra uma meta.</div>');
  }
  const body = incHtml + trHtml + expHtml + vaultHtml;
  document.getElementById('adBody').innerHTML = body || '<div class="empty">Nenhuma movimentação vinculada a esta conta ainda.</div>';
  const nb = document.getElementById('vkNewBtn'); if (nb) nb.onclick = ()=> openVaultModal(acc.id, null);
  document.querySelectorAll('#adBody [data-vkedit]').forEach(el=> el.onclick = ()=>{ const v = accVaults.find(x=>x.id===el.dataset.vkedit); if (v) openVaultModal(acc.id, v); });
  document.querySelectorAll('#adBody [data-vkin]').forEach(el=> el.onclick = ()=>{ const v = accVaults.find(x=>x.id===el.dataset.vkin); if (v) openVaultMove(v, 'in'); });
  document.querySelectorAll('#adBody [data-vkout]').forEach(el=> el.onclick = ()=>{ const v = accVaults.find(x=>x.id===el.dataset.vkout); if (v) openVaultMove(v, 'out'); });
  document.getElementById('accountDetailOverlay').classList.add('open');
}
document.getElementById('adClose').onclick = ()=> document.getElementById('accountDetailOverlay').classList.remove('open');
document.getElementById('adEdit').onclick = async ()=>{
  document.getElementById('accountDetailOverlay').classList.remove('open');
  const accs = await getAccounts(); const a = accs.find(x=>x.id===__detailAccId); if (a) openAccountEdit(a);
};
async function refreshDetail(){
  if (!__detailAccId) return;
  const accs = await getAccounts(); const a = accs.find(x=>x.id===__detailAccId);
  if (a) await openAccountDetail(a);
}
async function payFaturaAccount(acc){
  if (acc.tipo!=='cartao' || Number(acc.fatura)<=0) return;
  const valor = Number(acc.fatura);
  if (!confirm(`Pagar a fatura de ${fmtMoney(valor)} do cartão "${acc.label}"?\n\nZera a fatura e registra a saída de hoje nas despesas.`)) return;
  const accounts = await getAccounts();
  const a = accounts.find(x=>x.id===acc.id); if (!a) return;
  a.fatura = 0;
  const lines = await getExpenseLines();
  lines.push({ id: genId(), label: 'Pagamento fatura — ' + a.label, value: valor,
    date: dkey(new Date()), time: pad(new Date().getHours())+':'+pad(new Date().getMinutes()),
    recorrencia: 'none', categoria: 'outros', method: 'pix', bank: a.bank, createdAt: Date.now() });
  await storeSet('accounts_v2', accounts);
  await storeSet('expense_lines_v4', lines);
  await refreshDetail(); renderFinance();
  toast('Fatura paga');
}
async function detailAction(act, accId){
  const accounts = await getAccounts();
  const acc = accounts.find(a=>a.id===accId); if (!acc) return;
  if (act==='edit'){ document.getElementById('accountDetailOverlay').classList.remove('open'); openAccountEdit(acc); return; }
  if (act==='cofrinho'){ openVaultModal(acc.id, null); return; }
  if (act==='payfatura'){ await payFaturaAccount(acc); return; }
  if (act==='transfer'){
    document.getElementById('accountDetailOverlay').classList.remove('open');
    document.getElementById('btnTransfer').click();
    await new Promise(r=>setTimeout(r,60));
    if (acc.tipo==='cartao'){ const to=document.getElementById('trTo'); if ([...to.options].some(o=>o.value===accId)){ to.value=accId; if(to.onchange) to.onchange(); } }
    else { const from=document.getElementById('trFrom'); if ([...from.options].some(o=>o.value===accId)){ from.value=accId; if(from.onchange) from.onchange(); } }
    return;
  }
}

/* ---- Cofrinhos ---- */
async function getVaults(){ return await storeGet('vaults', []); }
let editingVaultId = null, __vaultAccId = null, __moveVaultId = null, __moveMode = 'in';
async function openVaultModal(accountId, vault){
  __vaultAccId = accountId;
  editingVaultId = vault ? vault.id : null;
  document.getElementById('vaultModalTitle').textContent = vault ? 'Editar cofrinho' : 'Novo cofrinho';
  document.getElementById('vkName').value = vault ? vault.name : '';
  document.getElementById('vkGoal').value = vault && vault.goal ? vault.goal : '';
  document.getElementById('vkDelete').style.display = vault ? '' : 'none';
  // criação global (sem conta fixa): mostra seletor de conta
  const af = document.getElementById('vkAccountField');
  if (!accountId && !vault){
    const cs = (await getAccounts()).filter(isContaLike);
    if (!cs.length){ toast('Cadastre uma conta primeiro.', {error:true}); return; }
    document.getElementById('vkAccount').innerHTML = cs.map(a=>`<option value="${a.id}">${esc(a.label)}</option>`).join('');
    af.style.display = '';
  } else af.style.display = 'none';
  document.getElementById('vaultModalOverlay').classList.add('open');
}
document.getElementById('btnNewVaultGlobal').onclick = ()=> openVaultModal(null, null);
document.getElementById('vkCancel').onclick = ()=> document.getElementById('vaultModalOverlay').classList.remove('open');
document.getElementById('vkSave').onclick = async ()=>{
  const name = document.getElementById('vkName').value.trim();
  if (!name){ toast('Dê um nome ao cofrinho.', {error:true}); return; }
  const goal = Number(document.getElementById('vkGoal').value||0);
  let vaults = await getVaults();
  if (editingVaultId){ const v = vaults.find(x=>x.id===editingVaultId); if (v){ v.name=name; v.goal=goal; } }
  else { const accId = __vaultAccId || document.getElementById('vkAccount').value; vaults.push({ id: genId(), accountId: accId, name, goal, saved: 0, createdAt: Date.now() }); }
  await storeSet('vaults', vaults);
  document.getElementById('vaultModalOverlay').classList.remove('open');
  await refreshDetail(); renderFinance();
  toast(editingVaultId ? 'Cofrinho atualizado' : 'Cofrinho criado');
};
document.getElementById('vkDelete').onclick = async ()=>{
  if (!editingVaultId) return;
  let vaults = await getVaults();
  const removed = vaults.find(v=>v.id===editingVaultId);
  vaults = vaults.filter(v=>v.id!==editingVaultId);
  await storeSet('vaults', vaults);
  document.getElementById('vaultModalOverlay').classList.remove('open');
  await refreshDetail(); renderFinance();
  toast('Cofrinho excluído', { undo: async ()=>{ const cur = await getVaults(); cur.push(removed); await storeSet('vaults', cur); await refreshDetail(); renderFinance(); } });
};
async function openVaultMove(vault, mode){
  __moveVaultId = vault.id; __moveMode = mode;
  const accounts = await getAccounts();
  const acc = accounts.find(a=>a.id===vault.accountId);
  const vaults = await getVaults();
  const reserved = vaults.filter(v=>v.accountId===vault.accountId).reduce((s,v)=>s+Number(v.saved||0),0);
  const livre = Number(acc.saldo||0) - reserved;
  document.getElementById('vaultMoveTitle').textContent = (mode==='in'?'Guardar em ':'Resgatar de ')+vault.name;
  document.getElementById('vaultMoveInfo').textContent = mode==='in'
    ? `Disponível pra guardar: ${fmtMoney(livre)}`
    : `Guardado no cofrinho: ${fmtMoney(vault.saved)}`;
  document.getElementById('vmValue').value = '';
  document.getElementById('vaultMoveOverlay').classList.add('open');
}
document.getElementById('vmCancel').onclick = ()=> document.getElementById('vaultMoveOverlay').classList.remove('open');
document.getElementById('vmSave').onclick = async ()=>{
  const value = Number(document.getElementById('vmValue').value||0);
  if (value<=0){ toast('Valor inválido.', {error:true}); return; }
  let vaults = await getVaults();
  const v = vaults.find(x=>x.id===__moveVaultId);
  if (!v) return;
  if (__moveMode==='in'){
    const accounts = await getAccounts();
    const acc = accounts.find(a=>a.id===v.accountId);
    const reserved = vaults.filter(x=>x.accountId===v.accountId).reduce((s,x)=>s+Number(x.saved||0),0);
    const livre = Number(acc.saldo||0) - reserved;
    if (value > livre){ toast('Não há saldo livre suficiente.', {error:true}); return; }
    v.saved = Number(v.saved||0) + value;
  } else {
    if (value > Number(v.saved||0)){ toast('Você não tem tudo isso guardado.', {error:true}); return; }
    v.saved = Number(v.saved||0) - value;
  }
  await storeSet('vaults', vaults);
  document.getElementById('vaultMoveOverlay').classList.remove('open');
  await refreshDetail(); renderFinance();
  toast(__moveMode==='in'?'Guardado no cofrinho':'Resgatado do cofrinho');
};
async function renderVaultsPage(){
  const vaults = await getVaults();
  const accounts = await getAccounts();
  const box = document.getElementById('vaultsList');
  if (!vaults.length){ box.innerHTML = emptyCta('Nenhum cofrinho ainda. Reserve uma parte do saldo pra uma meta.', '+ Novo cofrinho', 'btnNewVaultGlobal'); return; }
  const byAcc = {};
  vaults.forEach(v=>{ (byAcc[v.accountId] = byAcc[v.accountId] || []).push(v); });
  box.innerHTML = Object.keys(byAcc).map(accId=>{
    const acc = accounts.find(a=>a.id===accId);
    const accName = acc ? acc.label : 'Conta removida';
    const total = byAcc[accId].reduce((s,v)=>s+Number(v.saved||0),0);
    return `<div class="ad-sec" style="display:flex;align-items:center;">${esc(accName)}<span style="margin-left:auto;font-family:'IBM Plex Mono',monospace;color:var(--sage);">${fmtMoney(total)}</span></div>` +
      byAcc[accId].map(v=>{
        const goal = Number(v.goal||0);
        const pct = goal>0 ? Math.min(100, Math.round(Number(v.saved||0)/goal*100)) : 0;
        return `<div class="vaultcard">
          <div class="vaulttop"><div class="vaultname" data-vedit="${v.id}">${esc(v.name)}</div>
            <div class="vaultval">${fmtMoney(v.saved)}${goal>0?' <span style="color:var(--text-3)">/ '+fmtMoney(goal)+'</span>':''}</div></div>
          ${goal>0?`<div class="vaultbar"><div style="width:${pct}%"></div></div>`:''}
          <div class="vaultacts">
            <button class="btn-ghost vk-a" data-vin="${v.id}" style="padding:4px 10px;font-size:11px;">Guardar</button>
            <button class="btn-ghost vk-a" data-vout="${v.id}" style="padding:4px 10px;font-size:11px;">Resgatar</button>
          </div></div>`;
      }).join('');
  }).join('');
  box.querySelectorAll('[data-vedit]').forEach(el=> el.onclick = ()=>{ const v = vaults.find(x=>x.id===el.dataset.vedit); if (v) openVaultModal(v.accountId, v); });
  box.querySelectorAll('[data-vin]').forEach(el=> el.onclick = ()=>{ const v = vaults.find(x=>x.id===el.dataset.vin); if (v) openVaultMove(v, 'in'); });
  box.querySelectorAll('[data-vout]').forEach(el=> el.onclick = ()=>{ const v = vaults.find(x=>x.id===el.dataset.vout); if (v) openVaultMove(v, 'out'); });
}

/* ---- Transferência entre contas ---- */
async function getTransfers(){ return await storeGet('transfers', []); }
function accLabelById(accounts, id){ const a = accounts.find(x=>x.id===id); return a ? a.label : '—'; }
async function updateTransferHint(){
  const accounts = await getAccounts();
  const to = accounts.find(a=>a.id===document.getElementById('trTo').value);
  document.getElementById('trHint').textContent = (to && to.tipo==='cartao')
    ? 'Destino é cartão: o valor abate a fatura (pagamento).'
    : 'Move o saldo de uma conta pra outra.';
}
document.getElementById('btnTransfer').onclick = async ()=>{
  const accounts = await getAccounts();
  const contas = accounts.filter(isContaLike);
  if (contas.length===0){ toast('Cadastre uma conta primeiro.', {error:true}); return; }
  document.getElementById('trFrom').innerHTML = contas.map(a=>`<option value="${a.id}">${esc(a.label)}</option>`).join('');
  document.getElementById('trTo').innerHTML = accounts.filter(a=>a.id!==contas[0].id)
    .map(a=>`<option value="${a.id}">${esc(a.label)}${a.tipo==='cartao'?' (cartão)':''}</option>`).join('');
  document.getElementById('trValue').value = '';
  document.getElementById('trDate').value = dkey(new Date());
  await updateTransferHint();
  document.getElementById('transferModalOverlay').classList.add('open');
};
document.getElementById('trFrom').onchange = async ()=>{
  const accounts = await getAccounts();
  const fromId = document.getElementById('trFrom').value;
  const cur = document.getElementById('trTo').value;
  document.getElementById('trTo').innerHTML = accounts.filter(a=>a.id!==fromId)
    .map(a=>`<option value="${a.id}">${esc(a.label)}${a.tipo==='cartao'?' (cartão)':''}</option>`).join('');
  if ([...document.getElementById('trTo').options].some(o=>o.value===cur)) document.getElementById('trTo').value = cur;
  await updateTransferHint();
};
document.getElementById('trTo').onchange = updateTransferHint;
document.getElementById('trCancel').onclick = ()=> document.getElementById('transferModalOverlay').classList.remove('open');
document.getElementById('trSave').onclick = async ()=>{
  const fromId = document.getElementById('trFrom').value;
  const toId = document.getElementById('trTo').value;
  const value = Number(document.getElementById('trValue').value||0);
  const date = document.getElementById('trDate').value || dkey(new Date());
  if (!fromId || !toId || fromId===toId){ toast('Escolha contas diferentes.', {error:true}); return; }
  if (value<=0){ toast('Valor inválido.', {error:true}); return; }
  const accounts = await getAccounts();
  const from = accounts.find(a=>a.id===fromId), to = accounts.find(a=>a.id===toId);
  if (!from || !to) return;
  const toCard = to.tipo==='cartao';
  from.saldo = Number(from.saldo||0) - value;
  if (toCard) to.fatura = Math.max(0, Number(to.fatura||0) - value);
  else to.saldo = Number(to.saldo||0) + value;
  const tr = { id: genId(), fromId, toId, value, date, kind: toCard?'payment':'transfer', createdAt: Date.now() };
  const transfers = await getTransfers(); transfers.push(tr);
  await storeSet('accounts_v2', accounts);
  await storeSet('transfers', transfers);
  document.getElementById('transferModalOverlay').classList.remove('open');
  renderFinance();
  toast(toCard?'Fatura paga por transferência':'Transferência feita', { undo: async ()=>{
    const accs = await getAccounts();
    const f = accs.find(a=>a.id===fromId), t = accs.find(a=>a.id===toId);
    if (f) f.saldo = Number(f.saldo||0) + value;
    if (t){ if (toCard) t.fatura = Number(t.fatura||0) + value; else t.saldo = Number(t.saldo||0) - value; }
    let trs = await getTransfers(); trs = trs.filter(x=>x.id!==tr.id);
    await storeSet('accounts_v2', accs); await storeSet('transfers', trs);
    renderFinance();
  }});
};
async function accountAction(act, id){
  let accounts = await getAccounts();
  const idx = accounts.findIndex(a=>a.id===id);
  if (idx<0) return;
  if (act==='edit'){ openAccountEdit(accounts[idx]); return; }
  if (act==='star'){
    const willBe = !accounts[idx].principal;
    accounts.forEach(a=>a.principal=false);
    accounts[idx].principal = willBe;
    await storeSet('accounts_v2', accounts); renderFinance();
    toast(willBe ? 'Conta principal definida' : 'Conta principal removida'); return;
  }
  if (act==='up' && idx>0){ [accounts[idx-1],accounts[idx]]=[accounts[idx],accounts[idx-1]]; await storeSet('accounts_v2', accounts); renderFinance(); return; }
  if (act==='down' && idx<accounts.length-1){ [accounts[idx+1],accounts[idx]]=[accounts[idx],accounts[idx+1]]; await storeSet('accounts_v2', accounts); renderFinance(); return; }
  if (act==='del'){
    const removed = accounts[idx];
    accounts = accounts.filter(a=>a.id!==id);
    await storeSet('accounts_v2', accounts); renderFinance();
    toast('Conta excluída', { undo: async ()=>{
      const cur = await getAccounts();
      cur.splice(Math.min(idx, cur.length), 0, removed);
      await storeSet('accounts_v2', cur); renderFinance();
    }});
  }
}
function toggleAccountFields(tipo){
  document.getElementById('acContaFields').style.display = tipo==='cartao' ? 'none' : 'flex';
  document.getElementById('acChequeField').style.display = tipo==='conta' ? '' : 'none';  // só conta corrente tem cheque especial
  document.getElementById('acCartaoFields').style.display = tipo==='cartao' ? 'flex' : 'none';
  document.getElementById('acFaturaDias').style.display = tipo==='cartao' ? 'flex' : 'none';
}
function dayOrNull(id){ const v = parseInt(document.getElementById(id).value,10); return (v>=1 && v<=31) ? v : null; }
function setAcTipo(tipo){
  document.getElementById('acTipo').value = tipo;
  document.querySelectorAll('#accountModalOverlay .tipo-card').forEach(c=> c.classList.toggle('active', c.dataset.tipo===tipo));
  toggleAccountFields(tipo);
}
document.querySelectorAll('#accountModalOverlay .tipo-card').forEach(c=> c.onclick = ()=> setAcTipo(c.dataset.tipo));

let editingAccountId = null;
document.getElementById('btnOpenAccModal').onclick = ()=>{
  editingAccountId = null;
  document.getElementById('accountModalTitle').textContent = 'Nova conta';
  document.getElementById('acLabel').value = '';
  document.getElementById('acSaldo').value = '';
  document.getElementById('acChequeEspecial').value = '';
  document.getElementById('acLimite').value = '';
  document.getElementById('acFatura').value = '';
  document.getElementById('acFechamento').value = '';
  document.getElementById('acVencimento').value = '';
  document.getElementById('acBank').value = 'outro';
  document.getElementById('acPrincipal').checked = false;
  setAcTipo('conta');
  renderBankPicker('acBankPicker', 'acBank', 'outro');
  document.getElementById('acDelete').style.display = 'none';
  document.getElementById('acPayFatura').style.display = 'none';
  document.getElementById('accountModalOverlay').classList.add('open');
};
document.getElementById('acCancel').onclick = ()=> document.getElementById('accountModalOverlay').classList.remove('open');
document.getElementById('acSave').onclick = async ()=>{
  const label = document.getElementById('acLabel').value.trim();
  if (!label) return;
  const tipo = document.getElementById('acTipo').value;
  const saldo = Number(document.getElementById('acSaldo').value||0);
  const chequeEspecial = tipo==='conta' ? Number(document.getElementById('acChequeEspecial').value||0) : 0;
  const limite = Number(document.getElementById('acLimite').value||0);
  const fatura = Number(document.getElementById('acFatura').value||0);
  const fechamento = tipo==='cartao' ? dayOrNull('acFechamento') : null;
  const vencimento = tipo==='cartao' ? dayOrNull('acVencimento') : null;
  const bank = document.getElementById('acBank').value;
  const principal = document.getElementById('acPrincipal').checked;
  let accounts = await getAccounts();
  if (principal) accounts.forEach(a=>a.principal=false);
  if (editingAccountId){
    const a = accounts.find(x=>x.id===editingAccountId);
    if (a){ a.label=label; a.tipo=tipo; a.saldo=saldo; a.chequeEspecial=chequeEspecial; a.limite=limite; a.fatura=fatura; a.fechamento=fechamento; a.vencimento=vencimento; a.bank=bank; a.principal=principal; }
  } else {
    accounts.push({ id: genId(), label, tipo, saldo, chequeEspecial, limite, fatura, fechamento, vencimento, bank, principal, createdAt: Date.now() });
  }
  await storeSet('accounts_v2', accounts);
  document.getElementById('accountModalOverlay').classList.remove('open');
  renderFinance();
  toast(editingAccountId ? 'Conta atualizada' : 'Conta criada');
};
document.getElementById('acDelete').onclick = async ()=>{
  if (!editingAccountId) return;
  let accounts = await getAccounts();
  const removed = accounts.find(a=>a.id===editingAccountId);
  accounts = accounts.filter(a=>a.id!==editingAccountId);
  await storeSet('accounts_v2', accounts);
  document.getElementById('accountModalOverlay').classList.remove('open');
  renderFinance();
  toast('Conta excluída', { undo: async ()=>{
    const cur = await getAccounts();
    cur.push(removed);
    await storeSet('accounts_v2', cur);
    renderFinance();
  }});
};
function openAccountEdit(acc){
  editingAccountId = acc.id;
  document.getElementById('accountModalTitle').textContent = 'Editar conta';
  document.getElementById('acLabel').value = acc.label;
  document.getElementById('acSaldo').value = acc.saldo || 0;
  document.getElementById('acChequeEspecial').value = acc.chequeEspecial || '';
  document.getElementById('acLimite').value = acc.limite || 0;
  document.getElementById('acFatura').value = acc.fatura || 0;
  document.getElementById('acFechamento').value = acc.fechamento || '';
  document.getElementById('acVencimento').value = acc.vencimento || '';
  document.getElementById('acBank').value = acc.bank;
  document.getElementById('acPrincipal').checked = !!acc.principal;
  setAcTipo(acc.tipo || 'conta');
  renderBankPicker('acBankPicker', 'acBank', acc.bank);
  document.getElementById('acDelete').style.display = '';
  document.getElementById('acPayFatura').style.display = (acc.tipo==='cartao' && Number(acc.fatura)>0) ? '' : 'none';
  document.getElementById('accountModalOverlay').classList.add('open');
}

document.getElementById('acPayFatura').onclick = async ()=>{
  if (!editingAccountId) return;
  const accounts = await getAccounts();
  const acc = accounts.find(a=>a.id===editingAccountId);
  if (!acc || Number(acc.fatura)<=0) return;
  const valor = Number(acc.fatura);
  if (!confirm(`Pagar a fatura de ${fmtMoney(valor)} do cartão "${acc.label}"?\n\nIsso zera a fatura e registra a saída de hoje nas despesas.`)) return;
  acc.fatura = 0;
  const lines = await getExpenseLines();
  lines.push({
    id: genId(), label: 'Pagamento fatura — ' + acc.label, value: valor,
    date: dkey(new Date()), time: pad(new Date().getHours())+':'+pad(new Date().getMinutes()),
    recorrencia: 'none', categoria: 'outros', method: 'pix', bank: acc.bank, createdAt: Date.now()
  });
  await storeSet('accounts_v2', accounts);
  await storeSet('expense_lines_v4', lines);
  document.getElementById('accountModalOverlay').classList.remove('open');
  renderFinance();
};

/* ---- Período do Financeiro (Dia/Semana/Mês/Ano) ---- */
let finPeriod = 'month';
document.querySelectorAll('#finPeriodNav .perpill').forEach(b=>{
  b.onclick = ()=>{
    document.querySelectorAll('#finPeriodNav .perpill').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    finPeriod = b.dataset.period;
    renderFinance();
  };
});
function periodRange(period, now){
  if (period==='day') return { start:new Date(now.getFullYear(),now.getMonth(),now.getDate()), end:new Date(now.getFullYear(),now.getMonth(),now.getDate()) };
  if (period==='week'){ const s=startOfWeek(now); return { start:s, end:addDays(s,6) }; }
  if (period==='year') return { start:new Date(now.getFullYear(),0,1), end:new Date(now.getFullYear(),11,31) };
  return { start:new Date(now.getFullYear(),now.getMonth(),1), end:new Date(now.getFullYear(),now.getMonth()+1,0) };
}
function periodLabel(period){
  return { day:'do dia', week:'da semana', month:'do mês', year:'do ano' }[period];
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
function expenseTimeOf(exp){
  if (exp.time) return exp.time;
  if (exp.createdAt) { const d = new Date(exp.createdAt); return pad(d.getHours())+':'+pad(d.getMinutes()); }
  return '12:00';
}
function expenseHourOf(exp){
  return Number(expenseTimeOf(exp).split(':')[0]);
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

const CATEGORIA_LABEL = { moradia:'Moradia', transporte:'Transporte', alimentacao:'Alimentação', lazer:'Lazer', saude:'Saúde', educacao:'Educação', assinaturas:'Assinaturas', financiamento:'Financiamento', outros:'Outros' };

/* categorias = presets fixos + as que o usuário cria (kv custom_categories) */
let __customCats = [];
function catSlug(name){ return (name||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'').slice(0,40) || ('cat'+Date.now()); }
function allCategories(){
  const out = {...CATEGORIA_LABEL};
  __customCats.forEach(c=>{ if (c && c.key) out[c.key] = c.label; });
  return out;
}
function catLabel(key){ return allCategories()[key] || key || 'Outros'; }
async function loadCustomCats(){ __customCats = await storeGet('custom_categories', []); }
async function loadBankFavorites(){ const f = await storeGet('bank_favorites', null); if (Array.isArray(f) && f.length) __bankFavorites = f; }
async function loadAccView(){ const v = await storeGet('acc_view', null); if (v==='conta'||v==='banco') __accView = v; }
document.querySelectorAll('#accViewToggle button').forEach(b=>{
  b.onclick = async ()=>{
    __accView = b.dataset.accview;
    document.querySelectorAll('#accViewToggle button').forEach(x=>x.classList.toggle('active', x===b));
    await storeSet('acc_view', __accView);
    renderFinance();
  };
});
let __accTipo = 'all';
document.querySelectorAll('#accTipoFilter .perpill').forEach(b=>{
  b.onclick = ()=>{ __accTipo = b.dataset.acctipo; renderFinance(); };
});
function syncEyeIcon(){
  document.getElementById('eyeOpen').style.display = __hideVals ? 'none' : '';
  document.getElementById('eyeClosed').style.display = __hideVals ? '' : 'none';
}
document.getElementById('btnEyeVals').onclick = ()=>{
  __hideVals = !__hideVals;
  localStorage.setItem('pm_hidevals', __hideVals ? '1' : '0');
  syncEyeIcon();
  renderFinance();
};
syncEyeIcon();
document.getElementById('bankChooserClose').onclick = ()=> document.getElementById('bankChooserOverlay').classList.remove('open');
document.getElementById('bankSearch').oninput = (e)=>{ const cur = __bankChooserCtx ? document.getElementById(__bankChooserCtx.hiddenInputId).value : ''; renderBankChooserList(e.target.value, cur); };
function fillCategorySelect(sel, selected){
  const cats = allCategories();
  sel.innerHTML = Object.entries(cats).map(([k,label])=>`<option value="${k}">${esc(label)}</option>`).join('');
  sel.value = (selected && cats[selected]) ? selected : 'outros';
}

/* ---- Metas de gasto por categoria ---- */
async function renderGoals(expLines, now){
  const box = document.getElementById('goalsList');
  const goals = await storeGet('budget_goals', {});
  const keys = Object.keys(goals).filter(k=>Number(goals[k])>0);
  if (keys.length===0){
    box.innerHTML = emptyCta('Defina limites de gasto por categoria e acompanhe o mês de perto.', '+ Definir metas', 'btnEditGoals');
    return;
  }
  const monthRange = clampRangeToToday(periodRange('month', now), now);
  const spentByCat = bucketPeriodTotals(expLines, monthRange, 'month', e=>e.categoria||'outros', now);
  box.innerHTML = keys.map(k=>{
    const goal = Number(goals[k]);
    const spent = spentByCat[k]||0;
    const pct = Math.min(100, Math.round(spent/goal*100));
    const cls = spent>goal ? 'over' : (spent>=goal*0.8 ? 'warn' : '');
    return `<div class="goalrow ${cls}">
      <div class="toprow"><div class="cat">${catLabel(k)}</div><div class="nums">${fmtMoney(spent)} / ${fmtMoney(goal)}${spent>goal?' · estourou':''}</div></div>
      <div class="goalbar"><div style="width:${pct}%"></div></div>
    </div>`;
  }).join('');
}
function goalRowFixed(k, label, isCustom, val){
  return `<div class="goalinput-row" data-key="${k}">
    <label>${esc(label)}${isCustom?' <span class="cat-custom">personalizada</span>':''}</label>
    <span style="display:flex;align-items:center;gap:6px;">
      <input type="number" step="0.01" min="0" data-goal="${k}" placeholder="sem meta" value="${val||''}">
      ${isCustom?`<button type="button" class="goal-del" title="Remover categoria" data-delcat="${k}">✕</button>`:''}
    </span>
  </div>`;
}
function goalRowNew(){
  return `<div class="goalinput-row goal-new">
    <input type="text" class="goal-newname" placeholder="Nome da categoria" maxlength="30">
    <span style="display:flex;align-items:center;gap:6px;">
      <input type="number" step="0.01" min="0" class="goal-newlimit" placeholder="limite">
      <button type="button" class="goal-del" title="Remover" data-delnew="1">✕</button>
    </span>
  </div>`;
}
const __btnEditGoals = document.getElementById('btnEditGoals');
if (__btnEditGoals) __btnEditGoals.onclick = async ()=>{
  const goals = await storeGet('budget_goals', {});
  const customKeys = new Set(__customCats.map(c=>c.key));
  const box = document.getElementById('goalsInputs');
  box.innerHTML = Object.entries(allCategories()).map(([k,label])=>
    goalRowFixed(k, label, customKeys.has(k), goals[k])
  ).join('');
  document.getElementById('goalsModalOverlay').classList.add('open');
};
document.getElementById('goalsAddCat').onclick = ()=>{
  document.getElementById('goalsInputs').insertAdjacentHTML('beforeend', goalRowNew());
  const rows = document.querySelectorAll('#goalsInputs .goal-new .goal-newname');
  rows[rows.length-1]?.focus();
};
document.getElementById('goalsInputs').addEventListener('click', (e)=>{
  const b = e.target.closest('[data-delcat],[data-delnew]');
  if (b) b.closest('.goalinput-row').remove();
});
document.getElementById('goalsCancel').onclick = ()=> document.getElementById('goalsModalOverlay').classList.remove('open');
document.getElementById('goalsSave').onclick = async ()=>{
  const goals = {};
  const presetKeys = new Set(Object.keys(CATEGORIA_LABEL));
  const custom = [];
  // categorias existentes (preset + custom que sobreviveram)
  document.querySelectorAll('#goalsInputs input[data-goal]').forEach(inp=>{
    const k = inp.dataset.goal;
    if (!presetKeys.has(k)){
      const c = __customCats.find(x=>x.key===k);
      if (c) custom.push(c);
    }
    const v = Number(inp.value);
    if (v>0) goals[k] = v;
  });
  // categorias personalizadas novas
  document.querySelectorAll('#goalsInputs .goal-new').forEach(row=>{
    const name = row.querySelector('.goal-newname').value.trim();
    if (!name) return;
    let key = catSlug(name);
    while (presetKeys.has(key) || custom.some(c=>c.key===key)) key += '_';
    custom.push({ key, label: name });
    const v = Number(row.querySelector('.goal-newlimit').value);
    if (v>0) goals[key] = v;
  });
  __customCats = custom;
  await storeSet('custom_categories', custom);
  await storeSet('budget_goals', goals);
  document.getElementById('goalsModalOverlay').classList.remove('open');
  renderFinance();
  toast('Metas salvas');
};

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
async function renderAnomalies(expLines, now){
  const box = document.getElementById('anomalyBox');
  const anomalies = detectAnomalies(expLines, now);
  const dismissed = await storeGet('anomaly_dismissed', '');
  if (!anomalies.length || dismissed === monthKey(now)){ box.innerHTML=''; return; }
  box.innerHTML = `<div class="anomaly">
    <div class="ah"><span>⚠︎</span><span>${anomalies.length} gasto${anomalies.length>1?'s':''} fora do padrão</span>
      <button class="adismiss" id="anomalyDismiss" title="Dispensar por este mês">✕</button></div>
    <div class="asub">Bem acima da média da categoria nos meses anteriores. Toque pra revisar.</div>
    ${anomalies.map(a=>`<div class="aitem" data-id="${a.e.id}">
      <div class="ai"><div class="al">${esc(a.e.label)}</div>
        <div class="am">${a.pct}% acima da média de ${esc(catLabel(a.e.categoria))} (${fmtMoney(a.mean)})</div></div>
      <div class="av">${fmtMoney(a.e.value)}</div>
    </div>`).join('')}
  </div>`;
  box.querySelector('#anomalyDismiss').onclick = async ()=>{
    await storeSet('anomaly_dismissed', monthKey(now)); box.innerHTML='';
  };
  box.querySelectorAll('.aitem').forEach(it=>{
    it.onclick = ()=>{ const l = expLines.find(x=>x.id===it.dataset.id); if (l) openExpenseEdit(l); };
  });
}
async function renderFinance(){
  const entries = await storeGet('ifood-entries', []);
  const expLines = await getExpenseLines();
  const incLines = await getIncomeLines();
  const accounts = await getAccounts();
  const now = new Date();
  const activePage = document.querySelector('.fpage.active').id;

  const mk = monthKey();
  const monthEntries = entries.filter(e=>e.date.startsWith(mk));
  const ifoodTotal = monthEntries.reduce((s,e)=>s+Number(e.valor||0),0);
  const incomeFromLines = incLines.filter(l=>isIncomeActive(l,now)).reduce((s,l)=>s+Number(l.value||0),0);
  const income = incomeFromLines + ifoodTotal;
  const outflow = expLines.reduce((s,e)=>s+Number(e.value||0),0);
  const saldo = income-outflow;
  const hasVariableIncome = entries.length>0 || incLines.some(l=>l.type==='variavel');

  if (activePage === 'fpage-analises'){
    const range = periodRange(finPeriod, now);
    const aggRange = clampRangeToToday(range, now);
    const ifoodPeriod = entries.filter(e=>inRange(e.date, aggRange)).reduce((s,e)=>s+Number(e.valor||0),0);
    const datedExpPeriod = expLines.filter(e=>e.date).reduce((s,e)=>s+expenseTotalInRange(e, aggRange),0);
    const undatedExpMonthly = expLines.filter(e=>!e.date).reduce((s,e)=>s+Number(e.value||0),0);
    const incomeFixedPeriod = incLines.filter(l=>isIncomeActive(l,now) && l.type!=='variavel').reduce((s,l)=>s+prorateElapsed(Number(l.value||0), finPeriod, now),0);
    const incomeVariavelLinePeriod = incLines.filter(l=>isIncomeActive(l,now) && l.type==='variavel').reduce((s,l)=>s+prorateElapsed(Number(l.value||0), finPeriod, now),0);
    const entradasPeriodo = incomeFixedPeriod + incomeVariavelLinePeriod + ifoodPeriod;
    const saidasPeriodo = datedExpPeriod + prorateElapsed(undatedExpMonthly, finPeriod, now);
    const saldoPeriodo = entradasPeriodo - saidasPeriodo;

    const saldoEl = document.getElementById('finSaldoBig');
    saldoEl.textContent = fmtMoney(saldoPeriodo); saldoEl.className = 'big ' + (saldoPeriodo>=0?'sage':'brick');
    document.getElementById('finSaldoLbl').textContent = 'Saldo ' + periodLabel(finPeriod);
    document.getElementById('finRow3').innerHTML = `
      <div class="fc"><div class="v">${fmtMoney(entradasPeriodo)}</div><div class="l">Entradas ${periodLabel(finPeriod)}</div></div>
      <div class="fc"><div class="v">${fmtMoney(saidasPeriodo)}</div><div class="l">Saídas ${periodLabel(finPeriod)}</div></div>
      <div class="fc"><div class="v" style="color:var(--sage)">${fmtMoney(ifoodPeriod)}</div><div class="l">Variável ${periodLabel(finPeriod)}</div></div>`;

    renderDashCharts(entries, expLines, incLines, ifoodTotal, now, finPeriod, range, aggRange);
  }

  if (activePage === 'fpage-inicio'){
    const vaultsAll = await getVaults();
    __reservedByAcc = {};
    vaultsAll.forEach(v=>{ __reservedByAcc[v.accountId] = (__reservedByAcc[v.accountId]||0) + Number(v.saved||0); });
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
    const sumBox = document.getElementById('accSummary');
    if (accounts.length===0){ sumBox.innerHTML=''; }
    else {
      sumBox.innerHTML = `
        <div class="sumcard wide"><div class="sl">Patrimônio líquido</div><div class="sv ${patrimonio>=0?'sage':'brick'}">${fmtMoney(patrimonio)}</div><div class="sh">saldos − faturas</div></div>
        <div class="sumcard"><div class="sl">Saldo em contas</div><div class="sv ${saldoTotal<0?'brick':''}">${fmtMoney(saldoTotal)}</div></div>
        <div class="sumcard"><div class="sl">Fatura dos cartões</div><div class="sv brick">${fmtMoney(faturaTotal)}</div></div>
        <div class="sumcard"><div class="sl">Crédito disponível</div><div class="sv sage">${fmtMoney(creditoDisp)}</div></div>`;
    }
    // Projeção de saldo do fim do mês
    const projBox = document.getElementById('accProjection');
    if (contas.length===0){ projBox.innerHTML=''; }
    else {
      const today = now.getDate();
      const endMonth = new Date(now.getFullYear(), now.getMonth()+1, 0);
      const remRange = { start: addDays(new Date(now.getFullYear(), now.getMonth(), today), 1), end: endMonth };
      const aReceber = incLines.filter(l=> isIncomeActive(l,now) && l.payday && l.payday>=today)
        .reduce((s,l)=>s+Number(l.value||0),0);
      const aPagar = (today>=endMonth.getDate()) ? 0 : expLines.reduce((s,e)=>s+expenseTotalInRange(e, remRange),0);
      const projetado = saldoTotal + aReceber - aPagar;
      projBox.innerHTML = `<div class="projcard">
        <div class="pj-l">Projeção fim do mês</div>
        <div class="pj-v ${projetado<0?'brick':'sage'}">${fmtMoney(projetado)}</div>
        <div class="pj-h">hoje ${fmtMoney(saldoTotal)}${aReceber>0?' · <span class="sage">+'+fmtMoney(aReceber).replace('R$ ','')+'</span> a receber':''}${aPagar>0?' · <span class="brick">−'+fmtMoney(aPagar).replace('R$ ','')+'</span> a pagar':''}</div>
      </div>`;
    }
    // Lembrete de vencimento de fatura (cartões com vencimento e fatura > 0)
    const fatBox = document.getElementById('accFaturaAlert');
    const todayD = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const reminders = [];
    cartoes.forEach(c=>{
      if (!c.vencimento || Number(c.fatura||0)<=0) return;
      let dueM = now.getMonth(), dueY = now.getFullYear();
      let due = new Date(dueY, dueM, clampDayOfMonth(dueY, dueM, c.vencimento));
      if (dnum(due) < dnum(todayD)){ dueM++; due = new Date(dueY, dueM, clampDayOfMonth(dueY, dueM, c.vencimento)); }
      const days = Math.round((due - todayD)/86400000);
      if (days <= 7) reminders.push({ c, due, days });
    });
    reminders.sort((a,b)=>a.days-b.days);
    fatBox.innerHTML = reminders.map(r=>{
      const quando = r.days===0 ? 'vence hoje' : r.days===1 ? 'vence amanhã' : 'vence em ' + r.days + ' dias (' + pad(r.due.getDate()) + '/' + pad(r.due.getMonth()+1) + ')';
      return `<div class="fat-alert"><span>🗓️</span> Fatura do ${esc(r.c.label)} ${quando} · ${fmtMoney(r.c.fatura)}</div>`;
    }).join('');
    const odBox = document.getElementById('accOverdraftAlert');
    odBox.innerHTML = overdraft.length ? `<div class="od-alert">⚠︎ ${overdraft.length===1?'A conta':'As contas'} ${overdraft.map(a=>esc(a.label)).join(', ')} ${overdraft.length===1?'está':'estão'} no cheque especial · ${fmtMoney(chequeUsadoTotal)} usado${chequeDisp>0?' · '+fmtMoney(chequeDisp)+' ainda disponível':''}</div>` : '';
    const accBox = document.getElementById('accountLines');
    document.getElementById('accViewToggle').style.display = accounts.length ? 'inline-flex' : 'none';
    document.querySelectorAll('#accViewToggle button').forEach(b=> b.classList.toggle('active', b.dataset.accview===__accView));
    document.querySelectorAll('#accTipoFilter .perpill').forEach(b=> b.classList.toggle('active', b.dataset.acctipo===__accTipo));
    const shownAccounts = __accTipo==='all' ? accounts : accounts.filter(a=> (a.tipo||'conta')===__accTipo);
    if (accounts.length===0){ accBox.innerHTML = emptyCta('Cadastre suas contas e cartões pra acompanhar saldo e fatura.', '+ Adicionar conta', 'btnOpenAccModal'); }
    else if (shownAccounts.length===0){ accBox.innerHTML = '<div class="empty">Nenhum item deste tipo ainda.</div>'; }
    else if (__accView === 'banco'){
      const byBank = {};
      shownAccounts.forEach(a=>{ (byBank[a.bank] = byBank[a.bank] || []).push(a); });
      accBox.innerHTML = Object.keys(byBank).map(bankId=>{
        const list = byBank[bankId];
        const s = list.filter(isContaLike).reduce((t,a)=>t+Number(a.saldo||0),0);
        const f = list.filter(a=>a.tipo==='cartao').reduce((t,a)=>t+Number(a.fatura||0),0);
        const parts = [];
        if (list.some(isContaLike)) parts.push(`<span class="${s<0?'brick':'sage'}">${fmtMoney(s)}</span> saldo`);
        if (list.some(a=>a.tipo==='cartao')) parts.push(`<span class="brick">${fmtMoney(f)}</span> fatura`);
        return `<div class="bankgroup">
          <div class="bankgroup-head">
            <div class="bankavatar acc-logo" style="width:30px;height:30px;">
              <img src="assets/bancos/${bankById(bankId).id}.svg" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
              <div class="fallback-initials" style="display:none;background:${bankColor(bankById(bankId))}">${bankInitials(bankById(bankId))}</div>
            </div>
            <div class="bg-name">${bankById(bankId).name}</div>
            <div class="bg-meta">${parts.join(' · ')}</div>
          </div>
          ${list.map(a=> accountCardHtml(a, false, 0, 0)).join('')}
        </div>`;
      }).join('');
      wireAccountCards(accBox, accounts);
    }
    else {
      const flat = __accTipo==='all' ? accounts : shownAccounts;
      accBox.innerHTML = flat.map((a,idx)=> accountCardHtml(a, __accTipo==='all', idx, flat.length)).join('');
      wireAccountCards(accBox, accounts);
    }
  }

  if (activePage === 'fpage-cofrinhos'){
    await renderVaultsPage();
  }

  if (activePage === 'fpage-extrato'){
    await renderExtrato(expLines, incLines, entries, accounts, now);
  }
}
let __extFilter = 'all';
async function renderExtrato(expLines, incLines, entries, accounts, now){
  if (__extFilter !== 'in') await renderAnomalies(expLines, now);
  else document.getElementById('anomalyBox').innerHTML = '';
  const q = (document.getElementById('extSearch').value||'').toLowerCase().trim();
  const mkey = now.getFullYear()+'-'+pad(now.getMonth()+1);
  const items = [];
  expLines.forEach(e=>{
    items.push({ side:'out', sortKey: e.date||'0000-00-00', label: e.label, value: Number(e.value||0),
      sub: [relDate(e.date), catLabel(e.categoria), e.recorrencia==='mensal'?'mensal':'', bankById(e.bank).name].filter(Boolean).join(' · '),
      icon: bankAvatarHtml(e.bank), onClick: ()=>openExpenseEdit(e),
      search: (e.label+' '+catLabel(e.categoria)+' '+bankById(e.bank).name+' '+(METHODS[e.method]||'')).toLowerCase() });
  });
  incLines.forEach(l=>{
    const active = isIncomeActive(l, now);
    const sortKey = l.payday ? (mkey+'-'+pad(Math.min(28,l.payday))) : (l.createdAt ? dkey(new Date(l.createdAt)) : '0000-00-00');
    const acc = l.accountId ? accounts.find(x=>x.id===l.accountId) : null;
    items.push({ side:'in', sortKey, label: l.label, value: Number(l.value||0), muted: !active,
      sub: [TYPE_LABEL[l.type], l.payday?('todo dia '+l.payday):'', acc?('em '+acc.label):'', !active?'inativa':''].filter(Boolean).join(' · '),
      icon: `<div class="ext-dot b-${l.type}"></div>`, onClick: ()=>openIncomeEdit(l),
      search: (l.label+' '+(TYPE_LABEL[l.type]||'')).toLowerCase() });
  });
  entries.forEach(en=>{
    items.push({ side:'in', sortKey: en.date||'0000-00-00', label: 'Renda variável (iFood/entrega)', value: Number(en.valor||0),
      sub: [relDate(en.date), en.km?en.km+' km':''].filter(Boolean).join(' · '),
      icon: `<div class="ext-dot b-variavel"></div>`, onClick: null, ifood: en, search: 'ifood entrega renda variavel' });
  });
  let shown = items.filter(it=> __extFilter==='all' || it.side===__extFilter);
  if (q) shown = shown.filter(it=> it.search.includes(q));
  shown.sort((a,b)=> b.sortKey.localeCompare(a.sortKey));
  const box = document.getElementById('extratoList');
  if (!items.length){ box.innerHTML = emptyCta('Nenhum lançamento ainda. Use o botão + pra registrar uma despesa ou renda.', '+ Registrar despesa', 'btnOpenExpModal'); return; }
  if (!shown.length){ box.innerHTML = '<div class="empty">Nada encontrado.</div>'; return; }
  box.innerHTML = shown.map((it,i)=>`
    <div class="extrow" data-i="${i}">
      ${it.icon}
      <div class="exti"><div class="extl ${it.muted?'muted':''}">${esc(it.label)}</div><div class="extm">${esc(it.sub)}</div></div>
      <div class="extv ${it.side==='in'?'sage':'brick'}">${it.side==='in'?'+':'-'}${fmtMoney(it.value).replace('R$ ','')}</div>
      ${it.ifood?`<button class="extdel" title="Excluir">✕</button>`:''}
    </div>`).join('');
  box.querySelectorAll('.extrow').forEach(row=>{
    const it = shown[Number(row.dataset.i)];
    row.onclick = (ev)=>{ if (ev.target.closest('.extdel')) return; if (it.onClick) it.onClick(); };
    const del = row.querySelector('.extdel');
    if (del) del.onclick = async (ev)=>{ ev.stopPropagation(); const en = it.ifood;
      let cur = await storeGet('ifood-entries', []);
      cur = cur.filter(x=> !(x.date===en.date && String(x.valor)===String(en.valor) && String(x.km||'')===String(en.km||'')));
      await storeSet('ifood-entries', cur); renderFinance(); };
  });
}
document.querySelectorAll('#extratoFilter .perpill').forEach(b=>{
  b.onclick = ()=>{ document.querySelectorAll('#extratoFilter .perpill').forEach(x=>x.classList.remove('active')); b.classList.add('active'); __extFilter = b.dataset.extf; renderFinance(); };
});
document.getElementById('btnQuickIfood').onclick = ()=>{
  const f = document.getElementById('ifoodQuickForm');
  const show = f.style.display==='none';
  f.style.display = show ? 'block' : 'none';
  if (show) document.getElementById('ifoodDate').value = document.getElementById('ifoodDate').value || dkey(new Date());
};
document.addEventListener('click', (e)=>{
  const t = e.target.closest('[data-open]');
  if (t) document.getElementById(t.dataset.open).click();
});
document.getElementById('extSearch').oninput = ()=> renderFinance();

/* ---- Relatório anual (IR) — impressão pra PDF ---- */
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
async function renderIrReport(year){
  const expLines = await getExpenseLines();
  const incLines = await getIncomeLines();
  const entries = await storeGet('ifood-entries', []);
  const accounts = await getAccounts();
  const d = buildIrData(year, expLines, incLines, entries);
  const me = (document.getElementById('pfUsername')?.textContent || '').trim();
  const cats = Object.entries(d.catTotals).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]);
  const incRows = [
    ['Renda fixa', d.incFixed], ['Renda variável (cadastrada)', d.incVar],
    ['Renda temporária', d.incTemp], ['iFood / entregas', d.incIfood],
  ].filter(r=>r[1]>0);
  const el = document.getElementById('irPrintArea');
  el.innerHTML = `<div class="ir-doc">
    <h2>Relatório financeiro — ${year}</h2>
    <div class="ir-meta">Orby${me?' · '+esc(me):''} · gerado em ${new Date().toLocaleDateString('pt-BR')}</div>

    <h4>Resumo do ano</h4>
    <table><tbody>
      <tr><td>Total de rendas</td><td class="num">${fmtMoney(d.annualInc)}</td></tr>
      <tr><td>Total de despesas</td><td class="num">${fmtMoney(d.annualExp)}</td></tr>
      <tr class="tot"><td>Resultado do ano</td><td class="num">${fmtMoney(d.annualInc-d.annualExp)}</td></tr>
    </tbody></table>

    <h4>Rendas do ano</h4>
    ${incRows.length ? `<table><tbody>
      ${incRows.map(r=>`<tr><td>${r[0]}</td><td class="num">${fmtMoney(r[1])}</td></tr>`).join('')}
      <tr class="tot"><td>Total</td><td class="num">${fmtMoney(d.annualInc)}</td></tr>
    </tbody></table>` : '<div class="ir-note">Nenhuma renda registrada no período.</div>'}

    <h4>Despesas por categoria</h4>
    ${cats.length ? `<table><thead><tr><th>Categoria</th><th class="num">Total no ano</th></tr></thead><tbody>
      ${cats.map(([k,v])=>`<tr><td>${esc(catLabel(k))}</td><td class="num">${fmtMoney(v)}</td></tr>`).join('')}
      <tr class="tot"><td>Total</td><td class="num">${fmtMoney(d.annualExp)}</td></tr>
    </tbody></table>` : '<div class="ir-note">Nenhuma despesa registrada no período.</div>'}

    <h4>Saldo mês a mês</h4>
    <table><thead><tr><th>Mês</th><th class="num">Entradas</th><th class="num">Saídas</th><th class="num">Saldo</th></tr></thead><tbody>
      ${d.months.map(m=>`<tr><td>${m.label}</td><td class="num">${fmtMoney(m.inc)}</td><td class="num">${fmtMoney(m.exp)}</td><td class="num">${fmtMoney(m.saldo)}</td></tr>`).join('')}
      <tr class="tot"><td>Ano</td><td class="num">${fmtMoney(d.annualInc)}</td><td class="num">${fmtMoney(d.annualExp)}</td><td class="num">${fmtMoney(d.annualInc-d.annualExp)}</td></tr>
    </tbody></table>

    <h4>Contas e cartões (posição atual)</h4>
    ${accounts.length ? `<table><thead><tr><th>Conta / cartão</th><th>Tipo</th><th class="num">Saldo / fatura</th></tr></thead><tbody>
      ${accounts.map(a=>{const cartao=a.tipo==='cartao';return `<tr><td>${esc(a.label)}</td><td>${accTipoLabel(a)}</td><td class="num">${fmtMoney(cartao?a.fatura:a.saldo)}</td></tr>`;}).join('')}
    </tbody></table>
    <div class="ir-note">Contas e cartões mostram a posição de hoje, não o fechamento do ano.</div>` : '<div class="ir-note">Nenhuma conta cadastrada.</div>'}

    <div class="ir-note">Rendas recorrentes são estimadas pela configuração mensal ao longo dos meses ativos; iFood e despesas usam os lançamentos reais. Confira com seus comprovantes antes de declarar.</div>
  </div>`;
}
document.getElementById('btnIrReport').onclick = async ()=>{
  const sel = document.getElementById('irYear');
  const nowY = new Date().getFullYear();
  sel.innerHTML = '';
  for (let y=nowY; y>=nowY-5; y--) sel.innerHTML += `<option value="${y}">${y}</option>`;
  sel.value = String(nowY);
  await renderIrReport(nowY);
  document.getElementById('irModalOverlay').classList.add('open');
};
document.getElementById('irYear').onchange = (e)=> renderIrReport(Number(e.target.value));
document.getElementById('irCancel').onclick = ()=> document.getElementById('irModalOverlay').classList.remove('open');
document.getElementById('irPrint').onclick = ()=> window.print();

/* ---- Importar extrato OFX (conciliação) ---- */
let __ofxRows = [];
document.getElementById('btnImportOfx').onclick = ()=> document.getElementById('ofxFile').click();
document.getElementById('ofxFile').onchange = async (ev)=>{
  const file = ev.target.files[0];
  ev.target.value = '';
  if (!file) return;
  const fd = new FormData();
  fd.append('ofx', file);
  try{
    const r = await fetch('api/import-ofx.php', { method:'POST', headers:{'X-CSRF-Token': window.CSRF_TOKEN}, body: fd });
    const j = await r.json();
    if (r.status === 402){ toast('Importar extrato é do plano pago.', {error:true}); return; }
    if (!r.ok) throw new Error(j.error || 'falha');
    __ofxRows = j.rows;
    renderOfxPreview();
    document.getElementById('ofxModalOverlay').classList.add('open');
  } catch(e){ toast('Não consegui ler o extrato: ' + (e.message||''), {error:true}); }
};
function renderOfxPreview(){
  const cats = allCategories();
  const catOpts = Object.entries(cats).map(([k,l])=>`<option value="${k}">${esc(l)}</option>`).join('');
  const nDup = __ofxRows.filter(r=>r.dup).length;
  document.getElementById('ofxSummary').textContent =
    `${__ofxRows.length} lançamentos · ${nDup} possível(is) duplicado(s)`;
  document.getElementById('ofxRows').innerHTML = __ofxRows.map((r,i)=>`
    <div class="ofxrow ${r.dup?'dup':''}">
      <input type="checkbox" data-i="${i}" ${r.dup?'':'checked'}>
      <div class="oi"><div class="od">${esc(r.desc||'(sem descrição)')}</div>
        <div class="om">${relDate(r.date)} · ${r.kind==='expense'?'saída':'entrada'}</div></div>
      ${r.dup?'<span class="dupbadge">dup</span>':''}
      ${r.kind==='expense'?`<select data-cat="${i}">${catOpts}</select>`:''}
      <div class="ov ${r.kind==='expense'?'exp':'inc'}">${r.kind==='expense'?'-':'+'}${fmtMoney(r.value).replace('R$ ','')}</div>
    </div>`).join('');
  document.querySelectorAll('#ofxRows [data-cat]').forEach(s=> s.value='outros');
}
document.getElementById('ofxCancel').onclick = ()=> document.getElementById('ofxModalOverlay').classList.remove('open');
document.getElementById('ofxConfirm').onclick = async ()=>{
  const picked = [];
  document.querySelectorAll('#ofxRows [data-i]').forEach(chk=>{
    if (chk.checked) picked.push(Number(chk.dataset.i));
  });
  if (!picked.length){ toast('Nada selecionado.', {error:true}); return; }
  const expLines = await getExpenseLines();
  const incLines = await getIncomeLines();
  let nExp=0, nInc=0;
  picked.forEach(i=>{
    const r = __ofxRows[i];
    if (r.kind==='expense'){
      const catSel = document.querySelector(`#ofxRows [data-cat="${i}"]`);
      expLines.push({ id: genId(), label: r.desc || 'Importado', value: r.value, date: r.date,
        time: '12:00', recorrencia: 'none', categoria: (catSel&&catSel.value)||'outros',
        method: 'outro', bank: 'outro', accountId: null, createdAt: Date.now() });
      nExp++;
    } else {
      incLines.push({ id: genId(), label: r.desc || 'Importado', value: r.value, type: 'variavel', endDate: null, createdAt: Date.now() });
      nInc++;
    }
  });
  if (nExp) await storeSet('expense_lines_v4', expLines);
  if (nInc) await storeSet('income_lines', incLines);
  document.getElementById('ofxModalOverlay').classList.remove('open');
  renderFinance();
  toast(`${nExp+nInc} lançamento(s) importado(s)`);
};

let chartLine=null, chartBank=null, chartMethod=null, chartCategoria=null, chartHistory=null;
function chartAccent(){ return accentHex(); }

const WEEKDAY_MIN = ['D','S','T','Q','Q','S','S'];
function chartBaseOptions(extra){
  return Object.assign({
    responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{display:false} },
    scales:{
      x:{ grid:{color:chartGridCol()}, ticks:{color:chartTickCol(), font:{size:10} } },
      y:{ grid:{color:chartGridCol()}, ticks:{color:chartTickCol(), font:{size:10} }, beginAtZero:true }
    }
  }, extra||{});
}

function heatCellStyle(val, maxVal, extraClass, isCurrent){
  let bg = 'var(--surface-2)';
  let textColor = '';
  if (val>0 && maxVal>0){
    const t = 0.12 + 0.85*(val/maxVal);
    bg = `rgba(${accentRGBStr()},${t.toFixed(2)})`;
    textColor = t > 0.42 ? '#fff' : 'var(--text)';
  }
  return `class="heatcell ${extraClass||''} ${isCurrent?'today':''}" style="background:${bg};${textColor?`color:${textColor};font-weight:600;`:''}"`;
}

function renderExpenseHeatmap(expLines, now, period, range, aggRange){
  const wrap = document.getElementById('wrapHeat');
  const titleEl = document.getElementById('heatTitle');
  const subEl = document.getElementById('heatSub');

  if (period === 'day'){
    titleEl.textContent = 'Despesas por hora';
    subEl.textContent = 'Quanto mais escuro, mais foi gasto naquele horário. Hoje, ' + pad(now.getDate())+'/'+pad(now.getMonth()+1) + '.';
    const byHour = {};
    expenseOccurrenceEntries(expLines, aggRange).forEach(({exp})=>{
      const h = expenseHourOf(exp);
      byHour[h] = (byHour[h]||0) + Number(exp.value||0);
    });
    const maxVal = Math.max(...Object.values(byHour), 0);
    const nowHour = now.getHours();
    let html = '<div class="heatgrid" style="grid-template-columns:repeat(6,1fr);">';
    for (let h=0; h<24; h++){
      const val = byHour[h] || 0;
      html += `<div ${heatCellStyle(val, maxVal, '', h===nowHour)} title="${pad(h)}h: ${fmtMoney(val)}">${pad(h)}h</div>`;
    }
    html += '</div>';
    wrap.innerHTML = html;
    return;
  }

  if (period === 'week'){
    titleEl.textContent = 'Despesas por dia';
    subEl.textContent = 'Semana de ' + dkeyDisp(range.start) + ' a ' + dkeyDisp(range.end) + '.';
    const byDate = {};
    expenseOccurrenceEntries(expLines, aggRange).forEach(({exp, date})=>{
      const k = dkey(date);
      byDate[k] = (byDate[k]||0) + Number(exp.value||0);
    });
    const maxVal = Math.max(...Object.values(byDate), 0);
    let html = '<div class="heatgrid">' + WEEKDAY_MIN.map(d=>`<div class="heat-head">${d}</div>`).join('');
    for (let i=0;i<7;i++){
      const d = addDays(range.start, i);
      const k = dkey(d);
      const val = byDate[k] || 0;
      html += `<div ${heatCellStyle(val, maxVal, '', k===dkey(now))} title="${d.getDate()}/${d.getMonth()+1}: ${fmtMoney(val)}">${d.getDate()}</div>`;
    }
    html += '</div>';
    wrap.innerHTML = html;
    return;
  }

  if (period === 'year'){
    titleEl.textContent = 'Despesas por mês';
    subEl.textContent = 'Quanto mais escuro, mais foi gasto naquele mês. Ano de ' + now.getFullYear() + '.';
    const byMonth = {};
    expenseOccurrenceEntries(expLines, aggRange).forEach(({exp, date})=>{
      const m = date.getMonth();
      byMonth[m] = (byMonth[m]||0) + Number(exp.value||0);
    });
    const maxVal = Math.max(...Object.values(byMonth), 0);
    let html = '<div class="heatgrid" style="grid-template-columns:repeat(6,1fr);">';
    for (let m=0; m<12; m++){
      const val = byMonth[m] || 0;
      html += `<div ${heatCellStyle(val, maxVal, '', m===now.getMonth())} title="${MONTH_ABBR[m]}: ${fmtMoney(val)}">${MONTH_ABBR[m]}</div>`;
    }
    html += '</div>';
    wrap.innerHTML = html;
    return;
  }

  // period === 'month' (padrão)
  titleEl.textContent = 'Despesas por dia';
  subEl.textContent = 'Quanto mais escuro, mais foi gasto naquele dia. Mês atual.';
  const byDate = {};
  expenseOccurrenceEntries(expLines, aggRange).forEach(({exp, date})=>{
    const k = dkey(date);
    byDate[k] = (byDate[k]||0) + Number(exp.value||0);
  });
  const maxVal = Math.max(...Object.values(byDate), 0);

  const first = range.start;
  const gridStart = new Date(first); gridStart.setDate(gridStart.getDate() - gridStart.getDay());
  let html = '<div class="heatgrid">' + WEEKDAY_MIN.map(d=>`<div class="heat-head">${d}</div>`).join('');
  for (let i=0;i<42;i++){
    const d = new Date(gridStart); d.setDate(gridStart.getDate()+i);
    const inMonth = d.getMonth()===first.getMonth();
    if (!inMonth && i>=35) continue;
    const k = dkey(d);
    const val = byDate[k] || 0;
    html += `<div ${heatCellStyle(val, maxVal, inMonth?'':'outmonth', k===dkey(now))} title="${d.getDate()}/${d.getMonth()+1}: ${fmtMoney(val)}">${d.getDate()}</div>`;
  }
  html += '</div>';
  wrap.innerHTML = html;
}
function dkeyDisp(d){ return pad(d.getDate())+'/'+pad(d.getMonth()+1); }

function renderDashCharts(entries, expLines, incLines, ifoodTotal, now, period, range, aggRange){
  renderExpenseHeatmap(expLines, now, period, range, aggRange);

  if (typeof Chart === 'undefined'){
    ['wrapLine','wrapBank','wrapMethod','wrapCategoria'].forEach(id=>{
      document.getElementById(id).innerHTML = '<div class="dashempty">Não consegui carregar a biblioteca de gráficos agora.<br>Verifique sua conexão e recarregue a página.</div>';
    });
    return;
  }
  if (chartLine) { chartLine.destroy(); chartLine=null; }
  if (chartBank) { chartBank.destroy(); chartBank=null; }
  if (chartMethod) { chartMethod.destroy(); chartMethod=null; }
  if (chartCategoria) { chartCategoria.destroy(); chartCategoria=null; }
  if (chartHistory) { chartHistory.destroy(); chartHistory=null; }

  const wrapBank = document.getElementById('wrapBank');
  const byBank = bucketPeriodTotals(expLines, aggRange, period, e=>e.bank, now);
  const bankEntries = Object.entries(byBank);
  if (bankEntries.length===0){
    wrapBank.innerHTML = '<div class="dashempty">Nenhuma despesa cadastrada ainda.<br>Vá em Saídas pra registrar.</div>';
  } else {
    wrapBank.innerHTML = '<canvas id="chartBank"></canvas>';
    try {
      chartBank = new Chart(document.getElementById('chartBank'), {
        type:'bar',
        data:{ labels: bankEntries.map(([k])=>bankById(k).name), datasets:[{ data: bankEntries.map(([,v])=>v), backgroundColor: accentHex(), borderRadius:6, maxBarThickness:60 }] },
        options: chartBaseOptions()
      });
    } catch(err){ console.error('chartBank falhou', err); wrapBank.innerHTML = '<div class="dashempty">Não consegui desenhar este gráfico agora.</div>'; }
  }

  const wrapMethod = document.getElementById('wrapMethod');
  const byMethod = bucketPeriodTotals(expLines, aggRange, period, e=>e.method, now);
  const methodEntries = Object.entries(byMethod);
  if (methodEntries.length===0){
    wrapMethod.innerHTML = '<div class="dashempty">Nenhuma despesa cadastrada ainda.</div>';
  } else {
    wrapMethod.innerHTML = '<canvas id="chartMethod"></canvas>';
    try {
      chartMethod = new Chart(document.getElementById('chartMethod'), {
        type:'bar',
        data:{ labels: methodEntries.map(([k])=>METHODS[k]), datasets:[{ data: methodEntries.map(([,v])=>v), backgroundColor: accentHex(), borderRadius:6, maxBarThickness:60 }] },
        options: chartBaseOptions({ indexAxis:'y' })
      });
    } catch(err){ console.error('chartMethod falhou', err); wrapMethod.innerHTML = '<div class="dashempty">Não consegui desenhar este gráfico agora.</div>'; }
  }

  const wrapCategoria = document.getElementById('wrapCategoria');
  const byCategoria = bucketPeriodTotals(expLines, aggRange, period, e=>e.categoria||'outros', now);
  const categoriaEntries = Object.entries(byCategoria).sort((a,b)=>b[1]-a[1]);
  if (categoriaEntries.length===0){
    wrapCategoria.innerHTML = '<div class="dashempty">Nenhuma despesa cadastrada ainda.</div>';
  } else {
    wrapCategoria.innerHTML = '<canvas id="chartCategoria"></canvas>';
    try {
      if (chartCategoria) chartCategoria.destroy();
      chartCategoria = new Chart(document.getElementById('chartCategoria'), {
        type:'bar',
        data:{ labels: categoriaEntries.map(([k])=>catLabel(k)), datasets:[{ data: categoriaEntries.map(([,v])=>v), backgroundColor: accentHex(), borderRadius:6, maxBarThickness:60 }] },
        options: chartBaseOptions({ indexAxis:'y' })
      });
    } catch(err){ console.error('chartCategoria falhou', err); wrapCategoria.innerHTML = '<div class="dashempty">Não consegui desenhar este gráfico agora.</div>'; }
  }

  // histórico mensal: entradas x saídas dos últimos 6 meses, direto dos lançamentos
  const wrapHistory = document.getElementById('wrapHistory');
  try {
    wrapHistory.innerHTML = '<canvas id="chartHistory"></canvas>';
    const months = [];
    for (let i=5;i>=0;i--) months.push(new Date(now.getFullYear(), now.getMonth()-i, 1));
    const labels = months.map(d=>MONTH_ABBR[d.getMonth()] + (d.getFullYear()!==now.getFullYear() ? '/'+String(d.getFullYear()).slice(2) : ''));
    const saidasSerie = months.map(m=>{
      const r = { start: m, end: new Date(m.getFullYear(), m.getMonth()+1, 0) };
      const dated = expLines.filter(e=>e.date).reduce((s2,e)=>s2+expenseTotalInRange(e, r),0);
      const undated = expLines.filter(e=>!e.date && (!e.createdAt || e.createdAt <= r.end.getTime()+86399999)).reduce((s2,e)=>s2+Number(e.value||0),0);
      return dated + undated;
    });
    const entradasSerie = months.map(m=>{
      const r = { start: m, end: new Date(m.getFullYear(), m.getMonth()+1, 0) };
      const fixas = incLines.filter(l=>{
        if (l.createdAt && l.createdAt > r.end.getTime()+86399999) return false;
        if (l.type==='temporaria' && l.endDate && dnum(new Date(l.endDate+'T00:00:00')) < dnum(r.start)) return false;
        return true;
      }).reduce((s2,l)=>s2+Number(l.value||0),0);
      const variavel = entries.filter(e=>inRange(e.date, r)).reduce((s2,e)=>s2+Number(e.valor||0),0);
      return fixas + variavel;
    });
    chartHistory = new Chart(document.getElementById('chartHistory'), {
      type:'bar',
      data:{ labels, datasets:[
        { label:'Entradas', data: entradasSerie, backgroundColor:'#4FB07A', borderRadius:5, maxBarThickness:26 },
        { label:'Saídas', data: saidasSerie, backgroundColor:'#E15C56', borderRadius:5, maxBarThickness:26 }
      ]},
      options: chartBaseOptions({ plugins:{ legend:{display:true, labels:{color:chartTickCol(), font:{size:10}, boxWidth:12}} } })
    });
  } catch(err){ console.error('chartHistory falhou', err); wrapHistory.innerHTML = '<div class="dashempty">Não consegui desenhar este gráfico agora.</div>'; }

  const cardLine = document.getElementById('cardLine');
  const hasVariableIncome = entries.length>0 || incLines.some(l=>l.type==='variavel');
  cardLine.style.display = hasVariableIncome ? '' : 'none';
  if (hasVariableIncome){
    const wrapLine = document.getElementById('wrapLine');
    wrapLine.innerHTML = '<canvas id="chartLine"></canvas>';
    const lineSubMap = { day:'Ganhos lançados hoje.', week:'Ganhos lançados por dia, semana atual.', month:'Ganhos lançados por dia, mês atual.', year:'Ganhos lançados por mês, ano atual.' };
    document.getElementById('lineSub').textContent = lineSubMap[period] || lineSubMap.month;
    try {
      let days, labels, totals;
      if (period === 'year'){
        days = Array.from({length:12}, (_,m)=> new Date(now.getFullYear(), m, 1));
        totals = days.map(d=> entries.filter(e=>{ const ed=new Date(e.date+'T00:00:00'); return ed.getFullYear()===d.getFullYear() && ed.getMonth()===d.getMonth(); }).reduce((s,e)=>s+Number(e.valor||0),0));
        labels = days.map(d=>MONTH_ABBR[d.getMonth()]);
      } else {
        const spanDays = Math.round((range.end - range.start)/86400000) + 1;
        days = Array.from({length:spanDays}, (_,i)=> addDays(range.start, i));
        totals = days.map(d=>{ const k=dkey(d); return entries.filter(e=>e.date===k).reduce((s,e)=>s+Number(e.valor||0),0); });
        labels = days.map(d=>pad(d.getDate())+'/'+pad(d.getMonth()+1));
      }
      chartLine = new Chart(document.getElementById('chartLine'), {
        type:'line',
        data:{ labels,
          datasets:[{ data: totals, borderColor: accentHex(), backgroundColor: `rgba(${accentRGBStr()},0.18)`, fill:true, tension:0.35, pointRadius:0, borderWidth:2 }] },
        options: chartBaseOptions({ scales:{ x:{ grid:{display:false}, ticks:{color:chartTickCol(), font:{size:9}, maxTicksLimit:8} }, y:{ grid:{color:chartGridCol()}, ticks:{color:chartTickCol(), font:{size:10}} } } })
      });
    } catch(err){ console.error('chartLine falhou', err); wrapLine.innerHTML = '<div class="dashempty">Não consegui desenhar este gráfico agora.</div>'; }
  }
}

document.getElementById('btnAddIfood').onclick = async ()=>{
  const date = document.getElementById('ifoodDate').value || dkey(new Date());
  const valor = document.getElementById('ifoodValor').value;
  const km = document.getElementById('ifoodKm').value;
  if(!valor) return;
  const entries = await storeGet('ifood-entries', []);
  entries.push({date, valor:Number(valor), km: km?Number(km):null});
  await storeSet('ifood-entries', entries);
  document.getElementById('ifoodValor').value=''; document.getElementById('ifoodKm').value='';
  renderFinance();
};


/* ---- Perfil: mensagens, temas e notificações ---- */
const settingsMsg = document.getElementById('settingsMsg');
function showSettingsMsg(text, isError){
  settingsMsg.textContent = text;
  settingsMsg.style.color = isError ? 'var(--brick)' : 'var(--sage)';
  settingsMsg.style.display = 'block';
}
document.getElementById('btnLogout').onclick = ()=>{ location.href = 'logout.php'; };

function applyPrefs(prefs){
  prefs = prefs || {};
  document.documentElement.dataset.theme = prefs.theme || '';
  document.documentElement.dataset.bg = prefs.bg || '';
  try{ localStorage.setItem('pm_prefs', JSON.stringify({theme:prefs.theme||'', bg:prefs.bg||''})); }catch(e){}
  document.querySelectorAll('#themeGrid .themedot').forEach(d=> d.classList.toggle('sel', (prefs.theme||'')===d.dataset.t));
  document.querySelectorAll('#bgPick .bgopt').forEach(b=> b.classList.toggle('sel', (prefs.bg||'')===b.dataset.b));
}
async function savePrefs(patch){
  const prefs = Object.assign(await storeGet('user_prefs', {}), patch);
  applyPrefs(prefs);
  await storeSet('user_prefs', prefs);
}
document.querySelectorAll('#themeGrid .themedot').forEach(d=>{ d.onclick = ()=> savePrefs({theme: d.dataset.t}); });
document.querySelectorAll('#bgPick .bgopt').forEach(b=>{ b.onclick = ()=> savePrefs({bg: b.dataset.b}); });

async function renderPerfil(){
  settingsMsg.style.display = 'none';
  document.getElementById('totpEnrollBox').style.display = 'none';
  document.getElementById('totpBackupCodesBox').style.display = 'none';
  document.getElementById('totpDisableBox').style.display = 'none';
  applyPrefs(await storeGet('user_prefs', {}));
  refreshTotpStatus();
  const tglB = document.getElementById('tglNotifBrowser');
  const sub = document.getElementById('notifBrowserSub');
  if (!('Notification' in window)){
    tglB.checked = false; tglB.disabled = true;
    sub.textContent = 'Este navegador não suporta notificações.';
  } else {
    tglB.checked = Notification.permission === 'granted' && localStorage.getItem('pm_notif') === '1';
    if (Notification.permission === 'denied') sub.textContent = 'Permissão negada no navegador — libere nas configurações do site pra ativar.';
  }
  try{
    const r = await fetch('api/me.php');
    if (r.ok){
      const me = await r.json();
      document.getElementById('pfUsername').textContent = me.username;
      document.getElementById('pfEmail').textContent = me.email || 'sem e-mail cadastrado';
      renderAvatar(me);
      setTopbarAvatar(me.avatar);
      document.getElementById('tglNotifEmail').checked = !!me.notify_email;
      document.getElementById('tglNotifEmail').disabled = !me.email;
    }
  }catch(e){}
}

function setTopbarAvatar(avatar){
  if (!avatar) return;
  const src = avatar.startsWith('http') ? avatar : avatar + '?v=' + Date.now();
  document.getElementById('tabPerfil').innerHTML = `<img class="tab-avatar" src="${esc(src)}" alt="Perfil">`;
}
function renderAvatar(me){
  const el = document.getElementById('pfAvatar');
  if (me.avatar){
    const src = me.avatar.startsWith('http') ? me.avatar : me.avatar + '?v=' + Date.now();
    el.innerHTML = `<img src="${esc(src)}" alt="Foto de perfil">`;
  } else {
    el.textContent = (me.username||'?').slice(0,1);
  }
}
document.getElementById('pfAvatar').onclick = ()=> document.getElementById('avatarFile').click();
document.getElementById('btnChangeAvatar').onclick = ()=> document.getElementById('avatarFile').click();
document.getElementById('avatarFile').onchange = async (ev)=>{
  const file = ev.target.files[0];
  ev.target.value = '';
  if (!file) return;
  if (file.size > 4*1024*1024){ showSettingsMsg('Imagem muito grande (máx 4MB).', true); return; }
  const fd = new FormData();
  fd.append('avatar', file);
  try{
    const r = await fetch('api/avatar.php', { method:'POST', headers:{'X-CSRF-Token': window.CSRF_TOKEN}, body: fd });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || 'upload failed');
    renderAvatar({ avatar: j.avatar });
    setTopbarAvatar(j.avatar);
    showSettingsMsg('Foto de perfil atualizada.', false);
  } catch(e){ showSettingsMsg('Não consegui enviar a foto: ' + (e.message||''), true); }
};

document.getElementById('tglNotifBrowser').onchange = async (ev)=>{
  const tgl = ev.target;
  if (tgl.checked){
    const perm = await Notification.requestPermission();
    if (perm !== 'granted'){ tgl.checked = false; showSettingsMsg('Permissão de notificação não concedida.', true); return; }
    localStorage.setItem('pm_notif', '1');
    new Notification('Orby', { body: 'Notificações ativadas! Você será avisado quando uma tarefa começar.', icon: 'assets/icon-192.png' });
  } else {
    localStorage.setItem('pm_notif', '0');
  }
};

document.getElementById('tglNotifEmail').onchange = async (ev)=>{
  const tgl = ev.target;
  try{
    const r = await fetch('api/prefs.php', {
      method:'POST',
      headers: {'Content-Type':'application/json', 'X-CSRF-Token': window.CSRF_TOKEN},
      body: JSON.stringify({ notify_email: tgl.checked })
    });
    if (!r.ok) throw new Error('prefs failed');
    showSettingsMsg(tgl.checked ? 'Notificações por e-mail ativadas.' : 'Notificações por e-mail desativadas.', false);
  }catch(e){ tgl.checked = !tgl.checked; showSettingsMsg('Não consegui salvar agora, tenta de novo.', true); }
};
document.getElementById('btnExportBackup').onclick = async ()=>{
  try{
    const r = await fetch('api/export.php');
    if (!r.ok) throw new Error('export failed');
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'orby-backup-' + dkey(new Date()) + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    showSettingsMsg('Backup baixado com sucesso.', false);
  } catch(e){ showSettingsMsg('Não consegui gerar o backup agora.', true); }
};
document.getElementById('btnExportCsv').onclick = async ()=>{
  const expLines = await getExpenseLines();
  const incLines = await getIncomeLines();
  const entries = await storeGet('ifood-entries', []);
  const csvCell = v => '"' + String(v??'').replace(/"/g,'""') + '"';
  const num = v => String(Number(v||0)).replace('.', ',');
  const rows = [['tipo','descricao','valor','data','hora','categoria','forma_pagamento','banco','recorrencia']];
  expLines.forEach(e=> rows.push(['despesa', e.label, num(e.value), e.date||'', expenseTimeOf(e), catLabel(e.categoria), METHODS[e.method]||'', bankById(e.bank).name, e.recorrencia==='mensal'?'mensal':'']));
  incLines.forEach(l=> rows.push(['renda', l.label, num(l.value), l.endDate||'', '', TYPE_LABEL[l.type]||'', '', '', l.type==='temporaria'?'':'mensal']));
  entries.forEach(e=> rows.push(['renda variavel', e.km?('iFood '+e.km+' km'):'lançamento', num(e.valor), e.date||'', '', '', '', '', '']));
  const csv = '﻿' + rows.map(r=>r.map(csvCell).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], {type:'text/csv;charset=utf-8'}));
  const a = document.createElement('a');
  a.href = url; a.download = 'orby-relatorio-' + dkey(new Date()) + '.csv';
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
  showSettingsMsg('CSV exportado — abre direto no Excel/Planilhas.', false);
};
document.getElementById('btnImportBackup').onclick = ()=> document.getElementById('importBackupFile').click();
document.getElementById('importBackupFile').onchange = async (ev)=>{
  const file = ev.target.files[0];
  ev.target.value = '';
  if (!file) return;
  try{
    const text = await file.text();
    const data = JSON.parse(text);
    const r = await fetch('api/import.php', {
      method: 'POST',
      headers: {'Content-Type':'application/json', 'X-CSRF-Token': window.CSRF_TOKEN},
      body: JSON.stringify(data)
    });
    if (!r.ok) throw new Error('import failed');
    showSettingsMsg('Backup restaurado. Recarregando...', false);
    setTimeout(()=> location.reload(), 1200);
  } catch(e){ showSettingsMsg('Arquivo inválido ou falha ao restaurar.', true); }
};

async function refreshTotpStatus(){
  const statusEl = document.getElementById('totpStatus');
  const btnEnable = document.getElementById('btnEnable2fa');
  const btnDisable = document.getElementById('btnDisable2fa');
  try{
    const r = await fetch('api/me.php');
    if (!r.ok) throw new Error('me failed');
    const me = await r.json();
    if (me.totp_enabled){
      statusEl.textContent = 'Ativado';
      btnDisable.style.display = '';
      btnEnable.style.display = 'none';
    } else {
      statusEl.textContent = 'Desativado';
      btnEnable.style.display = '';
      btnDisable.style.display = 'none';
    }
  } catch(e){ statusEl.textContent = 'Não consegui checar o status agora.'; }
}

document.getElementById('btnEnable2fa').onclick = async ()=>{
  try{
    const r = await fetch('api/totp-enroll.php', { method:'POST', headers:{'X-CSRF-Token': window.CSRF_TOKEN} });
    if (!r.ok) throw new Error('enroll failed');
    const j = await r.json();
    document.getElementById('totpManualKey').textContent = j.secret;
    const qrBox = document.getElementById('totpQr');
    qrBox.innerHTML = '';
    new QRCode(qrBox, { text: j.otpauth_uri, width: 180, height: 180 });
    document.getElementById('totpCode').value = '';
    document.getElementById('totpEnrollBox').style.display = 'block';
    document.getElementById('btnEnable2fa').style.display = 'none';
  } catch(e){ showSettingsMsg('Não consegui iniciar a ativação do 2FA.', true); }
};

document.getElementById('btnConfirm2fa').onclick = async ()=>{
  const code = document.getElementById('totpCode').value.trim();
  try{
    const r = await fetch('api/totp-confirm.php', {
      method: 'POST',
      headers: {'Content-Type':'application/json', 'X-CSRF-Token': window.CSRF_TOKEN},
      body: JSON.stringify({ code })
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || 'confirm failed');
    document.getElementById('totpEnrollBox').style.display = 'none';
    document.getElementById('totpBackupCodesList').innerHTML = j.backup_codes.map(c=>`<div>${c}</div>`).join('');
    document.getElementById('totpBackupCodesBox').style.display = 'block';
    showSettingsMsg('2FA ativado com sucesso.', false);
    refreshTotpStatus();
  } catch(e){ showSettingsMsg('Código inválido, tenta de novo.', true); }
};

document.getElementById('btnDisable2fa').onclick = ()=>{
  document.getElementById('totpDisablePassword').value = '';
  document.getElementById('totpDisableBox').style.display = 'block';
  document.getElementById('btnDisable2fa').style.display = 'none';
};

document.getElementById('btnConfirmDisable2fa').onclick = async ()=>{
  const password = document.getElementById('totpDisablePassword').value;
  try{
    const r = await fetch('api/totp-disable.php', {
      method: 'POST',
      headers: {'Content-Type':'application/json', 'X-CSRF-Token': window.CSRF_TOKEN},
      body: JSON.stringify({ password })
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || 'disable failed');
    document.getElementById('totpDisableBox').style.display = 'none';
    showSettingsMsg('2FA desativado.', false);
    refreshTotpStatus();
  } catch(e){ showSettingsMsg('Senha incorreta ou falha ao desativar.', true); }
};

/* ---- Pickers do Orby: substituem os popups nativos de select/data/hora ---- */
function closePickers(){ document.querySelectorAll('.orby-pop').forEach(p=>p.remove()); }
document.addEventListener('mousedown', (e)=>{
  if (!e.target.closest('.orby-pop') && !e.target.closest('.pick-trigger')) closePickers();
});
function placePop(pop, anchor){
  document.body.appendChild(pop);
  const r = anchor.getBoundingClientRect();
  const pw = pop.offsetWidth, ph = pop.offsetHeight;
  let left = Math.max(8, Math.min(r.left, window.innerWidth - pw - 8));
  let top = r.bottom + 6;
  if (top + ph > window.innerHeight - 8) top = r.top - ph - 6;
  top = Math.max(8, Math.min(top, window.innerHeight - ph - 8));
  pop.style.left = left + 'px';
  pop.style.top = top + 'px';
}

function enhanceSelects(){
  document.querySelectorAll('.modal select').forEach(sel=>{
    if (sel.dataset.enhanced) return;
    sel.dataset.enhanced = '1';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pickbtn pick-trigger';
    sel.parentNode.insertBefore(btn, sel.nextSibling);
    sel.style.display = 'none';
    const sync = ()=>{
      btn.textContent = sel.options[sel.selectedIndex]?.text || '—';
      btn.disabled = sel.disabled;
    };
    sel.__syncPick = sync;
    sync();
    sel.addEventListener('change', sync);
    new MutationObserver(sync).observe(sel, {childList:true, attributes:true});
    btn.onclick = ()=>{
      sync();
      if (document.querySelector('.orby-pop')) { closePickers(); return; }
      const pop = document.createElement('div');
      pop.className = 'orby-pop';
      const list = document.createElement('div');
      list.className = 'pop-list';
      [...sel.options].forEach(opt=>{
        const o = document.createElement('div');
        o.className = 'pop-opt' + (opt.value===sel.value ? ' sel' : '');
        o.textContent = opt.text;
        o.onclick = ()=>{
          sel.value = opt.value;
          sel.dispatchEvent(new Event('change'));
          closePickers();
        };
        list.appendChild(o);
      });
      pop.appendChild(list);
      placePop(pop, btn);
      pop.style.minWidth = btn.getBoundingClientRect().width + 'px';
      list.querySelector('.sel')?.scrollIntoView({block:'center'});
    };
  });
}
function syncAllPickBtns(){
  document.querySelectorAll('.modal select[data-enhanced]').forEach(sel=> sel.__syncPick && sel.__syncPick());
}

function openCalPop(inp){
  closePickers();
  let view = inp.value ? new Date(inp.value+'T00:00:00') : new Date();
  const pop = document.createElement('div');
  pop.className = 'orby-pop';
  function draw(){
    const y = view.getFullYear(), m = view.getMonth();
    const first = new Date(y, m, 1);
    const gridStart = startOfWeek(first);
    const today = dkey(new Date());
    let html = '<div class="cal-wrap"><div class="cal-head"><div class="cal-title">' + MONTH_NAMES[m] + ' de ' + y + '</div>'
      + '<div class="cal-nav"><button type="button" data-nav="-1">‹</button><button type="button" data-nav="1">›</button></div></div>'
      + '<div class="cal-grid">' + WEEKDAY_MIN.map(d=>'<div class="cal-dh">'+d+'</div>').join('');
    for (let i=0;i<42;i++){
      const d = addDays(gridStart, i);
      const k = dkey(d);
      const out = d.getMonth()!==m;
      if (out && i>=35) continue;
      html += '<div class="cal-d'+(out?' out':'')+(k===today?' today':'')+(k===inp.value?' sel':'')+'" data-d="'+k+'">'+d.getDate()+'</div>';
    }
    html += '</div><div class="cal-foot"><button type="button" data-act="clear">Limpar</button><button type="button" data-act="today">Hoje</button></div></div>';
    pop.innerHTML = html;
    pop.querySelectorAll('[data-nav]').forEach(b=>{ b.onclick = ()=>{ view.setMonth(view.getMonth()+Number(b.dataset.nav)); draw(); }; });
    pop.querySelectorAll('.cal-d').forEach(c=>{ c.onclick = ()=>{ setVal(c.dataset.d); }; });
    pop.querySelector('[data-act="clear"]').onclick = ()=> setVal('');
    pop.querySelector('[data-act="today"]').onclick = ()=> setVal(dkey(new Date()));
  }
  function setVal(v){
    inp.value = v;
    inp.dispatchEvent(new Event('input'));
    inp.dispatchEvent(new Event('change'));
    closePickers();
  }
  draw();
  placePop(pop, inp);
}

function openTimePop(inp){
  closePickers();
  const cur = (inp.value || '12:00').split(':');
  let selH = cur[0], selM = cur[1];
  const pop = document.createElement('div');
  pop.className = 'orby-pop';
  const wrap = document.createElement('div');
  wrap.className = 'time-wrap';
  const colH = document.createElement('div'); colH.className = 'time-col';
  const colM = document.createElement('div'); colM.className = 'time-col';
  function setVal(){
    inp.value = selH + ':' + selM;
    inp.dispatchEvent(new Event('input'));
    inp.dispatchEvent(new Event('change'));
  }
  for (let h=0; h<24; h++){
    const v = pad(h);
    const o = document.createElement('div');
    o.className = 'pop-opt' + (v===selH?' sel':'');
    o.textContent = v;
    o.onclick = ()=>{ selH = v; colH.querySelectorAll('.pop-opt').forEach(x=>x.classList.toggle('sel', x.textContent===v)); setVal(); };
    colH.appendChild(o);
  }
  for (let mn=0; mn<60; mn+=5){
    const v = pad(mn);
    const o = document.createElement('div');
    o.className = 'pop-opt' + (v===selM?' sel':'');
    o.textContent = v;
    o.onclick = ()=>{ selM = v; setVal(); closePickers(); };
    colM.appendChild(o);
  }
  wrap.appendChild(colH); wrap.appendChild(colM);
  pop.appendChild(wrap);
  const foot = document.createElement('div');
  foot.className = 'time-foot';
  const now = document.createElement('button');
  now.type = 'button'; now.textContent = 'Agora';
  now.onclick = ()=>{ const n = new Date(); selH = pad(n.getHours()); selM = pad(n.getMinutes()); setVal(); closePickers(); };
  foot.appendChild(now);
  pop.appendChild(foot);
  placePop(pop, inp);
  colH.querySelector('.sel')?.scrollIntoView({block:'center'});
  colM.querySelector('.sel')?.scrollIntoView({block:'center'});
}

function enhanceDateTimeInputs(){
  document.querySelectorAll('input[type=date]').forEach(inp=>{
    if (inp.dataset.enhanced) return;
    inp.dataset.enhanced = '1';
    inp.readOnly = true;
    inp.classList.add('pick-trigger');
    inp.addEventListener('click', ()=> openCalPop(inp));
  });
  document.querySelectorAll('input[type=time]').forEach(inp=>{
    if (inp.dataset.enhanced) return;
    inp.dataset.enhanced = '1';
    inp.readOnly = true;
    inp.classList.add('pick-trigger');
    inp.addEventListener('click', ()=> openTimePop(inp));
  });
}
enhanceSelects();
enhanceDateTimeInputs();

const FAB_OPENERS = { expense:'btnOpenExpModal', income:'btnOpenIncModal', account:'btnOpenAccModal', task:'btnNewTask' };
function closeFabMenu(){ document.getElementById('fabMenu').classList.remove('open'); document.getElementById('fabNew').classList.remove('open'); }
document.getElementById('fabNew').onclick = (ev)=>{
  ev.stopPropagation();
  const menu = document.getElementById('fabMenu');
  const open = !menu.classList.contains('open');
  menu.classList.toggle('open', open);
  document.getElementById('fabNew').classList.toggle('open', open);
};
document.querySelectorAll('#fabMenu .fab-item').forEach(btn=>{
  btn.onclick = (ev)=>{ ev.stopPropagation(); closeFabMenu(); document.getElementById(FAB_OPENERS[btn.dataset.fab]).click(); };
});
document.addEventListener('click', (e)=>{ if (!e.target.closest('#fabMenu') && !e.target.closest('#fabNew')) closeFabMenu(); });

/* modais: Esc fecha, clique no fundo fecha, foco no primeiro campo, Enter salva */
document.querySelectorAll('.modal-overlay').forEach(ov=>{
  ov.addEventListener('mousedown', (e)=>{
    if (e.target!==ov) return;
    if (document.querySelector('.orby-pop')){ closePickers(); return; }
    ov.classList.remove('open');
  });
  new MutationObserver(()=>{
    if (ov.classList.contains('open')){
      syncAllPickBtns();
      const f = ov.querySelector('input:not([type=hidden]):not([type=file]):not([type=checkbox]):not([type=date]):not([type=time])');
      if (f) setTimeout(()=>f.focus(), 60);
    } else {
      closePickers();
    }
  }).observe(ov, {attributes:true, attributeFilter:['class']});
});
document.addEventListener('keydown', (e)=>{
  if (e.key !== 'Escape') return;
  if (document.querySelector('.orby-pop')){ closePickers(); return; }
  const open = document.querySelector('.modal-overlay.open');
  if (open) open.classList.remove('open');
});
document.querySelectorAll('.modal').forEach(m=>{
  m.addEventListener('keydown', (e)=>{
    if (e.key==='Enter' && e.target.tagName==='INPUT' && e.target.type!=='checkbox'){
      const btn = m.querySelector('.btn-primary');
      if (btn){ e.preventDefault(); btn.click(); }
    }
  });
});

/* revalida os dados ao voltar pro app (outro aparelho pode ter mexido) */
let __lastReval = Date.now();
document.addEventListener('visibilitychange', async ()=>{
  if (document.visibilityState !== 'visible') return;
  if (Date.now() - __lastReval < 60000) return;
  __lastReval = Date.now();
  try{
    const r = await fetch('api/data.php?all=1');
    if (!r.ok) return;
    const fresh = await r.json();
    if (JSON.stringify(fresh) !== JSON.stringify(__cache)){
      __cache = fresh;
      tasks = __cache.tasks_v6 || [];
      checklist = __cache.checklist_v6 || {};
      applyPrefs(__cache.user_prefs || {});
      __customCats = __cache.custom_categories || [];
      if (Array.isArray(__cache.bank_favorites) && __cache.bank_favorites.length) __bankFavorites = __cache.bank_favorites;
      if (__cache.acc_view==='conta'||__cache.acc_view==='banco') __accView = __cache.acc_view;
      if (Array.isArray(__cache.section_order)){ __sectionOrder = __cache.section_order.filter(p=>SECTION_DEF.includes(p)); SECTION_DEF.forEach(p=>{ if(!__sectionOrder.includes(p)) __sectionOrder.push(p); }); applySectionOrder(); renderSectionOrderList(); }
      const page = document.querySelector('.sectiontab.active')?.dataset.page;
      if (page==='financeiro') renderFinance();
      if (page==='agenda'){ renderAgenda(); renderHomeCharts(); }
      renderHero();
    }
  }catch(e){}
});

/* ---- Ordem das seções (menu principal) ---- */
const SECTION_DEF = ['agenda','financeiro','treinos'];
const SECTION_LABEL = { agenda:'Rotina', financeiro:'Finanças', treinos:'Treino' };
const SECTION_ICON = { agenda:'📅', financeiro:'💰', treinos:'🏋️' };
let __sectionOrder = SECTION_DEF.slice();
async function loadSectionOrder(){
  const o = await storeGet('section_order', null);
  if (Array.isArray(o)){
    const valid = o.filter(p=>SECTION_DEF.includes(p));
    SECTION_DEF.forEach(p=>{ if(!valid.includes(p)) valid.push(p); });
    __sectionOrder = valid;
  }
}
function applySectionOrder(){
  const nav = document.getElementById('sectiontabs'); if (!nav) return;
  const byPage = {};
  [...nav.children].forEach(c=>{ if(c.dataset.page) byPage[c.dataset.page]=c; });
  __sectionOrder.forEach(p=>{ if(byPage[p]) nav.appendChild(byPage[p]); });
  if (byPage['perfil']) nav.appendChild(byPage['perfil']);
}
function renderSectionOrderList(){
  const box = document.getElementById('sectionOrderList'); if (!box) return;
  box.innerHTML = __sectionOrder.map((p,i)=>`
    <div class="secorder-row">
      <span class="secorder-ic">${SECTION_ICON[p]}</span>
      <div class="secorder-name">${SECTION_LABEL[p]}</div>
      <button class="secord-btn" data-dir="up" data-p="${p}" title="Subir" ${i===0?'disabled':''}>↑</button>
      <button class="secord-btn" data-dir="down" data-p="${p}" title="Descer" ${i===__sectionOrder.length-1?'disabled':''}>↓</button>
    </div>`).join('') +
    `<div class="secorder-row muted"><span class="secorder-ic">👤</span><div class="secorder-name">Perfil</div><span style="font-size:10.5px;color:var(--text-3);">sempre por último</span></div>`;
  box.querySelectorAll('.secord-btn').forEach(b=> b.onclick = async ()=>{
    const p = b.dataset.p, i = __sectionOrder.indexOf(p);
    if (b.dataset.dir==='up' && i>0) [__sectionOrder[i-1],__sectionOrder[i]] = [__sectionOrder[i],__sectionOrder[i-1]];
    if (b.dataset.dir==='down' && i<__sectionOrder.length-1) [__sectionOrder[i+1],__sectionOrder[i]] = [__sectionOrder[i],__sectionOrder[i+1]];
    await storeSet('section_order', __sectionOrder);
    applySectionOrder(); renderSectionOrderList();
    toast('Ordem das seções atualizada');
  });
}

async function init(){
  document.getElementById('ifoodDate').value = dkey(new Date());
  applyPrefs(await storeGet('user_prefs', {}));
  await loadCustomCats();
  await loadBankFavorites();
  await loadAccView();
  await loadSectionOrder();
  applySectionOrder();
  renderSectionOrderList();
  await ensureSeeded();
  renderHomeCharts();
  renderAgenda();
  setInterval(()=>{ renderHero(); if (document.getElementById('apage-inicio').classList.contains('active')) renderHomeCharts(); }, 20000);
  if ('serviceWorker' in navigator){ navigator.serviceWorker.register('sw.js').catch(()=>{}); }
  fetch('api/me.php').then(r=>r.ok?r.json():null).then(me=>{ if(me) setTopbarAvatar(me.avatar); }).catch(()=>{});
}
init();
