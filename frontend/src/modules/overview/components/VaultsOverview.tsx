import { Link } from "react-router-dom"
import { Icon, SectionCard } from "../../../design-system"
import { formatCurrency } from "../../../lib/format"
import type { Vault } from "../../finance/contracts"

interface VaultsOverviewProps {
  vaults: Vault[]
  className?: string
}

export function VaultsOverview({ vaults, className }: VaultsOverviewProps) {
  return (
    <SectionCard
      title="Cofrinhos"
      className={className}
      description="Metas de reserva"
      bodyClassName="p-0"
      action={
        <Link
          to="/financeiro"
          className="rounded text-sm font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-primary"
        >
          Gerenciar cofrinhos
        </Link>
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
                <span className="numeric-value">{pct}%</span> de <span className="numeric-value">{formatCurrency(meta)}</span>
              </p>
            </li>
          )
        })}
      </ul>
    </SectionCard>
  )
}
