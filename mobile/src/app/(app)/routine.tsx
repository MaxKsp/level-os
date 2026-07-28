import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  ChoiceChips,
  EmptyState,
  ErrorState,
  NativeButton,
  NativeField,
  NativeModal,
  NativeScreen,
  PageHeader,
  Row,
  Section,
  SegmentedTabs,
  ToggleRow,
} from '@/components/native-ui';
import { levelTheme } from '@/constants/level-theme';
import { useCalendarConnection, useDashboard } from '@/hooks/use-native-data';
import { appConfig } from '@/lib/config';
import { saveDataKey, type RoutineTask } from '@/lib/api';
import { shortDate } from '@/lib/format';

type Period = 'day' | 'week' | 'month' | 'year';
const uid = () => `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const today = () => new Date().toISOString().slice(0, 10);

export default function RoutineScreen() {
  const params = useLocalSearchParams<{ action?: string; nonce?: string }>();
  const state = useDashboard();
  const calendar = useCalendarConnection();
  const [period, setPeriod] = useState<Period>('day');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<RoutineTask | null>(null);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(today());
  const [time, setTime] = useState('08:00');
  const [subtitle, setSubtitle] = useState('');
  const [priority, setPriority] = useState<'alta' | 'media' | 'baixa'>('media');
  const [repeat, setRepeat] = useState<'none' | 'daily' | 'weekdays' | 'weekly'>('none');
  const [reminder, setReminder] = useState(true);
  const handledAction = useRef('');

  const tasks = useMemo(() => (state.data?.tasks_v6 ?? []) as RoutineTask[], [state.data]);
  const visible = useMemo(() => {
    const now = new Date();
    const end = new Date(now);
    if (period === 'day') end.setDate(now.getDate() + 1);
    if (period === 'week') end.setDate(now.getDate() + 7);
    if (period === 'month') end.setMonth(now.getMonth() + 1);
    if (period === 'year') end.setFullYear(now.getFullYear() + 1);
    return tasks
      .filter((task) => {
        if (!task.date || task.repeat !== 'none') return true;
        const taskDate = new Date(`${task.date}T12:00:00`);
        return taskDate >= new Date(now.toDateString()) && taskDate < end;
      })
      .sort((a, b) => `${a.date || ''}${a.time || ''}`.localeCompare(`${b.date || ''}${b.time || ''}`));
  }, [period, tasks]);
  const pending = visible.filter((task) => !task.completed);
  const completed = visible.filter((task) => task.completed);

  const persist = async (next: RoutineTask[], message?: string) => {
    try {
      await saveDataKey('tasks_v6', next);
      await state.refresh();
      if (message) Alert.alert('Tudo certo', message);
    } catch (reason) {
      Alert.alert(
        'Não foi possível atualizar',
        reason instanceof Error && reason.message === 'plan_required'
          ? 'Esta ação faz parte do plano Individual.'
          : 'Tente novamente.',
      );
    }
  };

  const toggle = async (id: string) => {
    setSavingId(id);
    await persist(tasks.map((task) => task.id === id ? { ...task, completed: !task.completed } : task));
    setSavingId(null);
  };

  const openNew = () => {
    setEditing(null);
    setTitle('');
    setSubtitle('');
    setDate(today());
    setTime('08:00');
    setPriority('media');
    setRepeat('none');
    setReminder(true);
    setModal(true);
  };

  useEffect(() => {
    if (params.action !== 'new') return;
    const requestKey = `${params.action}:${params.nonce || ''}`;
    if (handledAction.current === requestKey) return;
    handledAction.current = requestKey;
    setEditing(null);
    setTitle('');
    setSubtitle('');
    setDate(today());
    setTime('08:00');
    setPriority('media');
    setRepeat('none');
    setReminder(true);
    setModal(true);
  }, [params.action, params.nonce]);

  const openEdit = (task: RoutineTask) => {
    setEditing(task);
    setTitle(task.title || '');
    setSubtitle(task.subtitle || '');
    setDate(task.date || today());
    setTime(task.time || '08:00');
    setPriority(task.priority || 'media');
    setRepeat(task.repeat === 'custom' ? 'none' : task.repeat || 'none');
    setReminder(Boolean(task.reminderMinutes?.length));
    setModal(true);
  };

  const submit = async () => {
    if (!title.trim()) return Alert.alert('Dê um nome para a tarefa.');
    const task: RoutineTask = {
      id: editing?.id || uid(),
      title: title.trim(),
      subtitle: subtitle.trim(),
      date,
      time,
      priority,
      repeat,
      completed: editing?.completed ?? false,
      reminderMinutes: reminder ? [10] : [],
      completedDates: editing?.completedDates ?? [],
      excludedDates: editing?.excludedDates ?? [],
    };
    const next = editing
      ? tasks.map((item) => item.id === editing.id ? task : item)
      : [...tasks, task];
    setModal(false);
    await persist(next, editing ? 'Tarefa atualizada.' : 'Tarefa criada.');
  };

  const remove = (task: RoutineTask) => {
    Alert.alert('Excluir tarefa?', task.title, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          setModal(false);
          void persist(tasks.filter((item) => item.id !== task.id), 'Tarefa excluída.');
        },
      },
    ]);
  };

  const connectCalendar = async () => {
    await WebBrowser.openBrowserAsync(`${appConfig.apiUrl}/api/calendar-connect.php`);
    await calendar.refresh();
  };

  return (
    <NativeScreen
      onRefresh={async () => Promise.all([state.refresh(), calendar.refresh()]).then(() => undefined)}
      refreshing={state.loading || calendar.loading}>
      <PageHeader
        action={<AddButton onPress={openNew} />}
        description="Tarefas, recorrências, lembretes e agenda em um só fluxo."
        eyebrow="ROTINA"
        title="Seu tempo"
      />
      <SegmentedTabs
        items={[
          { id: 'day', label: 'Dia' },
          { id: 'week', label: 'Semana' },
          { id: 'month', label: 'Mês' },
          { id: 'year', label: 'Ano' },
        ]}
        onChange={setPeriod}
        value={period}
      />
      {state.error ? <ErrorState retry={() => void state.refresh()} /> : (
        <>
          <Section title="A fazer" caption={`${pending.length} pendentes`}>
            {pending.length ? pending.map((task) => (
              <Row
                icon={task.priority === 'alta' ? 'alert-circle-outline' : 'ellipse-outline'}
                key={task.id}
                onPress={() => openEdit(task)}
                subtitle={`${task.date ? shortDate(task.date) : 'Recorrente'} · ${task.time || 'Sem horário'}${task.repeat !== 'none' ? ' · repete' : ''}`}
                title={task.title || 'Tarefa'}
                value={savingId === task.id ? '...' : undefined}
              />
            )) : (
              <EmptyState
                description="Você concluiu as tarefas deste período."
                icon="checkmark-done-outline"
                title="Tudo concluído"
              />
            )}
          </Section>
          {pending.length ? (
            <NativeButton
              icon="checkmark-done"
              label="Concluir primeira tarefa"
              onPress={() => void toggle(pending[0].id)}
              variant="secondary"
            />
          ) : null}
          {completed.length ? (
            <Section title="Concluídas" caption={`${completed.length} itens`}>
              {completed.slice(0, 8).map((task) => (
                <Row
                  icon="checkmark-circle"
                  key={task.id}
                  onPress={() => void toggle(task.id)}
                  subtitle={`${task.date ? shortDate(task.date) : 'Recorrente'} · toque para reabrir`}
                  title={task.title}
                />
              ))}
            </Section>
          ) : null}

          <Section
            title="Google Calendar"
            caption={calendar.data?.connection.status === 'connected'
              ? calendar.data.connection.accountEmail || 'Conectado'
              : 'Integração opcional'}>
            {calendar.data?.connection.status === 'connected' ? (
              calendar.data.events.slice(0, 6).map((event) => (
                <Row
                  icon="logo-google"
                  key={event.id}
                  subtitle={`${shortDate(event.start)}${event.location ? ` · ${event.location}` : ''}`}
                  title={event.title}
                />
              ))
            ) : (
              <NativeButton
                icon="logo-google"
                label="Conectar Google Calendar"
                onPress={() => void connectCalendar()}
                variant="secondary"
              />
            )}
          </Section>
        </>
      )}

      <NativeModal
        description="Configure como um despertador: horário, repetição e lembrete em uma única tela."
        onClose={() => setModal(false)}
        title={editing ? 'Editar tarefa' : 'Nova tarefa'}
        visible={modal}>
        <NativeField label="Tarefa" onChangeText={setTitle} placeholder="O que precisa ser feito?" value={title} />
        <View style={styles.clock}>
          <Ionicons color={levelTheme.colors.primary} name="alarm-outline" size={36} />
          <NativeField keyboardType="numbers-and-punctuation" label="Horário" onChangeText={setTime} placeholder="08:00" style={styles.clockInput} value={time} />
        </View>
        <View style={styles.quickTimes}>
          {['06:00', '08:00', '12:00', '18:00', '21:00'].map((item) => (
            <Pressable key={item} onPress={() => setTime(item)} style={[styles.timeChip, time === item && styles.timeChipActive]}>
              <Text style={[styles.timeText, time === item && styles.timeTextActive]}>{item}</Text>
            </Pressable>
          ))}
        </View>
        <NativeField label="Data" onChangeText={setDate} placeholder="AAAA-MM-DD" value={date} />
        <NativeField label="Detalhes" multiline onChangeText={setSubtitle} placeholder="Observação opcional" value={subtitle} />
        <Text style={styles.label}>Prioridade</Text>
        <ChoiceChips
          items={[
            { value: 'baixa', label: 'Baixa' },
            { value: 'media', label: 'Média' },
            { value: 'alta', label: 'Alta' },
          ]}
          onChange={setPriority}
          value={priority}
        />
        <Text style={styles.label}>Repetição</Text>
        <ChoiceChips
          items={[
            { value: 'none', label: 'Não repetir' },
            { value: 'daily', label: 'Diariamente' },
            { value: 'weekdays', label: 'Dias úteis' },
            { value: 'weekly', label: 'Semanalmente' },
          ]}
          onChange={setRepeat}
          value={repeat}
        />
        <ToggleRow description="Avisar 10 minutos antes" onChange={setReminder} title="Lembrete" value={reminder} />
        <NativeButton icon="checkmark" label={editing ? 'Salvar alterações' : 'Criar tarefa'} onPress={() => void submit()} />
        {editing ? <NativeButton icon="trash-outline" label="Excluir tarefa" onPress={() => remove(editing)} variant="danger" /> : null}
      </NativeModal>
    </NativeScreen>
  );
}

function AddButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable accessibilityLabel="Nova tarefa" accessibilityRole="button" onPress={onPress} style={styles.add}>
      <Ionicons color={levelTheme.colors.background} name="add" size={24} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  add: {
    alignItems: 'center',
    backgroundColor: levelTheme.colors.primary,
    borderRadius: 16,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  clock: { alignItems: 'center', flexDirection: 'row', gap: 16 },
  clockInput: { fontSize: 24, fontVariant: ['tabular-nums'], textAlign: 'center' },
  quickTimes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timeChip: { borderColor: levelTheme.colors.border, borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9 },
  timeChipActive: { backgroundColor: levelTheme.colors.primaryMuted, borderColor: levelTheme.colors.primary },
  timeText: { color: levelTheme.colors.muted, fontSize: 13 },
  timeTextActive: { color: levelTheme.colors.primary, fontWeight: '700' },
  label: { color: levelTheme.colors.text, fontSize: 13, fontWeight: '600' },
});
