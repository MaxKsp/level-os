import type { ReactNode } from "react"
import { BookOpen, Camera, Dumbbell, LineChart, Play } from "lucide-react"
import { Button } from "../../components/ui/button"
import type { Workout } from "./contracts"

type Props = {
  suggested: Workout | null
  onStart: (workout: Workout) => void
  onCreate: () => void
  onScanner: () => void
  onLibrary: () => void
  onProgress: () => void
}

export function TrainingQuickStart({ suggested, onStart, onCreate, onScanner, onLibrary, onProgress }: Props) {
  return <section aria-label="Atalhos da central de treino" className="rounded-2xl border border-outline-variant bg-surface-container-low p-3 sm:p-4">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[.16em] text-primary">Comece por aqui</p>
        <h2 className="mt-1 text-lg font-semibold text-on-surface">O que você quer fazer agora?</h2>
        <p className="mt-1 text-xs leading-5 text-muted">Acesse as ações principais sem precisar procurar dentro do módulo.</p>
      </div>
      {suggested ? <Button variant="primary" size="md" onClick={() => onStart(suggested)}>
        <Play className="size-4" /> Iniciar {suggested.name}
      </Button> : <Button variant="primary" size="md" onClick={onCreate}>
        <Dumbbell className="size-4" /> Criar primeiro treino
      </Button>}
    </div>    <div className="mt-4 grid gap-2 sm:grid-cols-3">
      <QuickAction icon={<Camera className="size-4" />} title="Reconhecer aparelho"
        description="Tire uma foto e veja o exercício e o vídeo compatível." onClick={onScanner} />
      <QuickAction icon={<BookOpen className="size-4" />} title="Explorar exercícios"
        description="Pesquise por músculo, equipamento ou vídeos nativos." onClick={onLibrary} />
      <QuickAction icon={<LineChart className="size-4" />} title="Ver evolução"
        description="Acompanhe medidas, histórico e evolução corporal." onClick={onProgress} />
    </div>
  </section>
}

function QuickAction({ icon, title, description, onClick }: {
  icon: ReactNode
  title: string
  description: string
  onClick: () => void
}) {
  return <button type="button" onClick={onClick}
    className="level-control group flex min-h-24 items-start gap-3 rounded-xl border border-outline-variant bg-surface/65 p-3 text-left transition-colors hover:border-primary/35 hover:bg-surface-container">
    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">{icon}</span>
    <span className="min-w-0">
      <span className="block text-sm font-semibold text-on-surface group-hover:text-primary">{title}</span>
      <span className="mt-1 block text-[11px] leading-5 text-muted">{description}</span>
    </span>
  </button>
}
