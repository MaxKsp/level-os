import { useApp } from "../../context/AppContext"
import { useFinance } from "../../modules/finance/store"
import { Modal } from "../ui/Modal"
import { Button } from "../ui/button"
import { GlobalSearch } from "./GlobalSearch"
import { Icon } from "../../design-system"
import { useProgress } from "../../modules/progress/store"
import { TaskSchedulerForm } from "../../modules/routine/TaskSchedulerForm"
import { ExpenseForm } from "../../modules/finance/ExpenseForm"

export function ModalsContainer() {
  const app = useApp()
  const fin = useFinance()
  const { awardEvent } = useProgress()
  const completed = app.exercises.filter((item) => item.completed).length
  const formatSeconds = (total: number) => `${Math.floor(total / 60).toString().padStart(2, "0")}:${(total % 60).toString().padStart(2, "0")}`

  const completeWorkout = () => {
    if (completed !== app.exercises.length) return
    const date = new Date().toLocaleDateString("sv-SE")
    void awardEvent("treino", `treino:${date}:superior-a`)
    app.setIsWorkoutActive(false)
    app.setIsWorkoutModalOpen(false)
  }

  return <>
    <GlobalSearch />
    <Modal isOpen={app.isTaskModalOpen} onClose={() => app.setIsTaskModalOpen(false)} title="Agendar tarefa" description="Crie uma vez e escolha quando repetir, como em um despertador." icon="alarm_add" maxWidth="max-w-xl">
      <TaskSchedulerForm onClose={() => app.setIsTaskModalOpen(false)} />
    </Modal>
    <Modal isOpen={app.isExpenseModalOpen} onClose={() => app.setIsExpenseModalOpen(false)} title="Lançar despesa" icon="payments" maxWidth="max-w-lg">
      <ExpenseForm accounts={fin.accounts} resetKey={app.isExpenseModalOpen} onCancel={() => app.setIsExpenseModalOpen(false)} onSave={fin.addExpense} />
    </Modal>
    <Modal isOpen={app.isWeightModalOpen} onClose={() => app.setIsWeightModalOpen(false)} title="Registrar peso" icon="monitor_weight"><form onSubmit={app.handleAddWeightSubmit} className="space-y-5"><div className="py-3 text-center"><p className="font-mono text-4xl font-bold text-primary">{app.weightValue} <span className="text-sm">kg</span></p><input type="range" min="65" max="120" step="0.1" value={app.weightValue} onChange={(e) => app.setWeightValue(e.target.value)} className="mt-6 w-full accent-primary" /></div><div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => app.setIsWeightModalOpen(false)}>Cancelar</Button><Button type="submit">Salvar registro</Button></div></form></Modal>
    <Modal isOpen={app.isWorkoutModalOpen} onClose={() => app.setIsWorkoutModalOpen(false)} title="Treino do dia: Superior A" icon="fitness_center" maxWidth="max-w-xl">
      <div className="space-y-4"><div className="flex items-center justify-between rounded-lg border border-outline-variant bg-surface-container p-3"><div><p className="text-sm font-semibold text-on-surface">Peito e tríceps</p><p className="text-xs text-muted">{completed} de {app.exercises.length} concluídos</p></div><div className="rounded-md bg-primary/10 px-3 py-1.5 font-mono text-sm text-primary">{formatSeconds(app.workoutTimer)}</div></div><Button variant={app.isWorkoutActive ? "danger" : "secondary"} onClick={() => app.setIsWorkoutActive(!app.isWorkoutActive)} className="w-full">{app.isWorkoutActive ? "Pausar cronômetro" : "Iniciar cronômetro"}</Button><div className="max-h-72 divide-y divide-outline-variant overflow-y-auto">{app.exercises.map((exercise) => <button key={exercise.id} onClick={() => app.handleToggleExercise(exercise.id)} className="flex w-full items-center justify-between px-1 py-3 text-left hover:bg-surface-container-high"><span><span className={exercise.completed ? "block text-sm text-muted line-through" : "block text-sm text-on-surface"}>{exercise.name}</span><span className="text-xs text-muted">{exercise.sets}</span></span><Icon name={exercise.completed ? "check_circle" : "radio_button_unchecked"} className="text-[20px] text-primary" /></button>)}</div><div className="flex items-center justify-between border-t border-outline-variant pt-4"><p className="text-xs text-muted">Progresso {completed}/{app.exercises.length}</p><Button disabled={completed !== app.exercises.length} onClick={completeWorkout}>Concluir treino · +80 XP</Button></div></div>
    </Modal>
  </>
}
