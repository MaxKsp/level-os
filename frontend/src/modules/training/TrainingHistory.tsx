import { useMemo, useState } from "react"
import { Activity, ChevronDown, Clock3, Dumbbell, Search, Trash2 } from "lucide-react"
import { Button } from "../../components/ui/button"
import { ConfirmIconAction } from "../../components/ui/IconAction"
import { EmptyState, SectionCard } from "../../design-system"
import type { TrainingModality, TrainingSessionLog } from "./contracts"
import { sessionVolume } from "./trainingAnalytics"

interface Props {
  sessions: TrainingSessionLog[]
  onQuickLog: () => void
  onDelete: (id: string) => Promise<void>
}
const modalityLabels: Record<TrainingModality, string> = {
  forca: "Força", cardio: "Cardio", calistenia: "Calistenia", mobilidade: "Mobilidade",
}
const amount = (value: number) => value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })
const dateLabel = (date: string) => new Date(date + "T12:00:00Z").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" })

export function TrainingHistory({ sessions, onQuickLog, onDelete }: Props) {
  const [query, setQuery] = useState("")
  const [modality, setModality] = useState<TrainingModality | "all">("all")
  const [showAll, setShowAll] = useState(false)
  const filtered = useMemo(() => sessions
    .filter((session) => modality === "all" || session.modality === modality)
    .filter((session) => !query.trim() || [session.name, ...session.exercises.map((e) => e.name)].join(" ").toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR").trim()))
    .sort((a, b) => b.date.localeCompare(a.date)), [sessions, modality, query])
  const visible = showAll ? filtered : filtered.slice(0, 12)
  return (
    <SectionCard title="Histórico de sessões" description="Exercícios realmente realizados, não apenas o resumo da ficha" bodyClassName="p-0">
      <div className="flex flex-col gap-3 border-b border-outline-variant p-4 sm:flex-row">
        <label className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-lg border border-outline-variant bg-surface px-3 text-muted focus-within:border-primary">
          <Search className="size-4 shrink-0" />
          <input value={query} onChange={(e) => { setQuery(e.target.value); setShowAll(false) }} placeholder="Buscar sessão ou exercício" aria-label="Buscar sessões" className="w-full min-w-0 bg-transparent text-sm text-on-surface outline-none placeholder:text-muted" />
        </label>
        <select value={modality} onChange={(e) => { setModality(e.target.value as typeof modality); setShowAll(false) }} aria-label="Filtrar modalidade" className="min-h-11 rounded-lg border border-outline-variant bg-surface px-3 text-sm text-on-surface outline-none focus:border-primary">
          <option value="all">Todas as modalidades</option>
          {Object.entries(modalityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>
      {filtered.length === 0 ? <EmptyState title={sessions.length ? "Nenhum registro encontrado" : "Seu histórico começa no primeiro treino"} description={sessions.length ? "Ajuste a busca ou o filtro para encontrar outra sessão." : "Inicie uma ficha e registre tudo de uma vez, ou utilize a sessão livre."} icon="history" action={<Button variant="primary" size="sm" onClick={onQuickLog}>Registrar sessão livre</Button>} /> : (
        <div className="divide-y divide-outline-variant">
          {visible.map((session) => (
            <details key={session.id} className="group open:bg-surface-container/35">
              <summary className="flex min-h-20 cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-surface-container/40 [&::-webkit-details-marker]:hidden sm:px-5">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary"><Dumbbell className="size-4" /></span>
                  <span className="min-w-0"><strong className="block truncate text-sm text-on-surface">{session.name}</strong>
                    <small className="mt-1 block text-[11px] text-muted">{dateLabel(session.date)} · {modalityLabels[session.modality]} · {session.exercises.length} exercício(s)</small></span>
                </div>
                <span className="inline-flex shrink-0 items-center gap-2 text-xs text-muted">{session.durationSec ? `${Math.round(session.durationSec / 60)} min` : "Sem duração"} <ChevronDown className="size-4 transition-transform group-open:rotate-180" /></span>
              </summary>
              <div className="space-y-2 border-t border-outline-variant px-4 py-4 sm:px-5">
                <div className="flex flex-wrap items-center gap-3 pb-2 text-[11px] text-muted">
                  <span className="inline-flex items-center gap-1"><Activity className="size-3.5 text-primary" />{sessionVolume(session) ? `${amount(sessionVolume(session))} kg de volume` : "Volume de força não informado"}</span>
                  {session.durationSec ? <span className="inline-flex items-center gap-1"><Clock3 className="size-3.5 text-primary" />{amount(session.durationSec / 60)} min</span> : null}
                </div>
                <div className="divide-y divide-outline-variant rounded-xl border border-outline-variant bg-surface/70">
                  {session.exercises.map((exercise, i) => (
                    <div key={exercise.id ?? `${session.id}-${i}`} className="flex flex-wrap items-start justify-between gap-2 px-3 py-3 text-sm">
                      <div className="min-w-0"><p className="font-semibold text-on-surface">{exercise.name}</p><p className="mt-1 text-[11px] text-muted">{modalityLabels[exercise.modality]}{exercise.sets === 1 ? " · série " + session.exercises.slice(0, i + 1).filter((e) => e.name === exercise.name).length : ""}</p></div>
                      <div className="max-w-full text-right text-xs tabular-nums text-on-surface-variant">
                        {exercise.sets != null && exercise.reps != null ? <p>{exercise.sets} × {exercise.reps} {exercise.loadKg != null ? `· ${amount(exercise.loadKg)} kg` : ""}</p> : null}
                        {exercise.distanceKm != null ? <p>{amount(exercise.distanceKm)} km</p> : null}
                        {exercise.durationSec != null ? <p>{amount(exercise.durationSec / 60)} min</p> : null}
                        {exercise.restSec != null ? <p className="text-muted">Descanso: {exercise.restSec} s</p> : null}
                        {exercise.rpe != null ? <p>RPE: {amount(exercise.rpe)}</p> : null}
                        {exercise.rir != null ? <p>RIR: {exercise.rir}</p> : null}
                        {exercise.progressionLevel ? <p className="text-muted">{exercise.progressionLevel}</p> : null}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end">
                  <ConfirmIconAction label={`Excluir sessão ${session.name}`} title="Excluir esta sessão?" description="Este registro será excluído; essa ação não pode ser desfeita." onConfirm={()=>void onDelete(session.id)}>
                    <Trash2 className="size-4" />
                  </ConfirmIconAction>
                </div>
              </div>
            </details>
          ))}
        </div>
      )}
      {!showAll && filtered.length > 12 ? <div className="flex justify-center border-t border-outline-variant p-4"><Button variant="secondary" size="sm" onClick={() => setShowAll(true)}>Mostrar mais {filtered.length - 12} sessões</Button></div> : null}
    </SectionCard>
  )
}
