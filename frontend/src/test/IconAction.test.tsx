import { fireEvent, render, screen } from "@testing-library/react"
import { Trash2 } from "lucide-react"
import { describe, expect, it, vi } from "vitest"
import { ConfirmIconAction } from "../components/ui/IconAction"

describe("ConfirmIconAction", () => {
  it("abre uma confirmação acessível antes de executar a ação", () => {
    const onConfirm = vi.fn()

    render(
      <ConfirmIconAction
        label="Excluir conta"
        title="Excluir esta conta?"
        description="Esta ação não pode ser desfeita."
        onConfirm={onConfirm}
      >
        <Trash2 aria-hidden="true" />
      </ConfirmIconAction>,
    )

    fireEvent.click(screen.getByRole("button", { name: "Excluir conta" }))

    expect(screen.getByRole("alertdialog")).toBeInTheDocument()
    expect(screen.getByText("Excluir esta conta?")).toBeInTheDocument()
    expect(onConfirm).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole("button", { name: "Excluir" }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })
})
