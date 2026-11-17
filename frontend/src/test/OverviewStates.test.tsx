import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it } from "vitest"
import { ParticipationDonut } from "../components/ui/ParticipationDonut"
import { formatCount } from "../lib/format"
import { financeBootstrapMock } from "../modules/finance/mock"
import { FinanceOverview } from "../modules/overview/components/FinanceOverview"
import { TrainingOverview } from "../modules/overview/components/TrainingOverview"
import { VaultsOverview } from "../modules/overview/components/VaultsOverview"

const workout = { title: "Treino A", focus: "Peito", durationMin: 0, exercises: [] }

describe("estados da Visão geral", () => {
  it("mostra estado vazio de cofrinhos e não inventa percentual sem meta", () => {
    const { rerender } = render(<MemoryRouter><VaultsOverview vaults={[]} /></MemoryRouter>)
    expect(screen.getByText("Nenhum cofrinho criado")).toBeInTheDocument()

    rerender(<MemoryRouter><VaultsOverview vaults={[{ id: "v1", label: "Viagem", saldo: 250, meta: null }]} /></MemoryRouter>)
    expect(screen.getByText("Sem meta definida")).toBeInTheDocument()
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument()
    expect(screen.queryByText("0%")).not.toBeInTheDocument()
  })

  it("não exibe 0,0 kg quando não há pesagem e descreve a variação corretamente", () => {
    const { rerender } = render(<MemoryRouter><TrainingOverview workout={workout} weights={[]} /></MemoryRouter>)
    expect(screen.getByText(/Nenhuma pesagem registrada/)).toBeInTheDocument()
    expect(screen.getByText("Nenhum exercício na sessão de hoje.")).toBeInTheDocument()
    expect(screen.queryByText("0,0 kg")).not.toBeInTheDocument()
    expect(screen.queryByText(/na semana/)).not.toBeInTheDocument()

    rerender(<MemoryRouter><TrainingOverview workout={workout} weights={[{ date: "2026-11-01", weight: 80 }, { date: "2026-11-15", weight: 80 }]} /></MemoryRouter>)
    expect(screen.getByText("Estável desde o primeiro registro")).toBeInTheDocument()
  })

  it("concorda contagens no singular e mostra estado vazio de contas", () => {
    render(<MemoryRouter><FinanceOverview data={{ ...financeBootstrapMock, accounts_v2: [] }} trend={[]} /></MemoryRouter>)
    expect(screen.getByText("Nenhuma conta cadastrada")).toBeInTheDocument()
    expect(screen.getByText("0 contas")).toBeInTheDocument()
    expect(formatCount(1, "cartão", "cartões")).toBe("1 cartão")
    expect(formatCount(1200, "conta", "contas")).toBe("1.200 contas")
  })

  it("rosca mostra o total sem repetir o rótulo", () => {
    render(<ParticipationDonut ariaLabel="Composição" formatValue={(value) => `R$ ${value}`} items={[{ label: "A", value: 1 }, { label: "B", value: 3 }]} />)
    expect(screen.getByText("Total")).toBeInTheDocument()
    expect(screen.getByText("R$ 4")).toBeInTheDocument()
    expect(screen.queryByText(/Total R\$/)).not.toBeInTheDocument()
  })
})
