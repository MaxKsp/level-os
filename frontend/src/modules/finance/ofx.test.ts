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
})
