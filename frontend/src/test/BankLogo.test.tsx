import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { BankLogo } from "../components/ui/BankLogo"

describe("BankLogo", () => {
  it("renderiza uma marca oficial como SVG", () => {
    render(<BankLogo bank="Nubank" />)
    const logo = screen.getByRole("img", { name: "Logo Nubank" })
    expect(logo).toHaveAttribute("data-bank-logo-kind", "official-svg")
    expect(logo.querySelector("svg")).not.toBeNull()
  })

  it("renderiza um fallback vetorial para qualquer instituição", () => {
    render(<BankLogo bank="Banco Comunitário Exemplo" />)
    const logo = screen.getByRole("img", { name: "Logo vetorial de Banco Comunitário Exemplo" })
    expect(logo).toHaveAttribute("data-bank-logo-kind", "generated-svg")
    expect(logo.querySelector("svg")).not.toBeNull()
  })
})
