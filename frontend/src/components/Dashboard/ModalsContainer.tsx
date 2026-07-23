import { useState, type FormEvent, type ReactNode } from "react"
import { useApp } from "../../context/AppContext"
import { useFinance, genId } from "../../modules/finance/store"
import { CATEGORY_LABEL } from "../../modules/finance/categories"
import { isCard } from "../../modules/finance/selectors"
import { Modal } from "../ui/Modal"
import { Input } from "../ui/Input"
import { Button } from "../ui/Button"
import { GlobalSearch } from "./GlobalSearch"
import { Icon } from "../../design-system"
import { useProgress } from "../../modules/progress/store"

export function ModalsContainer() {
  const app = useApp()
  const fin = useFinance()
  const { awardEvent } = useProgress()
  const [expenseAccountId, setExpenseAccountId] = useState(fin.accounts.find((a) => a.principal)?.id ?? fin.accounts[0]?.id ?? "")
  const [expenseCategory, setExpenseCategory] = useState("outros")
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10))
  const completed = app.exercises.filter((item) => item.completed).length
  const formatSeconds = (total: number) => `${Math.floor(total / 60).toString().padStart(2, "0")}:${(total % 60).toString().padStart(2, "0")}`

  const addExpense = (event: FormEvent) => {
    event.preventDefault()
    const value = Number(app.expenseAmount)
    const account = fin.accounts.find((item) => item.id === expenseAccountId)
    if (!account || !app.expenseDesc.trim() || !Number.isFinite(value) || value <= 0) return
    fin.addExpense({ id: genId("exp"), label: app.expenseDesc.trim(), value, date: expenseDate, time: null, recorrencia: "none", categoria: expenseCategory, method: isCard(account) ? "credito" : "debito", bank: account.bank, accountId: account.id, parcelas: null, createdAt: Math.floor(Date.now() / 1000) })
    app.setExpenseDesc(""); app.setExpenseAmount(""); app.setIsExpenseModalOpen(false)
  }

  const completeWorkout = () => {
    if (completed !== app.exercises.length) return
    const date = new Date().toLocaleDateString("sv-SE")
    void awardEvent("treino", `treino:${date}:superior-a`)
    app.setIsWorkoutActive(false)
    app.setIsWorkoutModalOpen(false)
  }

  return <>
    <GlobalSearch />
    <Modal isOpen={app.isTaskModalOpen} onClose={() => app.setIsTaskModalOpen(false)} title="Nova tarefa da rotina" icon="add_circle">
      <form onSubmit={app.handleAddTaskSubmit} className="space-y-4"><Input label="Título da tarefa" required placeholder="Ex.: Reunião de alinhamento" value={app.newTaskTitle} onChange={(e) => app.setNewTaskTitle(e.target.value)} /><div className="grid grid-cols-2 gap-4"><Input label="Horário" type="time" required value={app.newTaskTime} onChange={(e) => app.setNewTaskTime(e.target.value)} /><Input label="Categoria" placeholder="Ex.: Trabalho" value={app.newTaskSubtitle} onChange={(e) => app.setNewTaskSubtitle(e.target.value)} /></div><div className="flex justify-end gap-2 border-t border-outline-variant pt-4"><Button type="button" variant="ghost" onClick={() => app.setIsTaskModalOpen(false)}>Cancelar</Button><Button type="submit">Salvar tarefa</Button></div></form>
    </Modal>
    <Modal isOpen={app.isExpenseModalOpen} onClose={() => app.setIsExpenseModalOpen(false)} title="Lançar despesa" icon="payments" maxWidth="max-w-lg">
      <form onSubmit={addExpense} className="space-y-4"><Input label="Descrição" required placeholder="Ex.: Supermercado" value={app.expenseDesc} onChange={(e) => app.setExpenseDesc(e.target.value)} /><div className="grid gap-4 sm:grid-cols-2"><Input label="Valor (R$)" type="number" min="0" step="0.01" required value={app.expenseAmount} onChange={(e) => app.setExpenseAmount(e.target.value)} fontFamily="mono" /><Input label="Data" type="date" required value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} /></div><div className="grid gap-4 sm:grid-cols-2"><Select label="Conta ou cartão" value={expenseAccountId} onChange={setExpenseAccountId}>{fin.accounts.map((account) => <option key={account.id} value={account.id}>{account.label} · {account.bank ?? "Sem banco"}</option>)}</Select><Select label="Categoria" value={expenseCategory} onChange={setExpenseCategory}>{Object.entries(CATEGORY_LABEL).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</Select></div><p className="rounded-xl bg-primary/8 px-3 py-2 text-xs text-on-surface-variant">O valor será descontado do saldo ou somado à fatura, conforme a conta selecionada.</p><div className="flex justify-end gap-2 border-t border-outline-variant pt-4"><Button type="button" variant="ghost" onClick={() => app.setIsExpenseModalOpen(false)}>Cancelar</Button><Button type="submit">Lançar despesa</Button></div></form>
    </Modal>
    <Modal isOpen={app.isWeightModalOpen} onClose={() => app.setIsWeightModalOpen(false)} title="Registrar peso" icon="monitor_weight"><form onSubmit={app.handleAddWeightSubmit} className="space-y-5"><div className="py-3 text-center"><p className="font-mono text-4xl font-bold text-primary">{app.weightValue} <span className="text-sm">kg</span></p><input type="range" min="65" max="120" step="0.1" value={app.weightValue} onChange={(e) => app.setWeightValue(e.target.value)} className="mt-6 w-full accent-primary" /></div><div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => app.setIsWeightModalOpen(false)}>Cancelar</Button><Button type="submit">Salvar registro</Button></div></form></Modal>
    <Modal isOpen={app.isWorkoutModalOpen} onClose={() => app.setIsWorkoutModalOpen(false)} title="Treino do dia: Superior A" icon="fitness_center" maxWidth="max-w-xl">
      <div className="space-y-4"><div className="flex items-center justify-between rounded-lg border border-outline-variant bg-surface-container p-3"><div><p className="text-sm font-semibold text-on-surface">Peito e tríceps</p><p className="text-xs text-muted">{completed} de {app.exercises.length} concluídos</p></div><div className="rounded-md bg-primary/10 px-3 py-1.5 font-mono text-sm text-primary">{formatSeconds(app.workoutTimer)}</div></div><Button variant={app.isWorkoutActive ? "danger" : "secondary"} onClick={() => app.setIsWorkoutActive(!app.isWorkoutActive)} className="w-full">{app.isWorkoutActive ? "Pausar cronômetro" : "Iniciar cronômetro"}</Button><div className="max-h-72 divide-y divide-outline-variant overflow-y-auto">{app.exercises.map((exercise) => <button key={exercise.id} onClick={() => app.handleToggleExercise(exercise.id)} className="flex w-full items-center justify-between px-1 py-3 text-left hover:bg-surface-container-high"><span><span className={exercise.completed ? "block text-sm text-muted line-through" : "block text-sm text-on-surface"}>{exercise.name}</span><span className="text-xs text-muted">{exercise.sets}</span></span><Icon name={exercise.completed ? "check_circle" : "radio_button_unchecked"} className="text-[20px] text-primary" /></button>)}</div><div className="flex items-center justify-between border-t border-outline-variant pt-4"><p className="text-xs text-muted">Progresso {completed}/{app.exercises.length}</p><Button disabled={completed !== app.exercises.length} onClick={completeWorkout}>Concluir treino · +80 XP</Button></div></div>
    </Modal>
  </>
}

function Select({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) { return <label className="flex flex-col gap-1.5 text-sm font-medium text-on-surface-variant">{label}<select value={value} onChange={(e) => onChange(e.target.value)} className="rounded-lg border border-outline-variant bg-surface-container px-3 py-2.5 text-sm font-normal text-on-surface outline-none focus:border-primary">{children}</select></label> }
