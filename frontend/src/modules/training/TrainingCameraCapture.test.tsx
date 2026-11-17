import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { TrainingCameraCapture } from "./TrainingCameraCapture"

describe("TrainingCameraCapture", () => {
  it("abre a experiência de câmera ocupando todo o viewport", () => {
    render(<TrainingCameraCapture open onClose={vi.fn()} onConfirm={vi.fn()} />)

    const dialog = screen.getByRole("dialog", { name: "Fotografar aparelho" })
    expect(dialog).toHaveClass("fixed", "inset-0", "h-[100dvh]", "w-screen")
    expect(screen.getByText(/Enquadre o aparelho inteiro/i)).toBeInTheDocument()
    expect(screen.getByLabelText("Fechar câmera")).toBeInTheDocument()
  })
})
