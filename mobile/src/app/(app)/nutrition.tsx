import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import {
  EmptyState,
  ErrorState,
  Metric,
  NativeButton,
  NativeScreen,
  PageHeader,
  Row,
  Section,
} from '@/components/native-ui';
import { useNutrition } from '@/hooks/use-native-data';
import { money } from '@/lib/format';

const goalLabel: Record<string, string> = {
  emagrecimento: 'Emagrecimento',
  hipertrofia: 'Hipertrofia',
  manutencao: 'Manutenção',
};

export default function NutritionScreen() {
  const state = useNutrition();
  const plan = state.data?.plan ?? null;
  const shopping = plan?.shoppingList ?? [];

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
        description="Plano alimentar e compras no mesmo fluxo."
        eyebrow="ALIMENTAÇÃO"
        title="Seu cardápio"
      />

      {state.error ? <ErrorState retry={() => void state.refresh()} /> : plan ? (
        <>
          <View style={styles.metrics}>
            <Metric label="Período" value={`${plan.periodDays} dias`} />
            <Metric label="Custo estimado" value={money(plan.estimatedCostBRL)} />
          </View>

          <Section
            caption={`${plan.days.length} dias planejados`}
            title={goalLabel[plan.goal] ?? plan.goal}>
            {plan.days.slice(0, 7).map((day) => (
              <Row
                icon="restaurant-outline"
                key={day.day}
                subtitle={day.meals.map((meal) => meal.name).join(' · ')}
                title={`Dia ${day.day}`}
                value={money(day.meals.reduce(
                  (sum, meal) => sum + Number(meal.estimatedCostBRL || 0),
                  0,
                ))}
              />
            ))}
          </Section>

          <Section
            caption={`${shopping.length} itens consolidados`}
            title="Lista de compras">
            {shopping.length ? shopping.map((item, index) => (
              <Row
                icon="basket-outline"
                key={`${item.item}-${index}`}
                subtitle={item.category}
                title={item.item}
                value={item.quantity}
              />
            )) : (
              <EmptyState
                description="Peça à Cheff Rita para gerar uma lista consolidada."
                icon="basket-outline"
                title="Lista ainda vazia"
              />
            )}
          </Section>
        </>
      ) : (
        <EmptyState
          description="A Cheff Rita cria um plano dentro do seu objetivo e orçamento."
          icon="restaurant-outline"
          title="Nenhum cardápio ativo"
        />
      )}
    </NativeScreen>
  );
}

const styles = StyleSheet.create({
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 22,
  },
});
