import { fireEvent, render, screen } from "@testing-library/react"
import { useState } from "react"
import { describe, expect, it, vi } from "vitest"
import { OtpInput, type OtpStatus } from "../components/ui/OtpInput"

function ControlledOtp({ status = "idle", onComplete }: { status?: OtpStatus; onComplete?: (value: string) => void }) {
  const [value, setValue] = useState("")
  return <OtpInput value={value} onChange={setValue} status={status} onComplete={onComplete} />
}

describe("OtpInput", () => {
  it("distribui um código colado e sinaliza conclusão", () => {
    const onComplete = vi.fn()
    render(<ControlledOtp onComplete={onComplete} />)
    const inputs = screen.getAllByRole("textbox")

    fireEvent.paste(inputs[0], { clipboardData: { getData: () => "12 34-56" } })

    expect(inputs.map((input) => (input as HTMLInputElement).value)).toEqual(["1", "2", "3", "4", "5", "6"])
    expect(onComplete).toHaveBeenCalledWith("123456")
  })

  it("substitui os campos pelo estado confirmado", () => {
    render(<ControlledOtp status="success" />)

    expect(screen.queryAllByRole("textbox")).toHaveLength(0)
    expect(screen.getByText("Verificado com sucesso")).toBeInTheDocument()
  })

  it("expõe o erro de forma acessível", () => {
    render(<ControlledOtp status="error" />)

    expect(screen.getByRole("group")).toHaveAttribute("aria-invalid", "true")
  })
})
