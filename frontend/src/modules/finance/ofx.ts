export interface OfxPreviewRow {
  id: string
  date: string
  value: number
  kind: "entrada" | "saida"
  desc: string
  fitid: string | null
  duplicate: boolean
}

export interface ExistingTransaction {
  date: string | null
  value: number
}

const normalize = (value: string) => value.replace(/\r/g, "")

function field(block: string, name: string): string {
  const match = block.match(new RegExp(`<${name}>\\s*([^<\\n]+)`, "i"))
  return match?.[1]?.trim() ?? ""
}

/** Parser leve para preview local. O deploy autenticado continua usando api/import-ofx.php. */
export function parseOfxClient(content: string, existing: ExistingTransaction[] = []): OfxPreviewRow[] {
  const text = normalize(content)
  const blocks = text.match(/<STMTTRN>[\s\S]*?(?:<\/STMTTRN>|(?=<STMTTRN>)|$)/gi) ?? []
  const known = new Set(existing.filter((item) => item.date).map((item) => `${item.date}|${Math.abs(item.value).toFixed(2)}`))

  return blocks.flatMap((block, index) => {
    const rawDate = field(block, "DTPOSTED")
    const rawValue = field(block, "TRNAMT").replace(",", ".")
    const value = Number(rawValue)
    const dateDigits = rawDate.replace(/\D/g, "").slice(0, 8)
    if (dateDigits.length !== 8 || !Number.isFinite(value) || value === 0) return []

    const date = `${dateDigits.slice(0, 4)}-${dateDigits.slice(4, 6)}-${dateDigits.slice(6, 8)}`
    const fitid = field(block, "FITID") || null
    const desc = field(block, "MEMO") || field(block, "NAME") || field(block, "TRNTYPE") || "Lançamento OFX"
    const amount = Math.abs(value)
    return [{
      id: fitid || `ofx-${date}-${index}`,
      date,
      value: amount,
      kind: value > 0 ? "entrada" as const : "saida" as const,
      desc: desc.replace(/\s+/g, " ").trim(),
      fitid,
      duplicate: known.has(`${date}|${amount.toFixed(2)}`),
    }]
  })
}
