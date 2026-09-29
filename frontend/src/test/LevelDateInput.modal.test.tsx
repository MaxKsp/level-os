import { fireEvent, render, screen } from "@testing-library/react"
import { useState } from "react"
import { describe, expect, it, vi } from "vitest"
import { Modal } from "../components/ui/Modal"
import { LevelDateInput } from "../components/ui/LevelDateInput"

function Example({ close }: { close: () => void }) {
  const [date, setDate] = useState("2026-09-29")
  return <Modal isOpen onClose={close} title="Novo registro">
    <LevelDateInput aria-label="Data dentro do modal" value={date}
      onChange={(event) => setDate(event.target.value)} />
    <output data-testid="selected-date">{date}</output>
  </Modal>
}
describe("LevelDateInput dentro do modal Level OS", () => {
  it("abre o calendário sobre o modal sem fechar o formulário e atualiza o valor", () => {
    const close = vi.fn()
    render(<Example close={close} />)
    fireEvent.click(screen.getByRole("button", { name: "Data dentro do modal" }))
    expect(screen.getByRole("dialog", { name: "Selecionar data" })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("gridcell", { name: "26 de setembro de 2026" }))
    expect(screen.getByTestId("selected-date")).toHaveTextContent("2026-09-26")
    expect(screen.getByRole("dialog", { name: "Novo registro" })).toBeInTheDocument()
    expect(close).not.toHaveBeenCalled()
  })
})
