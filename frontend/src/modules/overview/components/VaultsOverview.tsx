import { Icon, SectionCard } from "../../../design-system"
import { formatCurrency } from "../../../lib/format"
import type { Vault } from "../../finance/contracts"

interface VaultsOverviewProps {
  vaults: Vault[]
}

export function VaultsOverview({ vaults }: VaultsOverviewProps) {
  return (
    <SectionCard
      title="Cofrinhos"
      description="Metas de reserva"
      bodyClassName="p-0"
      action={
        <a
          href="#finance"
          className="text-sm font-medium text-primary hover:text-on-surface"
        >
          Gerenciar
        </a>
      }
    >
      <ul className="flex flex-col gap-4 px-5 py-5 sm:px-6">
        {vaults.map((vault) => {
          const meta = vault.meta ?? 0
          const pct =
            meta > 0 ? Math.min(100, Math.round((vault.saldo / meta) * 100)) : 0
          return (
            <li key={vault.id}>
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-medium text-on-surface">
                  <Icon name="savings" className="text-[18px] text-tertiary" />
                  {vault.label}
                </span>
                <span className="font-mono text-sm text-on-surface">
                  {formatCurrency(vault.saldo)}
                </span>
              </div>
              <div
                className="h-2 overflow-hidden rounded-full bg-surface-container-highest"
                role="progressbar"
                aria-label={`Meta de ${vault.label}`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={pct}
              >
                <div
                  className="h-full rounded-full bg-tertiary"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-muted">
                {pct}% de {formatCurrency(meta)}
              </p>
            </li>
          )
        })}
      </ul>
    </SectionCard>
  )
}
