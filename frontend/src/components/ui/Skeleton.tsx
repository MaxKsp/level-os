import type { HTMLAttributes } from "react"
import { cn } from "../../lib/cn"

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden="true" className={cn("level-skeleton rounded-md bg-surface-container-high", className)} {...props} />
}
