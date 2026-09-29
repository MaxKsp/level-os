import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { NutritionCommercePanel } from "./NutritionCommercePanel"

describe("NutritionCommercePanel", () => {
  it("orienta compra externa sem fingir checkout integrado", () => {
    render(<NutritionCommercePanel plan={null} />)
    expect(screen.getByText("max6f466d9a")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Abrir iFood/ })).toHaveAttribute("href", "https://www.ifood.com.br/")
    expect(screen.getByRole("link", { name: /Escolher marmitas/ })).toHaveAttribute("href", "https://www.livup.com.br/")
    expect(screen.getByText(/sem checkout integrado/i)).toBeInTheDocument()
  })
  it("sinaliza que os 15% são apenas simulação", () => {
    render(<NutritionCommercePanel plan={null} />)
    fireEvent.change(screen.getByLabelText("Simular economia no carrinho"), { target: { value: "100,00" } })
    expect(screen.getByText(/15,00/)).toBeInTheDocument()
    expect(screen.getByText(/85,00/)).toBeInTheDocument()
    expect(screen.getByText(/não é cotação, preço final nem cupom validado/i)).toBeInTheDocument()
  })
})
