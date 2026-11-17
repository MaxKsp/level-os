import assert from "node:assert/strict"
import { chromium } from "playwright"

const base = process.env.LEVELOS_BROWSER_ORIGIN || "http://127.0.0.1:4173"
const executablePath = process.env.LEVELOS_CHROME_PATH || undefined
const browser = await chromium.launch({ headless: true, executablePath, args: ["--no-sandbox"] })
const failures = []
try {
  for (const [name, viewport] of [["desktop", { width: 1440, height: 900 }], ["mobile", { width: 390, height: 844 }]]) {
    const page = await browser.newPage({ viewport, reducedMotion: "reduce" })
    const errors = []
    page.on("pageerror", (error) => errors.push(error.message))
    const response = await page.goto(base + "/landing.html", { waitUntil: "networkidle", timeout: 45000 })
    assert.equal(response?.status(), 200, name + ": landing HTTP")
    await page.locator("#conteudo h1").waitFor({ timeout: 15000 })
    assert.match(await page.locator("#conteudo h1").innerText(), /importa hoje/i)
    assert.ok(await page.locator('a[href*="register.php"]').count() > 0, name + ": register CTA")
    assert.ok(await page.locator('a[href*="login.php"]').count() > 0, name + ": login CTA")
    const screenshot = page.locator(".marketing-product-screenshot img")
    await screenshot.scrollIntoViewIfNeeded()
    await assert.doesNotReject(async () => {
      await screenshot.evaluate(async (img) => { if (!img.complete) await new Promise((resolve) => { img.addEventListener("load", resolve, {once:true}); img.addEventListener("error", resolve, {once:true}) }); if (!img.naturalWidth) throw new Error("Hero preview failed to load") })
    }, name + ": screenshot")
    if (name === "mobile") {
      await page.getByRole("button", { name: "Abrir menu" }).click()
      assert.equal(await page.locator("#marketing-mobile-menu").isVisible(), true, "mobile navigation")
    }
    assert.deepEqual(errors, [], name + ": JS page exceptions")
    console.log("Browser smoke PASS: " + name)
    await page.close()
  }
} catch (error) {
  failures.push(error)
} finally {
  await browser.close()
}
if (failures.length) { failures.forEach(console.error); process.exitCode = 1 }
