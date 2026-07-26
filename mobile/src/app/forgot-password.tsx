import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NativeButton } from '@/components/native-ui';
import { levelTheme } from '@/constants/level-theme';
import { useAuth } from '@/providers/auth-provider';

export default function ForgotPasswordScreen() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email.includes('@')) {
      Alert.alert('Revise o e-mail', 'Informe o e-mail usado na sua conta.');
      return;
    }
    setBusy(true);
    try {
      await requestPasswordReset(email);
      Alert.alert(
        'Verifique seu e-mail',
        'Se a conta existir, enviaremos um link para criar uma nova senha.',
        [{ text: 'Voltar', onPress: () => router.replace('/login') }],
      );
    } catch (reason) {
      Alert.alert(
        'Não foi possível enviar',
        reason instanceof Error ? reason.message : 'Tente novamente.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.content}>
        <View style={styles.copy}>
          <Text style={styles.eyebrow}>RECUPERAR ACESSO</Text>
          <Text style={styles.title}>Crie uma nova senha.</Text>
          <Text style={styles.description}>
            O link seguro abrirá diretamente no Level OS.
          </Text>
        </View>
        <View style={styles.form}>
          <Text style={styles.label}>E-mail</Text>
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="voce@exemplo.com"
            placeholderTextColor={levelTheme.colors.muted}
            style={styles.input}
            value={email}
          />
          <NativeButton
            disabled={busy}
            label={busy ? 'Enviando…' : 'Enviar link'}
            onPress={() => void submit()}
          />
          <NativeButton
            label="Voltar ao login"
            onPress={() => router.replace('/login')}
            variant="secondary"
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    gap: 28,
    justifyContent: 'center',
    padding: 24,
  },
  copy: { gap: 8 },
  description: { color: levelTheme.colors.muted, fontSize: 15, lineHeight: 22 },
  eyebrow: { color: levelTheme.colors.primary, fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  form: {
    backgroundColor: 'rgba(7, 19, 16, 0.72)',
    borderColor: levelTheme.colors.border,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 14,
    padding: 18,
  },
  input: {
    backgroundColor: levelTheme.colors.surface,
    borderColor: levelTheme.colors.border,
    borderRadius: 14,
    borderWidth: 1,
    color: levelTheme.colors.text,
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: 16,
  },
  label: { color: levelTheme.colors.muted, fontSize: 12, fontWeight: '600' },
  safe: { backgroundColor: 'transparent', flex: 1 },
  title: { color: levelTheme.colors.text, fontSize: 34, fontWeight: '700', letterSpacing: -1.2 },
});
