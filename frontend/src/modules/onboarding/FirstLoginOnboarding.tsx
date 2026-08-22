import { useReducedMotion } from "motion/react"
import * as m from "motion/react-m"
import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"

import { PixelCard } from "@/components/ui/pixel-card"
import { Button } from "../../components/ui/button"
import { Modal } from "../../components/ui/Modal"
import { useApp } from "../../context/AppContext"
import { Icon } from "../../design-system/Icon"
import { useFinance } from "../finance/store"
import { useNutrition } from "../nutrition/store"
import { usePreferences } from "../preferences/store"
import { useTraining } from "../training/store"

interface ActivationStep {
  id: string
  title: string
  description: string
  icon: string
  complete: boolean
  action: () => void
  actionLabel: string
}
export function FirstLoginOnboarding() {
  const { onboarding_completed: completed, status, completeOnboarding } = usePreferences()
  const app = useApp()
  const finance = useFinance()
  const training = useTraining()
  const nutrition = useNutrition()
  const [intro, setIntro] = useState(true)
  const [dismissed, setDismissed] = useState(false)
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()

  const leaveForAction = (path: string, action?: () => void) => {
    setDismissed(true)
    navigate(path)
    action?.()
  }

  const steps = useMemo<ActivationStep[]>(() => [
    {
      id: "account",
      title: "Cadastre sua primeira conta",
      description: "O saldo e o patrimônio começam por aqui.",
      icon: "account_balance",
      complete: finance.accounts.length > 0,
      action: () => leaveForAction("/financeiro?tab=contas"),
      actionLabel: "Cadastrar conta",
    },
    {
      id: "transaction",
      title: "Registre uma movimentação",
      description: "Adicione uma despesa ou renda real para montar seu histórico.",
      icon: "payments",
      complete: finance.expenses.length + finance.income.length + finance.variableIncome.length > 0,
      action: () => leaveForAction("/financeiro", () => app.setIsExpenseModalOpen(true)),
      actionLabel: "Adicionar movimentação",
    },
    {
      id: "routine",
      title: "Crie uma tarefa recorrente",
      description: "Transforme algo que se repete em uma rotina acompanhável.",
      icon: "event_repeat",
      complete: app.tasks.some((task) => task.repeat && task.repeat !== "none"),
      action: () => leaveForAction("/agenda", () => app.setIsTaskModalOpen(true)),
      actionLabel: "Criar tarefa",
    },
    {
      id: "wellbeing",
      title: "Monte um treino ou cardápio",
      description: "Escolha a área que faz mais sentido para o seu momento.",
      icon: "exercise",
      complete: training.workouts.length > 0 || nutrition.plan !== null,
      action: () => leaveForAction("/treinos", () => app.setIsWorkoutModalOpen(true)),
      actionLabel: "Começar treino",
    },
  ], [app, finance.accounts.length, finance.expenses.length, finance.income.length, finance.variableIncome.length, nutrition.plan, training.workouts.length])

  if (status === "loading" || completed || dismissed) return null

  const completedCount = steps.filter((item) => item.complete).length
  const progress = Math.round((completedCount / steps.length) * 100)
  const finish = () => {
    completeOnboarding()
    navigate("/", { replace: true })
  }

  return (
    <Modal
      isOpen
      onClose={finish}
      title="Primeiros passos no Level OS"
      description={intro ? "Uma configuração rápida para você perceber valor nos primeiros minutos." : `${completedCount} de ${steps.length} etapas concluídas.`}
      icon="rocket_launch"
      maxWidth="max-w-3xl"
    >
      {intro ? (
        <div className="space-y-5">
          <PixelCard autoPlay className="min-h-[320px] sm:min-h-[360px]">
            <div className="mx-auto flex max-w-xl flex-col items-center">
              <span className="mb-5 grid size-12 place-items-center rounded-xl border border-primary/25 bg-background/75 text-primary"><Icon name="rocket_launch" className="text-2xl" /></span>
              <p className="mb-3 font-mono text-[10px] font-semibold tracking-[0.2em] text-primary">NÍVEL 01</p>
              <h2 className="max-w-lg text-balance text-center font-sans text-3xl font-bold tracking-[-0.045em] text-on-surface sm:text-4xl">Seu sistema começa com quatro ações reais.</h2>
              <p className="mt-4 max-w-lg text-center text-sm leading-6 text-on-surface-variant">Nada de tour longo: vamos cadastrar a base que conecta finanças, rotina e bem-estar.</p>
            </div>
          </PixelCard>
          <footer className="flex flex-col-reverse justify-between gap-3 sm:flex-row">
            <Button type="button" variant="ghost" size="lg" onClick={finish}>Explorar sozinho</Button>
            <Button type="button" size="lg" onClick={() => setIntro(false)}>Configurar meu Level OS <Icon name="arrow_forward" /></Button>
          </footer>
        </div>
      ) : (
        <m.div initial={reduceMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          <div>
            <div className="mb-2 flex items-center justify-between text-xs"><span className="text-on-surface-variant">Progresso da configuração</span><strong className="font-mono tabular-nums text-primary">{progress}%</strong></div>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-container-high" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><span className="block h-full rounded-full bg-primary transition-[width] motion-reduce:transition-none" style={{ width: `${progress}%` }} /></div>
          </div>
          <div className="divide-y divide-outline-variant border-y border-outline-variant">
            {steps.map((item) => (
              <section key={item.id} className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center">
                <span className={`grid size-10 shrink-0 place-items-center rounded-lg ${item.complete ? "bg-primary/12 text-primary" : "bg-surface-container text-on-surface-variant"}`}><Icon name={item.complete ? "check" : item.icon} /></span>
                <div className="min-w-0 flex-1"><h3 className="text-sm font-semibold text-on-surface">{item.title}</h3><p className="mt-1 text-xs leading-5 text-on-surface-variant">{item.description}</p></div>
                {item.complete ? <span className="text-xs font-semibold text-primary">Concluído</span> : <Button type="button" variant="outline" size="sm" onClick={item.action}>{item.actionLabel}</Button>}
              </section>
            ))}
          </div>
          <footer className="flex flex-col-reverse justify-between gap-3 sm:flex-row">
            <Button type="button" variant="ghost" size="lg" onClick={() => setIntro(true)}>Voltar</Button>
            <Button type="button" size="lg" onClick={finish}>{completedCount === steps.length ? "Ir para a Visão Geral" : "Continuar depois"}<Icon name="arrow_forward" /></Button>
          </footer>
        </m.div>
      )}
    </Modal>
  )
}
