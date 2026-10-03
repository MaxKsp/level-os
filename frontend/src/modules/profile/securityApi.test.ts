import { afterEach, describe, expect, it, vi } from "vitest"
import { disableTotp, enrollTotp } from "./securityApi"

afterEach(() => {
  vi.unstubAllGlobals()
  delete window.CSRF_TOKEN
})

describe("controles de MFA", () => {
  it("envia o fator atual para contas passwordless, sem expor credenciais na URL", async () => {
    window.CSRF_TOKEN = "csrf-example"
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }))
    vi.stubGlobal("fetch", fetchMock)
    await disableTotp("", "123456")
    expect(fetchMock).toHaveBeenCalledWith("/api/totp-disable.php", expect.objectContaining({
      method: "POST",
      credentials: "same-origin",
      body: JSON.stringify({ password: "", code: "123456" }),
      headers: expect.objectContaining({ "X-CSRF-Token": "csrf-example" }),
    }))
  })

  it("mostra o conflito e não permite substituir silenciosamente um 2FA ativo", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ error: "O 2FA existente deve ser desativado com reautenticação." }),
      { status: 409, headers: { "Content-Type": "application/json" } },
    )))
    await expect(enrollTotp()).rejects.toThrow("reautenticação")
  })
})
