import { Skeleton } from "../../components/ui/Skeleton"

export function FinanceSummarySkeleton() {
  return (
    <div className="grid grid-cols-2 border-y border-outline-variant py-3 sm:grid-cols-4" aria-hidden="true">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="border-l border-outline-variant p-4 first:border-l-0">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-3 h-6 w-28 max-w-full" />
          <Skeleton className="mt-2 h-2.5 w-16" />
        </div>
      ))}
    </div>
  )
}

export function FinancePanelSkeleton({ overview = false }: { overview?: boolean }) {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Carregando dados financeiros">
      {overview ? <FinanceSummarySkeleton /> : <Skeleton className="h-12 w-full" />}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,.65fr)]">
        <div className="border-y border-outline-variant py-5">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="mt-4 h-12 w-64 max-w-full" />
          <Skeleton className="mt-8 h-44 w-full" />
        </div>
        <div className="border-y border-outline-variant py-5">
          <Skeleton className="h-4 w-36" />
          <div className="mt-5 space-y-4">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-12 w-full" />)}</div>
        </div>
      </div>
    </div>
  )
}
