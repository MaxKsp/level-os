import type { TrainingModality } from "./contracts"

export type MuscleGroup = "Peito" | "Costas" | "Pernas" | "Ombros" | "Braços" | "Core" | "Cardio" | "Mobilidade"
export interface LibraryExercise {
  name: string; group: MuscleGroup; modality: TrainingModality; equipment: string; cue: string
}
export const EXERCISE_CATALOG: LibraryExercise[] = [
  { name: "Supino reto", group: "Peito", modality: "forca", equipment: "Barra / banco", cue: "Pés apoiados; controle a descida." },
  { name: "Supino inclinado", group: "Peito", modality: "forca", equipment: "Halteres / banco", cue: "Mantenha os ombros estáveis." },
  { name: "Flexão", group: "Peito", modality: "calistenia", equipment: "Peso corporal", cue: "Tronco alinhado durante a amplitude." },
  { name: "Puxada frontal", group: "Costas", modality: "forca", equipment: "Máquina", cue: "Puxe sem impulsionar o tronco." },
  { name: "Remada baixa", group: "Costas", modality: "forca", equipment: "Cabo", cue: "Recolha as escápulas de forma controlada." },
  { name: "Remada curvada", group: "Costas", modality: "forca", equipment: "Barra", cue: "Tronco firme e movimento controlado." },
  { name: "Barra fixa", group: "Costas", modality: "calistenia", equipment: "Barra alta", cue: "Evite balanços e respeite sua amplitude." },
  { name: "Agachamento livre", group: "Pernas", modality: "forca", equipment: "Barra / rack", cue: "Controle a descida sem perder estabilidade." },
  { name: "Leg press", group: "Pernas", modality: "forca", equipment: "Máquina", cue: "Ajuste o banco à sua amplitude." },
  { name: "Stiff", group: "Pernas", modality: "forca", equipment: "Halteres / barra", cue: "Faça a dobradiça de quadril controlada." },
  { name: "Afundo", group: "Pernas", modality: "forca", equipment: "Peso corporal / halteres", cue: "Mantenha equilíbrio na passada." },
  { name: "Cadeira extensora", group: "Pernas", modality: "forca", equipment: "Máquina", cue: "Ajuste a posição do joelho e do rolo." },
  { name: "Panturrilha", group: "Pernas", modality: "forca", equipment: "Máquina / degrau", cue: "Evite impulsos e mantenha controle." },
  { name: "Desenvolvimento", group: "Ombros", modality: "forca", equipment: "Halteres", cue: "Tronco estável na elevação." },
  { name: "Elevação lateral", group: "Ombros", modality: "forca", equipment: "Halteres", cue: "Suba sem embalo." },
  { name: "Rosca direta", group: "Braços", modality: "forca", equipment: "Barra", cue: "Cotovelos próximos ao tronco." },
  { name: "Tríceps corda", group: "Braços", modality: "forca", equipment: "Cabo", cue: "Evite usar o balanço do corpo." },
  { name: "Prancha", group: "Core", modality: "calistenia", equipment: "Colchonete", cue: "Respire normalmente e mantenha alinhamento." },
  { name: "Abdominal", group: "Core", modality: "calistenia", equipment: "Colchonete", cue: "Evite puxar o pescoço." },
  { name: "Corrida", group: "Cardio", modality: "cardio", equipment: "Rua / esteira", cue: "Ajuste ritmo e duração à sua capacidade." },
  { name: "Bicicleta", group: "Cardio", modality: "cardio", equipment: "Bicicleta / ergométrica", cue: "Ajuste a altura do selim." },
  { name: "Caminhada", group: "Cardio", modality: "cardio", equipment: "Rua / esteira", cue: "Adapte a intensidade gradualmente." },
  { name: "Mobilidade de quadril", group: "Mobilidade", modality: "mobilidade", equipment: "Colchonete", cue: "Movimentos lentos, sem forçar a amplitude." },
  { name: "Mobilidade de ombro", group: "Mobilidade", modality: "mobilidade", equipment: "Livre / elástico", cue: "Evite dor ou compensações." },
]
const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR")
export function searchExercises(query: string, group: MuscleGroup | "Todos" = "Todos"): LibraryExercise[] {
  const needle = normalize(query.trim())
  return EXERCISE_CATALOG.filter((item) =>
    (group === "Todos" || item.group === group) &&
    (!needle || normalize(item.name + " " + item.group + " " + item.equipment).includes(needle)),
  )
}
