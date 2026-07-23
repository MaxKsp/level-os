/**
 * Tabelas oficiais para estimativa mensal de salário CLT — competência 2026.
 * Revisar anualmente antes da primeira folha do novo ano.
 *
 * Fontes: INSS (Portaria Interministerial MPS/MF nº 13/2026) e tabela mensal
 * do IRPF 2026 da Receita Federal. O resultado é apenas uma estimativa: folha,
 * convenção coletiva e deduções específicas podem alterar o valor real.
 */
import { fromMoneyCents, toMoneyCents } from "../../lib/money"

export const CLT_TABLES_2026 = {
  year: 2026,
  inss: [
    { upTo: 1_621, rate: 0.075 },
    { upTo: 2_902.84, rate: 0.09 },
    { upTo: 4_354.27, rate: 0.12 },
    { upTo: 8_475.55, rate: 0.14 },
  ],
  irrf: [
    { upTo: 2_428.8, rate: 0, deduction: 0 },
    { upTo: 2_826.65, rate: 0.075, deduction: 182.16 },
    { upTo: 3_751.05, rate: 0.15, deduction: 394.16 },
    { upTo: 4_664.68, rate: 0.225, deduction: 675.49 },
    { upTo: Number.POSITIVE_INFINITY, rate: 0.275, deduction: 908.73 },
  ],
  dependentDeduction: 189.59,
  // Desconto simplificado mensal de 2026; substitui as deduções legais quando maior.
  simplifiedMonthlyDeduction: 607.2,
  transportVoucherRate: 0.06,
  irReduction: {
    exemptUntil: 5_000,
    partialUntil: 7_350,
    intercept: 978.62,
    slope: 0.133145,
  },
} as const

export interface SalaryInput {
  grossSalary: number
  dependents: number
  hasTransportVoucher: boolean
  transportVoucherBenefit: number
  healthPlan: number
  dentalPlan: number
  pension: number
  otherDiscounts: number
  mealVoucher: number
  foodAllowance: number
}

export interface SalaryEstimate {
  grossSalary: number
  inss: number
  irrf: number
  taxableBase: number
  transportVoucherDiscount: number
  healthPlan: number
  dentalPlan: number
  pension: number
  otherDiscounts: number
  netSalary: number
  benefits: {
    transportVoucher: number
    mealVoucher: number
    foodAllowance: number
  }
}

export const EMPTY_SALARY_INPUT: SalaryInput = {
  grossSalary: 0,
  dependents: 0,
  hasTransportVoucher: false,
  transportVoucherBenefit: 0,
  healthPlan: 0,
  dentalPlan: 0,
  pension: 0,
  otherDiscounts: 0,
  mealVoucher: 0,
  foodAllowance: 0,
}

const safeCents = (value: number) => Number.isFinite(value) ? Math.max(0, toMoneyCents(value)) : 0

function calculateInssCents(grossCents: number): number {
  let previousLimitCents = 0
  let contributionCents = 0

  for (const bracket of CLT_TABLES_2026.inss) {
    const limitCents = toMoneyCents(bracket.upTo)
    const taxableCents = Math.max(0, Math.min(grossCents, limitCents) - previousLimitCents)
    contributionCents += taxableCents * bracket.rate
    previousLimitCents = limitCents
    if (grossCents <= limitCents) break
  }
  return Math.round(contributionCents)
}

export function calculateInss(grossSalary: number): number {
  return fromMoneyCents(calculateInssCents(safeCents(grossSalary)))
}

function calculateIrrfCents(grossCents: number, taxableBaseCents: number): number {
  const bracket = CLT_TABLES_2026.irrf.find((item) => taxableBaseCents <= toMoneyCents(item.upTo)) ?? CLT_TABLES_2026.irrf.at(-1)!
  const beforeReductionCents = Math.max(0, Math.round(taxableBaseCents * bracket.rate) - toMoneyCents(bracket.deduction))
  const reductionCents = grossCents <= toMoneyCents(CLT_TABLES_2026.irReduction.exemptUntil)
    ? beforeReductionCents
    : grossCents <= toMoneyCents(CLT_TABLES_2026.irReduction.partialUntil)
      ? Math.max(0, toMoneyCents(CLT_TABLES_2026.irReduction.intercept) - Math.round(CLT_TABLES_2026.irReduction.slope * grossCents))
      : 0
  return Math.max(0, beforeReductionCents - Math.min(beforeReductionCents, reductionCents))
}

export function calculateIrrf(grossSalary: number, taxableBase: number): number {
  return fromMoneyCents(calculateIrrfCents(safeCents(grossSalary), safeCents(taxableBase)))
}

export function calculateSalary(input: SalaryInput): SalaryEstimate {
  const grossCents = safeCents(input.grossSalary)
  const dependents = Math.max(0, Math.floor(Number.isFinite(input.dependents) ? input.dependents : 0))
  const pensionCents = safeCents(input.pension)
  const inssCents = calculateInssCents(grossCents)
  const legalDeductionsCents = inssCents
    + dependents * toMoneyCents(CLT_TABLES_2026.dependentDeduction)
    + pensionCents
  const irDeductionsCents = Math.max(
    legalDeductionsCents,
    toMoneyCents(CLT_TABLES_2026.simplifiedMonthlyDeduction),
  )
  const taxableBaseCents = Math.max(0, grossCents - irDeductionsCents)
  const irrfCents = calculateIrrfCents(grossCents, taxableBaseCents)
  const transportVoucherBenefitCents = safeCents(input.transportVoucherBenefit)
  const transportCapCents = Math.round(grossCents * CLT_TABLES_2026.transportVoucherRate)
  const transportVoucherDiscountCents = input.hasTransportVoucher
    ? (transportVoucherBenefitCents > 0 ? Math.min(transportCapCents, transportVoucherBenefitCents) : transportCapCents)
    : 0
  const healthPlanCents = safeCents(input.healthPlan)
  const dentalPlanCents = safeCents(input.dentalPlan)
  const otherDiscountsCents = safeCents(input.otherDiscounts)
  const netSalaryCents = Math.max(0, grossCents - inssCents - irrfCents - transportVoucherDiscountCents - healthPlanCents - dentalPlanCents - pensionCents - otherDiscountsCents)

  return {
    grossSalary: fromMoneyCents(grossCents),
    inss: fromMoneyCents(inssCents),
    irrf: fromMoneyCents(irrfCents),
    taxableBase: fromMoneyCents(taxableBaseCents),
    transportVoucherDiscount: fromMoneyCents(transportVoucherDiscountCents),
    healthPlan: fromMoneyCents(healthPlanCents),
    dentalPlan: fromMoneyCents(dentalPlanCents),
    pension: fromMoneyCents(pensionCents),
    otherDiscounts: fromMoneyCents(otherDiscountsCents),
    netSalary: fromMoneyCents(netSalaryCents),
    benefits: {
      transportVoucher: fromMoneyCents(transportVoucherBenefitCents),
      mealVoucher: fromMoneyCents(safeCents(input.mealVoucher)),
      foodAllowance: fromMoneyCents(safeCents(input.foodAllowance)),
    },
  }
}
