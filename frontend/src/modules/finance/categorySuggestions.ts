const CATEGORY_KEYWORDS: ReadonlyArray<readonly [string, readonly string[]]> = [
  ["alimentacao", ["mercado", "supermercado", "restaurante", "delivery", "ifood", "lanche", "padaria", "comida"]],
  ["transporte", ["uber", "99", "combustivel", "gasolina", "estacionamento", "onibus", "metro"]],
  ["moradia", ["aluguel", "condominio", "energia", "luz", "agua", "internet", "gas"]],
  ["saude", ["farmacia", "medico", "consulta", "academia", "remedio", "odontologico"]],
  ["assinaturas", ["netflix", "spotify", "prime", "assinatura", "mensalidade"]],
  ["educacao", ["curso", "faculdade", "livro", "escola"]],
  ["lazer", ["cinema", "viagem", "show", "jogo", "bar", "streaming"]],
]

const normalize = (value: string) => value
  .toLocaleLowerCase("pt-BR")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")

export function suggestExpenseCategory(description: string): string | null {
  const normalized = normalize(description)
  if (normalized.trim().length < 3) return null
  return CATEGORY_KEYWORDS.find(([, words]) => words.some((word) => normalized.includes(word)))?.[0] ?? null
}
