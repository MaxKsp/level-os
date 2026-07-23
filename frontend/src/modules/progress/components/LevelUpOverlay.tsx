import { Button } from "../../../components/ui/Button"
import { Modal } from "../../../components/ui/Modal"
import { LevelMark } from "../../../components/ui/LevelMark"
import { useProgress } from "../store"

export function LevelUpOverlay() {
  const { celebration, dismissCelebration } = useProgress()
  return (
    <Modal isOpen={Boolean(celebration)} onClose={dismissCelebration} title="Novo nível desbloqueado" maxWidth="max-w-lg">
      {celebration ? (
        <div className="py-6 text-center">
          <LevelMark className="level-up-glow mx-auto size-14 text-primary" />
          <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Level up</p>
          <p className="mt-2 font-mono text-6xl font-medium tracking-[-0.08em] text-on-surface">{String(celebration.level).padStart(2, "0")}</p>
          <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-on-surface-variant">Seu sistema evoluiu. Continue transformando pequenas ações em consistência.</p>
          {celebration.unlocked.length ? <p className="mt-4 text-xs text-primary">{celebration.unlocked.length} nova conquista desbloqueada</p> : null}
          <Button className="mt-7" onClick={dismissCelebration}>Continuar</Button>
        </div>
      ) : null}
    </Modal>
  )
}
