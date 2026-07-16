/** Mock ISOLADO da Rotina para o preview (view models de front-end). */
import type { Task } from "./contracts"

export const tasksMock: Task[] = [
  {
    id: "1",
    time: "07:00",
    title: "Meditação matinal",
    subtitle: "Sessão de bem-estar",
    completed: true,
  },
  {
    id: "2",
    time: "08:30",
    title: "Treino de cardio",
    subtitle: "Corrida leve na esteira",
    completed: true,
  },
  {
    id: "3",
    time: "10:00",
    title: "Planejamento semanal",
    subtitle: "Metas do time",
    completed: true,
  },
  {
    id: "4",
    time: "14:00",
    title: "Reunião de alinhamento",
    subtitle: "Videochamada",
    completed: false,
  },
  {
    id: "5",
    time: "16:30",
    title: "Revisão de código",
    subtitle: "Pull requests no GitHub",
    completed: false,
  },
  {
    id: "6",
    time: "18:00",
    title: "Comprar suplementos",
    subtitle: "Farmácia central",
    completed: false,
  },
]
