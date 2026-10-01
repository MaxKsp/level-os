import { useMemo, useState } from "react"
import { BookOpen, Dumbbell, History, LineChart, Pencil, Play, Plus, RotateCcw, Ruler, Trash2 } from "lucide-react"
import { AssistantAvatar } from "../assistant/AssistantAvatar"
import { useAssistant } from "../assistant/store"
import { useProfileData } from "../profile/storage"
import { Button } from "../../components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { AnimatedNumber } from "../../components/ui/AnimatedNumber"
import { ConfirmIconAction, IconAction } from "../../components/ui/IconAction"
import { EmptyState, SectionCard, Sparkline } from "../../design-system"
import type { MeasurementType, Workout } from "./contracts"
import { ageFromBirthDate, computeBodyIndices, measurementSeries } from "./bodyIndices"
import { useTraining } from "./store"
import { WorkoutFormModal } from "./WorkoutFormModal"
import { MeasurementModal, SessionModal } from "./TrainingQuickLogModals"
import { TrainingInsights } from "./TrainingInsights"
import { TrainingHistory } from "./TrainingHistory"
import { TrainingLiveModal } from "./TrainingLiveModal"
import { TrainingPersonalRecords } from "./TrainingPersonalRecords"
import { ExerciseLibraryPicker } from "./ExerciseLibraryPicker"
import { TrainingMachineScanner } from "./TrainingMachineScanner"
import { TrainingQuickStart } from "./TrainingQuickStart"
import { nextWorkout } from "./nextWorkout"

type Tab = "workouts" | "library" | "sessions" | "measurements"

const labels: Record<MeasurementType, string> = {
  peso: "Peso", gordura: "Gordura", altura: "Altura", cintura: "Cintura",
  quadril: "Quadril", braco: "Braço", coxa: "Coxa", peito: "Peito", panturrilha: "Panturrilha",
}

export function TrainingScreen() {
  const training = useTraining()
  const assistant = useAssistant()
  const [tab, setTab] = useState<Tab>("workouts")
  const [workoutModal, setWorkoutModal] = useState<{ open: boolean; edit: Workout | null }>({ open: false, edit: null })
  const [measurementOpen, setMeasurementOpen] = useState(false)
  const [sessionOpen, setSessionOpen] = useState(false)
  const [metric, setMetric] = useState<MeasurementType>("peso")
  const [activeWorkout, setActiveWorkout] = useState<Workout | null>(null)

  const availableMetrics = useMemo(
    () => (Object.keys(labels) as MeasurementType[]).filter((type) => training.measurements.some((item) => item.type === type)),
    [training.measurements],
  )
  const activeMetric = availableMetrics.includes(metric) ? metric : (availableMetrics[0] ?? "peso")
  const series = useMemo(() => measurementSeries(training.measurements, activeMetric), [training.measurements, activeMetric])
  const metricUnit = useMemo(
    () => training.measurements.find((item) => item.type === activeMetric)?.unit ?? "",
    [training.measurements, activeMetric],
  )
  const profileData = useProfileData()
  const indices = useMemo(
    () => computeBodyIndices(training.measurements, { age: ageFromBirthDate(profileData.birthDate), sex: profileData.sex }),
    [training.measurements, profileData.birthDate, profileData.sex],
  )
  const suggestedWorkout = useMemo(
    () => nextWorkout(training.workouts, training.programs, training.sessions),
    [training.workouts, training.programs, training.sessions],
  )
  const openArea = (next: Tab, anchor?: string) => {
    setTab(next)
    if (anchor) window.requestAnimationFrame(() => document.getElementById(anchor)?.scrollIntoView({ block: "start" }))
  }

  return <main className="level-page mx-auto flex max-w-[1180px] flex-col gap-6 px-4 pb-24 pt-24 sm:px-6">
    <header className="level-page-header flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[.18em] text-primary">Academia / Treinos</p>
        <h1 className="level-page-title mt-1 text-3xl font-semibold tracking-tight text-on-surface">Central de treino</h1>
        <p className="mt-2 max-w-2xl text-on-surface-variant">
          Treine, consulte execuções, reconheça aparelhos e acompanhe sua evolução sem sair do mesmo fluxo.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="md" onClick={() => assistant.openFor("treinos")}>
          <AssistantAvatar module="treinos" className="size-4" />Personal Léo
        </Button>
        <Button variant="primary" size="md" onClick={() => setWorkoutModal({ open: true, edit: null })}>
          <Plus className="size-4" />Novo treino
        </Button>
      </div>
    </header>
    {training.error ? <div role="alert" className="rounded-lg border border-error/35 bg-error/5 px-4 py-3 text-sm text-error">
      {training.error} <button className="ml-2 underline" onClick={() => void training.refresh()}>Tentar novamente</button>
    </div> : null}

    <TrainingQuickStart
      suggested={suggestedWorkout}
      onStart={setActiveWorkout}
      onCreate={() => setWorkoutModal({ open: true, edit: null })}
      onScanner={() => openArea("library", "training-scanner")}
      onLibrary={() => openArea("library", "training-library")}
      onProgress={() => openArea("measurements", "training-measurements")}
    />

    <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)} className="w-full">
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <TabsList variant="line" aria-label="Áreas da central de treino" className="min-w-max">
          <TabsTrigger value="workouts"><Dumbbell className="size-4" />Meus treinos</TabsTrigger>
          <TabsTrigger value="library"><BookOpen className="size-4" />Exercícios e aparelhos</TabsTrigger>
          <TabsTrigger value="sessions"><History className="size-4" />Histórico</TabsTrigger>
          <TabsTrigger value="measurements"><LineChart className="size-4" />Evolução</TabsTrigger>
        </TabsList>
      </div>
    </Tabs>

    {tab === "workouts" ? <div className="space-y-5">
      <TrainingInsights
        sessions={training.sessions}
        workouts={training.workouts}
        programs={training.programs}
        onStart={setActiveWorkout}
        onCreate={() => setWorkoutModal({ open: true, edit: null })}
        onQuickLog={() => setSessionOpen(true)}
      />
      {training.programs.length > 0 ? <SectionCard
        title={training.programs.length === 1 ? "Programa ativo" : "Programas ativos"}
        description={`${training.programs.length} programa(s) em uso`}
        bodyClassName="p-0"
      >
        <div className="divide-y divide-outline-variant">
          {training.programs.map((program) => <div key={program.id} className="px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-on-surface">{program.name}</p>
                <p className="mt-1 text-xs text-muted">
                  Versão {program.version} · {program.focus} · {program.daysPerWeek}x/semana · {program.location}
                </p>
              </div>
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">Ativo</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {program.workouts.map((workout) => <span key={workout.id}
                className="rounded-lg border border-outline-variant px-2.5 py-1.5 text-xs text-on-surface-variant">
                {workout.name}
              </span>)}
            </div>
          </div>)}
        </div>
      </SectionCard> : null}

      <SectionCard title="Meus treinos" description={`${training.workouts.length} fichas`}
        action={<Button variant="ghost" size="sm" onClick={() => setWorkoutModal({ open: true, edit: null })}>
          <Plus className="size-4" />Novo treino
        </Button>} bodyClassName="p-0">
        {training.workouts.length === 0 ? <EmptyState
          title="Nenhum treino montado"
          description="Crie sua primeira ficha com metas de séries, repetições, carga e descanso."
          icon="fitness_center"
          action={<Button variant="primary" size="sm" onClick={() => setWorkoutModal({ open: true, edit: null })}>Criar treino</Button>}
        /> : <ul className="divide-y divide-outline-variant">
          {training.workouts.map((workout) => <li key={workout.id} className="px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-on-surface">{workout.name}</h2>
                <p className="mt-0.5 text-xs text-muted">{workout.focus || "Foco livre"} · {workout.exercises.length} exercícios</p>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <Button variant="secondary" size="sm" onClick={() => setActiveWorkout(workout)}>
                  <Play className="size-3.5" />Iniciar
                </Button>
                <IconAction label="Editar treino" onClick={() => setWorkoutModal({ open: true, edit: workout })}>
                  <Pencil className="size-4" />
                </IconAction>
                <ConfirmIconAction label="Excluir treino" title={`Excluir “${workout.name}”?`}
                  description="A ficha será removida. Sessões já registradas permanecem no histórico."
                  onConfirm={() => training.removeWorkout(workout.id)}>
                  <Trash2 className="size-4" />
                </ConfirmIconAction>
              </div>
            </div>
            <div className="mt-3 grid gap-1 sm:grid-cols-2">
              {workout.exercises.slice(0, 6).map((exercise) => <div key={exercise.id} className="flex justify-between gap-3 text-sm">
                <span className="truncate text-on-surface-variant">{exercise.name}</span>
                <span className="numeric-value shrink-0 text-xs text-muted">
                  {exercise.sets ?? "—"} × {exercise.reps ?? "—"}{exercise.loadKg ? ` · ${exercise.loadKg} kg` : ""}
                </span>
              </div>)}
            </div>
          </li>)}
        </ul>}
      </SectionCard>

      {training.programHistory.length > 0 ? <SectionCard title="Histórico de programas"
        description={`${training.programHistory.length} versão(ões)`} bodyClassName="p-0">
        <ul className="divide-y divide-outline-variant">
          {training.programHistory.map((program) => <li key={program.id}
            className="flex flex-col justify-between gap-3 px-5 py-4 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3">
              <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary"><History className="size-4" /></span>
              <div>
                <p className="font-semibold text-on-surface">Versão {program.version} · {program.name}</p>
                <p className="mt-1 text-xs text-muted">{program.daysPerWeek}x/semana · {program.workouts.length} ficha(s) · {program.location}</p>
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={() => void training.restoreProgram(program.id)}>
              <RotateCcw className="size-4" />Restaurar
            </Button>
          </li>)}
        </ul>
      </SectionCard> : null}
    </div> : null}

    {tab === "library" ? <div className="space-y-5">
      <div id="training-scanner" className="scroll-mt-24"><TrainingMachineScanner /></div>
      <div id="training-library" className="scroll-mt-24">
        <ExerciseLibraryPicker title="Biblioteca e videoteca de exercícios"
          description="Filtre exercícios com vídeo nativo, veja a execução dentro do Level OS e use a referência antes ou durante o treino." />
      </div>
    </div> : null}

    {tab === "sessions" ? <div className="space-y-5">
      <TrainingPersonalRecords sessions={training.sessions} />
      <TrainingHistory sessions={training.sessions} onQuickLog={() => setSessionOpen(true)} onDelete={training.removeSession} />
    </div> : null}

    {tab === "measurements" ? <div id="training-measurements" className="scroll-mt-24 space-y-4">
      <SectionCard title="Índices corporais" description="Calculados das suas últimas medidas"
        action={<Button variant="secondary" size="sm" onClick={() => setMeasurementOpen(true)}>
          <Ruler className="size-4" />Registrar medida
        </Button>} bodyClassName="p-0">
        {indices.bmi || indices.whr || indices.weightDelta || indices.composition || indices.waterTarget || indices.bmr ? <>
          <div className="grid divide-y divide-outline-variant sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <MetricBlock label="IMC"
              value={indices.bmi ? indices.bmi.value.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) : null}
              detail={indices.bmi?.label ?? "Registre peso e altura"} />
            <MetricBlock label="Cintura ÷ quadril"
              value={indices.whr ? indices.whr.value.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) : null}
              detail={indices.whr?.label ?? "Registre cintura e quadril"} />
            <MetricBlock label="Variação de peso"
              value={indices.weightDelta ? `${indices.weightDelta.value > 0 ? "+" : ""}${indices.weightDelta.value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg` : null}
              detail={indices.weightDelta ? `desde ${new Date(`${indices.weightDelta.sinceDate}T12:00:00`).toLocaleDateString("pt-BR")}` : "Registre 2+ pesos"} />
          </div>
          {indices.composition || indices.waterTarget || indices.bmr ? <div className="grid divide-y divide-outline-variant border-t border-outline-variant sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <MetricBlock label={`Massa magra${indices.composition?.estimated ? " · estimada" : ""}`}
              value={indices.composition ? `${indices.composition.leanMass.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg` : null}
              detail={indices.composition ? "músculo, osso e água" : "Registre % de gordura, ou preencha sexo e nascimento no perfil"} />
            <MetricBlock label={`Massa gorda${indices.composition?.estimated ? " · estimada" : ""}`}
              value={indices.composition ? `${indices.composition.fatMass.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg` : null}
              detail={indices.composition ? `${indices.composition.fatPct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% do peso${indices.composition.estimated ? " (fórmula)" : ""}` : "Registre % de gordura"} />
            <MetricBlock label="Taxa metabólica basal"
              value={indices.bmr ? `${indices.bmr.value.toLocaleString("pt-BR")} kcal` : null}
              detail={indices.bmr ? "gasto em repouso por dia" : "Preencha sexo e nascimento no perfil"} />
          </div> : null}
          {indices.waterTarget ? <div className="grid border-t border-outline-variant sm:grid-cols-3">
            <MetricBlock label="Referência de hidratação"
              value={`${indices.waterTarget.liters.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} L/dia`}
              detail={`Estimativa geral de 35 ml × ${indices.waterTarget.basedOnKg.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg`} />
          </div> : null}
        </> : <p className="px-5 py-4 text-sm text-muted">
          Registre peso, altura, cintura e quadril para calcular IMC e relação cintura-quadril.
        </p>}
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
        <SectionCard title="Evolução corporal"
          description={series.values.length ? `${labels[activeMetric]} · ${series.values.length} registros` : "Sem dados"}>
          {availableMetrics.length > 1 ? <div className="mb-4 flex flex-wrap gap-1.5" aria-label="Medida exibida no gráfico">
            {availableMetrics.map((type) => <button key={type} type="button" aria-pressed={activeMetric === type}
              onClick={() => setMetric(type)}
              className={`min-h-11 rounded-full border px-3 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-primary ${activeMetric === type ? "border-primary bg-primary/10 text-primary" : "border-outline-variant text-muted hover:text-on-surface"}`}>
              {labels[type]}
            </button>)}
          </div> : null}
          {series.values.length ? <>
            <div className="mb-3 flex items-baseline gap-2">
              <AnimatedNumber value={series.values.at(-1) ?? 0} animationKey={`training-latest-${activeMetric}`}
                formatValue={(value) => `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ${metricUnit}`}
                className="text-3xl font-semibold" />
              <span className="text-xs text-muted">último registro</span>
            </div>
            <Sparkline values={series.values} labels={series.labels}
              valueFormatter={(value) => `${value.toLocaleString("pt-BR")} ${metricUnit}`} height={150} />
          </> : <EmptyState title="Registre sua primeira medida" description="A série temporal aparecerá aqui."
            icon="monitor_weight" action={<Button variant="primary" size="sm" onClick={() => setMeasurementOpen(true)}>Registrar</Button>} />}
        </SectionCard>

        <SectionCard title="Últimas medidas" description="Mais recentes" bodyClassName="p-0">
          <ul className="divide-y divide-outline-variant">
            {training.measurements.slice(0, 9).map((item) => <li key={item.id}
              className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="text-sm text-on-surface">{labels[item.type]}</p>
                <p className="text-xs text-muted">{new Date(`${item.date}T12:00:00`).toLocaleDateString("pt-BR")}</p>
              </div>
              <span className="numeric-value text-sm">{item.value.toLocaleString("pt-BR")} {item.unit}</span>
            </li>)}
          </ul>
        </SectionCard>
      </div>
    </div> : null}

    <TrainingLiveModal workout={activeWorkout} history={training.sessions}
      effortMetricsAvailable={training.capabilities?.effortMetrics ?? false}
      onClose={() => setActiveWorkout(null)} onSave={training.addSession} />
    <WorkoutFormModal open={workoutModal.open} initial={workoutModal.edit}
      onClose={() => setWorkoutModal({ open: false, edit: null })}
      onSave={(value) => workoutModal.edit ? training.updateWorkout(value) : training.addWorkout(value)} />
    <MeasurementModal open={measurementOpen} onClose={() => setMeasurementOpen(false)} onSave={training.addMeasurement} />
    <SessionModal open={sessionOpen} workouts={training.workouts} onClose={() => setSessionOpen(false)} onSave={training.addSession} />
  </main>
}

function MetricBlock({ label, value, detail }: { label: string; value: string | null; detail: string }) {
  return <div className="px-5 py-4">
    <p className="text-xs text-muted">{label}</p>
    {value ? <p className="numeric-value mt-1 text-2xl font-semibold text-on-surface">{value}</p> : null}
    <p className={value ? "mt-0.5 text-xs text-on-surface-variant" : "mt-1 text-sm text-muted"}>{detail}</p>
  </div>
}
