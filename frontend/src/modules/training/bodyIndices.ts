import type { BodyMeasurement as Measurement } from "./contracts"

export interface BodyIndices {
  bmi: { value: number; label: string } | null
  whr: { value: number; label: string } | null
  weightDelta: { value: number; sinceDate: string } | null
}

function bmiLabel(bmi: number): string {
  if (bmi < 18.5) return "Abaixo do peso"
  if (bmi < 25) return "Peso normal"
  if (bmi < 30) return "Sobrepeso"
  if (bmi < 35) return "Obesidade grau I"
  if (bmi < 40) return "Obesidade grau II"
  return "Obesidade grau III"
}

// Faixas de risco da OMS para relação cintura-quadril (sem sexo cadastrado,
// usamos o corte mais conservador: 0.85 mulher / 0.90 homem → alerta em 0.90).
function whrLabel(whr: number): string {
  if (whr < 0.85) return "Baixo risco"
  if (whr < 0.95) return "Risco moderado"
  return "Risco alto"
}

/** Calcula IMC, relação cintura-quadril e variação de peso a partir das medidas existentes. */
export function computeBodyIndices(measurements: Measurement[]): BodyIndices {
  const latestOf = (type: Measurement["type"]) => measurements.find((m) => m.type === type)
  const weight = latestOf("peso")
  const height = latestOf("altura")
  const waist = latestOf("cintura")
  const hip = latestOf("quadril")

  let bmi: BodyIndices["bmi"] = null
  if (weight && height && height.value > 0) {
    const meters = height.value / 100
    const value = weight.value / (meters * meters)
    bmi = { value, label: bmiLabel(value) }
  }

  let whr: BodyIndices["whr"] = null
  if (waist && hip && hip.value > 0) {
    const value = waist.value / hip.value
    whr = { value, label: whrLabel(value) }
  }

  let weightDelta: BodyIndices["weightDelta"] = null
  const weights = measurements.filter((m) => m.type === "peso")
  if (weights.length >= 2) {
    weightDelta = { value: weights[0].value - weights[weights.length - 1].value, sinceDate: weights[weights.length - 1].date }
  }

  return { bmi, whr, weightDelta }
}
