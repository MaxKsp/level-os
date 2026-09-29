import { fireEvent, render, screen } from "@testing-library/react"
import type { FormEvent } from "react"
import { describe, expect, it, vi } from "vitest"
import { LevelSelect } from "../components/ui/LevelSelect"
import { LevelDateInput } from "../components/ui/LevelDateInput"

describe("Controles padronizados do Level OS", () => {
  it("exibe seleção, permite escolher outra opção sem submeter o formulário", () => {
    const onChange = vi.fn()
    const submit = vi.fn((event: FormEvent) => event.preventDefault())
    render(<form onSubmit={submit}>
      <LevelSelect label="Categoria" value="a" onChange={onChange} options={[
        { value: "a", label: "Alimentação" }, { value: "b", label: "Transporte" },
      ]} />
    </form>)
    fireEvent.click(screen.getByRole("button", { name: "Categoria" }))
    expect(screen.getByRole("listbox")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("option", { name: "Transporte" }))
    expect(onChange).toHaveBeenCalledWith("b")
    expect(submit).not.toHaveBeenCalled()
  })
  it("permite navegação por teclado e escape", () => {
    const onChange = vi.fn()
    render(<LevelSelect aria-label="Prioridade" value="low" onChange={onChange}
      options={[{ value: "low", label: "Baixa" }, { value: "high", label: "Alta" }]} />)
    const control = screen.getByRole("button", { name: "Prioridade" })
    fireEvent.keyDown(control, { key: "ArrowDown" })
    fireEvent.keyDown(control, { key: "ArrowDown" })
    fireEvent.keyDown(control, { key: "Enter" })
    expect(onChange).toHaveBeenCalledWith("high")
    fireEvent.click(control)
    fireEvent.keyDown(control, { key: "Escape" })
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
  })
  it("mantém semântica e limites nativos de data", () => {
    const onChange = vi.fn()
    render(<LevelDateInput aria-label="Data da compra" value="2026-09-29" min="2026-09-01" max="2026-09-30" onChange={onChange} />)
    const input = screen.getByLabelText("Data da compra") as HTMLInputElement
    expect(input.type).toBe("date")
    expect(input.min).toBe("2026-09-01")
    expect(input.max).toBe("2026-09-30")
    fireEvent.change(input, { target: { value: "2026-09-25" } })
    expect(onChange).toHaveBeenCalled()
  })
})
