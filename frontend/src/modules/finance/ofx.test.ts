import { describe, expect, it } from "vitest"
import { parseOfxClient } from "./ofx"

describe("parseOfxClient", () => {
  it("separa entradas, saídas e marca duplicidade", () => {
    const rows = parseOfxClient(`<OFX><STMTTRN><DTPOSTED>20260715120000<TRNAMT>-42.50<FITID>A1<MEMO>Mercado</STMTTRN><STMTTRN><DTPOSTED>20260716<TRNAMT>1500.00<FITID>A2<NAME>Cliente</STMTTRN></OFX>`, [{ date: "2026-07-15", value: 42.5 }])
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ date: "2026-07-15", value: 42.5, kind: "saida", duplicate: true })
    expect(rows[1]).toMatchObject({ kind: "entrada", duplicate: false })
  })
})
