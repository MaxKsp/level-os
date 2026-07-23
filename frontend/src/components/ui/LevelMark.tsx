/** Marca ascendente do Level OS. Mantém o nome técnico legado para evitar churn. */
export function LevelMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="currentColor"
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}

      <path
        className="level-mark__chevron level-mark__chevron--primary"
        d="M7 33.5 24 8l17 25.5h-8.4L24 20.6l-8.6 12.9H7Z"
      />
      <path
        className="level-mark__chevron level-mark__chevron--secondary"
        d="m15 41 9-13.5L33 41h-7l-2-3-2 3h-7Z"
        opacity="0.55"
      />
    </svg>
  )
}
