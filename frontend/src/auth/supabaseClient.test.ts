import { afterEach, describe, expect, it, vi } from "vitest"
import { exchangePhpSession } from "./supabaseClient"

describe("exchangePhpSession", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    delete window.CSRF_TOKEN
  })

  it("sincroniza o novo CSRF quando o backend regenera a sessao PHP", async () => {
    window.CSRF_TOKEN = "csrf-anterior"
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(
      JSON.stringify({ status: "authenticated", created: false }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": "csrf-renovado",
        },
      },
    ))

    const result = await exchangePhpSession({ access_token: "supabase-token" } as never)

    expect(result).toBe("authenticated")
    expect(window.CSRF_TOKEN).toBe("csrf-renovado")
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth-supabase-exchange.php",
      expect.objectContaining({
        headers: expect.objectContaining({ "X-CSRF-Token": "csrf-anterior" }),
      }),
    )
  })

  it("mantem o login bloqueado quando o segundo fator local ainda e necessario", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(
      JSON.stringify({ status: "mfa_required" }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ))

    await expect(exchangePhpSession({ access_token: "supabase-token" } as never))
      .resolves.toBe("mfa_required")
  })

  it("solicita AAL2 quando o usuario possui TOTP verificado no Supabase", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(
      JSON.stringify({ status: "supabase_mfa_required" }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    ))

    await expect(exchangePhpSession({ access_token: "supabase-token" } as never))
      .resolves.toBe("supabase_mfa_required")
  })
})
