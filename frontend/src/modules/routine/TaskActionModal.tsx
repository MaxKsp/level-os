import { useState } from "react"
import { Button } from "../../components/ui/Button"
import { Modal } from "../../components/ui/Modal"
import type { Task } from "../../context/AppContext"
import { useApp } from "../../context/AppContext"
import { Icon } from "../../design-system"
import {
  deleteFutureTaskOccurrences,
  deleteTaskSeries,
  setTaskSchedulePaused,
  skipTaskOccurrence,
  snoozeTaskOccurrence,
} from "./actions"
import { taskRepeatLabel } from "./selectors"
import { TaskSchedulerForm } from "./TaskSchedulerForm"

interface TaskActionModalProps {
  task: Task | null
  occurrenceDate: string
  onClose: () => void
}

type Confirmation = "future" | "series" | null

export function TaskActionModal({ task, occurrenceDate, onClose }: TaskActionModalProps) {
  const { setTasks } = useApp()
  const [editing, setEditing] = useState(false)
  const [confirmation, setConfirmation] = useState<Confirmation>(null)
  const recurring = Boolean(task?.repeat && task.repeat !== "none")

  if (!task) return null

  const applyAndClose = (update: (tasks: Task[]) => Task[]) => {
    setTasks(update)
    onClose()
  }

  if (editing) {
    return (
      <Modal
        isOpen
        onClose={onClose}
        title="Editar agendamento"
        description="As alterações serão aplicadas à série preservando o histórico."
        icon="edit"
        maxWidth="max-w-xl"
      >
        <TaskSchedulerForm task={task} onClose={onClose} />
      </Modal>
    )
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={task.title}
      description={`${occurrenceDate.split("-").reverse().join("/")} às ${task.time}`}
      icon="alarm"
      maxWidth="max-w-lg"
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2 border-y border-outline-variant py-3 text-xs text-muted">
          <span className="rounded-md bg-surface-container-high px-2 py-1">{task.subtitle || "Geral"}</span>
          {recurring ? <span className="rounded-md bg-primary/10 px-2 py-1 text-primary">{taskRepeatLabel(task)}</span> : null}
          {(task.reminderMinutes ?? [0]).map((minutes) => (
            <span key={minutes} className="rounded-md border border-outline-variant px-2 py-1">
              {minutes === 0 ? "Na hora" : `${minutes} min antes`}
            </span>
          ))}
        </div>

        {confirmation ? (
          <div role="alert" className="space-y-4 rounded-xl border border-error/30 bg-error/[0.06] p-4">
            <div>
              <p className="font-medium text-on-surface">
                {confirmation === "series" ? "Excluir toda a série?" : "Excluir esta e as próximas ocorrências?"}
              </p>
              <p className="mt-1 text-xs leading-5 text-muted">
                {confirmation === "series"
                  ? "O agendamento e seus adiamentos vinculados serão removidos. Essa ação não pode ser desfeita."
                  : "O histórico anterior será preservado e nenhuma nova ocorrência será criada a partir desta data."}
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirmation(null)}>Voltar</Button>
              <Button
                variant="danger"
                onClick={() => applyAndClose((tasks) => confirmation === "series"
                  ? deleteTaskSeries(tasks, task.id)
                  : deleteFutureTaskOccurrences(tasks, task.id, occurrenceDate))}
              >
                Confirmar exclusão
              </Button>
            </div>
          </div>
        ) : (
          <>
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Adiar ocorrência</h3>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <ActionButton label="10 min" icon="hourglass_top" onClick={() => applyAndClose((tasks) => snoozeTaskOccurrence(tasks, task.id, occurrenceDate, 10))} />
                <ActionButton label="1 hora" icon="hourglass_top" onClick={() => applyAndClose((tasks) => snoozeTaskOccurrence(tasks, task.id, occurrenceDate, 60))} />
                <ActionButton label="Amanhã" icon="calendar_month" onClick={() => applyAndClose((tasks) => snoozeTaskOccurrence(tasks, task.id, occurrenceDate, "tomorrow"))} />
              </div>
            </section>

            <section className="divide-y divide-outline-variant border-y border-outline-variant">
              <RowAction icon="event_available" label={recurring ? "Pular somente esta ocorrência" : "Excluir esta tarefa"} onClick={() => applyAndClose((tasks) => skipTaskOccurrence(tasks, task.id, occurrenceDate))} />
              {recurring ? (
                <>
                  <RowAction icon={task.paused ? "play_arrow" : "pause"} label={task.paused ? "Retomar agendamento" : "Pausar agendamento"} onClick={() => applyAndClose((tasks) => setTaskSchedulePaused(tasks, task.id, !task.paused))} />
                  <RowAction icon="edit" label="Editar toda a série" onClick={() => setEditing(true)} />
                  <RowAction icon="delete" label="Excluir esta e as próximas" danger onClick={() => setConfirmation("future")} />
                </>
              ) : null}
              <RowAction icon="delete" label={recurring ? "Excluir toda a série" : "Excluir tarefa"} danger onClick={() => setConfirmation("series")} />
            </section>
          </>
        )}
      </div>
    </Modal>
  )
}

function ActionButton({ label, icon, onClick }: { label: string; icon: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="level-control flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg border border-outline-variant bg-surface-container px-2 text-xs font-medium text-on-surface transition-colors hover:border-primary/50 hover:bg-primary/[0.06] motion-reduce:transition-none">
      <Icon name={icon} className="text-[18px] text-primary" />
      {label}
    </button>
  )
}

function RowAction({ icon, label, danger = false, onClick }: { icon: string; label: string; danger?: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`level-row-action flex min-h-12 w-full items-center gap-3 px-1 text-left text-sm transition-colors hover:bg-surface-container motion-reduce:transition-none ${danger ? "text-error" : "text-on-surface"}`}>
      <Icon name={icon} className="text-[18px]" />
      <span>{label}</span>
      <Icon name="chevron_right" className="ml-auto text-[16px] text-muted" />
    </button>
  )
}
