import { StyleSheet, View } from 'react-native';

import {
  EmptyState,
  ErrorState,
  Metric,
  NativeScreen,
  PageHeader,
  Row,
  Section,
} from '@/components/native-ui';
import { useDashboard } from '@/hooks/use-native-data';
import { money, shortDate } from '@/lib/format';

export default function FinanceScreen() {
  const state = useDashboard();
  const accounts = state.data?.accounts_v2 ?? [];
  const expenses = state.data?.expense_lines_v4 ?? [];
  const income = state.data?.income_lines ?? [];
  const totalBalance = accounts.reduce((sum, item) => sum + (Number(item.saldo) || 0), 0);
  const totalExpenses = expenses.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
  const totalIncome = income.reduce((sum, item) => sum + (Number(item.value) || 0), 0);

  return (
    <NativeScreen onRefresh={state.refresh} refreshing={state.loading}>
      <PageHeader
        description="Leitura objetiva do que entra, sai e permanece."
        eyebrow="FINANÇAS"
        title="Seu dinheiro"
      />
      {state.error ? <ErrorState retry={() => void state.refresh()} /> : (
        <>
          <View style={styles.hero}>
            <Metric label="Patrimônio disponível" value={money(totalBalance)} />
          </View>
          <View style={styles.metrics}>
            <Metric label="Rendas" tone="positive" value={money(totalIncome)} />
            <Metric label="Despesas" tone="negative" value={money(totalExpenses)} />
          </View>

          <Section title="Contas" caption={`${accounts.length} cadastradas`}>
            {accounts.length ? accounts.map((account) => (
              <Row
                icon={account.fatura ? 'card-outline' : 'business-outline'}
                key={account.id}
                subtitle={account.fatura ? `Fatura ${money(account.fatura)}` : 'Conta'}
                title={account.label}
                value={money(account.saldo)}
              />
            )) : (
              <EmptyState
                description="Cadastre sua primeira conta pela plataforma."
                icon="wallet-outline"
                title="Nenhuma conta"
              />
            )}
          </Section>

          <Section title="Últimos lançamentos">
            {expenses.length ? expenses.slice(0, 10).map((expense) => (
              <Row
                icon="receipt-outline"
                key={expense.id}
                subtitle={`${expense.categoria || 'Outros'} · ${shortDate(expense.date)}`}
                title={expense.label}
                value={money(expense.value)}
              />
            )) : (
              <EmptyState
                description="As despesas registradas aparecerão aqui."
                icon="file-tray-outline"
                title="Sem lançamentos"
              />
            )}
          </Section>
        </>
      )}
    </NativeScreen>
  );
}

const styles = StyleSheet.create({
  hero: { paddingVertical: 8 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 22 },
});
