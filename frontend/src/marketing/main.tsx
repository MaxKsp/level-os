import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { domAnimation, LazyMotion, MotionConfig } from "motion/react"
import "@fontsource-variable/geist"
import { registerServiceWorker } from "../lib/pwa"
import { LandingPage } from "./LandingPage"
import { startMarketingAnalytics } from "./analytics"
import "./marketing.css"

startMarketingAnalytics()

// A entrada pública também precisa registrar o worker para cumprir o contrato
// instalável quando a primeira visita acontece pela landing.
if (document.readyState === "complete") void registerServiceWorker()
else window.addEventListener("load", () => { void registerServiceWorker() }, { once: true })

createRoot(document.getElementById("landing-root")!).render(
  <StrictMode>
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <LandingPage />
      </MotionConfig>
    </LazyMotion>
  </StrictMode>,
)
