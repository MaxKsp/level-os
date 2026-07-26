import { useMemo, useState } from 'react';
import { Alert } from 'react-native';

import {
  EmptyState,
  ErrorState,
  NativeScreen,
  PageHeader,
  Row,
  Section,
} from '@/components/native-ui';
import { useDashboard } from '@/hooks/use-native-data';
import { apiRequest } from '@/lib/api';

export default function RoutineScreen() {
  const state = useDashboard();
  const [savingId, setSavingId] = useState<string | null>(null);
  const tasks = useMemo(() => state.data?.tasks_v6 ?? [], [state.data]);
  const pending = tasks.filter((task) => !task.completed);
  const completed = tasks.filter((task) => task.completed);

  const toggle = async (id: string) => {
    setSavingId(id);
    try {
      await apiRequest('/api/data.php', {
        method: 'POST',
        bodyJson: {
          key: 'tasks_v6',
          value: tasks.map((task) => task.id === id ? { ...task, completed: !task.completed } : task),
        },
      });
      await state.refresh();
    } catch (reason) {
      Alert.alert(
        'Não foi possível atualizar',
        reason instanceof Error && reason.message === 'plan_required'
          ? 'Esta ação faz parte do plano Individual.'
          : 'Tente novamente.',
      );
    } finally {
      setSavingId(null);
    }
  };

  return (
    <NativeScreen onRefresh={state.refresh} refreshing={state.loading}>
      <PageHeader
        description="O que merece sua atenção agora."
        eyebrow="ROTINA"
        title="Seu dia"
      />
      {state.error ? <ErrorState retry={() => void state.refresh()} /> : (
        <>
          <Section title="A fazer" caption={`${pending.length} pendentes`}>
            {pending.length ? pending.map((task) => (
              <Row
                icon="ellipse-outline"
                key={task.id}
                onPress={savingId ? undefined : () => void toggle(task.id)}
                subtitle={task.subtitle || task.time || 'Sem horário'}
                title={task.title || task.label || 'Tarefa'}
              />
            )) : (
              <EmptyState
                description="Você concluiu todas as tarefas visíveis."
                icon="checkmark-done-outline"
                title="Tudo concluído"
              />
            )}
          </Section>
          {completed.length ? (
            <Section title="Concluídas" caption={`${completed.length} itens`}>
              {completed.slice(0, 8).map((task) => (
                <Row
                  icon="checkmark-circle"
                  key={task.id}
                  onPress={savingId ? undefined : () => void toggle(task.id)}
                  subtitle={task.subtitle || task.time || 'Concluída'}
                  title={task.title || task.label || 'Tarefa'}
                />
              ))}
            </Section>
          ) : null}
        </>
      )}
    </NativeScreen>
  );
}
