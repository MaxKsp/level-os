import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import { parseOfxClient } from "./ofx"

describe("parseOfxClient", () => {
  const sample = `<OFX><STMTTRN><DTPOSTED>20260715120000<TRNAMT>-42.50<FITID>A1<MEMO>Mercado</STMTTRN><STMTTRN><DTPOSTED>20260716<TRNAMT>1500.00<FITID>A2<NAME>Cliente</STMTTRN></OFX>`

  it("separa entradas, saídas e marca duplicidade", () => {
    const rows = parseOfxClient(sample, [{ date: "2026-07-15", value: 42.5 }])
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ date: "2026-07-15", value: 42.5, kind: "saida", duplicate: true })
    expect(rows[1]).toMatchObject({ kind: "entrada", duplicate: false })
  })

  it("não confunde entradas com saídas do mesmo valor e data", () => {
    const rows = parseOfxClient(sample, [
      { date: "2026-07-15", value: 42.5, kind: "entrada" },
      { date: "2026-07-16", value: 1500, kind: "entrada" },
    ])
    expect(rows[0].duplicate).toBe(false)
    expect(rows[1].duplicate).toBe(true)
  })

  it("mantém identificadores de seleção únicos mesmo com FITID repetido", () => {
    const repeated = `<OFX><STMTTRN><DTPOSTED>20260715<TRNAMT>-20<FITID>A1</STMTTRN><STMTTRN><DTPOSTED>20260715<TRNAMT>-30<FITID>A1</STMTTRN></OFX>`
    const rows = parseOfxClient(repeated)
    expect(rows).toHaveLength(2)
    expect(rows[0].fitid).toBe("A1")
    expect(rows[0].id).not.toBe(rows[1].id)
    expect(rows[0].duplicate).toBe(false)
    expect(rows[1].duplicate).toBe(true)
  })

  it("descarta datas impossíveis, evitando lançamentos em dias inexistentes", () => {
    const invalid = `<OFX><STMTTRN><DTPOSTED>20260231<TRNAMT>-10<FITID>bad</STMTTRN></OFX>`
    expect(parseOfxClient(invalid)).toEqual([])
  })

  it("lê TRNAMT com separador de milhar como o parser do servidor", () => {
    const cases: [string, number, "entrada" | "saida"][] = [
      ["-1234.56", 1234.56, "saida"],
      ["-1234,56", 1234.56, "saida"],
      ["-1.234,56", 1234.56, "saida"],
      ["-1,234.56", 1234.56, "saida"],
      ["1.234.567,89", 1234567.89, "entrada"],
      ["2.500", 2.5, "entrada"],
      ["1.234.567", 1234567, "entrada"],
      ["1200", 1200, "entrada"],
    ]
    for (const [raw, value, kind] of cases) {
      const [row] = parseOfxClient(`<OFX><STMTTRN><DTPOSTED>20260710<TRNAMT>${raw}<FITID>A1</STMTTRN></OFX>`)
      expect(row, raw).toMatchObject({ value, kind })
    }
  })

  it("mantém centavos e sinal da fixture compartilhada com o servidor e descarta sinal no fim", () => {
    const fixture = readFileSync(resolve(__dirname, "../../../../tests/fixtures/milhar.ofx"), "utf8")
    expect(parseOfxClient(fixture).map((row) => [row.fitid, row.value, row.kind])).toEqual([
      ["MIL001", 1234.56, "saida"],
      ["MIL002", 1234567.89, "entrada"],
      ["MIL003", 1234.56, "saida"],
      ["MIL005", 0.05, "saida"],
    ])
  })
})
