import type { IncomeLine } from "./contracts"

function validIsoDate(value: string | null | undefined): string | null {
  if (!value) return null
  const iso = value.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null
  const [year, month, day] = iso.split("-").map(Number)
  const parsed = new Date(year, month - 1, day)
  if (
    parsed.getFullYear() !== year
    || parsed.getMonth() !== month - 1
    || parsed.getDate() !== day
  ) return null
  return iso
}

function timestampIso(value: number | null): string | null {
  if (!value || value <= 0) return null
  const date = new Date(value < 10_000_000_000 ? value * 1000 : value)
  if (Number.isNaN(date.getTime())) return null
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-")
}

export function incomeStartIso(income: IncomeLine): string | null {
  return validIsoDate(income.date) ?? timestampIso(income.createdAt)
}

export function incomeEndIso(income: IncomeLine): string | null {
  return validIsoDate(income.endDate)
}

export function localDateIso(date = new Date()): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-")
}

/** Vigência inclusiva, aplicada a qualquer tipo de renda. */
export function incomeIsActiveOn(income: IncomeLine, referenceDate = new Date()): boolean {
  const reference = localDateIso(referenceDate)
  const start = incomeStartIso(income)
  const end = incomeEndIso(income)
  return (!start || start <= reference) && (!end || end >= reference)
}

