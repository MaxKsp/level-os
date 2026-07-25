import type { BodyMeasurement as Measurement } from "./contracts"

export interface BodyProfile {
  /** Idade em anos, ou null quando não cadastrada. */
  age: number | null
  /** "m" | "f" | "" — vazio quando não cadastrado. */
  sex: string
}

export interface BodyIndices {
  bmi: { value: number; label: string } | null
  whr: { value: number; label: string } | null
  weightDelta: { value: number; sinceDate: string } | null
  /** Massa gorda e magra em kg. `estimated` quando o % de gordura veio da fórmula, não de medição. */
  composition: { fatMass: number; leanMass: number; fatPct: number; estimated: boolean } | null
  /** Meta diária de água em litros (35 ml por kg de peso corporal). */
  waterTarget: { liters: number; basedOnKg: number } | null
  /** Taxa metabólica basal (kcal/dia) por Mifflin-St Jeor. Exige idade + sexo. */
  bmr: { value: number } | null
}

/** Idade em anos a partir de uma data YYYY-MM-DD, ou null se inválida/futura. */
export function ageFromBirthDate(birthDate: string | null | undefined, now: Date = new Date()): number | null {
  if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null
  const [year, month, day] = birthDate.split("-").map(Number)
  const birth = new Date(year, month - 1, day)
  if (
    Number.isNaN(birth.getTime())
    || birth.getFullYear() !== year
    || birth.getMonth() !== month - 1
    || birth.getDate() !== day
    || birth > now
  ) return null
  let age = now.getFullYear() - year
  if (now.getMonth() < month - 1 || (now.getMonth() === month - 1 && now.getDate() < day)) age -= 1
  return age >= 0 && age <= 120 ? age : null
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

/** Calcula IMC, RCQ, variação de peso, composição corporal, meta de água e TMB. */
export function computeBodyIndices(measurements: Measurement[], profile?: BodyProfile): BodyIndices {
  const age = profile?.age ?? null
  const sex = profile?.sex ?? ""
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

  // Composição: prioriza o % de gordura medido; na ausência, estima pela
  // fórmula de Deurenberg (IMC + idade + sexo). Só a medida é marcada como
  // exata; a fórmula é sinalizada como estimativa.
  let composition: BodyIndices["composition"] = null
  if (weight && bodyfat && bodyfat.value > 0 && bodyfat.value < 75) {
    const fatMass = weight.value * (bodyfat.value / 100)
    composition = { fatMass, leanMass: weight.value - fatMass, fatPct: bodyfat.value, estimated: false }
  } else if (weight && bmi && age !== null && age >= 18 && (sex === "m" || sex === "f")) {
    const fatPct = 1.2 * bmi.value + 0.23 * age - 10.8 * (sex === "m" ? 1 : 0) - 5.4
    if (fatPct > 0 && fatPct < 75) {
      const fatMass = weight.value * (fatPct / 100)
      composition = { fatMass, leanMass: weight.value - fatMass, fatPct, estimated: true }
    }
  }

  let waterTarget: BodyIndices["waterTarget"] = null
  if (weight && weight.value > 0) {
    waterTarget = { liters: (weight.value * 35) / 1000, basedOnKg: weight.value }
  }

  // TMB (Mifflin-St Jeor): kcal em repouso. Exige peso, altura, idade e sexo.
  let bmr: BodyIndices["bmr"] = null
  if (weight && height && height.value > 0 && age !== null && age >= 18 && (sex === "m" || sex === "f")) {
    const value = 10 * weight.value + 6.25 * height.value - 5 * age + (sex === "m" ? 5 : -161)
    if (value > 0) bmr = { value: Math.round(value) }
  }

  return { bmi, whr, weightDelta, composition, waterTarget, bmr }
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
