import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AnimatedNumber, Sparkline } from '@/components/native-charts';
import {
  ActionTile,
  EmptyState,
  ErrorState,
  LoadingState,
  Metric,
  NativeScreen,
  PageHeader,
  ProgressBar,
  Row,
  Section,
  SectionLink,
} from '@/components/native-ui';
import { ProfileAvatar } from '@/components/profile-avatar';
import { levelTheme } from '@/constants/level-theme';
import { useDashboard, useNutrition, useProfile, useProgress, useTraining } from '@/hooks/use-native-data';
import { money } from '@/lib/format';

export default function OverviewScreen() {
  const dashboard = useDashboard();
  const profile = useProfile();
  const progress = useProgress();
  const training = useTraining();
  const nutrition = useNutrition();
  const accounts = dashboard.data?.accounts_v2 ?? [];
  const expenses = dashboard.data?.expense_lines_v4 ?? [];
  const incomes = dashboard.data?.income_lines ?? [];
  const tasks = dashboard.data?.tasks_v6 ?? [];
  const vaults = dashboard.data?.vaults ?? [];
  const totalBalance = accounts.reduce((sum, account) => sum + (Number(account.saldo) || 0), 0);
  const totalInvoice = accounts.reduce((sum, account) => sum + (Number(account.fatura) || 0), 0);
  const pendingTasks = tasks.filter((task) => !task.completed);
  const financeTrend = [
    totalBalance - expenses.reduce((sum, item) => sum + Number(item.value || 0), 0),
    totalBalance - totalInvoice,
    totalBalance,
  ];

  const refresh = async () => {
    await Promise.all([
      dashboard.refresh(), profile.refresh(), progress.refresh(), training.refresh(), nutrition.refresh(),
    ]);
  };

  return (
    <NativeScreen onRefresh={refresh} refreshing={dashboard.loading || profile.loading}>
      <PageHeader
        action={(
          <ProfileAvatar
            avatar={profile.data?.avatar}
            name={profile.data?.username}
            onPress={() => router.push('/(app)/profile')}
          />
        )}
        description="Seu dia, seu dinheiro e seu progresso em um só lugar."
        eyebrow="HOJE"
        title={`Olá, ${profile.data?.username?.split(' ')[0] ?? 'você'}.`}
      />

      {dashboard.loading && !dashboard.data ? (
        <LoadingState label="Preparando sua visão do dia…" rows={4} />
      ) : dashboard.error ? <ErrorState retry={() => void refresh()} /> : (
        <>
          <Section
            action={<SectionLink label="Ver finanças" onPress={() => router.push('/(app)/finance')} />}
            caption={`${accounts.length} ${accounts.length === 1 ? 'conta conectada' : 'contas conectadas'}`}
            title="Seu dinheiro hoje">
            <View style={styles.balanceHero}>
              <Text style={styles.balanceLabel}>Saldo disponível</Text>
              <AnimatedNumber format={money} value={totalBalance} />
              <View style={styles.balanceMeta}>
                <Text style={styles.balanceMetaText}>Faturas {money(totalInvoice)}</Text>
                <Text style={styles.balanceMetaDot}>•</Text>
                <Text style={styles.balanceMetaText}>
                  {expenses.length + incomes.length} movimentações
                </Text>
              </View>
              <Sparkline height={92} values={financeTrend} />
            </View>
          </Section>

          <Section title="Ações rápidas" caption="O que você quer registrar agora?">
            <View style={styles.quickActions}>
              <ActionTile
                accent
                compact
                description="Registre valor, categoria e conta"
                icon="add-circle-outline"
                onPress={() => router.push({
                  pathname: '/(app)/finance',
                  params: { action: 'expense', nonce: String(Date.now()) },
                })}
                title="Lançar despesa"
              />
              <ActionTile
                compact
                description="Crie um lembrete com horário e repetição"
                icon="alarm-outline"
                onPress={() => router.push({
                  pathname: '/(app)/routine',
                  params: { action: 'new', nonce: String(Date.now()) },
                })}
                title="Nova tarefa"
              />
            </View>
          </Section>

          <View style={styles.metrics}>
            <Metric label="XP" value={String(progress.data?.xp ?? 0)} />
            <Metric label="Sequência" value={`${progress.data?.streak ?? 0} dias`} />
          </View>

          <Section title={`Nível ${progress.data?.level ?? 1} · ${progress.data?.title ?? 'Começando'}`} caption={`${progress.data?.xp_into_level ?? 0}/${progress.data?.xp_to_next ?? 0} XP`}>
            <ProgressBar value={progress.data?.progress_pct ?? 0} />
          </Section>

          <Section
            action={<SectionLink label="Abrir rotina" onPress={() => router.push('/(app)/routine')} />}
            title="Próximas ações"
            caption={`${pendingTasks.length} tarefas pendentes`}>
            {pendingTasks.length ? pendingTasks.slice(0, 4).map((task) => (
              <Row
                icon="checkmark-circle-outline"
                key={task.id}
                onPress={() => router.push('/(app)/routine')}
                subtitle={task.subtitle || task.time || 'Sem horário'}
                title={task.title || task.label || 'Tarefa'}
              />
            )) : <EmptyState description="As próximas tarefas aparecerão aqui." icon="sparkles-outline" title="Dia em ordem" />}
          </Section>

          <Section title="Módulos" caption="Continue de onde parou">
            <Row
              icon="barbell-outline"
              onPress={() => router.push('/(app)/training')}
              subtitle={`${training.data?.sessions.length ?? 0} sessões registradas`}
              title="Treinos"
              value={`${training.data?.workouts.length ?? 0} fichas`}
            />
            <Row
              icon="restaurant-outline"
              onPress={() => router.push('/(app)/nutrition')}
              subtitle={nutrition.data?.plan ? `${nutrition.data.plan.periodDays} dias planejados` : 'Crie seu primeiro cardápio'}
              title="Alimentação"
              value={nutrition.data?.plan ? money(nutrition.data.plan.estimatedCostBRL) : undefined}
            />
            <Row
              icon="sparkles-outline"
              onPress={() => router.push('/(app)/assistant')}
              subtitle="Especialistas de finanças, rotina, treinos e alimentação"
              title="Agente de IA"
            />
            <Row
              icon="wallet-outline"
              onPress={() => router.push('/(app)/finance')}
              subtitle={`${expenses.length + incomes.length} lançamentos`}
              title="Finanças"
              value={money(totalBalance)}
            />
          </Section>

          {vaults.length ? (
            <Section title="Cofrinhos" caption={`${vaults.length} objetivos`}>
              {vaults.map((vault) => (
                <Row
                  icon="archive-outline"
                  key={vault.id}
                  subtitle={vault.meta ? `Meta ${money(vault.meta)}` : 'Sem meta definida'}
                  title={vault.label}
                  value={money(vault.saldo)}
                />
              ))}
            </Section>
          ) : null}

          <Section
            action={<SectionLink label="Ver extrato" onPress={() => router.push('/(app)/finance')} />}
            title="Movimentações recentes">
            {expenses.length ? expenses.slice(0, 3).map((expense) => (
              <Row
                icon="arrow-down-outline"
                key={expense.id}
                subtitle={expense.categoria || expense.date || 'Despesa'}
                title={expense.label}
                value={money(expense.value)}
              />
            )) : <EmptyState description="Seus lançamentos recentes aparecerão aqui." icon="receipt-outline" title="Nenhuma movimentação" />}
          </Section>
        </>
      )}
    </NativeScreen>
  );
}

const styles = StyleSheet.create({
  balanceHero: {
    backgroundColor: levelTheme.colors.surface,
    borderColor: levelTheme.colors.border,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 10,
    overflow: 'hidden',
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  balanceLabel: {
    color: levelTheme.colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  balanceMeta: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  balanceMetaDot: { color: levelTheme.colors.border, fontSize: 12 },
  balanceMetaText: {
    color: levelTheme.colors.muted,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 18 },
  quickActions: { flexDirection: 'row', gap: 10 },
});
