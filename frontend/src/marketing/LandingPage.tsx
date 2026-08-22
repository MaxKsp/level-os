import { useEffect, useState, type Key, type ReactNode } from "react"
import { AnimatePresence, useReducedMotion, useScroll, useSpring } from "motion/react"
import * as m from "motion/react-m"
import {
  ArrowDown,
  ArrowRight,
  Check,
  LockKeyhole,
  Menu,
  Sparkles,
  X,
} from "lucide-react"
import { LevelMark } from "../components/ui/LevelMark"
import { Icon } from "../design-system"
import { AssistantAvatar } from "../modules/assistant/AssistantAvatar"
import type { AssistantModule } from "../modules/assistant/store"
import {
  FaqSection,
  PricingSection,
  ProductTourSection,
} from "./MarketingProductSections"
import { OrbitalJourney } from "./OrbitalJourney"

const ASSISTANT_AGENTS = [
  {
    id: "geral",
    name: "Agente de IA",
    module: "Coordenação geral",
    context: null,
    icon: "stars",
    purpose: "Entende o pedido e encaminha você ao especialista certo, sem misturar os contextos.",
    prompt: "Quero organizar melhor minha semana.",
    response: "Posso começar pela sua agenda com a Secretária Nina e conectar o plano às suas metas.",
    action: "Escolher um especialista",
    source: "Contexto dos módulos",
  },
  {
    id: "financeiro",
    name: "Assessor Fin",
    module: "Finanças",
    context: "financeiro",
    icon: "account_balance",
    purpose: "Consulta contas e orçamento, categoriza movimentações e explica para onde seu dinheiro está indo.",
    prompt: "Quanto comprometi do meu orçamento este mês?",
    response: "Você utilizou 63% do orçamento mensal. Alimentação cresceu 12%, enquanto transporte caiu 8%.",
    action: "Ver análise financeira",
    source: "Dados financeiros atualizados",
  },
  {
    id: "agenda",
    name: "Secretária Nina",
    module: "Rotina",
    context: "agenda",
    icon: "event",
    purpose: "Organiza agenda, tarefas e recorrências para transformar planos em um dia executável.",
    prompt: "Organize minhas tarefas de amanhã.",
    response: "Encontrei quatro tarefas. Posso distribuir as prioridades em três blocos sem conflito de horário.",
    action: "Abrir minha rotina",
    source: "Agenda e tarefas do Level OS",
  },
  {
    id: "treinos",
    name: "Personal Léo",
    module: "Treinos",
    context: "treinos",
    icon: "exercise",
    purpose: "Monta programas, acompanha sessões, cardio, medidas corporais e evolução de desempenho.",
    prompt: "Monte meu próximo treino de força.",
    response: "Preparei uma sessão de 45 minutos baseada no seu histórico e no grupo muscular menos trabalhado.",
    action: "Revisar treino",
    source: "Histórico de treinos",
  },
  {
    id: "alimentacao",
    name: "Cheff Rita",
    module: "Alimentação",
    context: "alimentacao",
    icon: "restaurant",
    purpose: "Cria cardápios e receitas alinhados ao objetivo, período e orçamento informado.",
    prompt: "Crie um cardápio simples para sete dias.",
    response: "Montei 35 refeições dentro do orçamento, com uma lista de compras pronta para você revisar.",
    action: "Ver cardápio",
    source: "Plano alimentar e orçamento",
  },
] as const

function Reveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number; key?: Key }) {
  const reduceMotion = useReducedMotion()
  return (
    <m.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: 24, filter: "blur(7px)" }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-72px" }}
      transition={{ duration: 0.52, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </m.div>
  )
}

function PageProgress() {
  const reduceMotion = useReducedMotion()
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 28, mass: 0.25 })
  if (reduceMotion) return null
  return <m.div className="page-progress" style={{ scaleX }} aria-hidden="true" />
}

function Brand() {
  return (
    <a className="marketing-brand" href="#inicio" aria-label="Level OS — início">
      <span className="marketing-brand-mark"><LevelMark /></span>
      <span>LEVEL OS</span>
    </a>
  )
}

function DashboardPreview() {
  return (
    <figure className="marketing-product marketing-product-screenshot">
      <div className="product-screenshot-label">
        <span>VISÃO GERAL</span>
        <span><i /> Captura real da plataforma</span>
      </div>
      <picture><source srcSet="/marketing/screens/overview.avif" type="image/avif" /><source srcSet="/marketing/screens/overview.webp" type="image/webp" /><img src="/marketing/screens/overview.png" alt="Tela real da Visão Geral do Level OS com prioridades do dia, resumo financeiro e navegação lateral" width={1280} height={720} decoding="async" fetchPriority="high" /></picture>
      <span className="hero-guide hero-guide-today"><i>1</i><b>Seu dia</b><small>Prioridades que pedem ação</small></span>
      <span className="hero-guide hero-guide-money"><i>2</i><b>Seu dinheiro</b><small>Patrimônio e alertas no contexto</small></span>
      <span className="hero-guide hero-guide-progress"><i>3</i><b>Sua evolução</b><small>Rotina, treino e XP conectados</small></span>
      <figcaption>Interface real do produto · dados de demonstração</figcaption>
    </figure>
  )
}

function useMarketingMotionGuard() {
  useEffect(() => {
    let lastY = window.scrollY
    let lastTime = performance.now()
    let clearTimer = 0
    let frame = 0
    const onScroll = () => {
      if (frame) return
      frame = window.requestAnimationFrame(() => {
        const now = performance.now()
        const speed = Math.abs(window.scrollY - lastY) / Math.max(1, now - lastTime)
        if (speed > 1.45) {
          document.documentElement.dataset.marketingScroll = "fast"
          window.clearTimeout(clearTimer)
          clearTimer = window.setTimeout(() => { delete document.documentElement.dataset.marketingScroll }, 180)
        }
        lastY = window.scrollY
        lastTime = now
        frame = 0
      })
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => { window.removeEventListener("scroll", onScroll); window.cancelAnimationFrame(frame); window.clearTimeout(clearTimer); delete document.documentElement.dataset.marketingScroll }
  }, [])
}

function MarketingTypewriter({ text, identity }: { text: string; identity: string }) {
  const reduceMotion = useReducedMotion()
  const [visible, setVisible] = useState(reduceMotion ? text.length : 0)

  useEffect(() => {
    if (reduceMotion) { setVisible(text.length); return }
    let cancelled = false
    let timer = 0
    setVisible(0)
    const advance = (current: number) => {
      if (cancelled || current >= text.length) return
      const next = current + 1
      setVisible(next)
      const character = text[next - 1]
      const delay = /[.!?]/.test(character) ? 82 : /[,;:]/.test(character) ? 42 : character === " " ? 10 : 16
      timer = window.setTimeout(() => advance(next), delay)
    }
    timer = window.setTimeout(() => advance(0), 520)
    return () => { cancelled = true; window.clearTimeout(timer) }
  }, [identity, reduceMotion, text])

  const finished = visible >= text.length
  return (
    <button className="marketing-typewriter" type="button" onClick={() => setVisible(text.length)} aria-label={finished ? text : "Resposta sendo digitada. Clique para revelar."}>
      {visible === 0 ? <span className="agent-thinking" aria-hidden="true"><i /><i /><i /></span> : <><span aria-hidden="true">{text.slice(0, visible)}</span>{!finished ? <i className="typewriter-cursor" aria-hidden="true" /> : null}</>}
      <span className="marketing-sr-only" aria-live="polite">{text}</span>
    </button>
  )
}

function AgentChatPreview({ agent }: { agent: (typeof ASSISTANT_AGENTS)[number] }) {
  return (
    <div className="agent-chat-preview">
      <div className="agent-chat-header">
        <span className="agent-avatar"><AssistantAvatar module={agent.context as AssistantModule | null} /></span>
        <div><strong>{agent.name}</strong><small>{agent.purpose}</small></div>
        <span className="agent-online"><i /> online</span>
      </div>
      <div className="agent-chat-context"><LockKeyhole /><span>Contexto isolado · {agent.module}</span></div>
      <div className="agent-chat-body">
        <div className="agent-chat-user">{agent.prompt}</div>
        <div className="agent-chat-answer">
          <span className="agent-avatar small"><AssistantAvatar module={agent.context as AssistantModule | null} /></span>
          <div><MarketingTypewriter text={agent.response} identity={agent.id} /><small><Check /> {agent.source}</small></div>
        </div>
      </div>
      <div className="agent-chat-footer"><span>Peça ao {agent.name}…</span><button type="button" aria-label="Enviar exemplo"><Icon name="arrow_forward" /></button></div>
    </div>
  )
}

export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [showStickyCta, setShowStickyCta] = useState(false)
  const [activeAgentId, setActiveAgentId] = useState<(typeof ASSISTANT_AGENTS)[number]["id"]>("financeiro")
  const activeAgent = ASSISTANT_AGENTS.find((agent) => agent.id === activeAgentId) ?? ASSISTANT_AGENTS[1]
  useMarketingMotionGuard()
  useEffect(() => {
    const hero = document.getElementById("inicio")
    if (!hero) return
    const observer = new IntersectionObserver(([entry]) => setShowStickyCta(!entry.isIntersecting), { threshold: .12 })
    observer.observe(hero)
    return () => observer.disconnect()
  }, [])
  return (
    <div className="marketing-shell">
      <PageProgress />
      <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
      <header className="marketing-header">
        <Brand />
        <nav className="marketing-nav" aria-label="Navegação principal">
          <a href="#sistema">O sistema</a><a href="#recursos">Recursos</a><a href="#agentes">Agentes</a><a href="#planos">Planos</a>
        </nav>
        <div className="marketing-header-actions"><a className="text-link" href="https://lvlos.com/login.php">Entrar</a><a className="button button-small" href="https://lvlos.com/register.php">Começar grátis <ArrowRight size={16} /></a></div>
        <button className="marketing-menu-button" type="button" aria-expanded={menuOpen} aria-controls="marketing-mobile-menu" aria-label={menuOpen ? "Fechar menu" : "Abrir menu"} onClick={() => setMenuOpen((value) => !value)}>{menuOpen ? <X /> : <Menu />}</button>
      </header>
      <AnimatePresence>
        {menuOpen ? <m.nav id="marketing-mobile-menu" className="marketing-mobile-nav" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}><a href="#sistema" onClick={() => setMenuOpen(false)}>O sistema</a><a href="#recursos" onClick={() => setMenuOpen(false)}>Recursos</a><a href="#agentes" onClick={() => setMenuOpen(false)}>Agentes</a><a href="#planos" onClick={() => setMenuOpen(false)}>Planos</a><a href="#duvidas" onClick={() => setMenuOpen(false)}>Dúvidas</a><a href="https://lvlos.com/login.php">Entrar</a><a className="button" href="https://lvlos.com/register.php">Começar grátis</a></m.nav> : null}
      </AnimatePresence>

      <main id="conteudo">
        <section className="marketing-hero" id="inicio">
          <div className="hero-grid" aria-hidden="true" />
          <div className="hero-copy">
            <m.div className="hero-edition" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.45 }}><span>LEVEL OS / SUA VISÃO GERAL</span><i>ONLINE</i></m.div>
            <m.p className="marketing-eyebrow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.45 }}>SEU SISTEMA OPERACIONAL PESSOAL</m.p>
            <m.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.68, ease: [0.22, 1, 0.36, 1] }}>Comece pelo que<br /><span>importa hoje.</span></m.h1>
            <m.div className="hero-lower" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.62, delay: 0.12 }}>
              <p className="hero-description">Uma tela inicial que reúne seu dinheiro, compromissos, treino e progresso — com contexto suficiente para você agir, sem transformar sua vida em outra planilha.</p>
              <div className="hero-outcomes" aria-label="Resultados do Level OS"><span><b>01</b> Organizar o dia</span><span><b>02</b> Entender o dinheiro</span><span><b>03</b> Acompanhar a evolução</span></div>
              <div><div className="hero-actions"><a className="button" href="https://lvlos.com/register.php">Começar grátis <ArrowRight size={18} /></a><a className="button button-quiet" href="#sistema">Explorar o sistema</a></div><p className="hero-note"><Check size={14} /> 30 dias para experimentar · sem cartão</p></div>
            </m.div>
          </div>
          <m.div className="hero-product" initial={{ opacity: 0, y: 30, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.8, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}><DashboardPreview /></m.div>
          <a className="hero-scroll" href="#sistema"><span>Conheça o sistema</span><ArrowDown size={15} /></a>
        </section>

        <section className="signal-strip" aria-label="Diferenciais do Level OS">
          <span><b>01</b> Cinco áreas conectadas</span><span><b>02</b> Agentes especializados</span><span><b>03</b> Experiência PWA</span><span><b>04</b> Dados isolados por usuário</span>
        </section>

        <section className="marketing-intro" id="sistema"><OrbitalJourney /></section>

        <ProductTourSection />

        <section className="agents-section deferred-section" id="agentes" aria-labelledby="agents-title">
          <Reveal className="agents-copy">
            <div><span className="agents-icon"><Sparkles /></span><p className="marketing-eyebrow">IA COM LIMITE E CONTEXTO</p><h2 id="agents-title">Um especialista para cada parte da sua vida.</h2></div>
            <div className="agents-intro"><p>O Agente de IA entende sua intenção e chama o especialista certo. Cada conversa mantém propósito, ferramentas e histórico próprios.</p><ul><li><Check /> Cinco agentes com responsabilidades claras</li><li><Check /> Confirmação antes de ações importantes</li><li><Check /> Respostas baseadas nos seus dados do Level OS</li></ul></div>
          </Reveal>
          <Reveal className="agent-workspace" delay={0.08}>
            <div className="agent-roster" role="tablist" aria-label="Agentes especializados do Level OS">
              {ASSISTANT_AGENTS.map((agent) => (
                <button
                  type="button"
                  role="tab"
                  id={`agent-tab-${agent.id}`}
                  aria-controls="agent-preview"
                  aria-selected={activeAgent.id === agent.id}
                  className="agent-roster-item"
                  key={agent.id}
                  onClick={() => setActiveAgentId(agent.id)}
                >
                  <span><Icon name={agent.icon} /></span>
                  <span><strong>{agent.name}</strong><small>{agent.module}</small></span>
                  <ArrowRight aria-hidden="true" />
                </button>
              ))}
            </div>
            <div className="agent-dialog" id="agent-preview" role="tabpanel" aria-labelledby={`agent-tab-${activeAgent.id}`} tabIndex={0}>
              <AnimatePresence mode="wait" initial={false}>
                <m.div key={activeAgent.id} initial={{ opacity: 0, y: 8, scale: .99 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: .99 }} transition={{ duration: 0.24 }}>
                  <AgentChatPreview agent={activeAgent} />
                  <div className="agent-action">{activeAgent.action} <ArrowRight size={15} /></div>
                </m.div>
              </AnimatePresence>
            </div>
          </Reveal>
          <p className="agent-demo-disclaimer"><LockKeyhole /> Prévia local da experiência. Esta demonstração não consulta dados reais nem chama provedores de IA.</p>
        </section>

        <section className="security-section" id="seguranca">
          <Reveal className="security-mark"><LockKeyhole /></Reveal>
          <Reveal className="security-copy" delay={0.06}><p className="marketing-eyebrow">PRIVACIDADE COMO FUNDAÇÃO</p><h2>Seus dados servem a você. Não ao contrário.</h2><p>Autenticação segura, verificação em duas etapas, isolamento por usuário e controles de sessão fazem parte da arquitetura — não de um texto pequeno no rodapé.</p><div className="security-points"><span><Check /> 2FA e login Google</span><span><Check /> Sessões protegidas</span><span><Check /> Backup e exportação</span><span><Check /> Sem venda de dados</span></div></Reveal>
        </section>

        <PricingSection />

        <FaqSection />

      </main>

      <AnimatePresence>{showStickyCta ? <m.aside className="sticky-marketing-cta" initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 18 }} aria-label="Começar no Level OS"><span><LevelMark /><b>30 dias grátis</b><small>Sem cartão no cadastro</small></span><a className="button button-small" href="https://lvlos.com/register.php">Começar <ArrowRight /></a></m.aside> : null}</AnimatePresence>

      <footer className="marketing-footer"><Brand /><p>© {new Date().getFullYear()} Level OS. Sistema operacional pessoal.</p><div><a href="https://lvlos.com/login.php">Entrar</a><a href="https://lvlos.com/register.php">Criar conta</a></div></footer>
    </div>
  )
}
