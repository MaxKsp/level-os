import { createContext, useCallback, useContext, useState, type ReactNode } from "react"
import { useNavigate } from "react-router-dom"
import { resolveAssistantConfirmation, sendAssistantCommand, undoAssistantAction, type AssistantApproval } from "./api"
import type { AssistantResponse } from "./contracts"
import { useFinance } from "../finance/store"
import { useTraining } from "../training/store"
import { useNutrition } from "../nutrition/store"
import { useApp } from "../../context/AppContext"
import { useProgress } from "../progress/store"

export type AssistantModule = "financeiro" | "agenda" | "treinos" | "alimentacao"

interface Value {
  open: boolean
  setOpen: (open: boolean) => void
  openFor: (module: AssistantModule) => void
  moduleContext: AssistantModule | null
  loading: boolean
  error: string | null
  result: AssistantResponse | null
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
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AssistantResponse | null>(null)
  const finance = useFinance(), training = useTraining(), nutrition = useNutrition(), app = useApp(), progress = useProgress(), navigate = useNavigate()

  const setOpen = useCallback((value: boolean) => {
    setOpenState(value)
    if (!value) setModuleContext(null)
  }, [])
  const openFor = useCallback((module: AssistantModule) => {
    setModuleContext(module)
    setOpenState(true)
  }, [])

  const refresh = useCallback(async (module?: AssistantResponse["module"]) => {
    const requests: Promise<void>[] = [progress.refresh()]
    if (module === "financeiro") requests.push(finance.refresh())
    if (module === "agenda") requests.push(app.refreshTasks())
    if (module === "treinos") requests.push(training.refresh())
    if (module === "alimentacao") requests.push(nutrition.refresh())
    await Promise.allSettled(requests)
    if (module === "financeiro") navigate("/financeiro")
    if (module === "agenda") navigate("/agenda")
    if (module === "treinos") navigate("/treinos")
    if (module === "alimentacao") navigate("/alimentacao")
  }, [app, finance, navigate, nutrition, progress, training])

  const submit = async (text: string) => {
    setLoading(true); setError(null)
    try {
      const response = await sendAssistantCommand(text, moduleContext)
      setResult(response)
      await refresh(response.module)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Agente de IA indisponível.")
    } finally {
      setLoading(false)
    }
  }

  const undo = async (actionToken?: string | null, module?: AssistantResponse["module"]) => {
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
  }

  const resolveConfirmation = async (actionToken: string, decision: "confirm" | "cancel", module?: AssistantResponse["module"], approval?: AssistantApproval) => {
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
  }

  return (
    <Ctx.Provider value={{ open, setOpen, openFor, moduleContext, loading, error, result, submit, undo, resolveConfirmation, dismiss: () => { setResult(null); setError(null) } }}>
      {children}
    </Ctx.Provider>
  )
}

export function useAssistant() {
  const value = useContext(Ctx)
  if (!value) throw new Error("useAssistant precisa estar dentro de AssistantProvider")
  return value
}
