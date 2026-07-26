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
import { useDashboard, useProfile } from '@/hooks/use-native-data';
import { money } from '@/lib/format';

export default function OverviewScreen() {
  const dashboard = useDashboard();
  const profile = useProfile();
  const accounts = dashboard.data?.accounts_v2 ?? [];
  const expenses = dashboard.data?.expense_lines_v4 ?? [];
  const tasks = dashboard.data?.tasks_v6 ?? [];
  const totalBalance = accounts.reduce((sum, account) => sum + (Number(account.saldo) || 0), 0);
  const totalInvoice = accounts.reduce((sum, account) => sum + (Number(account.fatura) || 0), 0);
  const pendingTasks = tasks.filter((task) => !task.completed);

  return (
    <NativeScreen
      onRefresh={async () => {
        await Promise.all([dashboard.refresh(), profile.refresh()]);
      }}
      refreshing={dashboard.loading || profile.loading}>
      <PageHeader
        description="Seu dia, seu dinheiro e seu progresso em um só lugar."
        eyebrow="HOJE"
        title={`Olá, ${profile.data?.username?.split(' ')[0] ?? 'você'}.`}
      />

      {dashboard.error ? <ErrorState retry={() => void dashboard.refresh()} /> : (
        <>
          <View style={styles.metrics}>
            <Metric label="Saldo total" value={money(totalBalance)} />
            <Metric
              label="Faturas"
              tone={totalInvoice > 0 ? 'negative' : 'default'}
              value={money(totalInvoice)}
            />
          </View>

          <Section title="Próximas ações" caption={`${pendingTasks.length} tarefas pendentes`}>
            {pendingTasks.length ? pendingTasks.slice(0, 4).map((task) => (
              <Row
                icon="checkmark-circle-outline"
                key={task.id}
                subtitle={task.subtitle || task.time || 'Sem horário'}
                title={task.title || task.label || 'Tarefa'}
              />
            )) : (
              <EmptyState
                description="As próximas tarefas aparecerão aqui."
                icon="sparkles-outline"
                title="Dia em ordem"
              />
            )}
          </Section>

          <Section title="Movimentações recentes">
            {expenses.length ? expenses.slice(0, 5).map((expense) => (
              <Row
                icon="arrow-down-outline"
                key={expense.id}
                subtitle={expense.categoria || expense.date || 'Despesa'}
                title={expense.label}
                value={money(expense.value)}
              />
            )) : (
              <EmptyState
                description="Seus lançamentos recentes aparecerão aqui."
                icon="receipt-outline"
                title="Nenhuma movimentação"
              />
            )}
          </Section>
        </>
      )}
    </NativeScreen>
  );
}

const styles = StyleSheet.create({
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 22 },
});
