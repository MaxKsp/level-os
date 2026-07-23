import { Modal } from "../../../components/ui/Modal"
import { Icon } from "../../../design-system"
import type { Achievement } from "../contracts"
import { AchievementGrid } from "./AchievementGrid"

export function AchievementsModal({
  isOpen,
  onClose,
  achievements,
}: {
  isOpen: boolean
  onClose: () => void
  achievements: Achievement[]
}) {
  const unlocked = achievements.filter((achievement) => achievement.unlocked).length
  const earnedXp = achievements
    .filter((achievement) => achievement.unlocked)
    .reduce((sum, achievement) => sum + achievement.xp_bonus, 0)

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Conquistas"
      description="Explore os marcos de rotina, finanças, treinos e consistência."
      icon="trophy"
      maxWidth="max-w-4xl"
    >
      <div className="mb-4 grid grid-cols-3 border-y border-outline-variant">
        <Summary icon="check_circle" label="Desbloqueadas" value={`${unlocked}/${achievements.length}`} />
        <Summary icon="stars" label="XP conquistado" value={earnedXp.toLocaleString("pt-BR")} />
        <Summary icon="target" label="Restantes" value={String(achievements.length - unlocked)} />
      </div>
      <AchievementGrid achievements={achievements} showFilters />
    </Modal>
  )
}

function Summary({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="min-w-0 border-l border-outline-variant px-3 py-3 first:border-l-0 sm:px-4">
      <p className="flex items-center gap-1.5 truncate text-xs text-muted">
        <Icon name={icon} className="text-[14px] text-primary" />
        {label}
      </p>
      <p className="mt-1 truncate font-mono text-base font-semibold text-on-surface">{value}</p>
    </div>
  )
}
