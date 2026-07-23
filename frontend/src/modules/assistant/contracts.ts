export type AssistantStatus = "applied" | "answered" | "query" | "clarification" | "refused" | "undone" | "confirmation" | "cancelled"
export interface AssistantResponse {
  ok: boolean
  status: AssistantStatus
  action?: string
  message: string
  module?: "financeiro" | "agenda" | "treinos" | "alimentacao" | "query" | null
  undoAvailable: boolean
  actionToken?: string | null
  undoExpiresAt?: string | null
  confirmationRequired?: boolean
  confirmationExpiresAt?: string | null
  provider?: string
  data?: unknown
}

export interface AssistantHistoryExchange {
  requestId: string
  createdAt: string
  userText: string
  response: AssistantResponse
}
