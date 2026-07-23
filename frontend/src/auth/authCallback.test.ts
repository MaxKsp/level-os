import { describe, expect, it } from "vitest"

import { authCallbackIntent } from "./authCallback"

describe("authCallbackIntent", () => {
  it("uses the PKCE redirect type returned by Supabase for password recovery", () => {
    expect(authCallbackIntent(new URLSearchParams("code=abc"), "recovery")).toBe("recovery")
  })

  it("keeps compatibility with recovery links that carry mode or type", () => {
    expect(authCallbackIntent(new URLSearchParams("mode=recovery"), null)).toBe("recovery")
    expect(authCallbackIntent(new URLSearchParams("type=recovery"), null)).toBe("recovery")
  })

  it("treats a regular OAuth callback as login", () => {
    expect(authCallbackIntent(new URLSearchParams("code=abc"), null)).toBe("login")
  })
})
