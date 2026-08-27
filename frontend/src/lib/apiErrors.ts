/**
 * Mapa central de erros da API.
 *
 * REGRA: a API pode devolver um código estável (`plan_required`, `csrf_invalid`, …),
 * mas a interface nunca mostra esse código, mensagem de SQL, nome de classe ou stack.
 * Toda tela traduz o código para uma frase clara usando `describeApiError`.
 */

export const API_ERROR_CODES = [
  "plan_required",
  "email_verification_required",
  "authentication_required",
  "csrf_invalid",
  "validation_failed",
  "account_not_found",
  "duplicate_transaction",
  "rate_limited",
  "synchronization_failed",
  "service_unavailable",
] as const

export type ApiErrorCode = (typeof API_ERROR_CODES)[number]

export interface ApiErrorCopy {
  /** Frase curta para o usuário. Nunca contém código interno. */
  message: string
  /** Rótulo da ação principal, quando existir uma saída útil. */
  action?: string
  /** Indica que o caminho de assinatura deve ser oferecido. */
  upgrade?: boolean
  /** Indica que recarregar a página resolve. */
  reload?: boolean
}

const COPY: Record<ApiErrorCode, ApiErrorCopy> = {
  plan_required: {
    message: "Adicionar movimentações é um recurso do plano Individual.",
    action: "Conhecer o plano",
    upgrade: true,
  },
  email_verification_required: {
    message: "Confirme seu e-mail para usar este recurso.",
    action: "Reenviar confirmação",
  },
  authentication_required: {
    message: "Sua sessão expirou. Entre novamente para continuar.",
    action: "Entrar",
    reload: true,
  },
  csrf_invalid: {
    message: "Sua sessão foi atualizada. Recarregue a página e tente novamente.",
    action: "Recarregar",
    reload: true,
  },
  validation_failed: { message: "Confira os dados informados e tente novamente." },
  account_not_found: { message: "A conta selecionada não está mais disponível." },
  duplicate_transaction: { message: "Esse lançamento parece já ter sido registrado." },
  rate_limited: { message: "Muitas tentativas em pouco tempo. Aguarde alguns instantes." },
  synchronization_failed: { message: "Não foi possível salvar agora. Tente novamente." },
  service_unavailable: { message: "O serviço está indisponível no momento. Tente novamente em instantes." },
}

/** Códigos vindos do servidor que apontam para a mesma intenção. */
const ALIASES: Record<string, ApiErrorCode> = {
  paid_plan_required: "plan_required",
  plan_required: "plan_required",
  email_not_verified: "email_verification_required",
  email_verification_required: "email_verification_required",
  unauthorized: "authentication_required",
  authentication_required: "authentication_required",
  "invalid csrf token": "csrf_invalid",
  invalid_csrf_token: "csrf_invalid",
  csrf_invalid: "csrf_invalid",
  invalid_payload: "validation_failed",
  validation_failed: "validation_failed",
  "payload too large": "validation_failed",
  account_not_found: "account_not_found",
  duplicate_transaction: "duplicate_transaction",
  rate_limited: "rate_limited",
  too_many_requests: "rate_limited",
  service_unavailable: "service_unavailable",
}

const STATUS_MAP: Record<number, ApiErrorCode> = {
  400: "validation_failed",
  401: "authentication_required",
  402: "plan_required",
  403: "csrf_invalid",
  404: "account_not_found",
  409: "duplicate_transaction",
  413: "validation_failed",
  422: "validation_failed",
  429: "rate_limited",
  503: "service_unavailable",
}

function isApiErrorCode(value: string): value is ApiErrorCode {
  return (API_ERROR_CODES as readonly string[]).includes(value)
}

/** Converte código bruto + status HTTP em um código conhecido do mapa. */
export function normalizeApiErrorCode(rawCode: string | null, status: number): ApiErrorCode {
  const clean = rawCode?.trim().toLowerCase() ?? ""
  if (clean && ALIASES[clean]) return ALIASES[clean]
  if (clean && isApiErrorCode(clean)) return clean
  return STATUS_MAP[status] ?? "synchronization_failed"
}

/**
 * Erro de API já classificado. `message` guarda o texto humano, de modo que
 * qualquer `catch` genérico que exiba `error.message` continue seguro.
 */
export class ApiError extends Error {
  readonly code: ApiErrorCode
  readonly status: number
  readonly requiredPlan: string | null

  constructor(code: ApiErrorCode, status: number, requiredPlan: string | null = null) {
    super(COPY[code].message)
    this.name = "ApiError"
    this.code = code
    this.status = status
    this.requiredPlan = requiredPlan
  }
}

/** Texto e ação para qualquer falha, inclusive rede e erros desconhecidos. */
export function describeApiError(cause: unknown, fallback: ApiErrorCode = "synchronization_failed"): ApiErrorCopy {
  if (cause instanceof ApiError) return COPY[cause.code]
  if (cause instanceof TypeError) return COPY.service_unavailable
  return COPY[fallback]
}

/** Código classificado de qualquer falha, útil para decidir CTA e telemetria. */
export function apiErrorCode(cause: unknown, fallback: ApiErrorCode = "synchronization_failed"): ApiErrorCode {
  if (cause instanceof ApiError) return cause.code
  if (cause instanceof TypeError) return "service_unavailable"
  return fallback
}
