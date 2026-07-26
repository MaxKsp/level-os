import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  EmptyState,
  NativeButton,
  NativeScreen,
  PageHeader,
  Section,
} from '@/components/native-ui';
import { levelTheme } from '@/constants/level-theme';
import { apiRequest } from '@/lib/api';

type Agent = 'financeiro' | 'agenda' | 'treinos' | 'alimentacao';
type AssistantResponse = {
  ok: boolean;
  status: string;
  message: string;
  actionToken?: string | null;
  confirmationRequired?: boolean;
  undoAvailable?: boolean;
};
type Exchange = {
  requestId: string;
  createdAt: string;
  userText: string;
  response: AssistantResponse;
};

const agents: { id: Agent; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'financeiro', label: 'Fin', icon: 'wallet-outline' },
  { id: 'agenda', label: 'Rotina', icon: 'calendar-outline' },
  { id: 'treinos', label: 'Treino', icon: 'barbell-outline' },
  { id: 'alimentacao', label: 'Cheff', icon: 'restaurant-outline' },
];

export default function AssistantScreen() {
  const params = useLocalSearchParams<{ module?: string }>();
  const requested = agents.some((item) => item.id === params.module)
    ? params.module as Agent
    : 'financeiro';
  const [agent, setAgent] = useState<Agent>(requested);
  const [history, setHistory] = useState<Exchange[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const activeAgent = useMemo(
    () => agents.find((item) => item.id === agent) ?? agents[0],
    [agent],
  );

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const result = await apiRequest<{ items?: Exchange[] }>(
        `/api/assistant-history.php?agent=${encodeURIComponent(agent)}&limit=30`,
      );
      setHistory(Array.isArray(result.items) ? result.items : []);
    } catch (reason) {
      if (reason instanceof Error && reason.message === 'paid_plan_required') {
        Alert.alert('Plano Individual', 'O Agente de IA é uma funcionalidade do plano pago.');
      }
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [agent]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const send = async () => {
    const prompt = text.trim();
    if (!prompt || busy) return;
    setBusy(true);
    setText('');
    try {
      await apiRequest<AssistantResponse>('/api/assistant.php', {
        method: 'POST',
        bodyJson: {
          requestId: `native_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
          text: prompt,
          module: agent,
        },
      });
      await loadHistory();
    } catch (reason) {
      const code = reason instanceof Error ? reason.message : '';
      Alert.alert(
        code === 'paid_plan_required' || code === 'plan_required'
          ? 'Plano Individual'
          : 'Agente indisponível',
        code === 'paid_plan_required' || code === 'plan_required'
          ? 'O Agente de IA é uma funcionalidade do plano pago.'
          : 'Não foi possível executar a solicitação agora. Tente novamente.',
      );
    } finally {
      setBusy(false);
    }
  };

  const decide = async (token: string, decision: 'confirm' | 'cancel') => {
    setBusy(true);
    try {
      await apiRequest('/api/assistant-confirm.php', {
        method: 'POST',
        bodyJson: { actionToken: token, decision },
      });
      await loadHistory();
    } finally {
      setBusy(false);
    }
  };

  return (
    <NativeScreen>
      <PageHeader
        description="Cada agente trabalha somente dentro do próprio módulo."
        eyebrow="AGENTE DE IA"
        title={activeAgent.label === 'Cheff' ? 'Cheff Rita' : `Assessor ${activeAgent.label}`}
      />

      <View style={styles.agentRail}>
        {agents.map((item) => (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: item.id === agent }}
            key={item.id}
            onPress={() => setAgent(item.id)}
            style={[styles.agentChip, item.id === agent && styles.agentChipActive]}>
            <Ionicons
              color={item.id === agent ? levelTheme.colors.background : levelTheme.colors.muted}
              name={item.icon}
              size={16}
            />
            <Text style={[styles.agentLabel, item.id === agent && styles.agentLabelActive]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Section caption="Histórico isolado por agente" title="Conversa">
        {loading ? (
          <ActivityIndicator color={levelTheme.colors.primary} style={styles.loader} />
        ) : history.length ? history.map((exchange) => (
          <View key={exchange.requestId} style={styles.exchange}>
            <View style={styles.userBubble}>
              <Text style={styles.userText}>{exchange.userText}</Text>
            </View>
            <View style={styles.agentBubble}>
              <Text style={styles.agentText}>{exchange.response.message}</Text>
              {exchange.response.confirmationRequired && exchange.response.actionToken ? (
                <View style={styles.actions}>
                  <NativeButton
                    disabled={busy}
                    label="Cancelar"
                    onPress={() => void decide(exchange.response.actionToken!, 'cancel')}
                    variant="secondary"
                  />
                  <NativeButton
                    disabled={busy}
                    label="Confirmar"
                    onPress={() => void decide(exchange.response.actionToken!, 'confirm')}
                  />
                </View>
              ) : null}
            </View>
          </View>
        )) : (
          <EmptyState
            description="Faça uma solicitação relacionada a este módulo."
            icon={activeAgent.icon}
            title="Comece uma conversa"
          />
        )}
      </Section>

      <View style={styles.composer}>
        <TextInput
          editable={!busy}
          multiline
          onChangeText={setText}
          placeholder={`Fale com ${activeAgent.label}…`}
          placeholderTextColor={levelTheme.colors.muted}
          style={styles.input}
          value={text}
        />
        <NativeButton
          disabled={busy || !text.trim()}
          icon="send-outline"
          label={busy ? 'Enviando' : 'Enviar'}
          onPress={() => void send()}
        />
      </View>
    </NativeScreen>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  agentBubble: {
    alignSelf: 'flex-start',
    backgroundColor: levelTheme.colors.surfaceRaised,
    borderColor: levelTheme.colors.border,
    borderRadius: 16,
    borderTopLeftRadius: 5,
    borderWidth: 1,
    maxWidth: '92%',
    padding: 14,
  },
  agentChip: {
    alignItems: 'center',
    borderColor: levelTheme.colors.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 42,
    paddingHorizontal: 13,
  },
  agentChipActive: {
    backgroundColor: levelTheme.colors.primary,
    borderColor: levelTheme.colors.primary,
  },
  agentLabel: {
    color: levelTheme.colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  agentLabelActive: {
    color: levelTheme.colors.background,
  },
  agentRail: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  agentText: {
    color: levelTheme.colors.text,
    fontSize: 14,
    lineHeight: 21,
  },
  composer: {
    gap: 12,
  },
  exchange: {
    gap: 10,
    marginBottom: 18,
  },
  input: {
    backgroundColor: levelTheme.colors.surface,
    borderColor: levelTheme.colors.border,
    borderRadius: 16,
    borderWidth: 1,
    color: levelTheme.colors.text,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 96,
    padding: 15,
    textAlignVertical: 'top',
  },
  loader: {
    paddingVertical: 32,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: levelTheme.colors.primary,
    borderRadius: 16,
    borderTopRightRadius: 5,
    maxWidth: '88%',
    padding: 13,
  },
  userText: {
    color: levelTheme.colors.background,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
});
