import { useEffect, useState } from "react"

interface TypewriterTextProps {
  text: string
  animate?: boolean
}

/**
 * Revela apenas respostas novas. O texto completo continua disponível para
 * leitores de tela e reduced-motion ignora a animação por completo.
 */
export function TypewriterText({ text, animate = false }: TypewriterTextProps) {
  const [visible, setVisible] = useState(animate ? 0 : text.length)

  useEffect(() => {
    if (!animate) {
      setVisible(text.length)
      return
    }

    let cancelled = false
    let timer = 0
    setVisible(0)
    const advance = (current: number) => {
      if (cancelled || current >= text.length) return
      const next = current + 1
      setVisible(next)
      const character = text[next - 1]
      const delay = /[.!?]/.test(character) ? 90 : /[,;:]/.test(character) ? 48 : character === " " ? 12 : 18
      timer = window.setTimeout(() => advance(next), delay)
    }
    timer = window.setTimeout(() => advance(0), 80)
    return () => { cancelled = true; window.clearTimeout(timer) }
  }, [animate, text])

  if (!animate) return <span>{text}</span>

  const finished = visible >= text.length
  const reveal = () => setVisible(text.length)
  return (
    <span role="button" tabIndex={finished ? -1 : 0} onClick={reveal} onKeyDown={(event) => {
      if (!finished && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); reveal() }
    }} aria-label={finished ? undefined : "Resposta sendo digitada. Clique para revelar imediatamente."}>
      <span aria-hidden="true">{text.slice(0, visible)}{!finished ? <span className="ml-0.5 inline-block h-[1em] w-px animate-pulse bg-current align-[-0.1em]" /> : null}</span>
      <span className="sr-only" role="status" aria-live="polite">{text}</span>
    </span>
  )
}
