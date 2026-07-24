import { afterEach, describe, expect, it } from "vitest"
import { clearSensitiveBrowserCaches, clearUnscopedUserStorage, userStorageKey } from "../lib/userStorage"

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
  it("remove caches sensíveis sem apagar preferências visuais", () => {
    window.LEVEL_OS_USER_SCOPE = "current"
    localStorage.setItem("level-os:finance:v1:user:old", "finance")
    localStorage.setItem("level-os:profile:v1:user:current", "profile")
    localStorage.setItem("level-os:theme", "light")
    localStorage.setItem("level-os:notifications:v1:user:current", "{}")

    clearSensitiveBrowserCaches()

    expect(localStorage.getItem("level-os:finance:v1:user:old")).toBeNull()
    expect(localStorage.getItem("level-os:profile:v1:user:current")).toBeNull()
    expect(localStorage.getItem("level-os:theme")).toBe("light")
    expect(localStorage.getItem("level-os:notifications:v1:user:current")).toBe("{}")
  })
})
