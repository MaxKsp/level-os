/** Tema claro/escuro do Level OS. A identidade usa aqua fixo. */

export type ThemeMode = "dark" | "light"

export const LEVEL_AQUA = "#31e6d4"

const THEME_KEY = "level-os:theme"
// Nomes LEGADOS de verdade (não renomear): existem só para limpeza de storage antigo.
const LEGACY_ACCENT_KEYS = ["orby_accent", "orby_custom_accent", "orby-accent", "orby-custom-accent"]

function syncFavicon(): void {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path fill="${LEVEL_AQUA}" d="M7 33.5 24 8l17 25.5h-8.4L24 20.6l-8.6 12.9H7Z"/><path fill="${LEVEL_AQUA}" opacity=".55" d="m15 41 9-13.5L33 41h-7l-2-3-2 3h-7Z"/></svg>`
  const favicon = document.querySelector<HTMLLinkElement>('link[rel~="icon"]')
  if (favicon) favicon.href = `data:image/svg+xml,${encodeURIComponent(svg)}`
  document.querySelector<HTMLLinkElement>('link[rel="mask-icon"]')?.setAttribute("color", LEVEL_AQUA)
}

export function getStoredTheme(): ThemeMode {
  return localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark"
}

/** Aplica e persiste somente o tema. Accents legados são removidos e ignorados. */
export function applyTheme(theme: ThemeMode): void {
  const root = document.documentElement
  root.dataset.theme = theme
  delete root.dataset.accent
  delete root.dataset.metallic
  root.style.removeProperty("--level-accent-opacity")
  for (const property of ["--color-primary", "--color-surface-tint", "--color-on-primary", "--color-primary-container"]) {
    root.style.removeProperty(property)
  }
  for (const key of LEGACY_ACCENT_KEYS) localStorage.removeItem(key)
  localStorage.setItem(THEME_KEY, theme)
  syncFavicon()
  window.dispatchEvent(new CustomEvent("level-theme-change", { detail: { theme } }))
}
