import registry from "bancos-brasileiros"
import { normalizeBankSearch, POPULAR_BANKS, resolveBankSlug } from "./BankLogo"

/**
 * Diretório carregado sob demanda a partir de guibranco/BancosBrasileiros.
 * Os SVGs continuam locais em @edusites/bancos-brasil; instituições sem uma
 * marca vetorial confiável recebem o fallback tipográfico de BankLogo.
 */

export interface BankOption {
  id: string
  name: string
  logoSlug: string | null
  code: string | null
  legalName: string | null
  popular: boolean
}

const ACRONYMS = new Set(["s.a.", "s.a", "ltda", "ip", "scd", "dtvm", "cfi", "cc", "cv", "pix", "bcb"])

function titleCaseOfficialName(value: string): string {
  const cleaned = value
    .replace(/\bBCO\b/gi, "Banco")
    .replace(/\s+-\s+EM LIQUIDA[CÇ][AÃ]O.*$/i, "")
    .replace(/\s+/g, " ")
    .trim()

  if (cleaned !== cleaned.toLocaleUpperCase("pt-BR")) return cleaned
  return cleaned.toLocaleLowerCase("pt-BR").split(" ").map((word, index) => {
    if (ACRONYMS.has(word)) return word.toLocaleUpperCase("pt-BR")
    if (index > 0 && ["de", "da", "do", "das", "dos", "e"].includes(word)) return word
    return word.charAt(0).toLocaleUpperCase("pt-BR") + word.slice(1)
  }).join(" ")
}

const popular: BankOption[] = POPULAR_BANKS.map((bank) => ({
  id: `brand:${bank.slug}`,
  name: bank.name,
  logoSlug: bank.slug,
  code: null,
  legalName: null,
  popular: true,
}))

export const BANK_OPTIONS: BankOption[] = (() => {
  const options = [...popular]
  const seen = new Set(popular.flatMap((bank) => [normalizeBankSearch(bank.name), normalizeBankSearch(bank.logoSlug ?? "")]))

  for (const bank of registry) {
    const fullName = `${bank.ShortName ?? ""} ${bank.LongName ?? ""}`.trim()
    if (!fullName || /liquida[cç][aã]o|liquidation/i.test(fullName)) continue
    if (resolveBankSlug(fullName)) continue

    const name = titleCaseOfficialName(bank.ShortName || bank.LongName)
    const normalized = normalizeBankSearch(name)
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    options.push({
      id: `registry:${bank.ISPB || bank.COMPE || normalized}`,
      name,
      logoSlug: null,
      code: bank.COMPE || null,
      legalName: bank.LongName && bank.LongName !== name ? bank.LongName : null,
      popular: false,
    })
  }

  return options.sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }))
})()

export function searchBanks(options: BankOption[], query: string): BankOption[] {
  const needle = normalizeBankSearch(query)
  if (!needle) return options
  return options.filter((bank) => normalizeBankSearch(`${bank.name} ${bank.legalName ?? ""} ${bank.code ?? ""}`).includes(needle))
}
