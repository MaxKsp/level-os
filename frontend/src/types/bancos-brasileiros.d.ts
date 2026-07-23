declare module "bancos-brasileiros" {
  export interface BrazilianBankRegistryEntry {
    COMPE: string | null
    ISPB: string | null
    LongName: string
    ShortName: string
    PixType: string | null
    Type: string | null
    Url: string | null
  }

  const banks: BrazilianBankRegistryEntry[]
  export default banks
}
