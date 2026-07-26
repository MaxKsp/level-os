import {
  EmptyState,
  ErrorState,
  Metric,
  NativeScreen,
  PageHeader,
  Row,
  Section,
} from '@/components/native-ui';
import { useTraining } from '@/hooks/use-native-data';
import { shortDate } from '@/lib/format';

export default function TrainingScreen() {
  const state = useTraining();
  const workouts = state.data?.workouts ?? [];
  const sessions = state.data?.sessions ?? [];
  const measurements = state.data?.measurements ?? [];
  const latest = measurements[0];
  const weight = latest ? Number(latest.weightKg ?? latest.weight ?? 0) : 0;

  return (
    <NativeScreen onRefresh={state.refresh} refreshing={state.loading}>
      <PageHeader
        description="Consistência, carga e evolução sem distrações."
        eyebrow="TREINOS"
        title="Seu desempenho"
      />
      {state.error ? <ErrorState retry={() => void state.refresh()} /> : (
        <>
          <Metric label="Peso registrado" value={weight ? `${weight.toFixed(1)} kg` : '—'} />
          <Section title="Fichas de treino" caption={`${workouts.length} disponíveis`}>
            {workouts.length ? workouts.map((workout) => (
              <Row
                icon="barbell-outline"
                key={workout.id}
                subtitle={`${workout.exercises?.length ?? 0} exercícios · ${workout.modality ?? 'Treino'}`}
                title={workout.name}
              />
            )) : (
              <EmptyState
                description="Crie uma ficha para começar a acompanhar sua evolução."
                icon="fitness-outline"
                title="Nenhuma ficha"
              />
            )}
          </Section>
          <Section title="Atividade recente">
            {sessions.length ? sessions.slice(0, 8).map((session) => (
              <Row
                icon="pulse-outline"
                key={session.id}
                subtitle={shortDate(session.date)}
                title={session.name}
                value={session.durationSec ? `${Math.round(session.durationSec / 60)} min` : undefined}
              />
            )) : (
              <EmptyState
                description="Seus treinos concluídos aparecerão aqui."
                icon="stopwatch-outline"
                title="Sem sessões registradas"
              />
            )}
          </Section>
        </>
      )}
    </NativeScreen>
  );
}
