import * as Dialog from "@radix-ui/react-dialog"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { ArrowLeftRight, BarChart3, Bot, ChefHat, Command, Dumbbell, Gauge, GraduationCap, ListTodo, LoaderCircle, LockKeyhole, Ruler, Scale, SendHorizonal, Trash2, TrendingDown, TrendingUp, Undo2, X } from "lucide-react"
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react"
import { cn } from "../../lib/cn"
import type { AssistantResponse } from "./contracts"
import { AssistantAvatar } from "./AssistantAvatar"
import { personaFor, personaFullName } from "./personas"
import { useAssistant, type AssistantModule } from "./store"
import { AssistantResultCard } from "./AssistantResultCard"
import { agentHistoryKey, appendAgentHistory, createEmptyAgentHistory, type AgentHistoryKey } from "./agentHistory"
import { clearAssistantHistory, getAssistantHistory, type AssistantApproval } from "./api"

interface Suggestion { icon: ReactNode; label: string; description: string; prefix: string; module: AssistantModule; template?: string; openWorkoutForm?: boolean; openDietForm?: boolean }

/** Agrupadas por frente do produto. O contexto do módulo filtra os chips exibidos. */
const SUGGESTIONS: Suggestion[] = [
  { module: "financeiro", icon: <TrendingDown className="size-4" />, label: "Gasto", description: "Lançar uma despesa", prefix: "/gasto", template: "Lançar R$ 42,90 de alimentação hoje na conta principal" },
  { module: "financeiro", icon: <TrendingUp className="size-4" />, label: "Renda", description: "Registrar uma entrada", prefix: "/renda", template: "Registrar renda de R$ 1.500 recebida hoje" },
  { module: "financeiro", icon: <ArrowLeftRight className="size-4" />, label: "Transferência", description: "Mover saldo entre contas", prefix: "/transferencia", template: "Transferir R$ 200 da conta principal para a poupança hoje" },
  { module: "financeiro", icon: <BarChart3 className="size-4" />, label: "Analisar gastos", description: "Onde o dinheiro está indo", prefix: "/analise", template: "Onde estou gastando mais este mês?" },
  { module: "agenda", icon: <ListTodo className="size-4" />, label: "Tarefa", description: "Criar tarefa na agenda", prefix: "/tarefa", template: "Criar tarefa pagar condomínio amanhã às 09:00" },
  { module: "agenda", icon: <Gauge className="size-4" />, label: "Produtividade", description: "Resumo da sua rotina", prefix: "/produtividade", template: "Como está minha produtividade na rotina?" },
  { module: "treinos", icon: <Dumbbell className="size-4" />, label: "Treino", description: "Registrar um treino do dia", prefix: "/treino", template: "Registrar treino de força de 45 minutos hoje" },
  { module: "treinos", icon: <Scale className="size-4" />, label: "Medida", description: "Registrar peso ou medida", prefix: "/medida", template: "Registrar peso 79,4 kg hoje" },
  { module: "treinos", icon: <Ruler className="size-4" />, label: "IMC e medidas", description: "Consultar evolução corporal", prefix: "/imc", template: "Quais minhas últimas medidas e IMC?" },
  { module: "treinos", icon: <GraduationCap className="size-4" />, label: "Programa personalizado", description: "Professor de educação física monta seu treino", prefix: "/programa", openWorkoutForm: true },
  { module: "alimentacao", icon: <ChefHat className="size-4" />, label: "Montar dieta", description: "Nutricionista por objetivo e orçamento", prefix: "/dieta", openDietForm: true },
]

const WORKOUT_FOCUS_OPTIONS = ["Hipertrofia", "Emagrecimento", "Força", "Resistência", "Condicionamento geral"]
const DIET_GOAL_OPTIONS = [["emagrecimento", "Emagrecimento"], ["hipertrofia", "Hipertrofia"], ["manutencao", "Manutenção"]] as const

type ChatMessage =
  | { id: number; role: "user"; text: string }
  | { id: number; role: "assistant"; response: AssistantResponse }
  | { id: number; role: "error"; text: string }

let messageId = 0
const nextId = () => ++messageId

function adjustmentStarter(response: AssistantResponse): string {
  const data = response.data && typeof response.data === "object" ? response.data as Record<string, unknown> : {}
  if (response.action === "create_diet_plan") {
    const plan = data.plan && typeof data.plan === "object" ? data.plan as Record<string, unknown> : {}
    return `Refaça o rascunho do cardápio mantendo objetivo ${String(plan.goal ?? "informado")}, período de ${String(plan.periodDays ?? "")} dias e orçamento de R$ ${String(plan.budgetBRL ?? "")}. Ajuste: `
  }
  if (response.action === "create_workout_program") {
    return `Refaça o rascunho do programa mantendo foco ${String(data.focus ?? "informado")}, ${String(data.daysPerWeek ?? "")} dias por semana e local ${String(data.location ?? "informado")}. Ajuste: `
  }
  return "Ajuste o rascunho proposto: "
}

function dietDraftOutsideBudgetTolerance(approval: AssistantApproval | undefined): boolean {
  const draft = approval?.draft
  if (!draft) return false
  const budget = typeof draft.budgetBRL === "number" ? draft.budgetBRL : Number(draft.budgetBRL)
  const estimated = typeof draft.estimatedCostBRL === "number" ? draft.estimatedCostBRL : Number(draft.estimatedCostBRL)
  return Number.isFinite(budget)
    && Number.isFinite(estimated)
    && (estimated < budget * 0.9 || estimated > budget * 1.1)
}

function useAutoResize(minHeight: number, maxHeight: number) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const adjust = useCallback((reset?: boolean) => {
    const el = ref.current
    if (!el) return
    el.style.height = `${minHeight}px`
    if (!reset) el.style.height = `${Math.max(minHeight, Math.min(el.scrollHeight, maxHeight))}px`
  }, [minHeight, maxHeight])
  return { ref, adjust }
}

function TypingDots() {
  return (
    <span className="inline-flex items-center">
      {[0, 1, 2].map((dot) => (
        <motion.span
          key={dot}
          className="mx-0.5 size-1.5 rounded-full bg-primary"
          animate={{ opacity: [0.3, 0.9, 0.3], scale: [0.85, 1.1, 0.85] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: dot * 0.15, ease: "easeInOut" }}
        />
      ))}
    </span>
  )
}

export function AssistantCommand() {
  const assistant = useAssistant()
  const reduce = useReducedMotion()
  const [text, setText] = useState("")
  const [messagesByAgent, setMessagesByAgent] = useState<Record<AgentHistoryKey, ChatMessage[]>>(() => createEmptyAgentHistory<ChatMessage>())
  const [historyLoaded, setHistoryLoaded] = useState<Record<AgentHistoryKey, boolean>>({ geral: false, financeiro: false, agenda: false, treinos: false, alimentacao: false })
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [clearingHistory, setClearingHistory] = useState(false)
  const [showPalette, setShowPalette] = useState(false)
  const [active, setActive] = useState(-1)
  const [workoutForm, setWorkoutForm] = useState<{ focus: string; days: number; location: "casa" | "academia" } | null>(null)
  const [dietForm, setDietForm] = useState<{ goal: string; periodDays: number; budget: string } | null>(null)
  const [approvalByToken, setApprovalByToken] = useState<Record<string, AssistantApproval>>({})
  const visibleSuggestions = assistant.moduleContext ? SUGGESTIONS.filter((s) => s.module === assistant.moduleContext) : SUGGESTIONS
  const persona = personaFor(assistant.moduleContext)
  const activeHistoryKey = agentHistoryKey(assistant.moduleContext)
  const messages = messagesByAgent[activeHistoryKey]
  const { ref: input, adjust } = useAutoResize(56, 180)
  const scrollRef = useRef<HTMLDivElement>(null)
  const lastResult = useRef<AssistantResponse | null>(null)
  const lastError = useRef<string | null>(null)
  const pendingHistoryKey = useRef<AgentHistoryKey | null>(null)

  const appendMessage = useCallback((key: AgentHistoryKey, message: ChatMessage) => {
    setMessagesByAgent((current) => appendAgentHistory(current, key, message))
  }, [])

  useEffect(() => {
    if (!assistant.open || !assistant.paidAccess || historyLoaded[activeHistoryKey]) return
    let cancelled = false
    setHistoryLoading(true)
    setHistoryError(null)
    void getAssistantHistory(activeHistoryKey)
      .then((items) => {
        if (cancelled) return
        const restored = items.flatMap<ChatMessage>((item) => {
          const expiry = item.response.undoExpiresAt ? Date.parse(item.response.undoExpiresAt) : Number.NaN
          const confirmationExpiry = item.response.confirmationExpiresAt ? Date.parse(item.response.confirmationExpiresAt) : Number.NaN
          const response = {
            ...item.response,
            undoAvailable: item.response.undoAvailable && Number.isFinite(expiry) && expiry > Date.now(),
            confirmationRequired: item.response.confirmationRequired && Number.isFinite(confirmationExpiry) && confirmationExpiry > Date.now(),
          }
          return [
            { id: nextId(), role: "user", text: item.userText },
            { id: nextId(), role: "assistant", response },
          ]
        })
        setMessagesByAgent((current) => current[activeHistoryKey].length > 0 ? current : { ...current, [activeHistoryKey]: restored })
        setHistoryLoaded((current) => ({ ...current, [activeHistoryKey]: true }))
      })
      .catch(() => {
        if (!cancelled) setHistoryError("Não foi possível carregar o histórico deste agente.")
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false)
      })
    return () => { cancelled = true }
  }, [activeHistoryKey, assistant.open, assistant.paidAccess, historyLoaded])

  const clearHistory = useCallback(async () => {
    if (clearingHistory) return
    setClearingHistory(true)
    setHistoryError(null)
    try {
      await clearAssistantHistory(activeHistoryKey)
      setMessagesByAgent((current) => ({ ...current, [activeHistoryKey]: [] }))
      setHistoryLoaded((current) => ({ ...current, [activeHistoryKey]: true }))
    } catch {
      setHistoryError("Não foi possível limpar o histórico deste agente.")
    } finally {
      setClearingHistory(false)
    }
  }, [activeHistoryKey, clearingHistory])

  const viewModule = useCallback((module: AssistantModule) => {
    assistant.setOpen(false)
    const path = module === "financeiro" ? "/financeiro" : module === "agenda" ? "/agenda" : module === "treinos" ? "/treinos" : "/alimentacao#nutrition-plan"
    const pathname = path.split("#")[0]
    if (window.location.pathname !== pathname) {
      window.location.assign(path)
      return
    }
    if (module === "alimentacao") {
      window.history.replaceState(null, "", path)
      requestAnimationFrame(() => document.getElementById("nutrition-plan")?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }))
    } else {
      window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" })
    }
  }, [assistant, reduce])

  useEffect(() => {
    if (text.startsWith("/") && !text.includes(" ")) {
      setShowPalette(true)
      setActive(visibleSuggestions.findIndex((s) => s.prefix.startsWith(text)))
    } else {
      setShowPalette(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, assistant.moduleContext])

  // Respostas e erros do store viram mensagens do chat (idempotente por referência).
  useEffect(() => {
    if (assistant.result && assistant.result !== lastResult.current) {
      lastResult.current = assistant.result
      const key = pendingHistoryKey.current ?? activeHistoryKey
      appendMessage(key, { id: nextId(), role: "assistant", response: assistant.result as AssistantResponse })
      pendingHistoryKey.current = null
    }
  }, [activeHistoryKey, appendMessage, assistant.result])
  useEffect(() => {
    if (assistant.error && assistant.error !== lastError.current) {
      lastError.current = assistant.error
      const key = pendingHistoryKey.current ?? activeHistoryKey
      appendMessage(key, { id: nextId(), role: "error", text: assistant.error as string })
      pendingHistoryKey.current = null
    }
    if (!assistant.error) lastError.current = null
  }, [activeHistoryKey, appendMessage, assistant.error])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: reduce ? "auto" : "smooth" })
  }, [messages.length, assistant.loading, reduce])

  const pick = (index: number) => {
    const suggestion = visibleSuggestions[index]
    if (!suggestion) return
    setShowPalette(false)
    if (suggestion.openWorkoutForm) {
      setDietForm(null)
      setWorkoutForm({ focus: WORKOUT_FOCUS_OPTIONS[0], days: 3, location: "academia" })
      setText("")
      requestAnimationFrame(() => { adjust(true); input.current?.focus() })
      return
    }
    if (suggestion.openDietForm) {
      setWorkoutForm(null)
      setDietForm({ goal: DIET_GOAL_OPTIONS[0][0], periodDays: 7, budget: "" })
      setText("")
      requestAnimationFrame(() => { adjust(true); input.current?.focus() })
      return
    }
    setText(suggestion.template ?? "")
    requestAnimationFrame(() => { adjust(); input.current?.focus() })
  }

  const send = () => {
    const value = text.trim()
    if (!value || assistant.loading) return
    pendingHistoryKey.current = activeHistoryKey
    appendMessage(activeHistoryKey, { id: nextId(), role: "user", text: value })
    setText("")
    adjust(true)
    void assistant.submit(value)
  }

  /** O texto livre do campo entra como observação extra do preset. */
  const extraNote = () => {
    const note = text.trim()
    return note ? ` Observações do usuário (respeite se for compatível): ${note}` : ""
  }

  const sendWorkoutProgram = () => {
    if (!workoutForm || assistant.loading) return
    const note = extraNote()
    const prompt = `Monte um programa de treino como professor de educação física: foco em ${workoutForm.focus.toLowerCase()}, ${workoutForm.days} dia(s) por semana, treinos serão feitos em ${workoutForm.location}.${note}`
    const label = `Programa · ${workoutForm.focus} · ${workoutForm.days}x/semana · ${workoutForm.location === "casa" ? "Em casa" : "Na academia"}`
    pendingHistoryKey.current = activeHistoryKey
    appendMessage(activeHistoryKey, { id: nextId(), role: "user", text: text.trim() ? `${label}\n${text.trim()}` : label })
    setWorkoutForm(null)
    setText("")
    adjust(true)
    void assistant.submit(prompt)
  }

  const sendDietPlan = () => {
    if (!dietForm || assistant.loading) return
    const budget = Number(dietForm.budget.replace(",", "."))
    if (!Number.isFinite(budget) || budget < 20) return
    const goalLabel = DIET_GOAL_OPTIONS.find(([value]) => value === dietForm.goal)?.[1] ?? dietForm.goal
    const note = extraNote()
    const prompt = `Monte um plano alimentar como nutricionista: objetivo ${dietForm.goal}, período de ${dietForm.periodDays} dias, orçamento total de R$ ${budget.toFixed(2)} para o período.${note}`
    const label = `Dieta · ${goalLabel} · ${dietForm.periodDays} dias · até R$ ${budget.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
    pendingHistoryKey.current = activeHistoryKey
    appendMessage(activeHistoryKey, { id: nextId(), role: "user", text: text.trim() ? `${label}\n${text.trim()}` : label })
    setDietForm(null)
    setText("")
    adjust(true)
    void assistant.submit(prompt)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (showPalette) {
      if (e.key === "ArrowDown") { e.preventDefault(); setActive((p) => (p < visibleSuggestions.length - 1 ? p + 1 : 0)); return }
      if (e.key === "ArrowUp") { e.preventDefault(); setActive((p) => (p > 0 ? p - 1 : visibleSuggestions.length - 1)); return }
      if (e.key === "Tab" || e.key === "Enter") { e.preventDefault(); if (active >= 0) pick(active); return }
      if (e.key === "Escape") { e.preventDefault(); setShowPalette(false); return }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (workoutForm) sendWorkoutProgram()
      else if (dietForm) sendDietPlan()
      else send()
    }
  }

  const empty = messages.length === 0
  const lastAssistant = [...messages].reverse().find((m): m is Extract<ChatMessage, { role: "assistant" }> => m.role === "assistant")

  if (!assistant.paidAccess) {
    return (
      <Dialog.Root open={assistant.open} onOpenChange={assistant.setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay asChild>
            <motion.div className="fixed inset-0 z-[130] bg-black/78 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
          </Dialog.Overlay>
          <div className="pointer-events-none fixed inset-0 z-[131] flex items-center justify-center p-4 sm:p-6">
            <Dialog.Content asChild aria-describedby="assistant-paid-description">
              <motion.section
                initial={{ opacity: 0, y: reduce ? 0 : 18, scale: reduce ? 1 : 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="pointer-events-auto relative w-full max-w-md overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-low p-6 shadow-2xl"
              >
                <Dialog.Close className="absolute right-3 top-3 grid size-10 place-items-center rounded-lg text-muted hover:bg-surface-container-high" aria-label="Fechar">
                  <X className="size-4" />
                </Dialog.Close>
                <span className="grid size-12 place-items-center rounded-xl bg-primary/10 text-primary">
                  {assistant.planReady ? <LockKeyhole className="size-5" /> : <LoaderCircle className="size-5 animate-spin" />}
                </span>
                <Dialog.Title className="mt-5 text-xl font-semibold text-on-surface">
                  {assistant.planReady ? "Agente de IA no plano pago" : "Verificando seu plano"}
                </Dialog.Title>
                <Dialog.Description id="assistant-paid-description" className="mt-2 text-sm leading-6 text-muted">
                  {assistant.planReady
                    ? "O Agente de IA é uma funcionalidade exclusiva do plano Individual pago. Durante o período gratuito, os demais módulos continuam disponíveis."
                    : "Aguarde enquanto confirmamos sua assinatura."}
                </Dialog.Description>
                {assistant.planReady ? (
                  <button
                    type="button"
                    onClick={() => {
                      assistant.setOpen(false)
                      window.location.assign("/perfil#plan")
                    }}
                    className="mt-6 min-h-11 w-full rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary hover:bg-primary/90"
                  >
                    Ver plano Individual
                  </button>
                ) : null}
              </motion.section>
            </Dialog.Content>
          </div>
        </Dialog.Portal>
      </Dialog.Root>
    )
  }

  return (
    <>
      <Dialog.Root open={assistant.open} onOpenChange={assistant.setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay asChild>
            <motion.div className="fixed inset-0 z-[130] bg-black/78 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
          </Dialog.Overlay>
          <div className="pointer-events-none fixed inset-0 z-[131] flex items-center justify-center p-0 sm:p-6">
            <Dialog.Content asChild aria-describedby={undefined}>
              <motion.section
                initial={{ opacity: 0, y: reduce ? 0 : 18, scale: reduce ? 1 : 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="pointer-events-auto relative flex h-full w-full flex-col overflow-hidden border-outline-variant bg-surface-container-low/95 shadow-2xl backdrop-blur-2xl sm:h-[min(88vh,56rem)] sm:max-w-3xl sm:rounded-2xl sm:border"
              >
                {!reduce ? (
                  <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
                    <div className="absolute -top-20 left-1/4 size-96 animate-pulse rounded-full bg-primary/[0.08] blur-[128px]" />
                    <div className="absolute -bottom-20 right-1/4 size-96 animate-pulse rounded-full bg-tertiary/[0.08] blur-[128px] [animation-delay:700ms]" />
                    <div className="absolute right-1/3 top-1/3 size-64 animate-pulse rounded-full bg-primary/[0.05] blur-[96px] [animation-delay:1000ms]" />
                  </div>
                ) : null}

                <header className="relative flex items-center justify-between border-b border-outline-variant px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary"><AssistantAvatar module={assistant.moduleContext} className="size-4" /></span>
                    <div>
                      <Dialog.Title className="text-sm font-semibold text-on-surface">
                        {persona.title ? <span className="font-normal text-muted">{persona.title} </span> : null}
                        {persona.name}
                      </Dialog.Title>
                      <Dialog.Description className="text-[11px] text-muted">{persona.tagline}</Dialog.Description>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!empty ? (
                      <button
                        type="button"
                        onClick={() => { void clearHistory() }}
                        disabled={clearingHistory}
                        className="grid size-10 place-items-center rounded-lg text-muted hover:bg-surface-container-high hover:text-on-surface"
                        aria-label={`Limpar histórico de ${personaFullName(persona)}`}
                        title="Limpar histórico deste agente"
                      >
                        {clearingHistory ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                      </button>
                    ) : null}
                    <kbd className="hidden rounded border border-outline-variant px-1.5 py-0.5 font-mono text-[10px] text-muted sm:block">Ctrl K</kbd>
                    <Dialog.Close className="grid size-10 place-items-center rounded-lg text-muted hover:bg-surface-container-high" aria-label="Fechar Agente de IA">
                      <X className="size-4" />
                    </Dialog.Close>
                  </div>
                </header>

                <div ref={scrollRef} className="relative flex-1 overflow-y-auto px-5 py-6">
                  {historyError ? <p role="alert" className="mb-3 rounded-lg border border-error/20 bg-error/5 px-3 py-2 text-xs text-error">{historyError}</p> : null}
                  {historyLoading ? <p role="status" className="mb-3 flex items-center gap-2 text-xs text-muted"><LoaderCircle className="size-3.5 animate-spin" />Carregando histórico…</p> : null}
                  {empty ? (
                    <div className="flex h-full flex-col items-center justify-center gap-8">
                      <motion.div initial={{ opacity: 0, y: reduce ? 0 : 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.5 }} className="text-center">
                        <h2 className="bg-gradient-to-r from-on-surface to-muted bg-clip-text pb-1 text-3xl font-medium tracking-tight text-transparent">
                          {persona.greeting}
                        </h2>
                        <motion.div
                          className="mx-auto h-px bg-gradient-to-r from-transparent via-outline-variant to-transparent"
                          initial={{ width: 0, opacity: 0 }}
                          animate={{ width: "100%", opacity: 1 }}
                          transition={{ delay: 0.5, duration: 0.8 }}
                        />
                        <motion.p className="mt-3 text-sm text-muted" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                          Digite um comando com / ou peça em linguagem natural
                        </motion.p>
                      </motion.div>
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        {visibleSuggestions.map((suggestion, index) => (
                          <motion.button
                            key={suggestion.prefix}
                            type="button"
                            onClick={() => pick(index)}
                            initial={{ opacity: 0, y: reduce ? 0 : 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 + index * 0.08 }}
                            className="flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-container/60 px-3 py-2 text-sm text-muted transition-colors hover:border-primary/40 hover:text-on-surface"
                          >
                            {suggestion.icon}
                            <span>{suggestion.label}</span>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      <AnimatePresence initial={false}>
                        {messages.map((message) => (
                          <motion.div
                            key={message.id}
                            initial={{ opacity: 0, y: reduce ? 0 : 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.25, ease: "easeOut" }}
                            className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}
                          >
                            {message.role === "user" ? (
                              <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm leading-6 text-on-primary shadow-md">
                                {message.text}
                              </div>
                            ) : (
                              <div className="flex max-w-[85%] items-start gap-2.5">
                                <span className="mt-1 grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"><AssistantAvatar module={assistant.moduleContext} className="size-3.5" /></span>
                                <div
                                  className={cn(
                                    "rounded-2xl rounded-bl-md border px-4 py-2.5 text-sm leading-6 shadow-sm",
                                    message.role === "error"
                                      ? "border-error/30 bg-error/5 text-error"
                                      : "border-outline-variant bg-surface-container text-on-surface",
                                  )}
                                >
                                  <p>{message.role === "error" ? message.text : message.response.status === "undone" ? "Ação desfeita." : message.response.message}</p>
                                  {message.role === "assistant" && message.response.status !== "undone" ? (
                                    <AssistantResultCard
                                      response={message.response}
                                      onView={viewModule}
                                      approval={message.response.actionToken ? approvalByToken[message.response.actionToken] : undefined}
                                      onApprovalChange={message.response.actionToken ? (approval) => setApprovalByToken((current) => ({ ...current, [message.response.actionToken as string]: approval })) : undefined}
                                    />
                                  ) : null}
                                  {message.role === "assistant" && message.response.usage ? (
                                    <p
                                      className="numeric-value mt-2 border-t border-outline-variant pt-2 text-[10px] leading-4 text-muted"
                                      aria-label={`Uso desta solicitação: ${message.response.usage.totalTokens} tokens; custo estimado de ${message.response.usage.estimatedCostUsd.toLocaleString("pt-BR", { style: "currency", currency: "USD", minimumFractionDigits: 4, maximumFractionDigits: 6 })}`}
                                    >
                                      {message.response.usage.totalTokens === 0
                                        ? "Processado localmente · sem custo de IA"
                                        : `${message.response.usage.totalTokens.toLocaleString("pt-BR")} tokens · custo estimado ${message.response.usage.estimatedCostUsd.toLocaleString("pt-BR", { style: "currency", currency: "USD", minimumFractionDigits: 4, maximumFractionDigits: 6 })}`}
                                    </p>
                                  ) : null}
                                  {message.role === "assistant"
                                    && message === lastAssistant
                                    && message.response.confirmationRequired
                                    && message.response.actionToken ? (
                                    <div className="mt-3 grid grid-cols-2 gap-2 border-t border-outline-variant pt-3 sm:grid-cols-3">
                                      {message.response.action === "create_diet_plan" || message.response.action === "create_workout_program" || message.response.action === "create_workout" ? (
                                        <button
                                          type="button"
                                          disabled={assistant.loading}
                                          onClick={() => {
                                            setText(adjustmentStarter(message.response))
                                            requestAnimationFrame(() => { adjust(); input.current?.focus() })
                                          }}
                                          className="col-span-2 min-h-10 rounded-lg border border-outline-variant px-3 text-xs font-semibold text-primary hover:bg-primary/10 disabled:opacity-50 sm:col-span-1"
                                        >
                                          Pedir ajustes
                                        </button>
                                      ) : null}
                                      <button
                                        type="button"
                                        disabled={assistant.loading}
                                        onClick={() => {
                                          pendingHistoryKey.current = activeHistoryKey
                                          void assistant.resolveConfirmation(message.response.actionToken as string, "cancel", message.response.module)
                                        }}
                                        className="min-h-10 rounded-lg border border-outline-variant px-3 text-xs font-semibold text-on-surface hover:bg-surface-container-high disabled:opacity-50"
                                      >
                                        Cancelar
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          pendingHistoryKey.current = activeHistoryKey
                                          void assistant.resolveConfirmation(
                                            message.response.actionToken as string,
                                            "confirm",
                                            message.response.module,
                                            approvalByToken[message.response.actionToken as string],
                                          )
                                        }}
                                        disabled={assistant.loading
                                          || dietDraftOutsideBudgetTolerance(approvalByToken[message.response.actionToken as string])
                                          || (approvalByToken[message.response.actionToken as string]?.mode === "replace_selected" && !(approvalByToken[message.response.actionToken as string]?.selectedWorkoutIds?.length))}
                                        className="min-h-10 rounded-lg bg-primary px-3 text-xs font-semibold text-on-primary hover:bg-primary/90 disabled:opacity-50"
                                      >
                                        {message.response.action === "create_diet_plan" && Boolean((message.response.data as Record<string, unknown> | undefined)?.hasActivePlan) ? "Aprovar e substituir" : "Aprovar"}
                                      </button>
                                    </div>
                                  ) : null}
                                  {message.role === "assistant"
                                    && message === lastAssistant
                                    && message.response.undoAvailable
                                    && message.response.actionToken ? (
                                    <button
                                      disabled={assistant.loading}
                                      onClick={() => {
                                        pendingHistoryKey.current = activeHistoryKey
                                        void assistant.undo(message.response.actionToken, message.response.module)
                                      }}
                                      className="mt-2 flex min-h-9 items-center gap-1.5 rounded-lg border border-outline-variant px-3 text-xs font-semibold text-primary hover:bg-primary/10"
                                    >
                                      <Undo2 className="size-3.5" />Desfazer
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                            )}
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      <AnimatePresence>
                        {assistant.loading ? (
                          <motion.div
                            initial={{ opacity: 0, y: reduce ? 0 : 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center gap-2.5"
                          >
                            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"><AssistantAvatar module={assistant.moduleContext} className="size-3.5" /></span>
                            <span className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-outline-variant bg-surface-container px-4 py-2.5 text-sm text-on-surface-variant">
                              Pensando<TypingDots />
                            </span>
                          </motion.div>
                        ) : null}
                      </AnimatePresence>
                    </div>
                  )}
                </div>

                <div className="relative flex flex-col gap-3 border-t border-outline-variant p-4">
                  {workoutForm ? (
                    <motion.div
                      initial={{ opacity: 0, y: reduce ? 0 : 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl border border-primary/30 bg-primary/[0.04] p-4"
                    >
                      <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-on-surface">
                        <GraduationCap className="size-4 text-primary" />
                        Montar programa de treino
                      </p>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <label className="text-xs text-muted">
                          Foco
                          <select
                            value={workoutForm.focus}
                            onChange={(e) => setWorkoutForm({ ...workoutForm, focus: e.target.value })}
                            className="mt-1 w-full rounded-lg border border-outline-variant bg-surface-container px-2.5 py-2 text-sm text-on-surface"
                          >
                            {WORKOUT_FOCUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                          </select>
                        </label>
                        <label className="text-xs text-muted">
                          Dias por semana
                          <select
                            value={workoutForm.days}
                            onChange={(e) => setWorkoutForm({ ...workoutForm, days: Number(e.target.value) })}
                            className="mt-1 w-full rounded-lg border border-outline-variant bg-surface-container px-2.5 py-2 text-sm text-on-surface"
                          >
                            {[1, 2, 3, 4, 5, 6, 7].map((day) => <option key={day} value={day}>{day}x</option>)}
                          </select>
                        </label>
                        <label className="text-xs text-muted">
                          Local
                          <select
                            value={workoutForm.location}
                            onChange={(e) => setWorkoutForm({ ...workoutForm, location: e.target.value as "casa" | "academia" })}
                            className="mt-1 w-full rounded-lg border border-outline-variant bg-surface-container px-2.5 py-2 text-sm text-on-surface"
                          >
                            <option value="academia">Academia</option>
                            <option value="casa">Em casa</option>
                          </select>
                        </label>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <p className="text-[10px] text-muted">Envie para {persona.name} montar. Você pode acrescentar detalhes no campo abaixo.</p>
                        <button type="button" onClick={() => setWorkoutForm(null)} className="shrink-0 rounded-lg px-3 py-1.5 text-xs text-muted hover:bg-surface-container-high">Cancelar</button>
                      </div>
                    </motion.div>
                  ) : null}
                  {dietForm ? (
                    <motion.div
                      initial={{ opacity: 0, y: reduce ? 0 : 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl border border-primary/30 bg-primary/[0.04] p-4"
                    >
                      <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-on-surface">
                        <ChefHat className="size-4 text-primary" />
                        Montar cardápio
                      </p>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <label className="text-xs text-muted">
                          Objetivo
                          <select
                            value={dietForm.goal}
                            onChange={(e) => setDietForm({ ...dietForm, goal: e.target.value })}
                            className="mt-1 w-full rounded-lg border border-outline-variant bg-surface-container px-2.5 py-2 text-sm text-on-surface"
                          >
                            {DIET_GOAL_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                          </select>
                        </label>
                        <label className="text-xs text-muted">
                          Período
                          <select
                            value={dietForm.periodDays}
                            onChange={(e) => setDietForm({ ...dietForm, periodDays: Number(e.target.value) })}
                            className="mt-1 w-full rounded-lg border border-outline-variant bg-surface-container px-2.5 py-2 text-sm text-on-surface"
                          >
                            {[7, 14, 30].map((days) => <option key={days} value={days}>{days} dias</option>)}
                          </select>
                        </label>
                        <label className="text-xs text-muted">
                          Orçamento total (R$)
                          <input
                            type="text"
                            inputMode="decimal"
                            value={dietForm.budget}
                            onChange={(e) => setDietForm({ ...dietForm, budget: e.target.value })}
                            placeholder="Ex.: 350"
                            className="mt-1 w-full rounded-lg border border-outline-variant bg-surface-container px-2.5 py-2 text-sm text-on-surface placeholder:text-muted"
                          />
                        </label>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <p className="text-[10px] text-muted">Orçamento mínimo R$ 20,00. Acrescente restrições no campo abaixo.</p>
                        <button type="button" onClick={() => setDietForm(null)} className="shrink-0 rounded-lg px-3 py-1.5 text-xs text-muted hover:bg-surface-container-high">Cancelar</button>
                      </div>
                    </motion.div>
                  ) : null}
                  <div className="relative rounded-2xl border border-outline-variant bg-background/45 shadow-inner">
                    <AnimatePresence>
                      {showPalette ? (
                        <motion.div
                          className="absolute inset-x-3 bottom-full z-50 mb-2 overflow-hidden rounded-lg border border-outline-variant bg-surface-container-high/95 shadow-lg backdrop-blur-xl"
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 5 }}
                          transition={{ duration: 0.15 }}
                        >
                          <div className="py-1">
                            {visibleSuggestions.map((suggestion, index) => (
                              <button
                                key={suggestion.prefix}
                                type="button"
                                onClick={() => pick(index)}
                                className={cn(
                                  "flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors",
                                  active === index ? "bg-primary/10 text-on-surface" : "text-on-surface-variant hover:bg-surface-container",
                                )}
                              >
                                <span className="grid size-5 place-items-center text-muted">{suggestion.icon}</span>
                                <span className="font-medium">{suggestion.label}</span>
                                <span className="text-muted">{suggestion.description}</span>
                                <span className="ml-auto font-mono text-[10px] text-muted">{suggestion.prefix}</span>
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>

                    <label className="sr-only" htmlFor="assistant-command">Peça ao Agente de IA</label>
                    <textarea
                      ref={input}
                      id="assistant-command"
                      autoFocus
                      value={text}
                      onChange={(e) => { setText(e.target.value); adjust() }}
                      onKeyDown={onKeyDown}
                      placeholder={workoutForm || dietForm ? "Quer acrescentar algo? Ex.: tenho dor no joelho, sou vegetariano…" : `Fale com ${assistant.moduleContext ? personaFullName(persona) : persona.name}… ou digite / para comandos`}
                      className="min-h-14 w-full resize-none bg-transparent px-4 py-3 text-base leading-6 text-on-surface outline-none placeholder:text-muted"
                      style={{ overflow: "hidden" }}
                    />

                    <div className="flex items-center justify-between gap-3 px-3 pb-2.5">
                      <button
                        type="button"
                        onClick={() => { setText("/"); requestAnimationFrame(() => input.current?.focus()) }}
                        className={cn("grid size-9 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-container-high hover:text-on-surface", showPalette && "bg-primary/10 text-primary")}
                        aria-label="Comandos rápidos"
                      >
                        <Command className="size-4" />
                      </button>
                      <div className="flex items-center gap-3">
                        <kbd className="hidden text-[10px] text-muted sm:block">Enter envia · Shift+Enter quebra linha</kbd>
                        <motion.button
                          type="button"
                          onClick={workoutForm ? sendWorkoutProgram : dietForm ? sendDietPlan : send}
                          whileTap={reduce ? undefined : { scale: 0.97 }}
                          disabled={assistant.loading || (!workoutForm && !dietForm && !text.trim()) || (Boolean(dietForm) && !(Number(dietForm!.budget.replace(",", ".")) >= 20))}
                          className={cn(
                            "flex min-h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition-all",
                            !assistant.loading && (workoutForm || (dietForm && Number(dietForm.budget.replace(",", ".")) >= 20) || text.trim())
                              ? "bg-primary text-on-primary shadow-md"
                              : "bg-surface-container-high text-muted",
                          )}
                        >
                          {assistant.loading ? <LoaderCircle className="size-4 animate-spin" /> : <SendHorizonal className="size-4" />}
                          Enviar
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.section>
            </Dialog.Content>
          </div>
        </Dialog.Portal>
      </Dialog.Root>

      <AnimatePresence>
        {!assistant.open && assistant.result && assistant.result.status !== "refused" && assistant.result.status !== "query" ? (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: reduce ? 0 : 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-1/2 z-[150] flex w-[min(92vw,32rem)] -translate-x-1/2 items-center gap-3 rounded-xl border border-outline-variant bg-surface-container-high px-4 py-3 shadow-lg md:bottom-6"
          >
            <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
              <AssistantAvatar module={assistant.result.module === "query" ? null : assistant.result.module ?? null} className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-on-surface">{assistant.result.status === "undone" ? "Desfeito" : assistant.result.message}</p>
            </div>
            {assistant.result.undoAvailable && assistant.result.actionToken ? (
              <button disabled={assistant.loading} onClick={() => {
                const module = assistant.result?.module
                pendingHistoryKey.current = module === "financeiro" || module === "agenda" || module === "treinos" || module === "alimentacao" ? module : "geral"
                void assistant.undo(assistant.result?.actionToken, assistant.result?.module)
              }} className="flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-primary hover:bg-primary/10">
                <Undo2 className="size-4" />Desfazer
              </button>
            ) : null}
            <button onClick={assistant.dismiss} className="grid size-10 place-items-center rounded-lg text-muted hover:bg-surface-container" aria-label="Dispensar">
              <X className="size-4" />
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  )
}
