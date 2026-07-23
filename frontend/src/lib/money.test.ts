import { describe, expect, it } from "vitest"
import { addMoney, fromMoneyCents, subtractMoney, sumMoney, toMoneyCents } from "./money"

describe("dinheiro em centavos", () => {
  it("elimina drift binário em somas e subtrações", () => {
    expect(addMoney(0.1, 0.2)).toBe(0.3)
    expect(subtractMoney(10, 9.99)).toBe(0.01)
    expect(sumMoney([0.1, 0.2, 10.01])).toBe(10.31)
  })

  it("converte somente nas bordas", () => {
    expect(toMoneyCents(4321.09)).toBe(432109)
    expect(fromMoneyCents(432109)).toBe(4321.09)
  })
})
