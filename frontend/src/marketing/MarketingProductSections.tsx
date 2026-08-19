import { useRef, useState, type KeyboardEvent, type ReactNode } from "react"
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Check,
  ChevronDown,
  CircleDollarSign,
  Dumbbell,
  FileUp,
  LockKeyhole,
  Salad,
  ShieldCheck,
  Sparkles,
  Target,
  Undo2,
  WalletCards,
} from "lucide-react"
import { AnimatePresence, useInView, useReducedMotion } from "motion/react"
import * as m from "motion/react-m"
import { Icon } from "../design-system"

const PRODUCT_AREAS = [
  {
    id: "financeiro",
    index: "01",
    name: "Finanças",
    kicker: "Seu dinheiro, sem planilha paralela",
    title: "Entenda o presente e enxergue o que vem depois.",
    description: "Contas, cartões, despesas, renda e patrimônio compartilham o mesmo contexto. O período muda; a leitura continua coerente.",
    result: "Patrimônio consolidado",
    metric: "R$ 28.460",
    change: "+ R$ 1.240 no período",
    icon: "account_balance_wallet",
    features: ["Contas e cartões", "Importação OFX", "Parcelamentos", "Salário CLT e PJ", "Imposto de renda"],
    cta: "Organizar meu dinheiro",
  },
  {
    id: "rotina",
    index: "02",
    name: "Rotina",
    kicker: "O dia possível, não o dia idealizado",
    title: "Prioridades, recorrências e agenda em uma visão executável.",
    description: "Crie tarefas, distribua horários e acompanhe o que foi concluído sem perder o histórico das semanas anteriores.",
    result: "Consistência da semana",
    metric: "67%",
    change: "4 de 6 prioridades concluídas",
    icon: "event",
    features: ["Tarefas recorrentes", "Vários horários", "Google Calendar", "Lembretes", "Visões por período"],
    cta: "Planejar minha semana",
  },
  {
    id: "treinos",
    index: "03",
    name: "Treinos",
    kicker: "Evolução que cabe no seu histórico",
    title: "Do programa ao registro da última série.",
    description: "Organize sessões, exercícios, cargas, cardio e medidas corporais com uma leitura clara da sua evolução.",
    result: "Volume semanal",
    metric: "8.420 kg",
    change: "+ 11% em quatro semanas",
    icon: "exercise",
    features: ["Programas completos", "Séries e cargas", "Cardio", "Medidas corporais", "Histórico de evolução"],
    cta: "Montar meu primeiro treino",
  },
  {
    id: "alimentacao",
    index: "04",
    name: "Alimentação",
    kicker: "Planejamento antes da próxima compra",
    title: "Cardápio, orçamento e lista de compras conectados.",
    description: "Revise refeições antes de aprovar, acompanhe o custo estimado e transforme o plano em uma lista prática para o mercado.",
    result: "Plano de sete dias",
    metric: "35 refeições",
    change: "84% do orçamento utilizado",
    icon: "restaurant",
    features: ["Cardápio semanal", "Custo estimado", "Lista de compras", "Edição antes de aprovar", "Histórico de planos"],
    cta: "Planejar minha alimentação",
  },
  {
    id: "progresso",
    index: "05",
    name: "Progresso",
    kicker: "Consistência que se torna visível",
    title: "Um único lugar para perceber que você avançou.",
    description: "XP, níveis, conquistas e indicadores dos módulos transformam registros cotidianos em uma visão de continuidade.",
    result: "Nível atual",
    metric: "LV 07",
    change: "640 XP para o próximo nível",
    icon: "military_tech",
    features: ["XP por módulo", "Conquistas", "Sequências", "Resumo semanal", "Evolução integrada"],
    cta: "Começar minha evolução",
  },
] as const

const CAPABILITIES = [
  { icon: WalletCards, title: "Vida financeira completa", text: "Contas, cartões, rendas, despesas, parcelamentos e patrimônio." },
  { icon: FileUp, title: "Importação OFX", text: "Traga o extrato do banco e revise os lançamentos antes de aplicar." },
  { icon: CircleDollarSign, title: "Salário e imposto de renda", text: "Simulações CLT ou PJ e organização dos dados usados no IR." },
  { icon: CalendarDays, title: "Rotina recorrente", text: "Tarefas com vários horários, repetição e leitura por período." },
  { icon: Dumbbell, title: "Treino completo", text: "Programas, exercícios, séries, cargas, cardio e medidas." },
  { icon: Salad, title: "Alimentação planejada", text: "Cardápios revisáveis, orçamento e lista de compras agregada." },
  { icon: Sparkles, title: "Agentes especializados", text: "Cada agente atua somente no próprio módulo e pede confirmação." },
  { icon: Target, title: "XP e conquistas", text: "Progresso entre finanças, rotina, treinos e alimentação." },
  { icon: BadgeCheck, title: "Insights locais", text: "Alertas importantes calculados sem gastar chamadas de IA." },
  { icon: ShieldCheck, title: "Acesso protegido", text: "Login Google, 2FA, sessões protegidas e isolamento por usuário." },
  { icon: Undo2, title: "Histórico e restauração", text: "Reveja decisões, desfaça ações e restaure versões de planos." },
  { icon: LockKeyhole, title: "Backup e exportação", text: "Seus dados continuam disponíveis para baixar e proteger." },
] as const

const COMPARISONS = [
  ["Planilhas e aplicativos separados", "Um histórico conectado"],
  ["Lembretes espalhados", "Próximas ações em contexto"],
  ["Dados acumulados sem leitura", "Indicadores e alertas objetivos"],
  ["Chat genérico", "Agentes com função e limites claros"],
] as const

const FAQ_ITEMS = [
  ["Preciso conectar minha conta bancária?", "Não. Você pode cadastrar as contas manualmente ou importar arquivos OFX. O Level OS não pede sua senha bancária."],
  ["A IA pode alterar meus dados sozinha?", "Não. Ações relevantes são apresentadas para revisão e confirmação. Cada agente também possui um escopo isolado."],
  ["O que acontece depois dos 30 dias?", "Você escolhe se deseja continuar no plano Individual. Seus dados continuam exportáveis, mesmo quando a escrita paga estiver bloqueada."],
  ["Funciona no celular?", "Sim. A experiência web é responsiva e instalável como PWA, mantendo os mesmos dados da versão para computador."],
  ["Posso exportar minhas informações?", "Sim. Backup e exportação permanecem disponíveis para que você mantenha o controle sobre o próprio histórico."],
  ["O Level OS substitui contador, nutricionista ou personal?", "Não. Ele organiza informações e rotinas pessoais, mas não substitui orientação profissional financeira, contábil, médica ou esportiva."],
] as const

type ProductArea = (typeof PRODUCT_AREAS)[number]

function MarketingReveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-50px" })
  const reduceMotion = useReducedMotion()
  const hidden = { opacity: 0, y: 8, filter: "blur(6px)" }

  return (
    <m.div
      ref={ref}
      className={className}
      initial={reduceMotion ? false : hidden}
      animate={reduceMotion || isInView ? { opacity: 1, y: 0, filter: "blur(0px)" } : hidden}
      transition={{ duration: .42, delay, ease: "easeOut" }}
    >
      {children}
    </m.div>
  )
}

function ProductPreview({ area }: { area: ProductArea }) {
  return (
    <div className={`tour-preview tour-preview-${area.id}`} aria-label={`Prévia do módulo ${area.name}`}>
      <div className="tour-preview-bar"><span><Icon name={area.icon} /> {area.name}</span><small>Dados de demonstração</small></div>
      <div className="tour-preview-hero"><small>{area.result}</small><strong>{area.metric}</strong><span>{area.change}</span></div>
      {area.id === "financeiro" ? (
        <><svg className="tour-chart" viewBox="0 0 520 150" role="img" aria-label="Patrimônio em crescimento"><path className="guide" d="M0 120H520M0 75H520M0 30H520" /><path className="area" d="M0 125C48 110 76 124 116 99s68-8 107-34 74 16 121-8 91-25 176-44V150H0Z" /><path className="line" d="M0 125C48 110 76 124 116 99s68-8 107-34 74 16 121-8 91-25 176-44" /></svg><div className="tour-mini-metrics"><span><small>Saldo</small><b>R$ 9.840</b></span><span><small>Fatura</small><b>R$ 2.180</b></span><span><small>Reservas</small><b>R$ 20.800</b></span></div></>
      ) : area.id === "rotina" ? (
        <div className="tour-task-list"><span><i className="done"><Check /></i><b>Revisar prioridades</b><small>08:30</small></span><span><i /><b>Planejamento semanal</b><small>19:00</small></span><span><i /><b>Preparar amanhã</b><small>21:15</small></span></div>
      ) : area.id === "treinos" ? (
        <div className="tour-workout-list"><span><b>Supino reto</b><i><em style={{ width: "82%" }} /></i><small>4 × 8 · 72 kg</small></span><span><b>Remada curvada</b><i><em style={{ width: "68%" }} /></i><small>3 × 10 · 60 kg</small></span><span><b>Desenvolvimento</b><i><em style={{ width: "55%" }} /></i><small>3 × 8 · 28 kg</small></span></div>
      ) : area.id === "alimentacao" ? (
        <div className="tour-meal-grid"><span><small>07:30</small><b>Café da manhã</b><em>R$ 6,40</em></span><span><small>12:30</small><b>Almoço</b><em>R$ 12,80</em></span><span><small>19:30</small><b>Jantar</b><em>R$ 9,60</em></span><span><small>LISTA</small><b>24 itens</b><em>pronta</em></span></div>
      ) : (
        <div className="tour-level-view"><div><span>07</span></div><section><small>SEQUÊNCIA ATUAL</small><strong>12 dias</strong><p><i /><i /><i /><i /><i /><i /><i /></p></section></div>
      )}
      <div className="tour-preview-footer"><span><i /> Sincronizado</span><span>Atualizado agora</span></div>
    </div>
  )
}

export function ProductTourSection() {
  const [activeId, setActiveId] = useState<ProductArea["id"]>("financeiro")
  const reduceMotion = useReducedMotion()
  const active = PRODUCT_AREAS.find((area) => area.id === activeId) ?? PRODUCT_AREAS[0]

  const moveTab = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
    event.preventDefault()
    const direction = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1
    const next = (index + direction + PRODUCT_AREAS.length) % PRODUCT_AREAS.length
    setActiveId(PRODUCT_AREAS[next].id)
    document.getElementById(`product-tab-${PRODUCT_AREAS[next].id}`)?.focus()
  }

  return (
    <section className="product-tour-section deferred-section" id="recursos" aria-labelledby="product-tour-title">
      <MarketingReveal className="tour-heading"><div><p className="marketing-eyebrow">O PRODUTO, POR DENTRO</p><h2 id="product-tour-title">Cinco áreas.<br />Um só contexto.</h2></div><p>Escolha um módulo para ver como o Level OS transforma registros cotidianos em uma próxima ação clara.</p></MarketingReveal>
      <div className="tour-tabs-shell">
        <div className="tour-tabs" role="tablist" aria-label="Módulos do Level OS">
          {PRODUCT_AREAS.map((area, index) => <button id={`product-tab-${area.id}`} role="tab" aria-selected={active.id === area.id} aria-controls="product-tour-panel" tabIndex={active.id === area.id ? 0 : -1} type="button" key={area.id} onClick={() => setActiveId(area.id)} onKeyDown={(event) => moveTab(event, index)}><span>{area.index}</span><Icon name={area.icon} /><b>{area.name}</b></button>)}
        </div>
      </div>
      <div className="tour-stage" id="product-tour-panel" role="tabpanel" aria-labelledby={`product-tab-${active.id}`} tabIndex={0}>
        <AnimatePresence mode="wait" initial={false}>
          <m.div className="tour-copy" key={`${active.id}-copy`} initial={reduceMotion ? false : { opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} exit={reduceMotion ? undefined : { opacity: 0, x: 10 }} transition={{ duration: .28 }}>
            <span className="tour-module-index">{active.index} / {active.name}</span><p className="marketing-eyebrow">{active.kicker}</p><h3>{active.title}</h3><p>{active.description}</p><ul>{active.features.map((feature) => <li key={feature}><Check /> {feature}</li>)}</ul><a className="tour-contextual-cta" href="https://lvlos.com/register.php">{active.cta} <ArrowRight /></a>
          </m.div>
          <m.div className="tour-media" key={`${active.id}-media`} initial={reduceMotion ? false : { opacity: 0, scale: .985, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={reduceMotion ? undefined : { opacity: 0, scale: .99, y: -8 }} transition={{ duration: .32 }}><ProductPreview area={active} /></m.div>
        </AnimatePresence>
      </div>
    </section>
  )
}

export function CapabilitySection() {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? CAPABILITIES : CAPABILITIES.slice(0, 6)
  return (
    <section className="capabilities-section deferred-section" aria-labelledby="capabilities-title">
      <MarketingReveal className="capabilities-heading"><div><p className="marketing-eyebrow">PROFUNDIDADE SOB DEMANDA</p><h2 id="capabilities-title">Recursos para usar.<br />Não para decorar a tela.</h2></div><p>O essencial aparece primeiro. As ferramentas mais específicas continuam prontas quando você precisar aprofundar.</p></MarketingReveal>
      <div className="capabilities-grid">{visible.map(({ icon: CapabilityIcon, title, text }, index) => <m.article key={title} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: .36, delay: Math.min(index, 5) * .035 }}><span><CapabilityIcon /></span><div><h3>{title}</h3><p>{text}</p></div></m.article>)}</div>
      <button className="capabilities-toggle" type="button" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>{expanded ? "Mostrar somente o essencial" : `Ver todos os ${CAPABILITIES.length} recursos`} <ChevronDown className={expanded ? "is-open" : ""} /></button>
    </section>
  )
}

export function BeforeAfterSection() {
  return (
    <section className="comparison-section deferred-section" aria-labelledby="comparison-title">
      <MarketingReveal className="comparison-heading"><p className="marketing-eyebrow">MENOS FRAGMENTAÇÃO</p><h2 id="comparison-title">A diferença aparece<br />na rotina.</h2></MarketingReveal>
      <div className="comparison-table"><div className="comparison-labels"><span>ANTES</span><span>COM LEVEL OS</span></div>{COMPARISONS.map(([before, after], index) => <div className="comparison-row" key={before}><span><b>{String(index + 1).padStart(2, '0')}</b>{before}</span><ArrowRight /><strong>{after}</strong></div>)}</div>
    </section>
  )
}

export function PricingSection() {
  return (
    <section className="pricing-section deferred-section" id="planos" aria-labelledby="pricing-title">
      <MarketingReveal className="pricing-heading"><p className="marketing-eyebrow">COMECE ANTES DE DECIDIR</p><h2 id="pricing-title">Trinta dias para montar<br />o seu sistema.</h2><p>Sem cartão no cadastro. Depois, um único plano para continuar usando todos os módulos e os agentes especializados.</p></MarketingReveal>
      <div className="pricing-grid">
        <article className="pricing-card trial"><header><span>PERÍODO GRATUITO</span><b>30 dias</b></header><div className="pricing-value"><strong>R$ 0</strong><small>sem cartão</small></div><ul><li><Check /> Módulos manuais completos</li><li><Check /> PWA instalável</li><li><Check /> Backup e exportação</li><li><Check /> Login Google e 2FA</li><li className="muted"><LockKeyhole /> Agentes de IA no plano Individual</li></ul><a className="button button-quiet" href="https://lvlos.com/register.php">Começar meus 30 dias</a></article>
        <article className="pricing-card featured"><header><span>PLANO INDIVIDUAL</span><b>MAIS COMPLETO</b></header><div className="pricing-value"><strong><small>R$</small> 19,90</strong><small>por mês</small></div><ul><li><Check /> Tudo do período gratuito</li><li><Check /> Todos os agentes especializados</li><li><Check /> Histórico e ações com confirmação</li><li><Check /> Insights conectados aos módulos</li><li><Check /> Pix por 30 dias ou cartão recorrente</li></ul><a className="button" href="https://lvlos.com/register.php">Criar minha conta <ArrowRight /></a></article>
      </div>
      <p className="pricing-note"><ShieldCheck /> O plano só é ativado depois da confirmação segura do pagamento. Seus dados permanecem exportáveis.</p>
    </section>
  )
}

export function FaqSection() {
  return (
    <section className="faq-section deferred-section" id="duvidas" aria-labelledby="faq-title">
      <MarketingReveal className="faq-heading"><p className="marketing-eyebrow">PERGUNTAS IMPORTANTES</p><h2 id="faq-title">Antes de começar.</h2><p>Respostas diretas sobre dados, IA, período gratuito e uso no celular.</p></MarketingReveal>
      <div className="faq-list">{FAQ_ITEMS.map(([question, answer]) => <details key={question}><summary>{question}<ChevronDown /></summary><p>{answer}</p></details>)}</div>
    </section>
  )
}
