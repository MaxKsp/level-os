/** Formatadores pt-BR compartilhados pela camada de UI. */

export function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }).replace(/\u00a0/g, " ")
}

/** Valor monetário com sinal explícito (+/−) para deltas. */
export function formatSignedCurrency(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : ""
  return `${sign}${formatCurrency(Math.abs(value))}`
}

/** Valor monetário compacto (ex.: R$ 12,5 mil) para rótulos de gráfico. */
export function formatCurrencyCompact(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 1,
  }).replace(/\u00a0/g, " ")
}

export function formatWeight(value: number): string {
  return `${value.toFixed(1).replace(".", ",")} kg`
}

const LONG_DATE = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "2-digit",
  month: "long",
})

export function formatLongDate(date: Date): string {
  const formatted = LONG_DATE.format(date)
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}
