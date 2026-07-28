import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

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
  ProgressBar,
  Row,
  Section,
  SegmentedTabs,
  ToggleRow,
} from '@/components/native-ui';
import { levelTheme } from '@/constants/level-theme';
import {
  useActivity,
  usePreferences,
  useProfile,
  useProfileDetails,
  useProgress,
  useSubscription,
} from '@/hooks/use-native-data';
import {
  confirmTotp,
  createSubscriptionCheckout,
  disableTotp,
  downloadBackup,
  enrollTotp,
  restoreBackup,
  savePreferences,
  saveProfileDetails,
  type PaymentMethod,
  type Preferences,
  type ProfileDetails,
  type SubscriptionPayment,
  type TotpEnrollment,
  uploadAvatar,
} from '@/lib/api';
import { secureStorage } from '@/lib/secure-storage';
import { registerNativePush } from '@/lib/native-push';
import { shortDate } from '@/lib/format';
import { useAuth } from '@/providers/auth-provider';

type Tab = 'account' | 'progress' | 'preferences' | 'activity' | 'plan';
const BIOMETRIC_KEY = 'level_os_biometric_unlock';

export default function ProfileScreen() {
  const params = useLocalSearchParams<{ tab?: string; section?: string; nonce?: string }>();
  const { signOut } = useAuth();
  const profile = useProfile();
  const details = useProfileDetails();
  const preferences = usePreferences();
  const progress = useProgress();
  const activity = useActivity();
  const subscription = useSubscription();
  const [tab, setTab] = useState<Tab>('account');
  const [profileDraft, setProfileDraft] = useState<ProfileDetails>({
    phone: '', city: '', bio: '', sex: '', birthDate: '',
  });
  const [prefsDraft, setPrefsDraft] = useState<Preferences>({
    theme: 'dark',
    notifications: { tasks: true, finance: true, backup: false },
    notify_email: false,
    onboarding_completed: false,
  });
  const [saving, setSaving] = useState(false);
  const [payment, setPayment] = useState<SubscriptionPayment | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [totpEnrollment, setTotpEnrollment] = useState<TotpEnrollment | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [totpPassword, setTotpPassword] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [securityOpen, setSecurityOpen] = useState(false);
  const handledSection = useRef('');

  useEffect(() => {
    if (details.data) setProfileDraft(details.data);
  }, [details.data]);
  useEffect(() => {
    if (preferences.data) setPrefsDraft(preferences.data);
  }, [preferences.data]);
  useEffect(() => {
    if (['account', 'progress', 'preferences', 'activity', 'plan'].includes(params.tab || '')) {
      setTab(params.tab as Tab);
    }
  }, [params.tab]);
  useEffect(() => {
    if (params.section !== 'security') return;
    const requestKey = `${params.section}:${params.nonce || ''}`;
    if (handledSection.current === requestKey) return;
    handledSection.current = requestKey;
    setTab('account');
    setSecurityOpen(true);
  }, [params.nonce, params.section]);

  const enableBiometrics = async () => {
    const supported = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!supported || !enrolled) {
      Alert.alert('Biometria indisponível', 'Cadastre biometria ou Face ID nas configurações do aparelho.');
      return;
    }
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Ativar acesso biométrico ao Level OS',
      cancelLabel: 'Cancelar',
    });
    if (result.success) {
      await secureStorage.setItem(BIOMETRIC_KEY, 'enabled');
      Alert.alert('Biometria ativada', 'Seus próximos acessos podem ser protegidos neste aparelho.');
    }
  };

  const enableNotifications = async () => {
    try {
      const result = await registerNativePush();
      if (result === 'registered') Alert.alert('Notificações ativadas', 'Este aparelho receberá seus lembretes.');
      else if (result === 'denied') Alert.alert('Permissão necessária', 'Autorize nas configurações do aparelho.');
      else Alert.alert('Use um aparelho real', 'Push nativo não funciona no navegador ou em alguns simuladores.');
    } catch {
      Alert.alert('Não foi possível ativar', 'Confira a configuração do Firebase.');
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      await saveProfileDetails(profileDraft);
      await details.refresh();
      Alert.alert('Perfil atualizado.');
    } catch {
      Alert.alert('Não foi possível salvar', 'Confira os dados informados.');
    } finally {
      setSaving(false);
    }
  };

  const savePrefs = async () => {
    setSaving(true);
    try {
      await savePreferences(prefsDraft);
      await preferences.refresh();
      Alert.alert('Preferências salvas.');
    } catch {
      Alert.alert('Não foi possível salvar', 'Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const changeAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permissão necessária', 'Autorize o acesso às fotos para trocar o avatar.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (result.canceled) return;
    setSaving(true);
    try {
      await uploadAvatar(result.assets[0]);
      await profile.refresh();
      Alert.alert('Foto atualizada.');
    } catch {
      Alert.alert('Não foi possível atualizar', 'Use uma imagem JPG, PNG ou WebP de até 4 MB.');
    } finally {
      setSaving(false);
    }
  };

  const startTotp = async () => {
    setSaving(true);
    try {
      const enrollment = await enrollTotp();
      setTotpEnrollment(enrollment);
      setTotpCode('');
      setSecurityOpen(true);
    } catch {
      Alert.alert('Não foi possível iniciar o 2FA', 'Tente novamente em alguns instantes.');
    } finally {
      setSaving(false);
    }
  };

  const verifyTotp = async () => {
    if (!/^\d{6}$/.test(totpCode.trim())) {
      Alert.alert('Código inválido', 'Digite os 6 números exibidos no seu autenticador.');
      return;
    }
    setSaving(true);
    try {
      const codes = await confirmTotp(totpCode.trim());
      setBackupCodes(codes);
      setTotpEnrollment(null);
      setTotpCode('');
      await profile.refresh();
      Alert.alert('2FA ativado', 'Guarde os códigos de recuperação exibidos nesta tela.');
    } catch {
      Alert.alert('Código inválido', 'Confira o código no aplicativo autenticador e tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const turnOffTotp = async () => {
    setSaving(true);
    try {
      await disableTotp(totpPassword);
      setTotpPassword('');
      setSecurityOpen(false);
      await profile.refresh();
      Alert.alert('2FA desativado.');
    } catch {
      Alert.alert('Não foi possível desativar', 'Confira sua senha e tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const exportBackup = async () => {
    setSaving(true);
    try {
      const raw = await downloadBackup();
      const file = new File(Paths.cache, `level-os-backup-${new Date().toISOString().slice(0, 10)}.json`);
      if (file.exists) file.delete();
      file.create();
      file.write(raw);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          dialogTitle: 'Exportar backup do Level OS',
          mimeType: 'application/json',
        });
      } else {
        Alert.alert('Backup criado', file.uri);
      }
    } catch {
      Alert.alert('Não foi possível exportar', 'Tente novamente em alguns instantes.');
    } finally {
      setSaving(false);
    }
  };

  const importBackup = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      type: ['application/json', 'text/json'],
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (asset.size && asset.size > 10 * 1024 * 1024) {
      Alert.alert('Arquivo muito grande', 'O backup deve ter no máximo 10 MB.');
      return;
    }
    Alert.alert(
      'Restaurar backup?',
      'Os dados atuais serão substituídos pelos dados deste arquivo.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restaurar',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setSaving(true);
              try {
                const raw = await new File(asset.uri).text();
                const parsed = JSON.parse(raw) as { format?: string };
                if (parsed?.format !== 'level-os-user-backup') throw new Error('invalid');
                await restoreBackup(raw);
                await refreshAll();
                Alert.alert('Backup restaurado', 'Os dados foram atualizados com segurança.');
              } catch {
                Alert.alert('Backup inválido', 'O arquivo não pertence ao Level OS ou está corrompido.');
              } finally {
                setSaving(false);
              }
            })();
          },
        },
      ],
    );
  };

  const checkout = async (method: PaymentMethod) => {
    setSaving(true);
    try {
      const next = await createSubscriptionCheckout(method);
      setPayment(next);
      if (next.checkout_url) await WebBrowser.openBrowserAsync(next.checkout_url);
    } catch (reason) {
      const message = reason instanceof Error && reason.message === 'subscription_already_active'
        ? 'Seu plano já está ativo.'
        : 'O Mercado Pago não respondeu. Tente novamente.';
      Alert.alert('Não foi possível iniciar', message);
    } finally {
      setSaving(false);
    }
  };

  const refreshAll = async () => {
    await Promise.all([
      profile.refresh(), details.refresh(), preferences.refresh(), progress.refresh(),
      activity.refresh(), subscription.refresh(),
    ]);
  };

  return (
    <NativeScreen onRefresh={refreshAll} refreshing={profile.loading || subscription.loading}>
      <PageHeader
        description={profile.data?.email ?? 'Sua conta Level OS'}
        eyebrow="PERFIL"
        title={profile.data?.username ?? 'Sua conta'}
      />
      <SegmentedTabs
        items={[
          { id: 'account', label: 'Conta', icon: 'person-outline' },
          { id: 'progress', label: 'Progresso', icon: 'trophy-outline' },
          { id: 'preferences', label: 'Preferências', icon: 'options-outline' },
          { id: 'activity', label: 'Atividade', icon: 'shield-checkmark-outline' },
          { id: 'plan', label: 'Plano', icon: 'card-outline' },
        ]}
        onChange={setTab}
        value={tab}
      />

      {profile.error ? <ErrorState retry={() => void refreshAll()} /> : (
        <>
          {tab === 'account' ? (
            <>
              <Section title="Dados pessoais" caption="Usados nas estimativas e personalização">
                <Row icon="camera-outline" onPress={() => void changeAvatar()} subtitle="JPG, PNG ou WebP de até 4 MB" title="Alterar foto do perfil" />
                <NativeField label="Telefone" onChangeText={(phone) => setProfileDraft((current) => ({ ...current, phone }))} value={profileDraft.phone} />
                <NativeField label="Cidade" onChangeText={(city) => setProfileDraft((current) => ({ ...current, city }))} value={profileDraft.city} />
                <NativeField label="Data de nascimento" onChangeText={(birthDate) => setProfileDraft((current) => ({ ...current, birthDate }))} placeholder="AAAA-MM-DD" value={profileDraft.birthDate} />
                <ChoiceChips
                  items={[{ value: '', label: 'Não informar' }, { value: 'm', label: 'Masculino' }, { value: 'f', label: 'Feminino' }]}
                  onChange={(sex) => setProfileDraft((current) => ({ ...current, sex }))}
                  value={profileDraft.sex}
                />
                <NativeField label="Sobre você" multiline onChangeText={(bio) => setProfileDraft((current) => ({ ...current, bio }))} value={profileDraft.bio} />
                <NativeButton disabled={saving} icon="checkmark" label="Salvar perfil" onPress={() => void saveProfile()} />
              </Section>
              <Section title="Segurança">
                <Row icon="finger-print-outline" onPress={() => void enableBiometrics()} subtitle="Protege este dispositivo" title="Ativar biometria" />
                <Row
                  icon="key-outline"
                  onPress={() => {
                    if (profile.data?.totp_enabled) {
                      setSecurityOpen(true);
                    } else {
                      void startTotp();
                    }
                  }}
                  subtitle={profile.data?.totp_enabled ? 'Código temporário exigido no login' : 'Use seu aplicativo autenticador'}
                  title={profile.data?.totp_enabled ? '2FA ativado' : 'Ativar autenticação em duas etapas'}
                />
                <Row icon="shield-checkmark-outline" subtitle="Sessão e tokens ficam no armazenamento seguro" title="Proteção da conta" />
              </Section>
              <Section title="Seus dados" caption="Portabilidade e recuperação">
                <Row icon="download-outline" onPress={() => void exportBackup()} subtitle="Baixe uma cópia completa em JSON" title="Exportar backup" />
                <Row icon="cloud-upload-outline" onPress={() => void importBackup()} subtitle="Substitui os dados atuais após confirmação" title="Restaurar backup" />
              </Section>
              <NativeButton icon="log-out-outline" label="Sair da conta" onPress={() => void signOut()} variant="danger" />
            </>
          ) : null}

          {tab === 'progress' ? (
            <>
              <View style={styles.metrics}>
                <Metric label="Nível" value={String(progress.data?.level ?? 1)} />
                <Metric label="XP total" value={String(progress.data?.xp ?? 0)} />
                <Metric label="Sequência" value={`${progress.data?.streak ?? 0} dias`} />
              </View>
              <Section title={progress.data?.title || 'Seu progresso'} caption={`${progress.data?.xp_into_level ?? 0}/${progress.data?.xp_to_next ?? 0} XP`}>
                <ProgressBar value={progress.data?.progress_pct ?? 0} />
              </Section>
              <Section title="Conquistas" caption={`${progress.data?.achievements.filter((item) => item.unlocked).length ?? 0} desbloqueadas`}>
                {progress.data?.achievements.length ? progress.data.achievements.map((item) => (
                  <Row
                    icon={item.unlocked ? 'trophy' : 'lock-closed-outline'}
                    key={item.code}
                    subtitle={`${item.description} · ${item.current}/${item.goal}`}
                    title={item.title}
                    value={item.unlocked ? `+${item.xp_bonus} XP` : undefined}
                  />
                )) : <EmptyState description="Complete ações em finanças, rotina e treinos." icon="trophy-outline" title="Conquistas em preparação" />}
              </Section>
            </>
          ) : null}

          {tab === 'preferences' ? (
            <Section title="Notificações" caption="Controle o que merece interromper você">
              <ToggleRow description="Tarefas e recorrências" onChange={(tasks) => setPrefsDraft((current) => ({ ...current, notifications: { ...current.notifications, tasks } }))} title="Rotina" value={prefsDraft.notifications.tasks} />
              <ToggleRow description="Faturas e vencimentos" onChange={(finance) => setPrefsDraft((current) => ({ ...current, notifications: { ...current.notifications, finance } }))} title="Finanças" value={prefsDraft.notifications.finance} />
              <ToggleRow description="Resumo de backup" onChange={(backup) => setPrefsDraft((current) => ({ ...current, notifications: { ...current.notifications, backup } }))} title="Backup" value={prefsDraft.notifications.backup} />
              <ToggleRow description="Receber também no e-mail" onChange={(notify_email) => setPrefsDraft((current) => ({ ...current, notify_email }))} title="Notificações por e-mail" value={prefsDraft.notify_email} />
              <NativeButton disabled={saving} icon="checkmark" label="Salvar preferências" onPress={() => void savePrefs()} />
              <NativeButton icon="notifications-outline" label="Ativar push neste aparelho" onPress={() => void enableNotifications()} variant="secondary" />
            </Section>
          ) : null}

          {tab === 'activity' ? (
            <Section title="Atividade da conta" caption="Acessos e ações sensíveis">
              {activity.data?.events.length ? activity.data.events.slice(0, 30).map((event, index) => (
                <Row
                  icon={event.outcome === 'success' ? 'checkmark-circle-outline' : 'alert-circle-outline'}
                  key={`${event.created_at}-${index}`}
                  subtitle={`${shortDate(event.created_at)}${event.ip_address ? ` · ${event.ip_address}` : ''}`}
                  title={event.event_type}
                  value={event.outcome}
                />
              )) : <EmptyState description="Os eventos de segurança aparecerão aqui." icon="shield-checkmark-outline" title="Sem atividade recente" />}
            </Section>
          ) : null}

          {tab === 'plan' ? (
            <>
              <Section title={subscription.data?.plan === 'individual' ? 'Plano Individual' : 'Plano gratuito'}>
                <Row
                  icon="trophy-outline"
                  subtitle={subscription.data?.paid_access
                    ? 'Todos os recursos estão disponíveis.'
                    : subscription.data?.in_trial
                      ? `${subscription.data.trial_days_left} dias restantes no teste`
                      : 'Assine para usar Agentes de IA e automações.'}
                  title={subscription.data?.paid_access ? 'Acesso ativo' : 'Conheça o Individual'}
                />
              </Section>
              {!subscription.data?.paid_access ? (
                <NativeButton icon="card-outline" label="Assinar o Level OS" onPress={() => setPaymentOpen(true)} />
              ) : null}
              <Section title="Aplicativo">
                <Row icon="restaurant-outline" onPress={() => router.push('/(app)/nutrition')} subtitle="Cardápio e compras" title="Alimentação" />
                <Row icon="sparkles-outline" onPress={() => router.push('/(app)/assistant')} subtitle="Agentes especializados" title="Agente de IA" />
                <Row icon="phone-portrait-outline" subtitle="Aplicativo nativo Android/iOS" title="Level OS 1.1.0" />
              </Section>
            </>
          ) : null}
        </>
      )}

      <NativeModal
        description="A cobrança acontece no ambiente seguro do Mercado Pago."
        onClose={() => setPaymentOpen(false)}
        title="Assinar o Level OS"
        visible={paymentOpen}>
        <NativeButton disabled={saving} icon="qr-code-outline" label="Pagar com Pix" onPress={() => void checkout('pix')} />
        <NativeButton disabled={saving} icon="card-outline" label="Pagar com cartão" onPress={() => void checkout('card')} variant="secondary" />
        {payment?.payment_code ? (
          <>
            <Text selectable style={styles.paymentCode}>{payment.payment_code}</Text>
            <NativeButton
              icon="copy-outline"
              label="Copiar código Pix"
              onPress={() => void Clipboard.setStringAsync(payment.payment_code)}
              variant="secondary"
            />
          </>
        ) : null}
      </NativeModal>

      <NativeModal
        description={profile.data?.totp_enabled
          ? 'Confirme sua senha para remover a proteção desta conta.'
          : 'Cadastre a chave no Google Authenticator, Authy, 1Password ou similar.'}
        onClose={() => {
          setSecurityOpen(false);
          setTotpEnrollment(null);
          setTotpCode('');
          setTotpPassword('');
          setBackupCodes([]);
        }}
        title={profile.data?.totp_enabled ? 'Desativar 2FA' : 'Ativar 2FA'}
        visible={securityOpen}>
        {profile.data?.totp_enabled ? (
          <>
            {profile.data.has_password ? (
              <NativeField
                label="Senha atual"
                onChangeText={setTotpPassword}
                secureTextEntry
                value={totpPassword}
              />
            ) : (
              <Text style={styles.securityNote}>Sua conta usa autenticação gerenciada; confirme a remoção abaixo.</Text>
            )}
            <NativeButton
              disabled={saving}
              icon="shield-outline"
              label="Desativar 2FA"
              onPress={() => void turnOffTotp()}
              variant="danger"
            />
          </>
        ) : totpEnrollment ? (
          <>
            <Text style={styles.securityNote}>
              Abra no autenticador ou copie a chave manualmente.
            </Text>
            <NativeButton
              icon="open-outline"
              label="Abrir no autenticador"
              onPress={() => void Linking.openURL(totpEnrollment.otpauth_uri)}
            />
            <Text selectable style={styles.paymentCode}>{totpEnrollment.secret}</Text>
            <NativeButton
              icon="copy-outline"
              label="Copiar chave"
              onPress={() => void Clipboard.setStringAsync(totpEnrollment.secret)}
              variant="secondary"
            />
            <NativeField
              keyboardType="number-pad"
              label="Código de 6 dígitos"
              maxLength={6}
              onChangeText={setTotpCode}
              value={totpCode}
            />
            <NativeButton disabled={saving} icon="checkmark" label="Confirmar 2FA" onPress={() => void verifyTotp()} />
          </>
        ) : null}
        {backupCodes.length ? (
          <>
            <Text style={styles.securityNote}>Códigos de recuperação — guarde em local seguro:</Text>
            <Text selectable style={styles.backupCodes}>{backupCodes.join('\n')}</Text>
            <NativeButton
              icon="copy-outline"
              label="Copiar códigos"
              onPress={() => void Clipboard.setStringAsync(backupCodes.join('\n'))}
              variant="secondary"
            />
          </>
        ) : null}
      </NativeModal>
    </NativeScreen>
  );
}

const styles = StyleSheet.create({
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 18 },
  paymentCode: {
    backgroundColor: levelTheme.colors.surface,
    borderColor: levelTheme.colors.border,
    borderRadius: 14,
    borderWidth: 1,
    color: levelTheme.colors.text,
    fontSize: 12,
    lineHeight: 18,
    padding: 14,
  },
  securityNote: {
    color: levelTheme.colors.muted,
    fontSize: 13,
    lineHeight: 20,
  },
  backupCodes: {
    backgroundColor: levelTheme.colors.surface,
    borderColor: levelTheme.colors.border,
    borderRadius: 14,
    borderWidth: 1,
    color: levelTheme.colors.text,
    fontFamily: 'monospace',
    fontSize: 14,
    lineHeight: 22,
    padding: 14,
  },
});
