import type { BodyMeasurement as Measurement } from "./contracts"

export interface BodyIndices {
  bmi: { value: number; label: string } | null
  whr: { value: number; label: string } | null
  weightDelta: { value: number; sinceDate: string } | null
  /** Massa gorda e magra em kg, só quando há peso + % de gordura registrados. */
  composition: { fatMass: number; leanMass: number; fatPct: number } | null
  /** Meta diária de água em litros (35 ml por kg de peso corporal). */
  waterTarget: { liters: number; basedOnKg: number } | null
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

/** Calcula IMC, RCQ, variação de peso, composição corporal e meta de água. */
export function computeBodyIndices(measurements: Measurement[]): BodyIndices {
  const newestFirst = measurements.slice().sort((a, b) => b.date.localeCompare(a.date))
  const latestOf = (type: Measurement["type"]) => newestFirst.find((m) => m.type === type)
  const weight = latestOf("peso")
  const height = latestOf("altura")
  const waist = latestOf("cintura")
  const hip = latestOf("quadril")
  const bodyfat = latestOf("gordura")

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
  const weights = newestFirst.filter((m) => m.type === "peso")
  if (weights.length >= 2) {
    weightDelta = { value: weights[0].value - weights[weights.length - 1].value, sinceDate: weights[weights.length - 1].date }
  }

  // Composição a partir de dados registrados — sem estimativa por idade/sexo,
  // que não são cadastrados. Só aparece quando o usuário loga o % de gordura.
  let composition: BodyIndices["composition"] = null
  if (weight && bodyfat && bodyfat.value > 0 && bodyfat.value < 75) {
    const fatMass = weight.value * (bodyfat.value / 100)
    composition = { fatMass, leanMass: weight.value - fatMass, fatPct: bodyfat.value }
  }

  let waterTarget: BodyIndices["waterTarget"] = null
  if (weight && weight.value > 0) {
    waterTarget = { liters: (weight.value * 35) / 1000, basedOnKg: weight.value }
  }

  return { bmi, whr, weightDelta, composition, waterTarget }
}

/**
 * Série temporal (mais antigo → mais novo) de um tipo de medida, pronta para o
 * gráfico de evolução. As medidas chegam do store em ordem decrescente.
 */
export function measurementSeries(measurements: Measurement[], type: Measurement["type"]): { values: number[]; labels: string[] } {
  const rows = measurements.filter((m) => m.type === type).slice().sort((a, b) => a.date.localeCompare(b.date))
  return {
    values: rows.map((m) => m.value),
    labels: rows.map((m) => new Date(m.date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })),
  }
}
