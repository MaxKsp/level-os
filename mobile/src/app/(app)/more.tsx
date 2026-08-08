import { router } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  ActionTile,
  ErrorState,
  LoadingState,
  Metric,
  NativeScreen,
  PageHeader,
  ProgressBar,
  Row,
  Section,
} from '@/components/native-ui';
import { ProfileAvatar } from '@/components/profile-avatar';
import { levelTheme } from '@/constants/level-theme';
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

      {profile.loading && !profile.data ? (
        <LoadingState label="Carregando sua conta…" rows={3} />
      ) : profile.error ? <ErrorState retry={() => void refresh()} /> : (
        <>
          <Pressable
            accessibilityHint="Abre seus dados pessoais e preferências"
            accessibilityLabel="Abrir perfil"
            accessibilityRole="button"
            onPress={() => router.push('/(app)/profile')}
            style={({ pressed }) => [styles.profileSummary, pressed && styles.profilePressed]}>
            <ProfileAvatar
              avatar={profile.data?.avatar}
              name={profile.data?.username}
              size={58}
            />
            <View style={styles.profileCopy}>
              <Text numberOfLines={1} style={styles.profileName}>
                {profile.data?.username || 'Sua conta'}
              </Text>
              <Text numberOfLines={1} style={styles.profileEmail}>
                {profile.data?.email || 'Perfil Level OS'}
              </Text>
              <View style={styles.planPill}>
                <Text style={styles.planPillText}>
                  {subscription.data?.paid_access ? 'Plano Individual' : 'Plano Free'}
                </Text>
              </View>
            </View>
            <Text style={styles.profileChevron}>›</Text>
          </Pressable>

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
  planPill: {
    alignSelf: 'flex-start',
    backgroundColor: levelTheme.colors.primaryMuted,
    borderRadius: 999,
    marginTop: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  planPillText: { color: levelTheme.colors.primary, fontSize: 10, fontWeight: '800' },
  profileChevron: { color: levelTheme.colors.muted, fontSize: 30, fontWeight: '300' },
  profileCopy: { flex: 1, gap: 3 },
  profileEmail: { color: levelTheme.colors.muted, fontSize: 12 },
  profileName: { color: levelTheme.colors.text, fontSize: 18, fontWeight: '700' },
  profilePressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
  profileSummary: {
    alignItems: 'center',
    backgroundColor: levelTheme.colors.surface,
    borderColor: levelTheme.colors.border,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 14,
    minHeight: 92,
    padding: 16,
  },
});
