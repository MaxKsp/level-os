import { fireEvent, render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { ParticipationDonut } from "../components/ui/ParticipationDonut"

describe("ParticipationDonut", () => {
  it("expõe valor e percentual de cada segmento para teclado e toque", () => {
    render(
      <ParticipationDonut
        ariaLabel="Composição do período"
        formatValue={(value) => `R$ ${value}`}
        items={[{ label: "Receitas", value: 75 }, { label: "Despesas", value: 25 }]}
      />,
    )

    const chart = screen.getByRole("img", { name: "Composição do período" })
    const segment = within(chart).getByRole("button", { name: "Despesas: R$ 25, 25%" })
    fireEvent.keyDown(segment, { key: "Enter" })
    fireEvent.blur(segment)

    expect(screen.getAllByText("Despesas").length).toBeGreaterThan(1)
    expect(screen.getByText("R$ 25")).toBeInTheDocument()
    expect(screen.getAllByText("25%").length).toBeGreaterThan(0)
  })
})
