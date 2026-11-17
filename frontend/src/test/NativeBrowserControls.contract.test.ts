import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    if (!/\.(tsx?|jsx?)$/.test(entry.name) || /\.test\./.test(entry.name)) return []
    return [path]
  })
}

describe("UX — controles nativos do navegador", () => {
  it("bloqueia controles e popups nativos fora do design system", () => {
    const root = join(__dirname, "..")
    const forbidden = [
      /<select\b/i,
      /<datalist\b/i,
      /<input\b[^>]*type=["'](?:date|time|datetime-local|month|week|color|range)["']/i,
      /window\.(?:alert|confirm|prompt)\s*\(/,
    ]
    const offenders = sourceFiles(root).flatMap((file) => {
      const source = readFileSync(file, "utf8")
      return forbidden
        .filter((pattern) => pattern.test(source))
        .map((pattern) => `${file}: ${pattern.source}`)
    })
    expect(offenders).toEqual([])
  })
})
