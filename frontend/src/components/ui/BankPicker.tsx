import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react"
import { Icon } from "../../design-system"
import { cn } from "../../lib/cn"
import { BankLogo, normalizeBankSearch, POPULAR_BANKS } from "./BankLogo"
import type { BankOption } from "./bankCatalog"

interface BankPickerProps {
  value: string
  onChange: (value: string) => void
  favorites: string[]
  onToggleFavorite: (bank: string) => void
  className?: string
}

const popularOptions: BankOption[] = POPULAR_BANKS.map((bank) => ({
  id: `brand:${bank.slug}`,
  name: bank.name,
  logoSlug: bank.slug,
  code: null,
  legalName: null,
  popular: true,
}))

export function BankPicker({ value, onChange, favorites, onToggleFavorite, className }: BankPickerProps) {
  const id = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [options, setOptions] = useState<BankOption[]>(popularOptions)

  const ensureFullCatalog = () => {
    if (options.length > popularOptions.length) return
    void import("./bankCatalog").then((module) => setOptions(module.BANK_OPTIONS))
  }

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("pointerdown", close)
    return () => document.removeEventListener("pointerdown", close)
  }, [])

  const favoriteSet = useMemo(() => new Set(favorites.map(normalizeBankSearch)), [favorites])
  const favoriteOptions = useMemo(() => favorites.map((favorite) =>
    options.find((bank) => normalizeBankSearch(bank.name) === normalizeBankSearch(favorite)) ?? {
      id: `favorite:${normalizeBankSearch(favorite)}`,
      name: favorite,
      logoSlug: null,
      code: null,
      legalName: null,
      popular: true,
    }), [favorites, options])

  const filtered = useMemo(() => {
    const needle = normalizeBankSearch(value)
    const result = needle
      ? options.filter((bank) => normalizeBankSearch(`${bank.name} ${bank.legalName ?? ""} ${bank.code ?? ""}`).includes(needle))
      : options
    return result.filter((bank) => !favoriteSet.has(normalizeBankSearch(bank.name))).slice(0, needle ? 60 : 100)
  }, [favoriteSet, options, value])

  const visible = [...favoriteOptions, ...filtered]
  const select = (bank: BankOption) => {
    onChange(bank.name)
    setOpen(false)
    inputRef.current?.focus()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault()
      setOpen(true)
      ensureFullCatalog()
      setActive((index) => Math.min(visible.length - 1, index + 1))
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      setActive((index) => Math.max(0, index - 1))
    } else if (event.key === "Enter" && open && visible[active]) {
      event.preventDefault()
      select(visible[active])
    } else if (event.key === "Escape") {
      setOpen(false)
    }
  }

  return (
    <div ref={rootRef} className={cn("relative min-w-0", className)}>
      <div className={cn("flex items-center gap-2 rounded-xl border bg-surface-container px-3 transition-colors", open ? "border-primary ring-2 ring-primary/12" : "border-outline-variant")}>
        <Icon name="search" className="text-[18px] text-muted" />
        <input
          ref={inputRef}
          value={value}
          onChange={(event) => { onChange(event.target.value); setOpen(true); setActive(0); ensureFullCatalog() }}
          onFocus={() => { setOpen(true); ensureFullCatalog() }}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-listbox`}
          aria-autocomplete="list"
          aria-activedescendant={open && visible[active] ? `${id}-${visible[active].id}` : undefined}
          className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-on-surface outline-none placeholder:text-muted"
          placeholder="Digite o banco, código ou instituição"
          autoComplete="off"
        />
        {value ? <button type="button" onClick={() => { onChange(""); setOpen(true); inputRef.current?.focus() }} aria-label="Limpar banco" className="level-icon-button grid h-7 w-7 place-items-center rounded-lg text-muted hover:bg-surface-container-high hover:text-on-surface"><Icon name="close" className="text-[16px]" /></button> : null}
      </div>

      {open ? (
        <div className="absolute z-50 mt-2 w-full min-w-[300px] overflow-hidden rounded-xl border border-outline-variant bg-surface-container-low shadow-lg">
          <div className="flex items-center justify-between border-b border-outline-variant px-3 py-2 text-[11px] text-muted">
            <span>{options.length > popularOptions.length ? `${options.length} instituições pesquisáveis` : "Carregando catálogo bancário…"}</span>
            <span>{favorites.length}/5 favoritos</span>
          </div>
          <ul id={`${id}-listbox`} role="listbox" className="max-h-72 overflow-y-auto p-1.5">
            {visible.length ? visible.map((bank, index) => {
              const favorite = favoriteSet.has(normalizeBankSearch(bank.name))
              const favoriteLimit = favorites.length >= 5 && !favorite
              return (
                <li key={bank.id} role="presentation">
                  <div className={cn("group flex items-center gap-2 rounded-xl px-2 py-2 transition-colors", active === index ? "bg-primary/10" : "hover:bg-surface-container")} onMouseEnter={() => setActive(index)}>
                    <button id={`${id}-${bank.id}`} role="option" aria-selected={normalizeBankSearch(value) === normalizeBankSearch(bank.name)} type="button" onClick={() => select(bank)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
                      <BankLogo bank={bank.name} size={34} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-on-surface">{bank.name}</span>
                        <span className="block truncate text-[11px] text-muted">{bank.code ? `Código ${bank.code}` : bank.popular ? "Instituição popular" : bank.legalName ?? "Instituição financeira"}</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      disabled={favoriteLimit}
                      aria-label={favorite ? `Remover ${bank.name} dos favoritos` : `Favoritar ${bank.name}`}
                      title={favoriteLimit ? "Você já selecionou 5 bancos favoritos" : undefined}
                      onClick={() => onToggleFavorite(bank.name)}
                      className={cn("level-icon-button grid h-8 w-8 shrink-0 place-items-center rounded-lg", favorite ? "bg-primary/12 text-primary" : "text-muted hover:bg-surface-container-high hover:text-primary", favoriteLimit && "cursor-not-allowed opacity-35")}
                    >
                      <Icon name={favorite ? "star" : "star_outline"} className="text-[18px]" />
                    </button>
                  </div>
                </li>
              )
            }) : <li className="px-4 py-8 text-center text-sm text-muted">Nenhum banco encontrado. O nome digitado ainda pode ser usado.</li>}
          </ul>
          {!normalizeBankSearch(value) ? <p className="border-t border-outline-variant px-3 py-2 text-[11px] text-muted">Lista em ordem alfabética. Digite para pesquisar todo o catálogo.</p> : null}
        </div>
      ) : null}
    </div>
  )
}
