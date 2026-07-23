import { afterEach, describe, expect, it } from "vitest"
import { clearUnscopedUserStorage, userStorageKey } from "../lib/userStorage"

describe("armazenamento isolado por usuário", () => {
  afterEach(() => {
    delete window.LEVEL_OS_USER_SCOPE
  })

  it("gera chaves diferentes para contas diferentes no mesmo navegador", () => {
    window.LEVEL_OS_USER_SCOPE = "101"
    const firstKey = userStorageKey("level-os:profile:v1")
    localStorage.setItem(firstKey, JSON.stringify({ name: "Conta A" }))

    window.LEVEL_OS_USER_SCOPE = "202"
    const secondKey = userStorageKey("level-os:profile:v1")

    expect(secondKey).not.toBe(firstKey)
    expect(localStorage.getItem(secondKey)).toBeNull()
    expect(localStorage.getItem(firstKey)).toContain("Conta A")
  })

  it("descarta caches globais sem apagar o cache que já possui dono", () => {
    localStorage.setItem("level-os:finance:v1", "dados-sem-dono")
    localStorage.setItem("level-os:tasks", "tarefas-sem-dono")
    window.LEVEL_OS_USER_SCOPE = "101"
    const ownedKey = userStorageKey("level-os:finance:v1")
    localStorage.setItem(ownedKey, "dados-da-conta")

    clearUnscopedUserStorage()

    expect(localStorage.getItem("level-os:finance:v1")).toBeNull()
    expect(localStorage.getItem("level-os:tasks")).toBeNull()
    expect(localStorage.getItem(ownedKey)).toBe("dados-da-conta")
  })
})

