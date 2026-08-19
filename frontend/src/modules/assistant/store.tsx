import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react"
import { useNavigate } from "react-router-dom"
import { resolveAssistantConfirmation, sendAssistantCommand, undoAssistantAction, type AssistantApproval } from "./api"
import type { AssistantResponse } from "./contracts"
import { useFinance } from "../finance/store"
import { useTraining } from "../training/store"
import { useNutrition } from "../nutrition/store"
import { useApp } from "../../context/AppContext"
import { useProgress } from "../progress/store"
import { useOptionalSubscription } from "../subscription/store"

export type AssistantModule = "financeiro" | "agenda" | "treinos" | "alimentacao"

interface Value {
  open: boolean
  setOpen: (open: boolean) => void
  openFor: (module: AssistantModule) => void
  moduleContext: AssistantModule | null
  loading: boolean
  phase: "analyzing" | "consulting" | null
  error: string | null
  result: AssistantResponse | null
  paidAccess: boolean
  planReady: boolean
  submit: (text: string) => Promise<void>
  undo: (actionToken?: string | null, module?: AssistantResponse["module"]) => Promise<void>
  resolveConfirmation: (actionToken: string, decision: "confirm" | "cancel", module?: AssistantResponse["module"], approval?: AssistantApproval) => Promise<void>
  dismiss: () => void
}
const Ctx = createContext<Value | undefined>(undefined)

export function AssistantProvider({ children }: { children: ReactNode }) {
  const [open, setOpenState] = useState(false)
  const [moduleContext, setModuleContext] = useState<AssistantModule | null>(null)
  const [loading, setLoading] = useState(false)
  const [phase, setPhase] = useState<Value["phase"]>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AssistantResponse | null>(null)
  const { refresh: refreshFinance } = useFinance()
  const { refresh: refreshTraining } = useTraining()
  const { refresh: refreshNutrition } = useNutrition()
  const { refreshTasks } = useApp()
  const { refresh: refreshProgress } = useProgress()
  const navigate = useNavigate()
  const subscriptionContext = useOptionalSubscription()
  const paidAccess = subscriptionContext === null
    ? true
    : subscriptionContext.status === "ready" && subscriptionContext.subscription.paid_access
  const planReady = subscriptionContext?.status !== "loading"

  const setOpen = useCallback((value: boolean) => {
    setOpenState(value)
    if (!value) setModuleContext(null)
  }, [])
  const openFor = useCallback((module: AssistantModule) => {
    setModuleContext(module)
    setOpenState(true)
  }, [])

  const refresh = useCallback(async (module?: AssistantResponse["module"]) => {
    const requests: Promise<void>[] = [refreshProgress()]
    if (module === "financeiro") requests.push(refreshFinance())
    if (module === "agenda") requests.push(refreshTasks())
    if (module === "treinos") requests.push(refreshTraining())
    if (module === "alimentacao") requests.push(refreshNutrition())
    await Promise.allSettled(requests)
    if (module === "financeiro") navigate("/financeiro")
    if (module === "agenda") navigate("/agenda")
    if (module === "treinos") navigate("/treinos")
    if (module === "alimentacao") navigate("/alimentacao")
  }, [navigate, refreshFinance, refreshNutrition, refreshProgress, refreshTasks, refreshTraining])

  const submit = useCallback(async (text: string) => {
    if (!paidAccess) {
      setError("O Agente de IA é uma funcionalidade exclusiva do plano pago.")
      return
    }
    setLoading(true); setPhase("analyzing"); setError(null)
    const phaseTimer = window.setTimeout(() => setPhase("consulting"), 550)
    try {
      const response = await sendAssistantCommand(text, moduleContext)
      setResult(response)
      if (response.status === "applied") await refresh(response.module)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Agente de IA indisponível.")
    } finally {
      window.clearTimeout(phaseTimer)
      setPhase(null)
      setLoading(false)
    }
  }, [moduleContext, paidAccess, refresh])

  const undo = useCallback(async (actionToken?: string | null, module?: AssistantResponse["module"]) => {
    if (!paidAccess) {
      setError("O Agente de IA é uma funcionalidade exclusiva do plano pago.")
      return
    }
    const token = actionToken ?? result?.actionToken
    const sourceModule = module ?? result?.module
    if (!token) return
    setLoading(true); setError(null)
    try {
      const response = await undoAssistantAction(token)
      setResult(response)
      await refresh(sourceModule)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível desfazer.")
    } finally {
      setLoading(false)
    }
  }, [paidAccess, refresh, result?.actionToken, result?.module])

  const resolveConfirmation = useCallback(async (actionToken: string, decision: "confirm" | "cancel", module?: AssistantResponse["module"], approval?: AssistantApproval) => {
    if (!paidAccess) {
      setError("O Agente de IA é uma funcionalidade exclusiva do plano pago.")
      return
    }
    setLoading(true); setError(null)
    try {
      const response = await resolveAssistantConfirmation(actionToken, decision, approval)
      setResult(response)
      if (decision === "confirm") await refresh(module ?? response.module)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível confirmar a ação.")
    } finally {
      setLoading(false)
    }
  }, [paidAccess, refresh])

  const dismiss = useCallback(() => { setResult(null); setError(null) }, [])
  const value = useMemo<Value>(() => ({
    open, setOpen, openFor, moduleContext, loading, phase, error, result, paidAccess,
    planReady, submit, undo, resolveConfirmation, dismiss,
  }), [dismiss, error, loading, moduleContext, open, openFor, paidAccess, phase, planReady, resolveConfirmation, result, setOpen, submit, undo])

  return (
    <Ctx.Provider value={value}>
      {children}
    </Ctx.Provider>
  )
}

export function useAssistant() {
  const value = useContext(Ctx)
  if (!value) throw new Error("useAssistant precisa estar dentro de AssistantProvider")
  return value
}
