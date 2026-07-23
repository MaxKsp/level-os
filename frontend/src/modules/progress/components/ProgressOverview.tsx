import { useState } from "react"
import { Button } from "../../../components/ui/Button"
import { AnimatedNumber } from "../../../components/ui/AnimatedNumber"
import { Icon } from "../../../design-system"
import { AchievementsModal } from "./AchievementsModal"
import { XpBar } from "./XpBar"
import { useProgress } from "../store"

export function ProgressOverview({ pendingTasks, workoutReady }: { pendingTasks: number; workoutReady: boolean }) {
  const { progress, lastDelta, status } = useProgress()
  const [achievementsOpen, setAchievementsOpen] = useState(false)
  const unlocked = progress.achievements.filter((achievement) => achievement.unlocked)
  const tracks = ([
    ["rotina", "Rotina", "text-primary", "bg-primary"],
    ["financeiro", "Finanças", "text-primary", "bg-primary"],
    ["treino", "Treinos", "text-primary", "bg-primary"],
  ] as const).map(([category, label, textTone, barTone]) => {
    const achievements = progress.achievements.filter((achievement) => achievement.category === category)
    return { category, label, textTone, barTone, unlocked: achievements.filter((achievement) => achievement.unlocked).length, total: achievements.length }
  })
  return (
    <section id="progress" className="border-t border-outline-variant pt-6" aria-labelledby="progress-title">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,.95fr)]">
        <div>
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-medium text-primary">Sistema de progressão</p>
            <span className="text-xs text-muted">{status === "loading" ? "Carregando…" : <><AnimatedNumber value={progress.streak} animationKey="overview-progress-streak" formatValue={(value) => Math.round(value).toLocaleString("pt-BR")} /> dias em sequência</>}</span>
          </div>
          <div className="mt-5 flex items-end justify-between gap-4">
            <div>
              <p className="font-mono text-[clamp(2.8rem,7vw,5.4rem)] font-medium leading-none tracking-[-0.07em] text-on-surface">
                <AnimatedNumber value={progress.level} animationKey="overview-progress-level" formatValue={(value) => String(Math.round(value)).padStart(2, "0")} />
              </p>
              <h2 id="progress-title" className="mt-3 text-xl font-medium text-on-surface">Nível {progress.level} · {progress.title}</h2>
            </div>
            {lastDelta ? <span className="mb-1 rounded-md border border-primary/25 px-2 py-1 font-mono text-xs text-primary">+{lastDelta} XP</span> : null}
          </div>
          <XpBar value={progress.progress_pct} animationKey="overview-progress-percent" className="mt-6" label={`${progress.xp_into_level.toLocaleString("pt-BR")} XP neste nível`} />
          <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-muted">
            <span><AnimatedNumber value={progress.xp} animationKey="overview-progress-xp" formatValue={(value) => `${Math.round(value).toLocaleString("pt-BR")} XP total`} /></span>
            <span>Faltam <strong className="font-medium text-on-surface"><AnimatedNumber value={progress.xp_to_next} animationKey="overview-progress-next" formatValue={(value) => `${Math.round(value).toLocaleString("pt-BR")} XP`} /></strong></span>
          </div>
        </div>

        <div className="border-t border-outline-variant lg:border-l lg:border-t-0 lg:pl-8">
          <div className="flex items-center justify-between py-3">
            <h3 className="text-sm font-medium text-on-surface">Missões de hoje</h3>
            <span className="text-xs text-muted">Valores base</span>
          </div>
          <ul>
            <Mission icon="task_alt" label={pendingTasks ? `${pendingTasks} tarefas pendentes` : "Rotina concluída"} xp={20} done={pendingTasks === 0} />
            <Mission icon="fitness_center" label={workoutReady ? "Treino disponível" : "Treino concluído"} xp={80} done={!workoutReady} />
            <Mission icon="payments" label="Registrar um lançamento" xp={8} />
          </ul>
        </div>
      </div>

      <div className="mt-8 border-t border-outline-variant pt-3">
        <div className="flex items-center justify-between py-2">
          <div>
            <h3 className="text-sm font-medium text-on-surface">Conquistas</h3>
            <p className="mt-0.5 font-mono text-xs text-muted">{unlocked.length}/{progress.achievements.length} desbloqueadas</p>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={() => setAchievementsOpen(true)}>
            <Icon name="trophy" className="text-[15px] text-primary" />
            Ver conquistas
          </Button>
        </div>
        <div className="mb-2 grid grid-cols-3 border-y border-outline-variant">
          {tracks.map((track) => {
            const percentage = track.total ? (track.unlocked / track.total) * 100 : 0
            return (
              <div key={track.category} className="min-w-0 border-l border-outline-variant px-3 py-3 first:border-l-0 sm:px-4">
                <div className="flex items-center justify-between gap-2 text-xs"><span className={track.textTone}>{track.label}</span><span className="font-mono text-muted">{track.unlocked}/{track.total}</span></div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-container-highest"><div className={`h-full rounded-full ${track.barTone} transition-[width] duration-500 motion-reduce:transition-none`} style={{ width: `${percentage}%` }} /></div>
              </div>
            )
          })}
        </div>
      </div>
      <AchievementsModal isOpen={achievementsOpen} onClose={() => setAchievementsOpen(false)} achievements={progress.achievements} />
    </section>
  )
}

function Mission({ icon, label, xp, done = false }: { icon: string; label: string; xp: number; done?: boolean }) {
  return (
    <li className="flex items-center gap-3 border-t border-outline-variant py-3.5 first:border-t-0">
      <Icon name={done ? "check_circle" : icon} className={`text-[18px] ${done ? "text-tertiary" : "text-primary"}`} />
      <span className={`min-w-0 flex-1 text-sm ${done ? "text-muted line-through" : "text-on-surface"}`}>{label}</span>
      <span className="font-mono text-xs text-muted">+{xp} XP</span>
    </li>
  )
}
