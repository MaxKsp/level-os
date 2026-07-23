/** Dinheiro na UI é calculado em centavos inteiros e convertido só na borda. */
export function toMoneyCents(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.round(value * 100)
}

export function fromMoneyCents(cents: number): number {
  return Math.trunc(cents) / 100
}

export function roundMoney(value: number): number {
  return fromMoneyCents(toMoneyCents(value))
}

export function sumMoney(values: Iterable<number>): number {
  let cents = 0
  for (const value of values) cents += toMoneyCents(value)
  return fromMoneyCents(cents)
}

export function addMoney(left: number, right: number): number {
  return fromMoneyCents(toMoneyCents(left) + toMoneyCents(right))
}

export function subtractMoney(left: number, right: number): number {
  return fromMoneyCents(toMoneyCents(left) - toMoneyCents(right))
}
