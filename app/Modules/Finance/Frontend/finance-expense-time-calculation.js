function expenseTimeOf(exp){
  if (exp.time) return exp.time;
  if (exp.createdAt) { const d = new Date(exp.createdAt); return pad(d.getHours())+':'+pad(d.getMinutes()); }
  return '12:00';
}
function expenseHourOf(exp){
  return Number(expenseTimeOf(exp).split(':')[0]);
}
