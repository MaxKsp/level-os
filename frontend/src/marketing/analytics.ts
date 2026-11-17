type MarketingEvent = "cta_click" | "signup_started"

function sendMarketingEvent(event: MarketingEvent): void {
  const body = JSON.stringify({ event, path: `${window.location.pathname}${window.location.search}${window.location.hash}`.slice(0, 160) })
  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/marketing-event.php", new Blob([body], { type: "application/json" }))
    return
  }
  void fetch("/api/marketing-event.php", { method: "POST", credentials: "same-origin", keepalive: true, headers: { "Content-Type": "application/json" }, body })
}

export function startMarketingAnalytics(): () => void {
  const onClick = (event: MouseEvent) => {
    const target = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null
    if (!target) return
    const url = new URL(target.href, window.location.href)
    if (url.hostname !== "lvlos.com" && url.hostname !== window.location.hostname) return
    if (url.pathname.endsWith("/register.php")) {
      sendMarketingEvent("cta_click")
      sendMarketingEvent("signup_started")
    }
  }
  document.addEventListener("click", onClick, { capture: true })
  return () => document.removeEventListener("click", onClick, { capture: true })
}
