import { beforeEach, describe, expect, it } from "vitest"
import { AUTH_STORAGE_KEY, authStorage, clearLegacySupabaseTokens } from "../auth/supabaseClient"

describe("Supabase auth storage", () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it("mantém tokens somente na sessão da aba", () => {
    authStorage.setItem(AUTH_STORAGE_KEY, "access-and-refresh-token")
    expect(sessionStorage.getItem(AUTH_STORAGE_KEY)).toBe("access-and-refresh-token")
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull()
  })

  it("mantém apenas o verificador PKCE no storage compartilhado", () => {
    const verifierKey = `${AUTH_STORAGE_KEY}-code-verifier`
    authStorage.setItem(verifierKey, "temporary-verifier")
    expect(localStorage.getItem(verifierKey)).toBe("temporary-verifier")
    expect(sessionStorage.getItem(verifierKey)).toBeNull()
  })

  it("remove sessões legadas sem invalidar um fluxo PKCE em andamento", () => {
    localStorage.setItem("sb-project-auth-token", "legacy-token")
    localStorage.setItem("sb-project-auth-token-code-verifier", "legacy-verifier")
    localStorage.setItem("unrelated", "keep")
    clearLegacySupabaseTokens()
    expect(localStorage.getItem("sb-project-auth-token")).toBeNull()
    expect(localStorage.getItem("sb-project-auth-token-code-verifier")).toBe("legacy-verifier")
    expect(localStorage.getItem("unrelated")).toBe("keep")
  })
})
