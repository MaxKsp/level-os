import assert from "node:assert/strict"
import { chromium } from "playwright"

const base = process.env.LEVELOS_BROWSER_ORIGIN || "http://127.0.0.1:4173"
const executablePath = process.env.LEVELOS_CHROME_PATH || undefined
const browser = await chromium.launch({ headless: true, executablePath, args: ["--no-sandbox"] })
const stations = [
  [0.2, "financas"], [0.4, "rotina"], [0.6, "treinos"],
  [0.8, "alimentacao"], [0.985, "progresso"],
]
try {
  for (const viewport of [{ width: 360, height: 740 }, { width: 390, height: 844 }, { width: 430, height: 932 }]) {
    const page = await browser.newPage({ viewport, reducedMotion: "no-preference" })
    const errors = []
    page.on("pageerror", (error) => errors.push(error.message))
    await page.goto(base + "/landing.html", { waitUntil: "networkidle", timeout: 45_000 })
    const cardOverflow = await page.locator(".orbit-copy").first().evaluate((element) => getComputedStyle(element).overflowY)
    assert.notEqual(cardOverflow, "auto", "O cartao mobile nao deve roubar o gesto de rolagem do scroll cinematografico")
    const journey = await page.locator(".orbital-journey").evaluate((el) => ({
      top: window.scrollY + el.getBoundingClientRect().top, height: el.getBoundingClientRect().height,
    }))
    await page.evaluate(() => { document.documentElement.style.scrollBehavior = "auto" })
    for (const [progress, station] of stations) {
      await page.evaluate(({ top, height, p }) => {
        window.scrollTo({ top: top + (height - window.innerHeight) * p, behavior: "instant" })
      }, { top: journey.top, height: journey.height, p: progress })
      await page.waitForTimeout(800)
      const node = await page.locator(".orbit-node-" + station).boundingBox()
      const stage = await page.locator(".orbital-stage").boundingBox()
      assert.ok(node, station + ": orbita precisa existir")
      assert.ok(stage, station + ": secao precisa existir")
      const centerX = node.x + node.width / 2
      const centerY = node.y + node.height / 2
      assert.ok(centerX >= viewport.width * .08 && centerX <= viewport.width * .92,
        `${viewport.width}px / ${station}: estação fora da câmera (x=${centerX.toFixed(0)})`)
      assert.ok(centerY > 40 && centerY < viewport.height * .75,
        `${viewport.width}px / ${station}: estação fora da câmera (y=${centerY.toFixed(0)})`)
      assert.ok(Math.abs(stage.y) <= 3, station + ": palco deve continuar fixo no scroll")
      const card = await page.locator("#" + station + " .orbit-copy").boundingBox()
      assert.ok(card && card.y >= -3 && card.y + card.height <= viewport.height + 3,
        `${viewport.width}px / ${station}: conteudo do capitulo recortado na viewport`)
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      assert.ok(overflow <= 1, `${viewport.width}px / ${station}: pagina extrapola a largura por ${overflow}px`)
      console.log(`PASS mobile ${viewport.width}px: ${station} x=${centerX.toFixed(0)} y=${centerY.toFixed(0)}`)
    }
    assert.deepEqual(errors, [], "Exceções JS na jornada mobile")
    await page.close()
  }
} finally { await browser.close() }
