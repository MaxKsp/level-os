import { act, fireEvent, render, screen } from "@testing-library/react"
import type { FormEvent } from "react"
import { describe, expect, it, vi } from "vitest"
import { LevelSelect } from "../components/ui/LevelSelect"
import { LevelDateInput } from "../components/ui/LevelDateInput"

describe("Controles padronizados do Level OS", () => {
  it("seleciona outra opção sem submeter o formulário", () => {
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
  it("permite navegação por teclado e Escape na lista", () => {
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
  it("abre o calendário Level OS e respeita datas mínimas e máximas", () => {
    const onChange = vi.fn()
    render(<LevelDateInput aria-label="Data da compra" value="2026-09-29"
      min="2026-09-20" max="2026-09-30" onChange={onChange} />)
    fireEvent.click(screen.getByRole("button", { name: "Data da compra" }))
    expect(screen.getByRole("dialog", { name: "Selecionar data" })).toBeInTheDocument()
    expect(screen.getByRole("grid", { name: /Dias de setembro de 2026/i })).toBeInTheDocument()
    expect(screen.getByRole("gridcell", { name: "19 de setembro de 2026" })).toBeDisabled()
    fireEvent.click(screen.getByRole("gridcell", { name: "25 de setembro de 2026" }))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0][0].target.value).toBe("2026-09-25")
    expect(screen.queryByRole("dialog", { name: "Selecionar data" })).not.toBeInTheDocument()
  })
  it("navega entre meses e permite informar o ano diretamente", () => {
    const onChange = vi.fn()
    render(<LevelDateInput value="1998-07-02" aria-label="Nascimento" onChange={onChange} />)
    fireEvent.click(screen.getByRole("button", { name: "Nascimento" }))
    expect(screen.getByRole("grid", { name: /Dias de julho de 1998/i })).toBeInTheDocument()
    fireEvent.change(screen.getByRole("textbox", { name: "Ano do calendário" }), { target: { value: "2000" } })
    expect(screen.getByRole("grid", { name: /Dias de julho de 2000/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Próximo mês" }))
    expect(screen.getByRole("grid", { name: /Dias de agosto de 2000/i })).toBeInTheDocument()
  })
  it("tem horário próprio, sem abrir controles nativos do sistema", () => {
    const onChange = vi.fn()
    render(<LevelDateInput type="time" aria-label="Hora da tarefa" value="08:30" onChange={onChange} />)
    fireEvent.click(screen.getByRole("button", { name: "Hora da tarefa" }))
    expect(screen.getByRole("dialog", { name: "Selecionar horário" })).toBeInTheDocument()
    fireEvent.change(screen.getByRole("spinbutton", { name: "Hora" }), { target: { value: "14" } })
    fireEvent.change(screen.getByRole("spinbutton", { name: "Minuto" }), { target: { value: "45" } })
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }))
    expect(onChange.mock.calls[0][0].target.value).toBe("14:45")
  })
  it("bloqueia confirmação fora dos limites ao editar data e horário", () => {
    const onChange = vi.fn()
    render(<LevelDateInput type="datetime-local" aria-label="Agendamento" value="2026-09-29T09:00"
      min="2026-09-29T08:00" max="2026-09-29T17:00" onChange={onChange} />)
    fireEvent.click(screen.getByRole("button", { name: "Agendamento" }))
    expect(screen.getByRole("dialog", { name: "Selecionar data e horário" })).toBeInTheDocument()
    fireEvent.change(screen.getByRole("spinbutton", { name: "Hora" }), { target: { value: "20" } })
    expect(screen.getByRole("button", { name: "Confirmar" })).toBeDisabled()
    fireEvent.change(screen.getByRole("spinbutton", { name: "Hora" }), { target: { value: "12" } })
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }))
    expect(onChange.mock.calls[0][0].target.value).toBe("2026-09-29T12:00")
  })
  it("não monta inputs date/time nativos, preservando a submissão por campo oculto", () => {
    const { container, rerender } = render(<LevelDateInput name="meal_date" type="date" aria-label="Data"
      value="2026-09-29" onChange={vi.fn()} />)
    expect(container.querySelector('input[type="date"], input[type="time"], input[type="datetime-local"]')).toBeNull()
    expect(container.querySelector('input[name="meal_date"]')).toHaveAttribute("type", "hidden")
    expect(container.querySelector('input[name="meal_date"]')).toHaveValue("2026-09-29")
    rerender(<LevelDateInput name="meal_date" type="time" aria-label="Horário" value="09:30" onChange={vi.fn()} />)
    expect(container.querySelector('input[type="time"]')).toBeNull()
    expect(container.querySelector('input[name="meal_date"]')).toHaveValue("09:30")
  })
  it("mantém campo obrigatório sem delegar validação ou calendário ao navegador", () => {
    const onSubmit = vi.fn()
    render(<form data-testid="required-date-form" onSubmit={onSubmit}>
      <LevelDateInput label="Data da refeição" value="" required onChange={vi.fn()} />
      <button type="submit">Salvar</button>
    </form>)
    const control = screen.getByRole("button", { name: "Data da refeição" })
    expect(control).toHaveAttribute("aria-required", "true")
    const form = screen.getByTestId("required-date-form")
    let accepted = true
    act(() => { accepted = form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })) })
    expect(accepted).toBe(false)
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByRole("dialog", { name: "Selecionar data" })).toBeInTheDocument()
  })
})
