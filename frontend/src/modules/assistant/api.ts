import type { AgentHistoryKey } from "./agentHistory"
import type { AssistantHistoryExchange, AssistantInsight, AssistantQualitySummary, AssistantResponse } from "./contracts"

declare global { interface Window { CSRF_TOKEN?: string } }

async function read<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null)
  if (!response.ok) {
    const code = body?.error
    const fallbackByCode: Record<string, string> = {
      assistant_provider_limit: "O provedor atingiu o limite temporário. Tente novamente em alguns minutos.",
      assistant_unavailable: "O Agente de IA está temporariamente indisponível. Tente novamente em alguns minutos.",
      assistant_daily_limit: "Seu limite diário foi atingido. Consultas processadas localmente continuam disponíveis.",
      assistant_missing_data: "Faltam dados para concluir. Confira os campos indicados pelo agente.",
      assistant_account_not_found: "A conta informada não foi encontrada. Escolha uma conta cadastrada.",
      assistant_duplicate: "Esta solicitação já foi processada e não será duplicada.",
      assistant_conflict: "Os dados mudaram enquanto você confirmava. Revise a proposta atualizada.",
      confirmation_conflict: "Os dados mudaram enquanto você confirmava. Envie o pedido novamente.",
      confirmation_expired: "A confirmação expirou. Envie o pedido novamente.",
      confirmation_unavailable: "Esta confirmação não está mais disponível.",
      undo_expired: "O prazo para desfazer terminou.",
      undo_unavailable: "Esta ação não pode mais ser desfeita.",
      undo_conflict: "Os dados mudaram e a ação não pode ser desfeita com segurança.",
      request_in_progress: "Esta solicitação ainda está sendo processada.",
    }
    const message = body?.message
      ?? fallbackByCode[String(code ?? "")]
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

export async function getAssistantInsights(module: string): Promise<AssistantInsight[]> {
  const result = await read<{ items?: AssistantInsight[] }>(await fetch(`/api/assistant-insights.php?module=${encodeURIComponent(module)}`, {
    credentials: "same-origin", headers: { Accept: "application/json" },
  }))
  return Array.isArray(result.items) ? result.items : []
}

export async function getAssistantQuality(days = 7): Promise<AssistantQualitySummary> {
  return read<AssistantQualitySummary>(await fetch(`/api/assistant-quality.php?days=${Math.max(1, Math.min(90, days))}`, {
    credentials: "same-origin", headers: { Accept: "application/json" },
  }))
}
