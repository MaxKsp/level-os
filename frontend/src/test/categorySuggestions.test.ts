import { describe, expect, it } from "vitest"
import { suggestExpenseCategory } from "../modules/finance/categorySuggestions"

describe("suggestExpenseCategory", () => {
  it("categoriza descrições financeiras comuns sem IA", () => {
    expect(suggestExpenseCategory("Compra no supermercado")).toBe("alimentacao")
    expect(suggestExpenseCategory("Gasolina do carro")).toBe("transporte")
    expect(suggestExpenseCategory("Mensalidade Netflix")).toBe("assinaturas")
  })

  it("não força categoria quando não há contexto suficiente", () => {
    expect(suggestExpenseCategory("x")).toBeNull()
    expect(suggestExpenseCategory("Pagamento diverso")).toBeNull()
  })
})
