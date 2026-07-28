import { router } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';

import {
  ActionTile,
  ErrorState,
  Metric,
  NativeScreen,
  PageHeader,
  ProgressBar,
  Row,
  Section,
} from '@/components/native-ui';
import { useProfile, useProgress, useSubscription } from '@/hooks/use-native-data';
import { useAuth } from '@/providers/auth-provider';

export default function MoreScreen() {
  const { signOut } = useAuth();
  const profile = useProfile();
  const progress = useProgress();
  const subscription = useSubscription();

  const refresh = async () => {
    await Promise.all([profile.refresh(), progress.refresh(), subscription.refresh()]);
  };

  const logout = () => {
    Alert.alert('Sair do Level OS?', 'Você precisará entrar novamente neste aparelho.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  return (
    <NativeScreen onRefresh={refresh} refreshing={profile.loading || progress.loading}>
      <PageHeader
        description="Recursos complementares, conta e preferências."
        eyebrow="LEVEL OS"
        title="Mais"
      />

      {profile.error ? <ErrorState retry={() => void refresh()} /> : (
        <>
          <Section title={profile.data?.username || 'Sua conta'} caption={profile.data?.email || 'Perfil Level OS'}>
            <Row
              icon="person-outline"
              onPress={() => router.push('/(app)/profile')}
              subtitle="Dados pessoais, segurança, plano e preferências"
              title="Abrir perfil"
              value={subscription.data?.paid_access ? 'Individual' : 'Free'}
            />
          </Section>

          <View style={styles.level}>
            <View style={styles.levelMetrics}>
              <Metric label={`Nível ${progress.data?.level ?? 1}`} value={`${progress.data?.xp ?? 0} XP`} />
              <Metric label="Sequência" value={`${progress.data?.streak ?? 0} dias`} />
            </View>
            <ProgressBar value={progress.data?.progress_pct ?? 0} />
          </View>

          <Section title="Experiências" caption="Recursos que complementam sua rotina">
            <View style={styles.actions}>
              <ActionTile
                description="Cardápio, compras e histórico alimentar"
                icon="restaurant-outline"
                onPress={() => router.push('/(app)/nutrition')}
                title="Alimentação"
              />
              <ActionTile
                accent
                description="Converse com o especialista de cada módulo"
                icon="sparkles-outline"
                onPress={() => router.push('/(app)/assistant')}
                title="Agente de IA"
              />
            </View>
          </Section>

          <Section title="Conta e dispositivo">
            <Row
              icon="notifications-outline"
              onPress={() => router.push({
                pathname: '/(app)/profile',
                params: { tab: 'preferences' },
              })}
              subtitle="Push, e-mail e lembretes"
              title="Notificações"
            />
            <Row
              icon="shield-checkmark-outline"
              onPress={() => router.push({
                pathname: '/(app)/profile',
                params: { section: 'security', nonce: String(Date.now()) },
              })}
              subtitle="Biometria, senha e autenticação em duas etapas"
              title="Segurança"
            />
            <Row
              icon="cloud-download-outline"
              onPress={() => router.push({
                pathname: '/(app)/profile',
                params: { tab: 'account' },
              })}
              subtitle="Exportar ou restaurar seus dados"
              title="Backup"
            />
            <Row
              icon="card-outline"
              onPress={() => router.push({
                pathname: '/(app)/profile',
                params: { tab: 'plan' },
              })}
              subtitle="Trial, assinatura e pagamentos"
              title="Plano"
              value={subscription.data?.paid_access ? 'Ativo' : 'Conhecer'}
            />
            <Row
              icon="log-out-outline"
              onPress={logout}
              subtitle="Encerrar a sessão neste aparelho"
              title="Sair"
            />
          </Section>
        </>
      )}
    </NativeScreen>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: 10,
  },
  level: {
    gap: 12,
  },
  levelMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
  },
});
