import type { AgentHistoryKey } from "./agentHistory"
import type { AssistantHistoryExchange, AssistantResponse } from "./contracts"

declare global { interface Window { CSRF_TOKEN?: string } }

async function read<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null)
  if (!response.ok) {
    const code = body?.error
    const message = body?.message
      ?? (code === "assistant_unavailable"
        ? "Todos os provedores gratuitos atingiram o limite ou estão indisponíveis."
        : code === "assistant_daily_limit"
          ? "O limite diário do Agente de IA foi atingido. Consultas locais continuam disponíveis."
          : code === "plan_required" || code === "paid_plan_required"
            ? "O Agente de IA é uma funcionalidade exclusiva do plano pago."
            : code === "invalid csrf token"
              ? "Sua sessão foi atualizada. Recarregue a página e tente novamente."
              : "Não foi possível executar a ação.")
    throw new Error(message)
  }
  return body as T
}

export async function sendAssistantCommand(text: string, module?: string | null): Promise<AssistantResponse> {
  return read<AssistantResponse>(await fetch("/api/assistant.php", {
    method: "POST",
    credentials: "same-origin",
    headers: { Accept: "application/json", "Content-Type": "application/json", "X-CSRF-Token": window.CSRF_TOKEN ?? "" },
    body: JSON.stringify({ requestId: `web_${crypto.randomUUID().replaceAll("-", "")}`, text, module: module ?? undefined }),
  }))
}

export async function undoAssistantAction(actionToken: string): Promise<AssistantResponse> {
  return read<AssistantResponse>(await fetch("/api/assistant-undo.php", {
    method: "POST",
    credentials: "same-origin",
    headers: { Accept: "application/json", "Content-Type": "application/json", "X-CSRF-Token": window.CSRF_TOKEN ?? "" },
    body: JSON.stringify({ actionToken }),
  }))
}

export interface AssistantApproval {
  mode?: "replace_all" | "append" | "replace_selected"
  selectedWorkoutIds?: string[]
  draft?: Record<string, unknown>
}

export async function resolveAssistantConfirmation(actionToken: string, decision: "confirm" | "cancel", approval?: AssistantApproval): Promise<AssistantResponse> {
  return read<AssistantResponse>(await fetch("/api/assistant-confirm.php", {
    method: "POST",
    credentials: "same-origin",
    headers: { Accept: "application/json", "Content-Type": "application/json", "X-CSRF-Token": window.CSRF_TOKEN ?? "" },
    body: JSON.stringify({ actionToken, decision, approval }),
  }))
}

export async function getAssistantHistory(agent: AgentHistoryKey): Promise<AssistantHistoryExchange[]> {
  const result = await read<{ items?: AssistantHistoryExchange[] }>(await fetch(`/api/assistant-history.php?agent=${encodeURIComponent(agent)}&limit=50`, {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  }))
  return Array.isArray(result.items) ? result.items : []
}

export async function clearAssistantHistory(agent: AgentHistoryKey): Promise<void> {
  await read<{ ok: boolean }>(await fetch(`/api/assistant-history.php?agent=${encodeURIComponent(agent)}`, {
    method: "DELETE",
    credentials: "same-origin",
    headers: { Accept: "application/json", "X-CSRF-Token": window.CSRF_TOKEN ?? "" },
  }))
}
