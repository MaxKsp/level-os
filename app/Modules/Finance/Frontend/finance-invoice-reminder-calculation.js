/** Lembretes de vencimento de fatura dos cartões (próximos 7 dias). */
function calculateInvoiceReminders(cartoes, now){
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
  return reminders;
}
