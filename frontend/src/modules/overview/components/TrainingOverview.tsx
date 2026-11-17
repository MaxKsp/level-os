import { Link } from "react-router-dom"
import { AnimatedNumber } from "../../../components/ui/AnimatedNumber"
import { Icon, SectionCard, Sparkline } from "../../../design-system"
import { formatWeight } from "../../../lib/format"
import type { WeightRecord, WorkoutSession } from "../../training/contracts"
import { trainingSummary } from "../../training/selectors"

interface TrainingOverviewProps {
  workout: WorkoutSession
  weights: WeightRecord[]
  onOpenWorkout?: () => void
}

export function TrainingOverview({ workout, weights, onOpenWorkout }: TrainingOverviewProps) {
  const summary = trainingSummary(workout, weights)
  const weightValues = weights.map((w) => w.weight)

  return (
    <SectionCard
      title="Treino de hoje"
      description={summary.focus}
      bodyClassName="p-0"
      action={
        onOpenWorkout ? <button type="button" onClick={onOpenWorkout} className="rounded text-sm font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-primary">Iniciar treino</button> : <Link to="/treinos" className="rounded text-sm font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-primary">Abrir treino</Link>
      }
    >
      <div className="px-5 py-5 sm:px-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted">
              Sessão
            </p>
            <h3 className="mt-1 font-semibold text-on-surface">
              {summary.title}
            </h3>
          </div>
          <p className="font-mono text-sm text-on-surface-variant">
            <AnimatedNumber value={summary.completed} animationKey="overview-training-completed" formatValue={(value) => Math.round(value).toLocaleString("pt-BR")} />/<AnimatedNumber value={summary.total} animationKey="overview-training-total" formatValue={(value) => Math.round(value).toLocaleString("pt-BR")} />
          </p>
        </div>

        <div
          className="mt-4 h-2 overflow-hidden rounded-full bg-surface-container-highest"
          role="progressbar"
          aria-label="Progresso do treino"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={summary.progress}
        >
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${summary.progress}%` }}
          />
        </div>

        <ul className="mt-4 space-y-1.5">
          {workout.exercises.length === 0 ? <li className="text-sm text-on-surface-variant">Nenhum exercício na sessão de hoje.</li> : null}
          {workout.exercises.slice(0, 3).map((ex) => (
            <li key={ex.id} className="flex items-center gap-2.5 text-sm">
              <Icon
                name={ex.completed ? "check_circle" : "radio_button_unchecked"}
                filled={ex.completed}
                className={
                  ex.completed
                    ? "text-[18px] text-tertiary"
                    : "text-[18px] text-muted"
                }
              />
              <span
                className={
                  ex.completed
                    ? "flex-1 text-muted line-through"
                    : "flex-1 text-on-surface"
                }
              >
                {ex.name}
              </span>
              <span className="font-mono text-xs text-muted">{ex.sets}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-auto border-t border-outline-variant px-5 py-4 sm:px-6">
        <div className="flex items-end justify-between">
          {weights.length === 0 ? (
            <div>
              <p className="text-sm text-on-surface-variant">Peso atual</p>
              <p className="mt-1 text-sm text-muted">Nenhuma pesagem registrada. Registre o peso em Treinos para acompanhar a evolução.</p>
            </div>
          ) : <>
          <div>
            <p className="text-sm text-on-surface-variant">Peso atual</p>
            <p className="mt-1 font-mono text-2xl font-medium text-on-surface">
              <AnimatedNumber value={summary.currentWeight} animationKey="overview-training-weight" formatValue={formatWeight} />
            </p>
            {weights.length > 1 ? <p className="mt-1 text-xs font-medium text-primary">
              {summary.weightDelta === 0
                ? "Estável desde o primeiro registro"
                : <><AnimatedNumber value={Math.abs(summary.weightDelta)} animationKey="overview-training-weight-delta" formatValue={(value) => `${summary.weightDelta > 0 ? "+" : "−"}${value.toFixed(1).replace(".", ",")} kg`} /> desde o primeiro registro</>}
            </p> : null}
          </div>
          <Sparkline
            values={weightValues}
            tone="primary"
            height={48}
            className="w-32"
            ariaLabel="Tendência de peso"
            valueFormatter={(value) => `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg`}
          />
          </>}
        </div>
      </div>
    </SectionCard>
  )
}
