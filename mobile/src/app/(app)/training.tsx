import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Sparkline } from '@/components/native-charts';
import {
  ChoiceChips,
  EmptyState,
  ErrorState,
  Metric,
  NativeButton,
  NativeField,
  NativeModal,
  NativeScreen,
  PageHeader,
  Row,
  Section,
  SegmentedTabs,
} from '@/components/native-ui';
import { levelTheme } from '@/constants/level-theme';
import { useTraining } from '@/hooks/use-native-data';
import { trainingMutation } from '@/lib/api';
import { shortDate } from '@/lib/format';

type Tab = 'workouts' | 'sessions' | 'measurements' | 'programs';
type Form = 'session' | 'measurement' | 'workout';
const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const today = () => new Date().toISOString().slice(0, 10);

const measureMeta = {
  peso: { label: 'Peso', unit: 'kg' },
  gordura: { label: 'Gordura corporal', unit: '%' },
  altura: { label: 'Altura', unit: 'cm' },
  cintura: { label: 'Cintura', unit: 'cm' },
  quadril: { label: 'Quadril', unit: 'cm' },
  braco: { label: 'Braço', unit: 'cm' },
  coxa: { label: 'Coxa', unit: 'cm' },
  peito: { label: 'Peito', unit: 'cm' },
} as const;

export default function TrainingScreen() {
  const state = useTraining();
  const [tab, setTab] = useState<Tab>('workouts');
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [focus, setFocus] = useState('');
  const [exercises, setExercises] = useState('');
  const [date, setDate] = useState(today());
  const [modality, setModality] = useState<'forca' | 'cardio' | 'calistenia' | 'mobilidade'>('forca');
  const [duration, setDuration] = useState('45');
  const [sets, setSets] = useState('3');
  const [reps, setReps] = useState('10');
  const [load, setLoad] = useState('');
  const [distance, setDistance] = useState('');
  const [measureType, setMeasureType] = useState<keyof typeof measureMeta>('peso');
  const [measureValue, setMeasureValue] = useState('');

  const workouts = state.data?.workouts ?? [];
  const sessions = state.data?.sessions ?? [];
  const measurements = useMemo(
    () => state.data?.measurements ?? [],
    [state.data?.measurements],
  );
  const programs = state.data?.programs ?? [];
  const history = state.data?.programHistory ?? [];
  const latestWeight = measurements.find((item) => item.type === 'peso');
  const weightSeries = useMemo(
    () => measurements
      .filter((item) => item.type === 'peso')
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((item) => Number(item.value)),
    [measurements],
  );

  const open = (next: Form) => {
    setForm(next);
    setName('');
    setFocus('');
    setExercises('');
    setDate(today());
    setDuration('45');
    setSets('3');
    setReps('10');
    setLoad('');
    setDistance('');
    setMeasureValue('');
  };

  const mutate = async (operation: string, payload: Record<string, unknown>, success: string) => {
    setSaving(true);
    try {
      await trainingMutation(operation, payload);
      setForm(null);
      await state.refresh();
      Alert.alert('Tudo certo', success);
    } catch {
      Alert.alert('Não foi possível salvar', 'Revise os dados e tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const saveWorkout = () => {
    if (!name.trim()) return Alert.alert('Informe o nome do treino.');
    const rows = exercises.split('\n').map((line) => line.trim()).filter(Boolean);
    void mutate('save_workout', {
      workout: {
        id: uid('workout'),
        name: name.trim(),
        focus: focus.trim() || 'Treino geral',
        exercises: rows.map((item, index) => ({
          id: uid(`exercise-${index}`),
          name: item,
          sets: '3',
          reps: '10',
          completed: false,
        })),
      },
    }, 'Ficha de treino criada.');
  };

  const saveSession = () => {
    const durationSec = Math.round(Number(duration) * 60);
    const sessionName = name.trim() || {
      forca: 'Sessão de força',
      cardio: 'Cardio',
      calistenia: 'Calistenia',
      mobilidade: 'Mobilidade',
    }[modality];
    if (modality === 'cardio' && (!Number(distance) || !durationSec)) {
      return Alert.alert('Informe distância e duração.');
    }
    if (['forca', 'calistenia'].includes(modality) && (!Number(sets) || !Number(reps))) {
      return Alert.alert('Informe séries e repetições.');
    }
    void mutate('log_session', {
      session: {
        name: sessionName,
        modality,
        date,
        durationSec: durationSec || null,
        source: 'manual',
        exercises: [{
          name: sessionName,
          modality,
          sets: ['forca', 'calistenia'].includes(modality) ? Number(sets) : null,
          reps: ['forca', 'calistenia'].includes(modality) ? Number(reps) : null,
          loadKg: modality === 'forca' ? Number(load.replace(',', '.')) || null : null,
          distanceKm: modality === 'cardio' ? Number(distance.replace(',', '.')) : null,
          durationSec: ['cardio', 'mobilidade'].includes(modality) ? durationSec : null,
        }],
      },
    }, 'Sessão registrada e XP atualizado.');
  };

  const saveMeasurement = () => {
    const value = Number(measureValue.replace(',', '.'));
    if (!value || value <= 0) return Alert.alert('Informe um valor válido.');
    void mutate('log_measurement', {
      measurement: {
        type: measureType,
        value,
        unit: measureMeta[measureType].unit,
        date,
        source: 'manual',
      },
    }, 'Medida registrada.');
  };

  const remove = (operation: string, id: string, label: string) => {
    Alert.alert(`Excluir ${label}?`, 'Essa ação será refletida em todos os dispositivos.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => void mutate(operation, { id }, 'Registro excluído.') },
    ]);
  };

  return (
    <NativeScreen onRefresh={state.refresh} refreshing={state.loading}>
      <PageHeader
        action={<AddButton onPress={() => open(tab === 'measurements' ? 'measurement' : tab === 'workouts' ? 'workout' : 'session')} />}
        description="Fichas, sessões, medidas e evolução corporal."
        eyebrow="TREINOS"
        title="Seu desempenho"
      />
      <View style={styles.metrics}>
        <Metric label="Treinos" value={String(workouts.length)} />
        <Metric label="Sessões" value={String(sessions.length)} />
        <Metric label="Peso" value={latestWeight ? `${Number(latestWeight.value).toFixed(1)} kg` : '—'} />
      </View>
      <SegmentedTabs
        items={[
          { id: 'workouts', label: 'Fichas', icon: 'barbell-outline' },
          { id: 'sessions', label: 'Sessões', icon: 'pulse-outline' },
          { id: 'measurements', label: 'Medidas', icon: 'body-outline' },
          { id: 'programs', label: 'Programas', icon: 'layers-outline' },
        ]}
        onChange={setTab}
        value={tab}
      />
      {state.error ? <ErrorState retry={() => void state.refresh()} /> : (
        <>
          {tab === 'workouts' ? (
            <Section title="Fichas de treino" caption={`${workouts.length} disponíveis`}>
              {workouts.length ? workouts.map((workout) => (
                <Row
                  icon="barbell-outline"
                  key={workout.id}
                  onPress={() => remove('delete_workout', workout.id, 'ficha')}
                  subtitle={`${workout.exercises?.length ?? 0} exercícios · ${workout.focus || 'Treino geral'}`}
                  title={workout.name}
                />
              )) : <EmptyState description="Crie uma ficha ou peça ao Coach Atlas." icon="fitness-outline" title="Nenhuma ficha" />}
            </Section>
          ) : null}

          {tab === 'sessions' ? (
            <>
              <NativeButton icon="add" label="Registrar sessão" onPress={() => open('session')} />
              <Section title="Histórico de sessões" caption={`${sessions.length} registros`}>
                {sessions.length ? sessions.map((session) => {
                  const exercise = session.exercises?.[0];
                  const value = exercise?.distanceKm
                    ? `${exercise.distanceKm} km`
                    : exercise?.loadKg
                      ? `${exercise.loadKg} kg`
                      : session.durationSec
                        ? `${Math.round(session.durationSec / 60)} min`
                        : undefined;
                  return (
                    <Row
                      icon="pulse-outline"
                      key={session.id}
                      onPress={() => remove('delete_session', session.id, 'sessão')}
                      subtitle={`${session.modality} · ${shortDate(session.date)}`}
                      title={session.name}
                      value={value}
                    />
                  );
                }) : <EmptyState description="Registre força, cardio, calistenia ou mobilidade." icon="stopwatch-outline" title="Sem sessões" />}
              </Section>
            </>
          ) : null}

          {tab === 'measurements' ? (
            <>
              {weightSeries.length ? (
                <Section title="Evolução do peso" caption={`${weightSeries.length} registros`}>
                  <Sparkline height={150} values={weightSeries} />
                </Section>
              ) : null}
              <NativeButton icon="add" label="Registrar medida" onPress={() => open('measurement')} />
              <Section title="Últimas medidas">
                {measurements.length ? measurements.slice(0, 20).map((item) => (
                  <Row
                    icon="body-outline"
                    key={item.id}
                    onPress={() => remove('delete_measurement', item.id, 'medida')}
                    subtitle={shortDate(item.date)}
                    title={measureMeta[item.type as keyof typeof measureMeta]?.label || item.type}
                    value={`${Number(item.value).toLocaleString('pt-BR')} ${item.unit}`}
                  />
                )) : <EmptyState description="Registre peso, gordura ou circunferências." icon="body-outline" title="Sem medidas" />}
              </Section>
            </>
          ) : null}

          {tab === 'programs' ? (
            <>
              <Section title="Programas ativos">
                {programs.length ? programs.map((program) => (
                  <Row
                    icon="layers-outline"
                    key={program.id}
                    subtitle={`${program.daysPerWeek} dias/semana · ${program.focus}`}
                    title={program.name}
                  />
                )) : <EmptyState description="O Coach Atlas pode montar uma periodização completa." icon="layers-outline" title="Nenhum programa ativo" />}
              </Section>
              {history.length ? (
                <Section title="Histórico">
                  {history.map((program) => (
                    <Row
                      icon="time-outline"
                      key={program.id}
                      onPress={() => void mutate('restore_program', { id: program.id }, 'Programa restaurado.')}
                      subtitle="Toque para restaurar"
                      title={program.name}
                    />
                  ))}
                </Section>
              ) : null}
            </>
          ) : null}
        </>
      )}

      <NativeModal
        description="Os dados ficam sincronizados com a versão web."
        onClose={() => setForm(null)}
        title={form === 'workout' ? 'Nova ficha' : form === 'measurement' ? 'Registrar medida' : 'Registrar sessão'}
        visible={form !== null}>
        {form === 'workout' ? (
          <>
            <NativeField label="Nome da ficha" onChangeText={setName} placeholder="Ex.: Treino A" value={name} />
            <NativeField label="Foco" onChangeText={setFocus} placeholder="Ex.: Peito e tríceps" value={focus} />
            <NativeField hint="Um exercício por linha." label="Exercícios" multiline onChangeText={setExercises} placeholder={'Supino reto\nCrucifixo\nTríceps corda'} value={exercises} />
            <NativeButton disabled={saving} icon="checkmark" label="Criar ficha" onPress={saveWorkout} />
          </>
        ) : null}
        {form === 'session' ? (
          <>
            <Text style={styles.label}>Modalidade</Text>
            <ChoiceChips
              items={[
                { value: 'forca', label: 'Força' },
                { value: 'cardio', label: 'Cardio' },
                { value: 'calistenia', label: 'Calistenia' },
                { value: 'mobilidade', label: 'Mobilidade' },
              ]}
              onChange={setModality}
              value={modality}
            />
            <NativeField label="Exercício ou sessão" onChangeText={setName} placeholder="Ex.: Supino reto" value={name} />
            <NativeField label="Data" onChangeText={setDate} value={date} />
            <NativeField keyboardType="number-pad" label="Duração (min)" onChangeText={setDuration} value={duration} />
            {['forca', 'calistenia'].includes(modality) ? (
              <View style={styles.inline}>
                <NativeField keyboardType="number-pad" label="Séries" onChangeText={setSets} style={styles.inlineField} value={sets} />
                <NativeField keyboardType="number-pad" label="Repetições" onChangeText={setReps} style={styles.inlineField} value={reps} />
              </View>
            ) : null}
            {modality === 'forca' ? <NativeField keyboardType="decimal-pad" label="Carga (kg)" onChangeText={setLoad} value={load} /> : null}
            {modality === 'cardio' ? <NativeField keyboardType="decimal-pad" label="Distância (km)" onChangeText={setDistance} value={distance} /> : null}
            <NativeButton disabled={saving} icon="checkmark" label="Salvar sessão" onPress={saveSession} />
          </>
        ) : null}
        {form === 'measurement' ? (
          <>
            <Text style={styles.label}>Medida</Text>
            <ChoiceChips
              items={(Object.keys(measureMeta) as (keyof typeof measureMeta)[])
                .map((value) => ({ value, label: measureMeta[value].label }))}
              onChange={(value) => setMeasureType(value)}
              value={measureType}
            />
            <NativeField keyboardType="decimal-pad" label={`Valor (${measureMeta[measureType].unit})`} onChangeText={setMeasureValue} value={measureValue} />
            <NativeField label="Data" onChangeText={setDate} value={date} />
            <NativeButton disabled={saving} icon="checkmark" label="Registrar medida" onPress={saveMeasurement} />
          </>
        ) : null}
      </NativeModal>
    </NativeScreen>
  );
}

function AddButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable accessibilityLabel="Adicionar" accessibilityRole="button" onPress={onPress} style={styles.add}>
      <Ionicons color={levelTheme.colors.background} name="add" size={24} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  add: { alignItems: 'center', backgroundColor: levelTheme.colors.primary, borderRadius: 16, height: 48, justifyContent: 'center', width: 48 },
  inline: { flexDirection: 'row', gap: 12 },
  inlineField: { minWidth: 120 },
  label: { color: levelTheme.colors.text, fontSize: 13, fontWeight: '600' },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 18 },
});
