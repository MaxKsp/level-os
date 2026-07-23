export type AuthCallbackIntent = "login" | "recovery"

/**
 * O Supabase devolve o tipo de redirect junto da troca PKCE. A query `mode`
 * continua como fallback para links antigos, mas nao e a fonte principal.
 */
export function authCallbackIntent(
  searchParams: URLSearchParams,
  redirectType: string | null | undefined,
): AuthCallbackIntent {
  if (redirectType === "recovery") return "recovery"
  if (searchParams.get("type") === "recovery") return "recovery"
  if (searchParams.get("mode") === "recovery") return "recovery"
  return "login"
}
