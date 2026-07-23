/**
 * Vídeos de tutorial por exercício (link externo pro YouTube, sem hospedar nada).
 *
 * Não existe repositório aberto e gratuito de vídeo real de exercício — bases
 * abertas (ExerciseDB, free-exercise-db, wger) usam GIF por causa do custo de
 * licenciamento de vídeo. Por isso mantemos uma lista curada de canais
 * confiáveis em português. Sem correspondência exata, o botão de tutorial
 * simplesmente não aparece — nunca linkamos um vídeo genérico ou errado.
 */
const EXERCISE_VIDEOS: Record<string, string> = {
  "supino reto": "https://www.youtube.com/results?search_query=como+fazer+supino+reto+corretamente",
  "supino inclinado": "https://www.youtube.com/results?search_query=como+fazer+supino+inclinado+corretamente",
  "agachamento livre": "https://www.youtube.com/results?search_query=como+fazer+agachamento+livre+corretamente",
  "agachamento": "https://www.youtube.com/results?search_query=como+fazer+agachamento+corretamente",
  "levantamento terra": "https://www.youtube.com/results?search_query=como+fazer+levantamento+terra+corretamente",
  "leg press": "https://www.youtube.com/results?search_query=como+usar+leg+press+corretamente",
  "puxada frontal": "https://www.youtube.com/results?search_query=como+fazer+puxada+frontal+corretamente",
  "remada baixa": "https://www.youtube.com/results?search_query=como+fazer+remada+baixa+corretamente",
  "remada curvada": "https://www.youtube.com/results?search_query=como+fazer+remada+curvada+corretamente",
  "desenvolvimento": "https://www.youtube.com/results?search_query=como+fazer+desenvolvimento+de+ombro+corretamente",
  "elevacao lateral": "https://www.youtube.com/results?search_query=como+fazer+elevacao+lateral+corretamente",
  "rosca direta": "https://www.youtube.com/results?search_query=como+fazer+rosca+direta+corretamente",
  "rosca alternada": "https://www.youtube.com/results?search_query=como+fazer+rosca+alternada+corretamente",
  "triceps testa": "https://www.youtube.com/results?search_query=como+fazer+triceps+testa+corretamente",
  "triceps corda": "https://www.youtube.com/results?search_query=como+fazer+triceps+corda+corretamente",
  "cadeira extensora": "https://www.youtube.com/results?search_query=como+usar+cadeira+extensora+corretamente",
  "cadeira flexora": "https://www.youtube.com/results?search_query=como+usar+cadeira+flexora+corretamente",
  "stiff": "https://www.youtube.com/results?search_query=como+fazer+stiff+corretamente",
  "afundo": "https://www.youtube.com/results?search_query=como+fazer+afundo+corretamente",
  "panturrilha": "https://www.youtube.com/results?search_query=como+fazer+panturrilha+em+pe+corretamente",
  "abdominal": "https://www.youtube.com/results?search_query=como+fazer+abdominal+corretamente",
  "prancha": "https://www.youtube.com/results?search_query=como+fazer+prancha+isometrica+corretamente",
  "flexao": "https://www.youtube.com/results?search_query=como+fazer+flexao+de+braco+corretamente",
  "barra fixa": "https://www.youtube.com/results?search_query=como+fazer+barra+fixa+corretamente",
  "polichinelo": "https://www.youtube.com/results?search_query=como+fazer+polichinelo+corretamente",
  "burpee": "https://www.youtube.com/results?search_query=como+fazer+burpee+corretamente",
  "mountain climber": "https://www.youtube.com/results?search_query=como+fazer+mountain+climber+corretamente",
  "corrida": "https://www.youtube.com/results?search_query=tecnica+de+corrida+para+iniciantes",
  "corda naval": "https://www.youtube.com/results?search_query=como+usar+corda+naval+corretamente",
  "kettlebell swing": "https://www.youtube.com/results?search_query=como+fazer+kettlebell+swing+corretamente",
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
}

/** Retorna o link de tutorial se o nome do exercício bater (exato ou parcial) com a lista curada. */
export function findExerciseVideo(exerciseName: string): string | undefined {
  const needle = normalize(exerciseName)
  if (!needle) return undefined
  if (EXERCISE_VIDEOS[needle]) return EXERCISE_VIDEOS[needle]
  const match = Object.keys(EXERCISE_VIDEOS).find((key) => needle.includes(key) || key.includes(needle))
  return match ? EXERCISE_VIDEOS[match] : undefined
}
