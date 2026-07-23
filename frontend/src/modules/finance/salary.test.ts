import { describe, expect, it } from "vitest"
import { toMoneyCents } from "../../lib/money"
import { calculateInss, calculateSalary, EMPTY_SALARY_INPUT } from "./salary"

describe("calculadora CLT 2026", () => {
  it("calcula INSS progressivo por faixa e respeita o teto", () => {
    expect(calculateInss(1_621)).toBe(121.58)
    expect(calculateInss(3_000)).toBe(248.6)
    expect(calculateInss(20_000)).toBe(988.09)
  })

  it("aplica dependentes, pensão e redução mensal do IRRF", () => {
    const withoutDependents = calculateSalary({ ...EMPTY_SALARY_INPUT, grossSalary: 6_000 })
    const withDependents = calculateSalary({ ...EMPTY_SALARY_INPUT, grossSalary: 6_000, dependents: 2, pension: 300 })

    expect(withoutDependents.irrf).toBeGreaterThan(0)
    expect(withDependents.taxableBase).toBeLessThan(withoutDependents.taxableBase)
    expect(withDependents.irrf).toBeLessThan(withoutDependents.irrf)
  })

  it("aplica o desconto simplificado mensal quando supera as deduções legais", () => {
    const simplified = calculateSalary({ ...EMPTY_SALARY_INPUT, grossSalary: 3_000 })
    const legal = calculateSalary({ ...EMPTY_SALARY_INPUT, grossSalary: 3_000, dependents: 3 })

    expect(simplified.taxableBase).toBe(2_392.8)
    expect(legal.taxableBase).toBeLessThan(simplified.taxableBase)
  })

  it("respeita os limites da redução do IRRF em 2026", () => {
    const exempt = calculateSalary({ ...EMPTY_SALARY_INPUT, grossSalary: 5_000 })
    const firstCentAbove = calculateSalary({ ...EMPTY_SALARY_INPUT, grossSalary: 5_000.01 })
    const partialLimit = calculateSalary({ ...EMPTY_SALARY_INPUT, grossSalary: 7_350 })

    expect(exempt.irrf).toBe(0)
    expect(firstCentAbove.irrf).toBeGreaterThanOrEqual(0)
    expect(partialLimit.irrf).toBeGreaterThan(firstCentAbove.irrf)
  })

  it("limita o desconto do vale-transporte a 6% do bruto", () => {
    const result = calculateSalary({
      ...EMPTY_SALARY_INPUT,
      grossSalary: 4_000,
      hasTransportVoucher: true,
      transportVoucherBenefit: 500,
    })
    expect(result.transportVoucherDiscount).toBe(240)
    expect(result.benefits.transportVoucher).toBe(500)
  })

  it("separa benefícios informativos do salário líquido", () => {
    const base = calculateSalary({ ...EMPTY_SALARY_INPUT, grossSalary: 4_000 })
    const withBenefits = calculateSalary({ ...EMPTY_SALARY_INPUT, grossSalary: 4_000, mealVoucher: 800, foodAllowance: 300 })
    expect(withBenefits.netSalary).toBe(base.netSalary)
    expect(withBenefits.benefits).toMatchObject({ mealVoucher: 800, foodAllowance: 300 })
  })

  it("nunca produz líquido negativo em casos de borda", () => {
    const result = calculateSalary({ ...EMPTY_SALARY_INPUT, grossSalary: 1_000, healthPlan: 2_000, otherDiscounts: 500 })
    expect(result.netSalary).toBe(0)
  })

  it("mantém todos os componentes da folha em centavos exatos", () => {
    const result = calculateSalary({ ...EMPTY_SALARY_INPUT, grossSalary: 4_321.09, healthPlan: 0.1, dentalPlan: 0.2 })
    for (const value of [result.grossSalary, result.inss, result.irrf, result.taxableBase, result.healthPlan, result.dentalPlan, result.netSalary]) {
      expect(Number.isInteger(Math.round(value * 100))).toBe(true)
    }
    expect(toMoneyCents(result.healthPlan) + toMoneyCents(result.dentalPlan)).toBe(30)
    expect(toMoneyCents(result.netSalary)).toBe(
      Math.max(
        0,
        toMoneyCents(result.grossSalary)
          - toMoneyCents(result.inss)
          - toMoneyCents(result.irrf)
          - toMoneyCents(result.transportVoucherDiscount)
          - toMoneyCents(result.healthPlan)
          - toMoneyCents(result.dentalPlan)
          - toMoneyCents(result.pension)
          - toMoneyCents(result.otherDiscounts),
      ),
    )
  })
})
