import { memo, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { AnimatedNumber } from "../../components/ui/AnimatedNumber";
import { BankLogo } from "../../components/ui/BankLogo";
import { PersistentCollapsibleSection } from "../../components/ui/PersistentCollapsibleSection";
import { ConfirmIconAction, IconAction } from "../../components/ui/IconAction";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChartNoAxesCombined,
  ChartPie,
  CalendarRange,
  FileText,
  Pencil,
  ReceiptText,
  Star,
  Trash2,
  WalletCards,
} from "lucide-react";
import { useAssistant } from "../assistant/store";
import { AssistantAvatar } from "../assistant/AssistantAvatar";
import { EmptyState, Icon, SectionCard, Sparkline } from "../../design-system";
import { incomeTimeline, resolveFinancePeriod } from "./period";
import { formatCurrency } from "../../lib/format";
import { sumMoney } from "../../lib/money";
import { cn } from "../../lib/cn";
import type { AccountV2, IncomeLine } from "./contracts";
import {
  financeSummary,
  isCard,
  isIncomeActive,
} from "./selectors";
import { useFinance } from "./store";
import { AccountFormModal } from "./AccountFormModal";
import { IncomeFormModal } from "./IncomeFormModal";
import { FinanceDashboard } from "./FinanceDashboard";
import { FinanceStatement } from "./FinanceStatement";
import { AnnualTaxReport } from "./AnnualTaxReport";
import { FinanceActionCenter } from "./FinanceActionCenter";
import { FinanceExpenses } from "./FinanceExpenses";
import { FinanceInstallments } from "./FinanceInstallments";
import { FinanceCards } from "./FinanceCards";
import { FinancePanelSkeleton, FinanceSummarySkeleton } from "./FinanceSkeleton";

type Tab = "contas" | "extrato" | "gastos" | "parcelamentos" | "dash" | "ir";
const TYPE_LABEL: Record<string, string> = {
  conta: "Conta corrente",
  poupanca: "Poupança",
  pagamento: "Conta de pagamento",
  carteira: "Carteira digital",
  cartao: "Cartão de crédito",
};
const INCOME_LABEL: Record<string, string> = {
  fixa: "Fixa",
  variavel: "Variável",
  temporaria: "Temporária",
};

export function FinanceScreen() {
  const fin = useFinance();
  const assistant = useAssistant();
  const summary = useMemo(() => financeSummary(fin.bootstrap), [fin.bootstrap]);
  const incomeTrend = useMemo(() => incomeTimeline(fin.bootstrap, resolveFinancePeriod("6m", "", "", new Date())), [fin.bootstrap]);
  const accounts = useMemo(() => fin.accounts.filter((a) => !isCard(a)), [fin.accounts]);
  const [params, setParams] = useSearchParams();
  const requested = params.get("tab");
  const [tab, setTab] = useState<Tab>(
    requested === "extrato" || requested === "gastos" || requested === "parcelamentos" || requested === "dash" || requested === "ir"
      ? requested
      : "contas",
  );
  const [accModal, setAccModal] = useState<{
    open: boolean;
    edit: AccountV2 | null;
  }>({ open: false, edit: null });
  const [incModal, setIncModal] = useState<{
    open: boolean;
    edit: IncomeLine | null;
  }>({ open: false, edit: null });
  const [actionCenter, setActionCenter] = useState(false);

  useEffect(() => {
    if (
      requested === "extrato" ||
      requested === "gastos" ||
      requested === "parcelamentos" ||
      requested === "dash" ||
      requested === "ir" ||
      requested === "contas"
    )
      setTab(requested);
  }, [requested]);
  const changeTab = (next: Tab) => {
    setTab(next);
    setParams(next === "contas" ? {} : { tab: next }, { replace: true });
  };

  return (
    <main className="level-page mx-auto flex max-w-[1180px] flex-col gap-6 px-4 pb-24 pt-24 sm:px-6">
      <header className="level-page-header flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="level-page-title text-3xl font-semibold tracking-tight text-on-surface">
            Finanças
          </h1>
          <p className="mt-2 text-on-surface-variant">
            Contas, cartões, rendas e extrato em um só lugar.
          </p>
          <p
            role="status"
            className={cn(
              "mt-1 flex items-center gap-1 text-[11px]",
              fin.syncStatus === "error" ? "text-error" : "text-muted",
            )}
            title={fin.syncError ?? undefined}
          >
            <Icon
              name={
                fin.syncStatus === "error"
                  ? "cloud_off"
                  : fin.syncStatus === "local"
                    ? "devices"
                    : "cloud_done"
              }
              className="text-[14px]"
            />
            {fin.syncStatus === "local"
              ? "Preview salvo neste dispositivo"
              : fin.syncStatus === "loading"
                ? "Carregando dados seguros…"
                : fin.syncStatus === "syncing"
                  ? "Salvando alterações…"
                  : fin.syncStatus === "error"
                    ? (fin.syncError ?? "Não foi possível salvar agora. Tente novamente.")
                    : "Dados sincronizados"}
          </p>
          {fin.syncStatus === "error" && fin.syncRequiresUpgrade ? (
            <p className="mt-1 text-[11px] text-on-surface-variant">
              A movimentação não foi salva.{" "}
              <a href="/perfil" className="text-primary underline underline-offset-2">
                {fin.syncErrorAction ?? "Conhecer o plano"}
              </a>
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => assistant.openFor("financeiro")}>
            <AssistantAvatar module="financeiro" className="size-4" /> Assessor Fin
          </Button>
          <Button onClick={() => setActionCenter(true)} className="min-w-[190px]">
            <Icon name="add" className="text-[20px]" /> Nova movimentação{" "}
            <Icon name="expand_more" className="ml-auto text-[18px]" />
          </Button>
        </div>
      </header>

      {fin.syncStatus === "loading" ? <FinanceSummarySkeleton /> : <FinanceSummaryRow summary={summary} accountCount={accounts.length} cardCount={summary.cardsCount} />}

      <div className="-mx-4 min-w-0 overflow-x-auto px-4 pb-1 sm:mx-0 sm:overflow-visible sm:px-0">
        <Tabs
          value={tab}
          onValueChange={(value) => changeTab(value as Tab)}
          className="w-max min-w-full"
        >
          <TabsList
            variant="line"
            aria-label="Seções do financeiro"
            className="w-max min-w-full justify-start overflow-visible"
          >
            <TabsTrigger value="contas" className="shrink-0 gap-1.5 px-3 text-xs sm:gap-2 sm:text-sm">
              <WalletCards aria-hidden="true" />
              Contas
            </TabsTrigger>
            <TabsTrigger value="extrato" className="shrink-0 gap-1.5 px-3 text-xs sm:gap-2 sm:text-sm">
              <ReceiptText aria-hidden="true" />
              Extrato
            </TabsTrigger>
            <TabsTrigger value="dash" className="shrink-0 gap-1.5 px-3 text-xs sm:gap-2 sm:text-sm">
              <ChartNoAxesCombined aria-hidden="true" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="parcelamentos" className="shrink-0 gap-1.5 px-3 text-xs sm:gap-2 sm:text-sm">
              <CalendarRange aria-hidden="true" />
              Parcelamentos
            </TabsTrigger>
            <TabsTrigger value="gastos" className="shrink-0 gap-1.5 px-3 text-xs sm:gap-2 sm:text-sm">
              <ChartPie aria-hidden="true" />
              Gastos
            </TabsTrigger>
            <TabsTrigger value="ir" className="shrink-0 gap-1.5 px-3 text-xs sm:gap-2 sm:text-sm">
              <FileText aria-hidden="true" />
              Imposto de renda
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {tab === "parcelamentos" ? (
        <FinanceInstallments data={fin.bootstrap} syncStatus={fin.syncStatus} syncError={fin.syncError} />
      ) : fin.syncStatus === "loading" ? <FinancePanelSkeleton /> : tab === "dash" ? (
        <FinanceDashboard data={fin.bootstrap} />
      ) : tab === "extrato" ? (
        <FinanceStatement />
      ) : tab === "gastos" ? (
        <FinanceExpenses data={fin.bootstrap} syncStatus={fin.syncStatus} syncError={fin.syncError} />
      ) : tab === "ir" ? (
        <AnnualTaxReport data={fin.bootstrap} />
      ) : (
        <div className="flex flex-col gap-5">
          <PersistentCollapsibleSection
            storageKey="level-os:finance:accounts-open"
            title="Contas"
            description={`${accounts.length} cadastradas · ${formatCurrency(summary.totalBalance)}`}
            bodyClassName="p-0"
          >
            {accounts.length === 0 ? (
              <EmptyState title="Nenhuma conta cadastrada" description="Cadastre uma conta para acompanhar saldo, extrato e movimentações." icon="account_balance" action={<Button size="sm" onClick={() => setAccModal({ open: true, edit: null })}>Cadastrar primeira conta</Button>} />
            ) : (
              <ul className="divide-y divide-outline-variant">
                {accounts.map((a) => (
                  <li
                    key={a.id}
                    className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-3 py-3.5 hover:bg-surface-container sm:flex sm:px-5"
                  >
                    <BankLogo bank={a.bank} size={38} />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 truncate text-sm font-medium text-on-surface">
                        {a.label}
                        {a.principal ? (
                          <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] text-primary">
                            Principal
                          </span>
                        ) : null}
                      </p>
                      <p className="truncate text-xs text-muted">
                        {TYPE_LABEL[a.tipo] ?? a.tipo}
                        {a.chequeEspecial
                          ? ` · cheque especial ${formatCurrency(a.chequeEspecial)}`
                          : ""}
                      </p>
                    </div>
                    <p className="shrink-0 font-mono text-sm text-on-surface">
                      {formatCurrency(a.saldo)}
                    </p>
                    <RowActions
                      entityLabel={a.label}
                      onPrincipal={
                        !a.principal ? () => fin.setPrincipal(a.id) : undefined
                      }
                      onEdit={() => setAccModal({ open: true, edit: a })}
                      onDelete={() => fin.removeAccount(a.id)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </PersistentCollapsibleSection>

          <FinanceCards
            data={fin.bootstrap}
            onAdd={() => setAccModal({ open: true, edit: null })}
            onEdit={(card) => setAccModal({ open: true, edit: card })}
            onDelete={fin.removeAccount}
          />

          {incomeTrend.some((point) => point.total > 0) ? (
            <SectionCard title="Evolução das rendas" description="Ocorrências recorrentes + variáveis nos últimos 6 meses">
              <div className="pt-2">
                <Sparkline
                  values={incomeTrend.map((point) => point.total)}
                  labels={incomeTrend.map((point) => point.label)}
                  tone="tertiary"
                  height={140}
                  ariaLabel="Rendas por mês nos últimos 6 meses"
                  valueFormatter={(value) => formatCurrency(value)}
                />
                <div className="mt-2 flex justify-between text-[10px] text-muted">
                  {incomeTrend.map((point) => <span key={point.key}>{point.label}</span>)}
                </div>
              </div>
            </SectionCard>
          ) : null}

          <div className="grid gap-5 lg:grid-cols-2">
            <PersistentCollapsibleSection
              storageKey="level-os:finance:recurring-income-open"
              title="Rendas recorrentes"
              description={`${formatCurrency(sumMoney(fin.income.filter((income) => isIncomeActive(income)).map((item) => item.value)))} / mês ativo`}
              defaultOpen={false}
              bodyClassName="p-0"
            >
              {fin.income.length === 0 ? (
                <EmptyState title="Nenhuma renda recorrente" description="Cadastre salário, pró-labore ou outra entrada recorrente." icon="trending_up" action={<Button size="sm" onClick={() => setIncModal({ open: true, edit: null })}>Cadastrar renda</Button>} />
              ) : (
                <ul className="divide-y divide-outline-variant">
                  {fin.income.map((i) => {
                    const acc = fin.accounts.find((a) => a.id === i.accountId);
                    return (
                      <li
                        key={i.id}
                        className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-3 py-3.5 sm:flex sm:px-4"
                      >
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-tertiary/15 text-tertiary">
                          <Icon name="trending_up" className="text-[18px]" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-on-surface">
                            {i.label}
                          </p>
                          <p className="truncate text-xs text-muted">
                            {INCOME_LABEL[i.type ?? "fixa"]}
                            {i.payday ? ` · dia ${i.payday}` : ""}
                            {i.endDate ? ` · acerto ${i.endDate}` : ""}
                            {acc ? ` · ${acc.label}` : ""}
                          </p>
                        </div>
                        <p className="shrink-0 font-mono text-sm text-tertiary">
                          + {formatCurrency(i.value)}
                        </p>
                        <RowActions
                          entityLabel={i.label}
                          onEdit={() => setIncModal({ open: true, edit: i })}
                          onDelete={() => fin.removeIncome(i.id)}
                        />
                      </li>
                    );
                  })}
                </ul>
              )}
            </PersistentCollapsibleSection>
            <PersistentCollapsibleSection
              storageKey="level-os:finance:variable-income-open"
              title="Rendas variáveis"
              description={`${formatCurrency(sumMoney(fin.variableIncome.map((item) => item.valor)))} no período`}
              defaultOpen={false}
              bodyClassName="p-0"
            >
              {fin.variableIncome.length === 0 ? (
                <EmptyState title="Nenhuma renda variável" description="Lance recebimentos pontuais, comissões ou trabalhos avulsos." icon="ssid_chart" action={<Button size="sm" onClick={() => setActionCenter(true)}>Adicionar movimentação</Button>} />
              ) : (
                <ul className="divide-y divide-outline-variant">
                  {fin.variableIncome.map((item, index) => {
                    const id = item.id ?? `variable-${index}`;
                    const account = fin.accounts.find(
                      (a) => a.id === item.accountId,
                    );
                    return (
                      <li
                        key={id}
                        className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-3 py-3.5 sm:flex sm:px-4"
                      >
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/12 text-primary">
                          <Icon name="ssid_chart" className="text-[18px]" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-on-surface">
                            {item.label ?? "Renda variável"}
                          </p>
                          <p className="truncate text-xs text-muted">
                            {item.date ?? "Sem data"}
                            {account ? ` · ${account.label}` : ""}
                            {item.km ? ` · ${item.km} km` : ""}
                          </p>
                        </div>
                        <p className="shrink-0 font-mono text-sm text-tertiary">
                          + {formatCurrency(item.valor)}
                        </p>
                        <span className="col-span-2 col-start-2 row-start-2 flex justify-end sm:contents">
                          <ConfirmIconAction
                            label="Excluir renda variável"
                            title="Excluir renda variável?"
                            description="Esta movimentação será removida do período atual. Esta ação não pode ser desfeita."
                            onConfirm={() => fin.removeVariableIncome(id)}
                          >
                            <Trash2 className="size-4" aria-hidden="true" />
                          </ConfirmIconAction>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </PersistentCollapsibleSection>
          </div>
        </div>
      )}

      <AccountFormModal
        open={accModal.open}
        initial={accModal.edit}
        onClose={() => setAccModal({ open: false, edit: null })}
        onSave={(a) =>
          accModal.edit ? fin.updateAccount(a) : fin.addAccount(a)
        }
      />
      <IncomeFormModal
        open={incModal.open}
        initial={incModal.edit}
        accounts={fin.accounts}
        onClose={() => setIncModal({ open: false, edit: null })}
        onSave={(i) => (incModal.edit ? fin.updateIncome(i) : fin.addIncome(i))}
        onVersion={(id, value, month, salaryDetails) => fin.versionIncome(id, value, month, salaryDetails)}
      />
      <FinanceActionCenter
        open={actionCenter}
        onClose={() => setActionCenter(false)}
      />
    </main>
  );
}

const FinanceSummaryRow = memo(function FinanceSummaryRow({ summary, accountCount, cardCount }: { summary: ReturnType<typeof financeSummary>; accountCount: number; cardCount: number }) {
  return <div data-testid="finance-summary-row" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
    <SummaryCell icon="account_balance_wallet" label="Patrimônio" value={summary.netWorth} animationKey="finance-summary-net-worth" />
    <SummaryCell icon="account_balance" label="Saldo disponível" value={summary.totalBalance} animationKey="finance-summary-balance" sub={`${accountCount} contas`} />
    <SummaryCell icon="credit_card" label="Faturas" value={summary.totalInvoice} animationKey="finance-summary-invoice" sub={`${cardCount} cartões`} tone="danger" />
    <SummaryCell icon="credit_score" label="Crédito livre" value={summary.availableCredit} animationKey="finance-summary-credit" tone="positive" />
  </div>
});

function SummaryCell({
  icon,
  label,
  value,
  animationKey,
  sub,
  tone = "neutral",
}: {
  icon: string;
  label: string;
  value: number;
  animationKey: string;
  sub?: string;
  tone?: "neutral" | "positive" | "danger";
}) {
  const valueTone = tone === "positive" ? "text-tertiary" : tone === "danger" ? "text-error" : "text-on-surface";
  return (
    <article className="group min-w-0 rounded-xl border border-outline-variant bg-surface-container/55 p-3.5 transition-colors hover:border-primary/30 hover:bg-surface-container-high/70">
      <div className="flex items-center justify-between gap-2">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon name={icon} className="text-[17px]" />
        </span>
        {sub ? <span className="numeric-value truncate text-[10px] text-muted">{sub}</span> : null}
      </div>
      <p className="mt-3 truncate text-xs font-medium text-muted">{label}</p>
      <AnimatedNumber value={value} animationKey={animationKey} formatValue={formatCurrency} className={cn("mt-1 block truncate font-mono text-base font-semibold sm:text-lg", valueTone)} />
    </article>
  );
}
function RowActions({
  entityLabel,
  onEdit,
  onDelete,
  onPrincipal,
}: {
  entityLabel: string;
  onEdit: () => void;
  onDelete: () => void;
  onPrincipal?: () => void;
}) {
  return (
    <div className="col-span-2 col-start-2 row-start-2 flex shrink-0 justify-end gap-0.5 sm:justify-start">
      {onPrincipal ? (
        <IconAction label="Definir como principal" onClick={onPrincipal}>
          <Star className="size-4" aria-hidden="true" />
        </IconAction>
      ) : null}
      <IconAction label="Editar" onClick={onEdit}>
        <Pencil className="size-4" aria-hidden="true" />
      </IconAction>
      <ConfirmIconAction
        label="Excluir"
        title={`Excluir “${entityLabel}”?`}
        description="Os dados deste item serão removidos do painel. Esta ação não pode ser desfeita."
        onConfirm={onDelete}
      >
        <Trash2 className="size-4" aria-hidden="true" />
      </ConfirmIconAction>
    </div>
  );
}
