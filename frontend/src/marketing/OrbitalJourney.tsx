import { useRef, type Key } from "react"
import { useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from "motion/react"
import * as m from "motion/react-m"
import { ArrowRight, CalendarDays, Dumbbell, Trophy, Utensils, WalletCards } from "lucide-react"
import { LevelMark } from "../components/ui/LevelMark"

const worlds = [
  {
    number: "01",
    id: "financas",
    eyebrow: "Finanças",
    title: "Entenda seu dinheiro sem montar outra planilha.",
    description: "Contas, cartões, patrimônio, rendas, despesas, parcelamentos e imposto de renda compartilham a mesma visão.",
    proof: "Do lançamento ao patrimônio",
    value: "R$ 4.820",
    valueLabel: "saldo projetado",
    icon: WalletCards,
  },
  {
    number: "02",
    id: "rotina",
    eyebrow: "Rotina",
    title: "Transforme intenção em um dia que realmente acontece.",
    description: "Tarefas, horários recorrentes e compromissos aparecem no momento certo, sem disputar atenção o dia inteiro.",
    proof: "Hoje, semana, mês e ano",
    value: "03",
    valueLabel: "prioridades hoje",
    icon: CalendarDays,
  },
  {
    number: "03",
    id: "treinos",
    eyebrow: "Treinos",
    title: "Registre consistência, não apenas repetições.",
    description: "Planeje sessões, acompanhe cargas, medidas e evolução corporal sem perder o histórico que explica seu progresso.",
    proof: "Treino e evolução conectados",
    value: "04",
    valueLabel: "treinos em sequência",
    icon: Dumbbell,
  },
  {
    number: "04",
    id: "alimentacao",
    eyebrow: "Alimentação",
    title: "Planejamento alimentar dentro da sua realidade.",
    description: "Crie cardápios, revise custos e transforme refeições em uma lista de compras prática para a semana.",
    proof: "Cardápio, orçamento e compras",
    value: "35",
    valueLabel: "refeições planejadas",
    icon: Utensils,
  },
  {
    number: "05",
    id: "progresso",
    eyebrow: "Progresso",
    title: "Veja sua evolução atravessar todas as áreas.",
    description: "XP, níveis e conquistas tornam visível o efeito acumulado das pequenas ações — sem transformar sua vida em um jogo vazio.",
    proof: "Uma jornada, vários sinais",
    value: "2.840",
    valueLabel: "XP acumulado",
    icon: Trophy,
  },
] as const

type World = (typeof worlds)[number]
const chapterStops = [0.2, 0.4, 0.6, 0.8, 0.985] as const
const cameraStops = [0, 0.08, 0.2, 0.28, 0.4, 0.48, 0.6, 0.68, 0.8, 0.88, 0.985, 1]
const routePhases = [
  { from: "Núcleo", to: "Finanças", start: 0.08, end: 0.16 },
  { from: "Finanças", to: "Rotina", start: 0.25, end: 0.35 },
  { from: "Rotina", to: "Treinos", start: 0.45, end: 0.55 },
  { from: "Treinos", to: "Alimentação", start: 0.65, end: 0.75 },
  { from: "Alimentação", to: "Progresso", start: 0.85, end: 0.94 },
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
  const Icon = world.icon

  return (
    <m.div className={`orbit-node orbit-node-${world.id}`} style={reduceMotion ? undefined : { opacity, scale }} aria-hidden="true">
      <span className="orbit-node-radar" />
      <span className="orbit-node-disc"><Icon /></span>
      <span className="orbit-node-label">{world.number} / {world.eyebrow}</span>
    </m.div>
  )
}

function OrbitalMap({ progress, reduceMotion }: { progress: MotionValue<number>; reduceMotion: boolean }) {
  const x = useTransform(progress, cameraStops, ["11%", "16%", "72%", "20%", "-9%", "0%", "-42%", "-20%", "-52%", "-25%", "-36%", "-9%"])
  const y = useTransform(progress, cameraStops, ["10%", "5%", "-21%", "-2%", "-51%", "-15%", "44%", "20%", "25%", "5%", "-25%", "0%"])
  const scale = useTransform(progress, cameraStops, [0.74, 0.94, 1.56, 1.02, 1.58, 1.02, 1.62, 1.03, 1.66, 1.02, 1.62, 0.86])
  const rotate = useTransform(progress, cameraStops, [-7, -3, -1, 3, 5, 7, 9, 7, 5, 8, 11, 13])
  const travelerDistance = useTransform(
    progress,
    [0.08, 0.2, 0.4, 0.6, 0.8, 0.985],
    ["0%", "25%", "42%", "74%", "84%", "100%"],
  )
  const journeyPathLength = useTransform(progress, [0.08, 0.985], [0, 1])

  return (
    <m.div className="orbital-map" style={reduceMotion ? undefined : { x, y, scale, rotate }}>
      <svg className="orbital-routes" viewBox="0 0 1200 900" aria-hidden="true">
        <m.path className="orbit-route route-primary" d="M-80 828C180 796 216 535 423 573C643 614 738 827 1280 690" style={{ pathLength: reduceMotion ? 1 : progress }} />
        <m.path className="orbit-route" d="M128 822C285 595 383 413 600 493C817 573 856 757 1168 547" style={{ pathLength: reduceMotion ? 1 : progress }} />
        <m.path className="orbit-route" d="M258 706C337 442 575 265 844 316C1000 345 1076 197 1192 70" style={{ pathLength: reduceMotion ? 1 : progress }} />
        <m.path className="orbit-route route-dashed" d="M12 706C297 381 501 779 774 511C945 344 974 127 1215 92" style={{ pathLength: reduceMotion ? 1 : progress }} />
        <m.path
          className="orbit-route journey-route"
          d="M690 575C520 650 310 520 180 567C280 630 390 700 516 702C710 650 820 310 984 153C925 195 870 245 816 270C875 350 945 425 1008 522"
          style={{ pathLength: reduceMotion ? 1 : journeyPathLength }}
        />
        <ellipse className="core-orbit" cx="690" cy="575" rx="220" ry="142" />
        <ellipse className="core-orbit core-orbit-inner" cx="690" cy="575" rx="134" ry="84" />
        {[{ x: 87, y: 794 }, { x: 298, y: 660 }, { x: 455, y: 598 }, { x: 836, y: 704 }, { x: 1010, y: 602 }, { x: 1110, y: 202 }].map((point, index) => <circle className="route-junction" cx={point.x} cy={point.y} r={index % 2 ? 7 : 4} key={`${point.x}-${point.y}`} />)}
      </svg>
      <m.span className="orbit-traveler" style={reduceMotion ? undefined : { offsetDistance: travelerDistance }} aria-hidden="true" />

      <div className="orbit-core" aria-hidden="true">
        <span className="orbit-core-ring ring-outer" /><span className="orbit-core-ring ring-inner" />
        <span className="orbit-core-disc"><LevelMark /></span>
        <span className="orbit-core-caption">LEVEL OS / NÚCLEO</span>
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

export function OrbitalJourney() {
  const journeyRef = useRef<HTMLDivElement>(null)
  const reduceMotion = Boolean(useReducedMotion())
  const { scrollYProgress } = useScroll({ target: journeyRef, offset: ["start start", "end end"] })
  const progress = useSpring(scrollYProgress, { stiffness: 90, damping: 28, mass: 0.32 })

  return (
    <div className="orbital-journey" ref={journeyRef}>
      <div className="orbital-stage" aria-hidden="true">
        <div className="orbital-stars" />
        <OrbitalMap progress={progress} reduceMotion={reduceMotion} />
        <JourneyHud progress={progress} reduceMotion={reduceMotion} />
        <div className="orbital-coordinate coordinate-a">35° 41′ 22″ / LVL.01</div>
        <div className="orbital-coordinate coordinate-b">SYSTEM / CONNECTED</div>
      </div>

      <header className="orbital-intro">
        <p className="marketing-eyebrow">UMA VISÃO, NÃO CINCO APLICATIVOS</p>
        <h2>Uma constelação.<br />Seu centro.</h2>
        <p>Cada módulo orbita a mesma vida. Conforme você avança, o Level OS aproxima o que importa e mantém todo o contexto conectado.</p>
      </header>

      <div className="orbit-chapters">
        {worlds.map((world, index) => {
          const Icon = world.icon
          return (
            <article className={`orbit-chapter ${index % 2 ? "chapter-right" : "chapter-left"}`} id={world.id} key={world.id}>
              <m.div
                className="orbit-copy"
                initial={reduceMotion ? false : { opacity: 0, y: 30, filter: "blur(8px)" }}
                whileInView={reduceMotion ? undefined : { opacity: 1, y: 0, filter: "blur(0px)" }}
                viewport={{ once: false, amount: 0.55 }}
                transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="orbit-copy-meta"><span>{world.number}</span><span><Icon size={15} /> {world.eyebrow}</span></div>
                <h3>{world.title}</h3>
                <p>{world.description}</p>
                <div className="orbit-readout"><strong>{world.value}</strong><span>{world.valueLabel}</span></div>
                <small>{world.proof} <ArrowRight size={14} /></small>
              </m.div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
