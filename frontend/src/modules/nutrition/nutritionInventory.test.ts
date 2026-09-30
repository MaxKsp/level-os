import { describe, expect, it } from "vitest"
import type { PantryItem } from "./nutritionWorkspace"
import type { ShoppingItem } from "./store"
import { foodKey, inventoryCoverage, parseShoppingQuantity, shoppingRemaining } from "./nutritionInventory"

const item = (name: string, quantity: string): ShoppingItem => ({ item: name, quantity, category: "mercearia" })
const stock = (name: string, quantity: number, unit: PantryItem["unit"], expiresOn: string | null = null): PantryItem =>
  ({ id: name + unit, name, quantity, unit, category: "mercearia", expiresOn })

describe("Reconciliação conservadora da lista com a despensa", () => {
  it("lê valores brasileiros e unidades; não adivinha textos imprecisos", () => {
    expect(parseShoppingQuantity("1,5 kg")).toMatchObject({ value: 1.5, amount: 1500, base: "g" })
    expect(parseShoppingQuantity("2 unidades")).toMatchObject({ value: 2, unit: "un" })
    expect(parseShoppingQuantity("1 dúzia")).toBeNull()
    expect(parseShoppingQuantity("2")).toBeNull()
    expect(foodKey("Café   Torrado!")).toBe("cafe torrado")
  })
  it("soma gramas e quilos equivalentes sem confundir sal e salmão", () => {
    const result = inventoryCoverage(item("Sal", "500 g"),
      [stock("Salmão", 2, "kg"), stock("Sál", 0.2, "kg"), stock("Sal", 100, "g")], "2026-09-29")
    expect(result).toMatchObject({ status: "partial", available: 300, missing: 200, base: "g" })
  })
  it("não considera vencidos, ausentes, inconsistência de unidade ou quantidade ambígua", () => {
    expect(inventoryCoverage(item("Frango", "1 kg"), [stock("Frango", 2, "kg", "2026-09-28")], "2026-09-29").status).toBe("missing")
    expect(inventoryCoverage(item("Frango", "1 kg"), [stock("Frango", 2, "un")], "2026-09-29").status).toBe("check")
    expect(inventoryCoverage(item("Frango", "1 bandeja"), [stock("Frango", 1, "kg")], "2026-09-29").status).toBe("check")
    expect(inventoryCoverage(item("Frango", "1 kg"), [stock("Frango", 1, "kg")], "2026-09-29").status).toBe("sufficient")
  })
  it("exporta só o faltante, sem confundir carrinho com estoque ou supor unidade ambígua", () => {
    const items = [item("Arroz", "1 kg"), item("Frango", "1 kg"), item("Ovos", "1 dúzia"), item("Sal", "200 g")]
    const pantry = [stock("Arroz", 1, "kg"), stock("Frango", 0.5, "kg"), stock("Ovos", 6, "un")]
    const lines = shoppingRemaining(items, pantry, new Set<number>([3]), "2026-09-29").map((entry) => entry.line)
    expect(lines).toEqual(["Frango — 500 g (falta estimada)", "Ovos — 1 dúzia (verificar unidade na despensa)"])
  })
})
