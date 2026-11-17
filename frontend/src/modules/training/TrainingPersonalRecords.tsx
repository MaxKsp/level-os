import { useMemo, useState } from "react"
import { ArrowRight, Award, Dumbbell, Search } from "lucide-react"
import { SectionCard } from "../../design-system"
import type { TrainingSessionLog } from "./contracts"
import { personalRecords } from "./trainingRecords"

const kg = (value: number) => value.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) + " kg"
export function TrainingPersonalRecords({ sessions }: { sessions: TrainingSessionLog[] }) {
  const [search, setSearch] = useState("")
  const records = useMemo(() => personalRecords(sessions), [sessions])
  const visible = records.filter((record) => record.name.toLocaleLowerCase("pt-BR").includes(search.trim().toLocaleLowerCase("pt-BR"))).slice(0, 12)
  return <SectionCard title="Recordes de carga" description="Maior carga registrada por movimento de força, conforme seu histórico" icon={<Award className="size-5 text-primary" />}>
    {records.length ? <>
      <label className="mb-3 flex min-h-10 items-center gap-2 rounded-lg border border-outline-variant bg-surface px-3">
        <Search className="size-4 shrink-0 text-muted" />
        <input aria-label="Buscar recordes de exercícios" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filtrar por exercício" className="w-full min-w-0 bg-transparent text-sm text-on-surface outline-none placeholder:text-muted" />
      </label>
      <div className="grid gap-2 sm:grid-cols-2">
        {visible.map((record) => <div key={record.name} className="rounded-xl border border-outline-variant bg-surface/65 p-3">
          <div className="flex items-start gap-2"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Dumbbell className="size-4" /></span>
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-on-surface">{record.name}</p><p className="mt-1 text-[11px] text-muted">Recorde · {record.bestDate.split("-").reverse().join("/")}</p></div>
            <strong className="shrink-0 text-base tabular-nums text-primary">{kg(record.bestKg)}</strong></div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-outline-variant pt-2 text-[11px] text-muted">
            <span>Última carga: <strong className="text-on-surface">{kg(record.lastKg)}</strong></span>
            <span className="inline-flex items-center gap-1">Histórico: {record.observations} série(s) <ArrowRight className="size-3" /></span>
          </div>
        </div>)}
      </div>
      {!visible.length ? <p className="py-4 text-sm text-muted">Nenhum exercício encontrado.</p> : null}
      <p className="mt-3 text-[11px] leading-5 text-muted">A carga máxima é um dado de acompanhamento, não uma recomendação de aumento automático. Repetições, técnica e percepção de esforço também importam.</p>
    </> : <p className="text-sm text-muted">Registre cargas durante um treino de força para acompanhar seus recordes pessoais.</p>}
  </SectionCard>
}
