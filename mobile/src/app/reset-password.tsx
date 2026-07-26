import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NativeButton } from '@/components/native-ui';
import { levelTheme } from '@/constants/level-theme';
import { useAuth } from '@/providers/auth-provider';

export default function ResetPasswordScreen() {
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const strong = (
    password.length >= 10
    && /[a-z]/.test(password)
    && /[A-Z]/.test(password)
    && /\d/.test(password)
    && /[^A-Za-z0-9]/.test(password)
  );

  const submit = async () => {
    if (!strong) {
      Alert.alert(
        'Senha fraca',
        'Use 10 caracteres ou mais, com maiúscula, minúscula, número e símbolo.',
      );
      return;
    }
    if (password !== confirm) {
      Alert.alert('Senhas diferentes', 'Digite a mesma senha nos dois campos.');
      return;
    }
    setBusy(true);
    try {
      await updatePassword(password);
      Alert.alert('Senha atualizada', 'Entre novamente usando sua nova senha.');
    } catch (reason) {
      Alert.alert(
        'Não foi possível atualizar',
        reason instanceof Error ? reason.message : 'Solicite um novo link.',
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
          <Text style={styles.eyebrow}>NOVA SENHA</Text>
          <Text style={styles.title}>Proteja sua conta.</Text>
          <Text style={styles.description}>
            Use uma senha única que você ainda não utiliza em outro serviço.
          </Text>
        </View>
        <View style={styles.form}>
          <Text style={styles.label}>Nova senha</Text>
          <View style={styles.passwordField}>
            <TextInput
              autoCapitalize="none"
              autoComplete="new-password"
              onChangeText={setPassword}
              placeholder="10+ caracteres fortes"
              placeholderTextColor={levelTheme.colors.muted}
              secureTextEntry={!visible}
              style={styles.passwordInput}
              value={password}
            />
            <Pressable
              accessibilityLabel={visible ? 'Ocultar senha' : 'Mostrar senha'}
              onPress={() => setVisible((current) => !current)}>
              <Ionicons
                color={levelTheme.colors.muted}
                name={visible ? 'eye-off-outline' : 'eye-outline'}
                size={22}
              />
            </Pressable>
          </View>
          <Text style={[styles.hint, strong && styles.hintStrong]}>
            {strong
              ? 'Senha forte'
              : 'Maiúscula, minúscula, número, símbolo e 10+ caracteres'}
          </Text>
          <Text style={styles.label}>Confirmar senha</Text>
          <TextInput
            autoCapitalize="none"
            autoComplete="new-password"
            onChangeText={setConfirm}
            placeholder="Repita a nova senha"
            placeholderTextColor={levelTheme.colors.muted}
            secureTextEntry={!visible}
            style={styles.input}
            value={confirm}
          />
          <NativeButton
            disabled={busy}
            label={busy ? 'Atualizando…' : 'Atualizar senha'}
            onPress={() => void submit()}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, gap: 28, justifyContent: 'center', padding: 24 },
  copy: { gap: 8 },
  description: { color: levelTheme.colors.muted, fontSize: 15, lineHeight: 22 },
  eyebrow: { color: levelTheme.colors.primary, fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  form: {
    backgroundColor: 'rgba(7, 19, 16, 0.72)',
    borderColor: levelTheme.colors.border,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
    padding: 18,
  },
  hint: { color: levelTheme.colors.warning, fontSize: 12 },
  hintStrong: { color: levelTheme.colors.success },
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
  passwordField: {
    alignItems: 'center',
    backgroundColor: levelTheme.colors.surface,
    borderColor: levelTheme.colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 52,
    paddingRight: 16,
  },
  passwordInput: { color: levelTheme.colors.text, flex: 1, fontSize: 16, paddingHorizontal: 16 },
  safe: { backgroundColor: 'transparent', flex: 1 },
  title: { color: levelTheme.colors.text, fontSize: 34, fontWeight: '700', letterSpacing: -1.2 },
});
