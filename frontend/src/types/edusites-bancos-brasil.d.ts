declare module "@edusites/bancos-brasil/core" {
  export type BancoFormato = "quadrado" | "circulo" | "sem"

  export interface SvgBancoOptions {
    nome: string
    formato?: BancoFormato
    cor?: string
    fundo?: string
    tamanho?: number
    className?: string
  }

  export function svgBanco(options: SvgBancoOptions): string | null
  export function listarBancos(): string[]
  export function obterPreset(nome: string): {
    cor: string
    fundo: string
    formato: BancoFormato
    tamanho: number
  } | null
}
