import type { ComponentProps, ReactNode } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { TriangleAlert } from "lucide-react"
import { cn } from "../../lib/cn"

const base = "level-icon-button inline-grid size-9 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-container-high hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 disabled:pointer-events-none disabled:opacity-45"

type IconActionProps = ComponentProps<"button"> & {
  label: string
  children: ReactNode
  tone?: "neutral" | "danger"
}

export function IconAction({ label, children, tone = "neutral", className, ...props }: IconActionProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className={cn(base, tone === "danger" && "hover:bg-error/10 hover:text-error", className)}
          {...props}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent sideOffset={7}>{label}</TooltipContent>
    </Tooltip>
  )
}

interface ConfirmIconActionProps {
  label: string
  title: string
  description: string
  onConfirm: () => void
  children: ReactNode
}

export function ConfirmIconAction({ label, title, description, onConfirm, children }: ConfirmIconActionProps) {
  return (
    <AlertDialog>
      <Tooltip>
        <TooltipTrigger asChild>
          <AlertDialogTrigger asChild>
            <button type="button" aria-label={label} className={cn(base, "hover:bg-error/10 hover:text-error")}>
              {children}
            </button>
          </AlertDialogTrigger>
        </TooltipTrigger>
        <TooltipContent sideOffset={7}>{label}</TooltipContent>
      </Tooltip>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia><TriangleAlert aria-hidden="true" /></AlertDialogMedia>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>Excluir</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
