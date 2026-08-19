import { useRef, type Key } from "react"
import { useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from "motion/react"
import * as m from "motion/react-m"
import { LevelMark } from "../components/ui/LevelMark"
import { Icon } from "../design-system"

const worlds = [
  {
    number: "01",
    id: "financas",
    eyebrow: "Finanças",
    title: "Entenda seu dinheiro sem montar outra planilha.",
    description: "Contas, cartões, patrimônio, rendas, despesas, parcelamentos e imposto de renda compartilham a mesma visão.",
    capabilities: ["Contas e cartões", "OFX e parcelamentos", "Imposto de renda"],
    insight: "Veja o disponível, o comprometido e o impacto das próximas decisões.",
    next: "A previsão financeira encontra sua rotina",
    icon: "account_balance",
  },
  {
    number: "02",
    id: "rotina",
    eyebrow: "Rotina",
    title: "Transforme intenção em um dia que realmente acontece.",
    description: "Tarefas, horários recorrentes e compromissos aparecem no momento certo, sem disputar atenção o dia inteiro.",
    capabilities: ["Agenda recorrente", "Google Calendar", "Lembretes no contexto"],
    insight: "Encontre o próximo passo sem transformar o dia inteiro em urgência.",
    next: "A rotina abre espaço para o treino",
    icon: "event",
  },
  {
    number: "03",
    id: "treinos",
    eyebrow: "Treinos",
    title: "Registre consistência, não apenas repetições.",
    description: "Planeje sessões, acompanhe cargas, medidas e evolução corporal sem perder o histórico que explica seu progresso.",
    capabilities: ["Fichas e sessões", "Cargas e medidas", "Evolução corporal"],
    insight: "Compare sessões e ajuste o plano usando o histórico real do seu corpo.",
    next: "O treino se conecta à alimentação",
    icon: "exercise",
  },
  {
    number: "04",
    id: "alimentacao",
    eyebrow: "Alimentação",
    title: "Planejamento alimentar dentro da sua realidade.",
    description: "Crie cardápios, revise custos e transforme refeições em uma lista de compras prática para a semana.",
    capabilities: ["Plano alimentar", "Custo estimado", "Lista de compras"],
    insight: "Aprove o cardápio com o custo previsto e uma lista pronta para o mercado.",
    next: "As escolhas alimentam seu progresso",
    icon: "restaurant",
  },
  {
    number: "05",
    id: "progresso",
    eyebrow: "Progresso",
    title: "Veja sua evolução atravessar todas as áreas.",
    description: "XP, níveis e conquistas tornam visível o efeito acumulado das pequenas ações — sem transformar sua vida em um jogo vazio.",
    capabilities: ["XP e níveis", "Conquistas", "Visão semanal"],
    insight: "Transforme pequenas ações em uma leitura clara da sua evolução.",
    next: "Tudo retorna ao seu centro",
    icon: "trophy",
  },
] as const

type World = (typeof worlds)[number]
const chapterStops = [0.2, 0.4, 0.6, 0.8, 0.985] as const
const cameraStops = [0, 0.08, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.985, 1]
const routePhases = [
  { from: "Núcleo", to: "Finanças", start: 0.06, end: 0.18 },
  { from: "Finanças", to: "Rotina", start: 0.22, end: 0.38 },
  { from: "Rotina", to: "Treinos", start: 0.42, end: 0.58 },
  { from: "Treinos", to: "Alimentação", start: 0.62, end: 0.78 },
  { from: "Alimentação", to: "Progresso", start: 0.82, end: 0.97 },
] as const

function OrbitalNode({ world, index, progress, reduceMotion }: { world: World; index: number; progress: MotionValue<number>; reduceMotion: boolean; key?: Key }) {
  const center = chapterStops[index]
  const scaleStart = Math.max(0, center - 0.16)
  const scalePeak = Math.min(0.999, Math.max(0.001, center))
  const scaleEnd = Math.min(1, center + 0.18)
  const opacity = useTransform(
    progress,
    [Math.max(0, center - 0.2), Math.max(0.01, center - 0.08), Math.min(0.99, center + 0.1), Math.min(1, center + 0.22)],
    [0.25, 1, 1, 0.38],
  )
  const scale = useTransform(progress, [scaleStart, scalePeak, scaleEnd], [0.78, 1.18, 0.86])
  return (
    <m.div className={`orbit-node orbit-node-${world.id}`} style={reduceMotion ? undefined : { opacity, scale }} aria-hidden="true">
      <span className="orbit-node-radar" />
      <span className="orbit-node-disc"><Icon name={world.icon} /></span>
      <span className="orbit-node-label">{world.number} / {world.eyebrow}</span>
    </m.div>
  )
}

function OrbitalMap({ progress, reduceMotion }: { progress: MotionValue<number>; reduceMotion: boolean }) {
  const x = useTransform(progress, cameraStops, ["25%", "21%", "15%", "6%", "-3%", "-12%", "-21%", "-30%", "-39%", "-48%", "-57%", "-59%"])
  const y = useTransform(progress, cameraStops, ["0%", "1%", "4%", "0%", "-4%", "0%", "4%", "0%", "-4%", "0%", "4%", "1%"])
  const scale = useTransform(progress, cameraStops, [0.88, 0.92, 1.04, 0.96, 1.04, 0.96, 1.04, 0.96, 1.04, 0.96, 1.04, 0.92])
  const travelerDistance = useTransform(
    progress,
    [0.08, 0.2, 0.4, 0.6, 0.8, 0.985],
    ["7%", "18%", "36%", "54%", "72%", "90%"],
  )
  const journeyPathLength = useTransform(progress, [0.08, 0.985], [0, 1])

  return (
    <m.div className="orbital-map" style={reduceMotion ? undefined : { x, y, scale }}>
      <svg className="orbital-routes" viewBox="0 0 1800 620" aria-hidden="true">
        <m.path className="orbit-route route-primary" d="M70 310C150 310 210 250 300 250S500 370 620 370S820 250 940 250S1140 370 1260 370S1460 250 1580 250S1680 310 1730 310" style={{ pathLength: reduceMotion ? 1 : progress }} />
        <m.path className="orbit-route" d="M70 278C150 278 210 218 300 218S500 338 620 338S820 218 940 218S1140 338 1260 338S1460 218 1580 218S1680 278 1730 278" style={{ pathLength: reduceMotion ? 1 : progress }} />
        <m.path className="orbit-route route-dashed" d="M70 342C150 342 210 282 300 282S500 402 620 402S820 282 940 282S1140 402 1260 402S1460 282 1580 282S1680 342 1730 342" style={{ pathLength: reduceMotion ? 1 : progress }} />
        <m.path
          className="orbit-route journey-route"
          d="M70 310C150 310 210 250 300 250S500 370 620 370S820 250 940 250S1140 370 1260 370S1460 250 1580 250S1680 310 1730 310"
          style={{ pathLength: reduceMotion ? 1 : journeyPathLength }}
        />
        {[{ x: 70, y: 310 }, { x: 300, y: 250 }, { x: 620, y: 370 }, { x: 940, y: 250 }, { x: 1260, y: 370 }, { x: 1580, y: 250 }, { x: 1730, y: 310 }].map((point, index) => <circle className="route-junction" cx={point.x} cy={point.y} r={index === 0 || index === 6 ? 4 : 7} key={point.x} />)}
      </svg>
      <m.span className="orbit-traveler" style={reduceMotion ? undefined : { offsetDistance: travelerDistance }} aria-hidden="true" />

      <div className="orbit-core" aria-hidden="true">
        <span className="orbit-core-ring ring-outer" /><span className="orbit-core-ring ring-inner" />
        <span className="orbit-core-disc"><LevelMark /></span>
        <span className="orbit-core-caption">INÍCIO / LEVEL OS</span>
      </div>
      {worlds.map((world, index) => <OrbitalNode world={world} index={index} progress={progress} reduceMotion={reduceMotion} key={world.id} />)}
    </m.div>
  )
}

type RoutePhase = (typeof routePhases)[number]

function RoutePhaseStatus({ phase, progress, reduceMotion }: { phase: RoutePhase; progress: MotionValue<number>; reduceMotion: boolean; key?: Key }) {
  const opacity = useTransform(
    progress,
    [Math.max(0, phase.start - 0.025), phase.start, phase.end, Math.min(1, phase.end + 0.025)],
    [0, 1, 1, 0],
  )

  return (
    <m.div className="journey-route-status" style={reduceMotion ? { opacity: 0 } : { opacity }}>
      <span>{phase.from}</span>
      <i><b /> percorrendo rota</i>
      <strong>{phase.to}</strong>
    </m.div>
  )
}

function JourneyHud({ progress, reduceMotion }: { progress: MotionValue<number>; reduceMotion: boolean }) {
  const progressScale = useTransform(progress, [0.08, 0.985], [0, 1])

  return (
    <div className="journey-hud" aria-hidden="true">
      <div className="journey-route-stack">
        {routePhases.map((phase) => <RoutePhaseStatus phase={phase} progress={progress} reduceMotion={reduceMotion} key={`${phase.from}-${phase.to}`} />)}
      </div>
      <div className="journey-rail">
        <span className="journey-rail-track"><m.i style={reduceMotion ? { scaleX: 1 } : { scaleX: progressScale }} /></span>
        <div className="journey-rail-labels">
          {worlds.map((world, index) => <span key={world.id}><b>{world.number}</b>{world.eyebrow}</span>)}
        </div>
      </div>
    </div>
  )
}

function WorldChapter({ world, reduceMotion }: { world: World; reduceMotion: boolean; key?: Key }) {
  const chapterRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: chapterRef, offset: ["start end", "end start"] })
  const chapterProgress = useSpring(scrollYProgress, { stiffness: 110, damping: 34, mass: 0.2 })
  const opacity = useTransform(chapterProgress, [0.06, 0.22, 0.72, 0.94], [0, 1, 1, 0])
  const y = useTransform(chapterProgress, [0.06, 0.28, 0.72, 0.94], [42, 0, 0, -30])
  const scale = useTransform(chapterProgress, [0.06, 0.3, 0.72, 0.94], [0.975, 1, 1, 0.985])
  return (
    <article ref={chapterRef} className="orbit-chapter chapter-right" id={world.id}>
      <m.div className="orbit-copy" style={reduceMotion ? undefined : { opacity, y, scale }}>
        <div className="orbit-card-header">
          <span className="orbit-module-symbol"><Icon name={world.icon} /></span>
          <span><small>ESTAÇÃO {world.number} / 05</small><strong>{world.eyebrow}</strong></span>
        </div>
        <h3>{world.title}</h3>
        <p className="orbit-summary">{world.description}</p>
        <span className="orbit-feature-label">O QUE VOCÊ ENCONTRA</span>
        <div className="orbit-feature-list" aria-label={`Funcionalidades de ${world.eyebrow}`}>
          {world.capabilities.map((capability) => (
            <div key={capability}>
              <Icon name="check_circle" />
              <strong>{capability}</strong>
            </div>
          ))}
        </div>
        <div className="orbit-result">
          <Icon name="insights" />
          <p>{world.insight}</p>
        </div>
        <div className="orbit-card-footer">
          <span>{world.next}</span>
          <Icon name="arrow_forward" />
        </div>
      </m.div>
    </article>
  )
}

export function OrbitalJourney() {
  const journeyRef = useRef<HTMLDivElement>(null)
  const reduceMotion = Boolean(useReducedMotion())
  const { scrollYProgress } = useScroll({ target: journeyRef, offset: ["start start", "end end"] })
  const progress = useSpring(scrollYProgress, { stiffness: 105, damping: 34, mass: 0.22, restDelta: 0.0005 })
  const starsY = useTransform(progress, [0, 1], ["0%", "-6%"])
  const starsScale = useTransform(progress, [0, 1], [1, 1.08])

  return (
    <div className="orbital-journey" ref={journeyRef}>
      <div className="orbital-stage" aria-hidden="true">
        <m.div className="orbital-stars" style={reduceMotion ? undefined : { y: starsY, scale: starsScale }} />
        <OrbitalMap progress={progress} reduceMotion={reduceMotion} />
        <JourneyHud progress={progress} reduceMotion={reduceMotion} />
        <div className="orbital-coordinate coordinate-a">35° 41′ 22″ / LVL.01</div>
        <div className="orbital-coordinate coordinate-b">SYSTEM / CONNECTED</div>
      </div>

      <header className="orbital-intro">
        <p className="marketing-eyebrow">LEVEL OS POR DENTRO</p>
        <h2>Uma jornada.<br />Um sistema.</h2>
        <p>Cada parada apresenta um módulo e o papel dele na sua vida.</p>
      </header>

      <div className="orbit-chapters">
        {worlds.map((world) => <WorldChapter world={world} reduceMotion={reduceMotion} key={world.id} />)}
      </div>
    </div>
  )
}
