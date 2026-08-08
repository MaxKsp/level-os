import { useState, type Key, type ReactNode } from "react"
import { AnimatePresence, useReducedMotion, useScroll, useSpring } from "motion/react"
import * as m from "motion/react-m"
import {
  ArrowDown,
  ArrowRight,
  CalendarDays,
  Check,
  Dumbbell,
  LockKeyhole,
  Menu,
  Sparkles,
  X,
} from "lucide-react"
import { LevelMark } from "../components/ui/LevelMark"
import { OrbitalJourney } from "./OrbitalJourney"

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
    <div className="marketing-product" aria-label="Prévia ilustrativa do painel Level OS">
      <div className="marketing-product-bar">
        <div><span className="dot dot-aqua" /><span className="dot" /><span className="dot" /></div>
        <span>HOJE · 08:42</span>
      </div>
      <div className="marketing-product-grid">
        <div className="product-primary">
          <span className="product-label">Patrimônio líquido</span>
          <strong>R$ 28.460</strong>
          <span className="product-change">↗ 8,4% neste trimestre</span>
          <svg viewBox="0 0 420 112" role="img" aria-label="Linha de patrimônio em crescimento">
            <path className="chart-guide" d="M0 89H420M0 53H420M0 17H420" />
            <path className="chart-area" d="M0 94C45 80 65 92 104 72s63-13 92-31 60 4 94-15 76-13 130-25V112H0Z" />
            <path className="chart-line" d="M0 94C45 80 65 92 104 72s63-13 92-31 60 4 94-15 76-13 130-25" />
          </svg>
        </div>
        <div className="product-side">
          <span className="product-label">Seu nível</span>
          <div className="level-orbit"><span>07</span></div>
          <small>640 XP para o próximo</small>
        </div>
        <div className="product-today">
          <span className="product-label">Agora</span>
          <div><CalendarDays size={17} /><span><strong>Planejamento semanal</strong><small>Hoje · 19:00</small></span><Check size={16} /></div>
          <div><Dumbbell size={17} /><span><strong>Treino de força</strong><small>45 minutos</small></span><ArrowRight size={16} /></div>
        </div>
      </div>
    </div>
  )
}

export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <div className="marketing-shell">
      <PageProgress />
      <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
      <header className="marketing-header">
        <Brand />
        <nav className="marketing-nav" aria-label="Navegação principal">
          <a href="#sistema">O sistema</a><a href="#como-funciona">Como funciona</a><a href="#seguranca">Segurança</a>
        </nav>
        <div className="marketing-header-actions"><a className="text-link" href="https://lvlos.com/login.php">Entrar</a><a className="button button-small" href="https://lvlos.com/register.php">Começar grátis <ArrowRight size={16} /></a></div>
        <button className="marketing-menu-button" type="button" aria-expanded={menuOpen} aria-controls="marketing-mobile-menu" aria-label={menuOpen ? "Fechar menu" : "Abrir menu"} onClick={() => setMenuOpen((value) => !value)}>{menuOpen ? <X /> : <Menu />}</button>
      </header>
      <AnimatePresence>
        {menuOpen ? <m.nav id="marketing-mobile-menu" className="marketing-mobile-nav" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}><a href="#sistema" onClick={() => setMenuOpen(false)}>O sistema</a><a href="#como-funciona" onClick={() => setMenuOpen(false)}>Como funciona</a><a href="#seguranca" onClick={() => setMenuOpen(false)}>Segurança</a><a href="https://lvlos.com/login.php">Entrar</a><a className="button" href="https://lvlos.com/register.php">Começar grátis</a></m.nav> : null}
      </AnimatePresence>

      <main id="conteudo">
        <section className="marketing-hero" id="inicio">
          <div className="hero-grid" aria-hidden="true" />
          <div className="hero-copy">
            <m.div className="hero-edition" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.45 }}><span>LEVEL OS / 2026</span><i>ONLINE</i></m.div>
            <m.p className="marketing-eyebrow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.45 }}>SEU SISTEMA OPERACIONAL PESSOAL</m.p>
            <m.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.68, ease: [0.22, 1, 0.36, 1] }}>Sua vida,<br /><span>em um só sistema.</span></m.h1>
            <m.div className="hero-lower" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.62, delay: 0.12 }}>
              <p className="hero-description">Finanças, rotina, treinos, alimentação e progresso conectados para você decidir melhor — e viver com menos ruído.</p>
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

        <section className="product-principles" aria-label="Princípios do produto">
          <Reveal className="principles-heading"><p className="marketing-eyebrow">PRODUTO, NÃO PROMESSA</p><h2>Profundidade quando você precisa. Silêncio quando não precisa.</h2></Reveal>
          <div className="principles-list">
            {[{ n: "01", title: "Seu dia primeiro", text: "A tela inicial prioriza o que pede ação agora, não uma parede de métricas." }, { n: "02", title: "Histórico preservado", text: "Decisões, lançamentos e evolução permanecem conectados ao seu contexto." }, { n: "03", title: "Controle real", text: "Exporte seus dados, proteja o acesso e escolha quando a IA deve participar." }].map((item) => <Reveal className="principle" key={item.n}><span>{item.n}</span><h3>{item.title}</h3><p>{item.text}</p></Reveal>)}
          </div>
        </section>

        <section className="how-section" id="como-funciona">
          <Reveal className="section-heading compact"><p className="marketing-eyebrow">COMECE SEM CERIMÔNIA</p><h2>O sistema cresce junto com a sua rotina.</h2></Reveal>
          <div className="steps-grid">
            {[{ n: "01", title: "Traga o essencial", text: "Cadastre suas contas, compromissos e objetivos no seu ritmo." }, { n: "02", title: "Veja as conexões", text: "Registros dispersos se transformam em uma visão coerente do seu momento." }, { n: "03", title: "Evolua com contexto", text: "Acompanhe padrões, conquistas e próximos passos sem perder o histórico." }].map((step, index) => <Reveal className="step" key={step.n} delay={index * 0.06}><span>{step.n}</span><h3>{step.title}</h3><p>{step.text}</p></Reveal>)}
          </div>
        </section>

        <section className="agents-section">
          <Reveal className="agents-copy"><span className="agents-icon"><Sparkles /></span><p className="marketing-eyebrow">IA COM LIMITE E CONTEXTO</p><h2>Ajuda especializada, sem misturar sua vida inteira.</h2><p>Cada agente trabalha dentro do próprio módulo. O Assessor Fin entende lançamentos; a Cheff Rita cuida do cardápio; treino e rotina mantêm seus próprios contextos.</p><ul><li><Check /> Escopo separado por agente</li><li><Check /> Confirmação antes de ações importantes</li><li><Check /> Histórico próprio em cada módulo</li></ul></Reveal>
          <Reveal className="agent-dialog" delay={0.08}><div className="agent-header"><span><Sparkles /></span><div><strong>Assessor Fin</strong><small>Finanças em contexto</small></div><i>AGENTE</i></div><div className="agent-message user-message">Quanto comprometi do meu orçamento este mês?</div><div className="agent-message">Você utilizou 63% do orçamento mensal. Alimentação cresceu 12%, enquanto transporte caiu 8%.</div><div className="agent-action">Ver análise completa <ArrowRight size={15} /></div></Reveal>
        </section>

        <section className="security-section" id="seguranca">
          <Reveal className="security-mark"><LockKeyhole /></Reveal>
          <Reveal className="security-copy" delay={0.06}><p className="marketing-eyebrow">PRIVACIDADE COMO FUNDAÇÃO</p><h2>Seus dados servem a você. Não ao contrário.</h2><p>Autenticação segura, verificação em duas etapas, isolamento por usuário e controles de sessão fazem parte da arquitetura — não de um texto pequeno no rodapé.</p><div className="security-points"><span><Check /> 2FA e login Google</span><span><Check /> Sessões protegidas</span><span><Check /> Backup e exportação</span><span><Check /> Sem venda de dados</span></div></Reveal>
        </section>

        <section className="closing-section">
          <div className="closing-word" aria-hidden="true">LEVEL</div>
          <Reveal><LevelMark className="closing-mark" /><p className="marketing-eyebrow">SEU PRÓXIMO NÍVEL COMEÇA AQUI</p><h2>Menos abas abertas.<br />Mais vida em movimento.</h2><p>Experimente o Level OS por 30 dias e construa seu sistema pessoal aos poucos.</p><div className="hero-actions centered"><a className="button" href="https://lvlos.com/register.php">Criar minha conta <ArrowRight size={18} /></a><a className="button button-quiet" href="https://lvlos.com/login.php">Já tenho uma conta</a></div></Reveal>
        </section>
      </main>

      <footer className="marketing-footer"><Brand /><p>© {new Date().getFullYear()} Level OS. Sistema operacional pessoal.</p><div><a href="https://lvlos.com/login.php">Entrar</a><a href="https://lvlos.com/register.php">Criar conta</a></div></footer>
    </div>
  )
}
