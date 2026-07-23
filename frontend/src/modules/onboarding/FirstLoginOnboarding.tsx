import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"

import { PixelCard } from "@/components/ui/pixel-card"
import { Button } from "../../components/ui/Button"
import { Modal } from "../../components/ui/Modal"
import { Icon } from "../../design-system/Icon"
import { usePreferences } from "../preferences/store"

const STEPS = [
  {
    eyebrow: "NÍVEL 01",
    title: "Seu próximo nível começa agora.",
    description: "O Level OS conecta dinheiro, rotina e treino para transformar progresso diário em uma visão simples da sua evolução.",
    icon: "rocket_launch",
  },
  {
    eyebrow: "VISÃO GERAL",
    title: "Comece pelo que pede atenção hoje",
    description: "A página inicial reúne saldo, compromissos, rotina e treino. Use os atalhos para aprofundar apenas quando precisar.",
    icon: "grid_view",
  },
  {
    eyebrow: "FINANÇAS",
    title: "Construa sua base financeira",
    description: "Cadastre contas e cartões, lance rendas e despesas e importe OFX. O dashboard passa a mostrar patrimônio e fluxo com dados reais.",
    icon: "finance",
  },
  {
    eyebrow: "ROTINA",
    title: "Planeje o dia sem carregar a tela",
    description: "Organize tarefas e agenda por período. Concluir o que importa também alimenta seu XP de consistência.",
    icon: "calendar_month",
  },
  {
    eyebrow: "TREINOS E XP",
    title: "Evolução que você consegue enxergar",
    description: "Registre treinos, cargas e medidas. Cada avanço desbloqueia XP e conquistas no seu perfil.",
    icon: "trophy",
  },
] as const

export function FirstLoginOnboarding() {
  const { onboarding_completed: completed, status, completeOnboarding } = usePreferences()
  const [step, setStep] = useState(0)
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()

  if (status === "loading" || completed) return null

  const current = STEPS[step]
  const lastStep = step === STEPS.length - 1
  const finish = () => {
    completeOnboarding()
    navigate("/", { replace: true })
  }

  return (
    <Modal
      isOpen
      onClose={finish}
      title="Primeiros passos no Level OS"
      description={`Etapa ${step + 1} de ${STEPS.length}. ${current.title}`}
      icon="rocket_launch"
      maxWidth="max-w-3xl"
    >
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-4" aria-label={`Etapa ${step + 1} de ${STEPS.length}`}>
          <div className="flex gap-1.5" aria-hidden="true">
            {STEPS.map((item, index) => (
              <span
                key={item.eyebrow}
                className={`h-1.5 rounded-full transition-[width,background-color] motion-reduce:transition-none ${index === step ? "w-8 bg-primary" : index < step ? "w-4 bg-primary/45" : "w-4 bg-outline"}`}
              />
            ))}
          </div>
          <span className="font-mono text-[11px] tabular-nums text-muted">{step + 1} / {STEPS.length}</span>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={reduceMotion ? false : { opacity: 0, x: 14 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, x: -10 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
          >
            {step === 0 ? (
              <PixelCard autoPlay className="min-h-[320px] sm:min-h-[360px]">
                <div className="mx-auto flex max-w-xl flex-col items-center">
                  <span className="mb-5 grid size-12 place-items-center rounded-xl border border-primary/25 bg-background/75 text-primary">
                    <Icon name={current.icon} className="text-2xl" />
                  </span>
                  <p className="mb-3 font-mono text-[10px] font-semibold tracking-[0.2em] text-primary">{current.eyebrow}</p>
                  <h2 className="max-w-lg text-balance font-sans text-3xl font-bold tracking-[-0.045em] text-on-surface sm:text-4xl">
                    {current.title}
                  </h2>
                  <p className="mt-4 max-w-lg text-sm leading-6 text-on-surface-variant">{current.description}</p>
                </div>
              </PixelCard>
            ) : (
              <section className="min-h-[320px] rounded-xl border border-outline-variant bg-surface-container-low px-6 py-8 sm:px-10 sm:py-10">
                <div className="flex h-full flex-col justify-between gap-10">
                  <div>
                    <span className="grid size-11 place-items-center rounded-lg border border-primary/20 bg-primary/8 text-primary">
                      <Icon name={current.icon} className="text-[22px]" />
                    </span>
                    <p className="mt-8 font-mono text-[10px] font-semibold tracking-[0.18em] text-primary">{current.eyebrow}</p>
                    <h2 className="mt-3 max-w-xl text-balance font-sans text-2xl font-bold tracking-[-0.035em] text-on-surface sm:text-3xl">{current.title}</h2>
                    <p className="mt-4 max-w-xl text-sm leading-6 text-on-surface-variant">{current.description}</p>
                  </div>
                  <p className="border-t border-outline-variant pt-5 text-xs leading-5 text-muted">
                    Você poderá explorar cada área com calma e alterar suas preferências no Perfil.
                  </p>
                </div>
              </section>
            )}
          </motion.div>
        </AnimatePresence>

        <footer className="flex flex-col-reverse items-stretch justify-between gap-3 sm:flex-row sm:items-center">
          {step === 0 ? (
            <Button type="button" variant="ghost" size="lg" onClick={finish}>Pular introdução</Button>
          ) : (
            <Button type="button" variant="ghost" size="lg" onClick={() => setStep((value) => Math.max(0, value - 1))}>
              <Icon name="chevron_left" /> Voltar
            </Button>
          )}
          <Button
            type="button"
            size="lg"
            onClick={() => { if (lastStep) finish(); else setStep((value) => value + 1) }}
          >
            {lastStep ? "Entrar no Level 1" : step === 0 ? "Começar agora" : "Continuar"}
            <Icon name={lastStep ? "rocket_launch" : "arrow_forward"} />
          </Button>
        </footer>
      </div>
    </Modal>
  )
}
