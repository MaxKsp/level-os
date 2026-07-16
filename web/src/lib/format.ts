/** Formatação pt-BR compartilhada entre os módulos. */

export function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  })
}

/** Moeda compacta para KPIs grandes (ex.: R$ 12,4 mil). */
export function formatCurrencyShort(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1000) {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      notation: "compact",
      maximumFractionDigits: 1,
    })
  }
  return formatCurrency(value)
}

export function formatSignedCurrency(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : ""
  return `${sign}${formatCurrency(Math.abs(value))}`
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`
}

export function formatWeight(value: number): string {
  return `${value.toFixed(1)} kg`
}

const WEEKDAYS = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
]

const MONTHS = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
]

/** Ex.: "Quinta-feira, 16 de julho". */
export function formatLongDate(date: Date): string {
  return `${WEEKDAYS[date.getDay()]}, ${date.getDate()} de ${MONTHS[date.getMonth()]}`
}
