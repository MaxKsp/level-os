import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import {
  EmptyState,
  ErrorState,
  Metric,
  NativeButton,
  NativeScreen,
  PageHeader,
  Row,
  Section,
  SegmentedTabs,
} from '@/components/native-ui';
import { useNutrition } from '@/hooks/use-native-data';
import { nutritionMutation } from '@/lib/api';
import { money, shortDate } from '@/lib/format';

type Tab = 'plan' | 'shopping' | 'history';
const goalLabel: Record<string, string> = {
  emagrecimento: 'Emagrecimento',
  hipertrofia: 'Hipertrofia',
  manutencao: 'Manutenção',
};

export default function NutritionScreen() {
  const state = useNutrition();
  const [tab, setTab] = useState<Tab>('plan');
  const [checked, setChecked] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const plan = state.data?.plan ?? null;
  const history = state.data?.history ?? [];
  const shopping = plan?.shoppingList ?? [];

  const mutate = async (operation: 'archive_active' | 'restore_plan', id?: string) => {
    setSaving(true);
    try {
      await nutritionMutation(operation, id);
      await state.refresh();
      Alert.alert('Tudo certo', operation === 'archive_active' ? 'Cardápio arquivado.' : 'Cardápio restaurado.');
    } catch {
      Alert.alert('Não foi possível atualizar', 'Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <NativeScreen onRefresh={state.refresh} refreshing={state.loading}>
      <PageHeader
        action={(
          <NativeButton
            icon="sparkles-outline"
            label="Cheff Rita"
            onPress={() => router.push({
              pathname: '/(app)/assistant',
              params: { module: 'alimentacao' },
            })}
            variant="secondary"
          />
        )}
        description="Cardápio, receitas, custos e compras no mesmo fluxo."
        eyebrow="ALIMENTAÇÃO"
        title="Sua nutrição"
      />
      <SegmentedTabs
        items={[
          { id: 'plan', label: 'Cardápio', icon: 'restaurant-outline' },
          { id: 'shopping', label: 'Compras', icon: 'basket-outline' },
          { id: 'history', label: 'Histórico', icon: 'time-outline' },
        ]}
        onChange={setTab}
        value={tab}
      />

      {state.error ? <ErrorState retry={() => void state.refresh()} /> : (
        <>
          {tab === 'plan' ? plan ? (
            <>
              <View style={styles.metrics}>
                <Metric label="Período" value={`${plan.periodDays} dias`} />
                <Metric label="Custo estimado" value={money(plan.estimatedCostBRL)} />
              </View>
              <Section caption={`${plan.days.length} dias planejados`} title={goalLabel[plan.goal] ?? plan.goal}>
                {plan.days.map((day) => (
                  <Row
                    icon="restaurant-outline"
                    key={day.day}
                    subtitle={day.meals.map((meal) => meal.name).join(' · ')}
                    title={`Dia ${day.day}`}
                    value={money(day.meals.reduce((sum, meal) => sum + Number(meal.estimatedCostBRL || 0), 0))}
                  />
                ))}
              </Section>
              <NativeButton disabled={saving} icon="archive-outline" label="Arquivar cardápio" onPress={() => void mutate('archive_active')} variant="secondary" />
            </>
          ) : (
            <EmptyState description="A Cheff Rita monta um cardápio dentro do seu objetivo e orçamento." icon="restaurant-outline" title="Nenhum cardápio ativo" />
          ) : null}

          {tab === 'shopping' ? (
            <Section caption={`${checked.length}/${shopping.length} itens separados`} title="Lista de compras">
              {shopping.length ? shopping.map((item, index) => {
                const key = `${item.item}-${index}`;
                const done = checked.includes(key);
                return (
                  <Row
                    icon={done ? 'checkmark-circle' : 'ellipse-outline'}
                    key={key}
                    onPress={() => setChecked((current) =>
                      done ? current.filter((id) => id !== key) : [...current, key])}
                    subtitle={item.category}
                    title={item.item}
                    value={item.quantity}
                  />
                );
              }) : <EmptyState description="Gere um cardápio para consolidar os ingredientes." icon="basket-outline" title="Lista vazia" />}
            </Section>
          ) : null}

          {tab === 'history' ? (
            <Section caption={`${history.length} versões`} title="Cardápios anteriores">
              {history.length ? history.map((item, index) => (
                <Row
                  icon="time-outline"
                  key={item.id || `${item.createdAt}-${index}`}
                  onPress={() => item.id ? void mutate('restore_plan', item.id) : undefined}
                  subtitle={`${item.periodDays} dias · ${shortDate(item.createdAt)} · toque para restaurar`}
                  title={goalLabel[item.goal] ?? item.goal}
                  value={money(item.estimatedCostBRL)}
                />
              )) : <EmptyState description="Cardápios substituídos e arquivados aparecerão aqui." icon="time-outline" title="Sem histórico" />}
            </Section>
          ) : null}
        </>
      )}
    </NativeScreen>
  );
}

const styles = StyleSheet.create({
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 22 },
});
