import { Link } from "react-router-dom"
import { useProgress } from "../store"

export function LevelChip() {
  const { progress, status } = useProgress()
  return (
    <Link
      to="/perfil#progress"
      className="flex min-h-10 w-full items-center gap-2 rounded-md border border-primary/25 bg-primary/[0.06] px-3 py-2 text-primary transition-colors hover:border-primary/50 hover:bg-primary/10"
      aria-label={`Nível ${progress.level}, ${progress.title}`}
    >
      <span className="text-xs font-medium">Nível</span>
      <span className="font-mono text-xs font-semibold tabular-nums">{String(progress.level).padStart(2, "0")}</span>
      {status === "syncing" ? <span className="size-1.5 animate-pulse rounded-full bg-primary" aria-label="Sincronizando" /> : null}
    </Link>
  )
}
