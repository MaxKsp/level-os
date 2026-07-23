import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"
import { PersistentCollapsibleSection } from "../components/ui/PersistentCollapsibleSection"

describe("PersistentCollapsibleSection", () => {
  beforeEach(() => window.localStorage.clear())

  it("expõe o estado e persiste a preferência", () => {
    const view = render(<PersistentCollapsibleSection storageKey="test-section" title="Contas"><button>Editar conta</button></PersistentCollapsibleSection>)
    const trigger = screen.getByRole("button", { name: /Contas/ })

    expect(trigger).toHaveAttribute("aria-expanded", "true")
    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute("aria-expanded", "false")
    expect(screen.getByRole("button", { name: "Editar conta", hidden: true }).closest("div")).toHaveAttribute("hidden")
    expect(window.localStorage.getItem("test-section")).toBe("closed")

    view.unmount()
    render(<PersistentCollapsibleSection storageKey="test-section" title="Contas"><span>Conteúdo</span></PersistentCollapsibleSection>)
    expect(screen.getByRole("button", { name: /Contas/ })).toHaveAttribute("aria-expanded", "false")
  })
})
