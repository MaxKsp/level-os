import { useApp } from '../../context/AppContext';

export const calculateRoutineProgress = (completed: number, total: number) => total > 0 ? Math.round((completed / total) * 100) : 0;
export const ROUTINE_PROGRESS_CIRCUMFERENCE = 301.6;

const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const Dashboard = () => {
  const { tasks, exercises, balance, invoice, projection, loggedWeights, handleToggleTask, setIsTaskModalOpen, setIsExpenseModalOpen, setIsWeightModalOpen, setIsWorkoutModalOpen } = useApp();
  const complete = tasks.filter((task) => task.completed).length;
  const progress = calculateRoutineProgress(complete, tasks.length);
  const pending = tasks.length - complete;
  const exerciseComplete = exercises.filter((exercise) => exercise.completed).length;
  const offset = ROUTINE_PROGRESS_CIRCUMFERENCE * (1 - progress / 100);
  const currentWeight = loggedWeights.at(-1)?.weight ?? 80;

  return (
    <main className="mx-auto max-w-[1440px] px-4 pb-16 pt-24 sm:px-6 lg:px-8">
      <section className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-sm font-medium text-[#8f96a3]">Quinta-feira, 16 de julho</p>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">Bom dia, Lucas.</h1>
          <p className="mt-2 text-base text-[#8f96a3]">Você tem {pending} tarefas pendentes e um treino programado para hoje.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setIsExpenseModalOpen(true)} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-[#d6d9df] hover:bg-white/[0.05]">Lançar despesa</button>
          <button onClick={() => setIsTaskModalOpen(true)} className="rounded-xl bg-[#c7d2fe] px-4 py-2.5 text-sm font-semibold text-[#1d2748] hover:bg-[#d7dfff]">Nova tarefa</button>
        </div>
      </section>

      <section className="mb-6 grid gap-3 sm:grid-cols-3" aria-label="Resumo financeiro">
        {[['Saldo disponível', money(balance), 'Conta principal'], ['Fatura atual', money(invoice), 'Fecha em 8 dias'], ['Projeção do mês', money(projection), 'Após compromissos']].map(([label, value, note], index) => (
          <article key={label} className="rounded-2xl border border-white/[0.07] bg-[#121418] p-5">
            <div className="mb-5 flex items-center justify-between"><p className="text-sm text-[#9299a5]">{label}</p><span className={`h-2 w-2 rounded-full ${index === 1 ? 'bg-[#f4bd73]' : 'bg-[#83d9b2]'}`} /></div>
            <p className="font-mono text-2xl font-medium tracking-[-0.04em] text-white">{value}</p><p className="mt-1 text-xs text-[#737a86]">{note}</p>
          </article>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(320px,.75fr)]">
        <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#121418]">
          <header className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4 sm:px-6">
            <div><h2 className="font-semibold text-white">Sua rotina</h2><p className="mt-0.5 text-sm text-[#7f8692]">Prioridades organizadas por horário</p></div>
            <button onClick={() => setIsTaskModalOpen(true)} className="text-sm font-medium text-[#b8c8ff] hover:text-white">Adicionar</button>
          </header>
          <div className="divide-y divide-white/[0.06]">
            {tasks.map((task) => (
              <button key={task.id} onClick={() => handleToggleTask(task.id)} className="group flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-white/[0.025] sm:px-6">
                <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border ${task.completed ? 'border-[#83d9b2] bg-[#83d9b2] text-[#10251c]' : 'border-[#464c56]'}`}><span className="material-symbols-outlined text-[14px]">{task.completed ? 'check' : ''}</span></span>
                <span className="w-12 shrink-0 font-mono text-xs text-[#747b87]">{task.time}</span>
                <span className="min-w-0 flex-1"><span className={`block truncate text-sm font-medium ${task.completed ? 'text-[#777e89] line-through' : 'text-[#e5e7eb]'}`}>{task.title}</span><span className="mt-0.5 block truncate text-xs text-[#707783]">{task.subtitle}</span></span>
                <span className="material-symbols-outlined text-[18px] text-transparent group-hover:text-[#747b87]">chevron_right</span>
              </button>
            ))}
          </div>
        </section>

        <aside className="flex flex-col gap-4">
          <section className="rounded-2xl border border-white/[0.07] bg-[#121418] p-6">
            <div className="flex items-center gap-5">
              <div className="relative grid h-28 w-28 shrink-0 place-items-center">
                <svg viewBox="0 0 112 112" className="absolute inset-0 -rotate-90"><circle cx="56" cy="56" r="48" fill="none" stroke="#25282e" strokeWidth="8"/><circle role="progressbar" aria-label="Progresso da rotina" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} cx="56" cy="56" r="48" fill="none" stroke="#b8c8ff" strokeWidth="8" strokeLinecap="round" style={{ strokeDasharray: ROUTINE_PROGRESS_CIRCUMFERENCE, strokeDashoffset: offset, transition: 'stroke-dashoffset .4s ease' }}/></svg>
                <span className="font-mono text-2xl font-semibold text-white">{progress}%</span>
              </div>
              <div><p className="text-sm font-medium text-white">Progresso de hoje</p><p className="mt-1 text-sm leading-5 text-[#858c98]">{complete} de {tasks.length} tarefas concluídas.</p><p className="mt-3 text-xs font-medium text-[#83d9b2]">Bom ritmo</p></div>
            </div>
          </section>

          <section className="rounded-2xl border border-white/[0.07] bg-[#121418] p-5">
            <div className="mb-5 flex items-start justify-between"><div><p className="text-xs font-medium uppercase tracking-[.12em] text-[#777e89]">Treino de hoje</p><h2 className="mt-2 font-semibold text-white">Superior A</h2><p className="mt-1 text-sm text-[#818894]">Peito, ombros e tríceps</p></div><span className="rounded-lg bg-[#27242f] px-2.5 py-1 text-xs text-[#d8c2ff]">45 min</span></div>
            <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-[#292c32]"><div className="h-full rounded-full bg-[#b8c8ff]" style={{ width: `${calculateRoutineProgress(exerciseComplete, exercises.length)}%` }} /></div>
            <div className="flex items-center justify-between"><p className="text-xs text-[#7d8490]">{exerciseComplete} de {exercises.length} exercícios</p><button onClick={() => setIsWorkoutModalOpen(true)} className="rounded-xl bg-white/[0.07] px-3.5 py-2 text-sm font-medium text-white hover:bg-white/[0.11]">Continuar</button></div>
          </section>

          <section className="rounded-2xl border border-white/[0.07] bg-[#121418] p-5">
            <div className="flex items-end justify-between"><div><p className="text-sm text-[#858c98]">Peso atual</p><p className="mt-2 font-mono text-2xl font-medium text-white">{currentWeight.toFixed(1)} <span className="text-sm text-[#7c838e]">kg</span></p><p className="mt-1 text-xs text-[#83d9b2]">−1,0 kg nesta semana</p></div><button onClick={() => setIsWeightModalOpen(true)} className="text-sm font-medium text-[#b8c8ff]">Registrar</button></div>
          </section>
        </aside>
      </div>
    </main>
  );
};
