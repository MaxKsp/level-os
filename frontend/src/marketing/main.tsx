import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { LazyMotion, MotionConfig } from "motion/react"
import "@fontsource-variable/geist"
import { LandingPage } from "./LandingPage"
import "./marketing.css"

const loadMotionFeatures = () => import("../app/motionFeatures").then((module) => module.default)

createRoot(document.getElementById("landing-root")!).render(
  <StrictMode>
    <LazyMotion features={loadMotionFeatures} strict>
      <MotionConfig reducedMotion="user">
        <LandingPage />
      </MotionConfig>
    </LazyMotion>
  </StrictMode>,
)
