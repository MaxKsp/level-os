import * as LocalAuthentication from 'expo-local-authentication';
import { router } from 'expo-router';
import { Alert } from 'react-native';

import {
  ErrorState,
  NativeButton,
  NativeScreen,
  PageHeader,
  Row,
  Section,
} from '@/components/native-ui';
import { useProfile, useSubscription } from '@/hooks/use-native-data';
import { secureStorage } from '@/lib/secure-storage';
import { registerNativePush } from '@/lib/native-push';
import { useAuth } from '@/providers/auth-provider';

const BIOMETRIC_KEY = 'level-os:biometric-unlock';

export default function ProfileScreen() {
  const { signOut } = useAuth();
  const profile = useProfile();
  const subscription = useSubscription();

  const enableBiometrics = async () => {
    const supported = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!supported || !enrolled) {
      Alert.alert('Biometria indisponível', 'Cadastre uma biometria ou Face ID nas configurações do aparelho.');
      return;
    }
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Ativar acesso biométrico ao Level OS',
      cancelLabel: 'Cancelar',
    });
    if (result.success) {
      await secureStorage.setItem(BIOMETRIC_KEY, 'enabled');
      Alert.alert('Biometria ativada', 'O app poderá proteger seus próximos acessos neste aparelho.');
    }
  };

  const enableNotifications = async () => {
    try {
      const result = await registerNativePush();
      if (result === 'registered') {
        Alert.alert('Notificações ativadas', 'Este aparelho receberá os lembretes do Level OS.');
      } else if (result === 'denied') {
        Alert.alert('Permissão necessária', 'Autorize as notificações nas configurações do aparelho.');
      } else {
        Alert.alert('Use um aparelho real', 'Push nativo não funciona no navegador ou em alguns simuladores.');
      }
    } catch {
      Alert.alert('Não foi possível ativar', 'Confira a configuração do Firebase e tente novamente.');
    }
  };

  return (
    <NativeScreen
      onRefresh={async () => {
        await Promise.all([profile.refresh(), subscription.refresh()]);
      }}
      refreshing={profile.loading || subscription.loading}>
      <PageHeader
        description={profile.data?.email ?? 'Sua conta Level OS'}
        eyebrow="PERFIL"
        title={profile.data?.username ?? 'Sua conta'}
      />
      {profile.error ? <ErrorState retry={() => void profile.refresh()} /> : (
        <>
          <Section title="Plano">
            <Row
              icon="trophy-outline"
              subtitle={
                subscription.data?.paid_access
                  ? 'Todos os recursos estão disponíveis.'
                  : subscription.data?.in_trial
                    ? `${subscription.data.trial_days_left} dias restantes no teste`
                    : 'Recursos essenciais'
              }
              title={subscription.data?.plan === 'individual' ? 'Individual' : 'Gratuito'}
            />
          </Section>
          <Section title="Segurança">
            <Row
              icon="finger-print-outline"
              onPress={() => void enableBiometrics()}
              subtitle="Protege o acesso neste dispositivo"
              title="Ativar biometria"
            />
            <Row
              icon="shield-checkmark-outline"
              subtitle="Sessão criptografada no armazenamento seguro"
              title="Proteção da conta"
            />
          </Section>
          <Section title="Aplicativo">
            <Row
              icon="restaurant-outline"
              onPress={() => router.push('/(app)/nutrition')}
              subtitle="Cardápio, refeições e lista de compras"
              title="Alimentação"
            />
            <Row
              icon="sparkles-outline"
              onPress={() => router.push('/(app)/assistant')}
              subtitle="Agentes especializados por módulo"
              title="Agente de IA"
            />
            <Row
              icon="notifications-outline"
              onPress={() => void enableNotifications()}
              subtitle="Faturas, tarefas e lembretes com o app fechado"
              title="Ativar notificações nativas"
            />
            <Row icon="phone-portrait-outline" subtitle="Aplicativo nativo Android/iOS" title="Level OS 1.0.0" />
          </Section>
          <NativeButton
            icon="log-out-outline"
            label="Sair da conta"
            onPress={() => void signOut()}
            variant="danger"
          />
        </>
      )}
    </NativeScreen>
  );
}
