import type { ShoppingItem } from "./store"
import type { PantryItem } from "./nutritionWorkspace"

/** Comparação intencionalmente exata: "sal" não pode casar com "salmão". */
export const foodKey = (name: string) => name.toLocaleLowerCase("pt-BR").normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ")

type Unit = PantryItem["unit"]
type Base = "g" | "ml" | "un" | "pacote"
const conversions: Record<Unit, { base: Base; multiplier: number }> = {
  g: { base: "g", multiplier: 1 }, kg: { base: "g", multiplier: 1000 },
  ml: { base: "ml", multiplier: 1 }, l: { base: "ml", multiplier: 1000 },
  un: { base: "un", multiplier: 1 }, pacote: { base: "pacote", multiplier: 1 },
}
export type ParsedQuantity = { value: number; unit: Unit; base: Base; amount: number }
export function parseShoppingQuantity(raw: string): ParsedQuantity | null {
  const matched = raw.trim().toLowerCase().match(/^(\d+(?:[.,]\d{1,2})?)\s*(kg|g|ml|l|un\.?|unidades?|pacotes?|pct\.?)$/)
  if (!matched) return null
  const value = Number(matched[1].replace(",", "."))
  const alias = matched[2].replace(".", "")
  const unit: Unit = alias === "un" || alias.startsWith("unidade") ? "un"
    : alias.startsWith("pacote") || alias === "pct" ? "pacote" : alias as Unit
  const conversion = conversions[unit]
  if (!conversion || !Number.isFinite(value) || value <= 0 || value > 10000) return null
  return { value, unit, base: conversion.base, amount: value * conversion.multiplier }
}
export type InventoryCoverage = {
  status: "sufficient" | "partial" | "missing" | "check"
  available: number
  required: number | null
  missing: number | null
  base: Base | null
}
const round = (value: number) => Math.round(value * 100) / 100
/** Apenas dados declarados, compatíveis e dentro da validade são contabilizados. */
export function inventoryCoverage(item: ShoppingItem, pantry: PantryItem[], today: string): InventoryCoverage {
  const expected = parseShoppingQuantity(item.quantity)
  const matching = pantry.filter((stock) => foodKey(stock.name) === foodKey(item.item) &&
    stock.quantity > 0 && (!stock.expiresOn || stock.expiresOn >= today))
  if (!expected) return { status: matching.length ? "check" : "missing", available: 0, required: null, missing: null, base: null }
  if (!matching.length) return { status: "missing", available: 0, required: expected.amount, missing: expected.amount, base: expected.base }
  const compatible = matching.filter((stock) => conversions[stock.unit].base === expected.base)
  if (!compatible.length) return { status: "check", available: 0, required: expected.amount, missing: null, base: expected.base }
  const available = round(compatible.reduce((total, stock) => total + stock.quantity * conversions[stock.unit].multiplier, 0))
  const remaining = round(Math.max(0, expected.amount - available))
  return { status: remaining === 0 ? "sufficient" : "partial", available, required: expected.amount, missing: remaining, base: expected.base }
}
export const coverageText = (coverage: InventoryCoverage): string => {
  if (coverage.status === "sufficient") return "Estoque estimado suficiente"
  if (coverage.status === "partial") return "Faltam aprox. " + coverage.missing + " " + coverage.base
  if (coverage.status === "check") return "Conferir unidade/quantidade"
  return "Não disponível na despensa"
}

/** Sugestão de compras: não trata carrinho como pagamento e não oculta medidas incertas. */
export function shoppingRemaining(items: ShoppingItem[], pantry: PantryItem[],
  inCart: ReadonlySet<number>, today: string): Array<{ index: number; line: string }> {
  return items.flatMap((item, index) => {
    if (inCart.has(index)) return []
    const coverage = inventoryCoverage(item, pantry, today)
    if (coverage.status === "sufficient") return []
    const detail = coverage.status === "partial"
      ? String(coverage.missing) + " " + coverage.base + " (falta estimada)"
      : item.quantity + (coverage.status === "check" ? " (verificar unidade na despensa)" : "")
    return [{ index, line: item.item + " — " + detail }]
  })
}
