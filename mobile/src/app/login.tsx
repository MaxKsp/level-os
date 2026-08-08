import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';

import { LevelBackground } from '@/components/level-background';
import { LevelLogo } from '@/components/level-logo';
import { NativeButton } from '@/components/native-ui';
import { levelTheme } from '@/constants/level-theme';
import { useAuth } from '@/providers/auth-provider';

export default function LoginScreen() {
  const { error: authError, signIn, signInWithGoogle, signUp } = useAuth();
  const reducedMotion = useReducedMotion();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const strongPassword = (
    password.length >= 10
    && /[a-z]/.test(password)
    && /[A-Z]/.test(password)
    && /\d/.test(password)
    && /[^A-Za-z0-9]/.test(password)
  );

  const submit = async () => {
    if (!email.includes('@') || password.length < 6) {
      Alert.alert('Revise os dados', 'Informe um e-mail válido e uma senha com pelo menos 6 caracteres.');
      return;
    }
    if (creating && !strongPassword) {
      Alert.alert(
        'Senha fraca',
        'Use 10 caracteres ou mais, com maiúscula, minúscula, número e símbolo.',
      );
      return;
    }
    setBusy(true);
    try {
      if (creating) {
        const status = await signUp(email, password);
        if (status === 'confirmation_required') {
          Alert.alert('Confirme seu e-mail', 'Enviamos o link de confirmação para concluir o cadastro.');
          setCreating(false);
        }
      } else {
        await signIn(email, password);
      }
    } catch (reason) {
      Alert.alert(
        creating ? 'Não foi possível criar a conta' : 'Não foi possível entrar',
        reason instanceof Error ? reason.message : 'Tente novamente.',
      );
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (reason) {
      Alert.alert('Acesso com Google', reason instanceof Error ? reason.message : 'Não foi possível concluir o acesso.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <LevelBackground />
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboard}>
          <ScrollView
            contentContainerStyle={styles.loginContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
        <Animated.View
          entering={reducedMotion ? undefined : FadeInDown.duration(420).springify()}
          style={styles.brand}>
          <LevelLogo size={42} />
        </Animated.View>

        <Animated.View
          entering={reducedMotion ? undefined : FadeInDown.delay(90).duration(460).springify()}
          style={styles.copy}>
          <Text style={styles.eyebrow}>SISTEMA OPERACIONAL PESSOAL</Text>
          <Text style={styles.title}>{creating ? 'Crie sua conta.' : 'Sua vida em movimento.'}</Text>
          <Text style={styles.description}>
            Finanças, rotina, treinos e progresso em uma experiência feita para o celular.
          </Text>
        </Animated.View>

        <Animated.View
          entering={reducedMotion ? undefined : FadeInDown.delay(170).duration(500).springify()}
          style={styles.form}>
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
          <View style={styles.fieldMeta}>
            <Text style={styles.label}>Senha</Text>
            {!creating ? (
              <Pressable
                accessibilityRole="link"
                onPress={() => router.push('/forgot-password')}>
                <Text style={styles.forgot}>Esqueci minha senha</Text>
              </Pressable>
            ) : null}
          </View>
          <View style={styles.passwordField}>
            <TextInput
              autoCapitalize="none"
              autoComplete={creating ? 'new-password' : 'current-password'}
              onChangeText={setPassword}
              onSubmitEditing={() => void submit()}
              placeholder={creating ? '10+ caracteres fortes' : 'Sua senha'}
              placeholderTextColor={levelTheme.colors.muted}
              secureTextEntry={!showPassword}
              style={styles.passwordInput}
              value={password}
            />
            <Pressable
              accessibilityLabel={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              hitSlop={12}
              onPress={() => setShowPassword((value) => !value)}>
              <Ionicons
                color={levelTheme.colors.muted}
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={22}
              />
            </Pressable>
          </View>
          {creating && password ? (
            <Text style={[styles.passwordHint, strongPassword && styles.passwordGood]}>
              {strongPassword
                ? 'Senha forte'
                : 'Use 10+ caracteres, maiúscula, minúscula, número e símbolo'}
            </Text>
          ) : null}
          {authError ? <Text style={styles.error}>{authError}</Text> : null}
          <NativeButton
            disabled={busy}
            label={creating ? 'Criar conta' : 'Entrar'}
            loading={busy}
            onPress={() => void submit()}
          />
          <View style={styles.divider}>
            <View style={styles.line} />
            <Text style={styles.or}>ou</Text>
            <View style={styles.line} />
          </View>
          <NativeButton
            disabled={busy}
            icon="logo-google"
            label="Continuar com Google"
            onPress={() => void google()}
            variant="secondary"
          />
        </Animated.View>

        <Pressable onPress={() => setCreating((value) => !value)} style={styles.switchMode}>
          <Text style={styles.switchText}>
            {creating ? 'Já possui uma conta? ' : 'Primeiro acesso? '}
            <Text style={styles.switchAccent}>{creating ? 'Entrar' : 'Criar conta'}</Text>
          </Text>
        </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: levelTheme.colors.background, flex: 1 },
  safe: { backgroundColor: 'transparent', flex: 1 },
  keyboard: { flex: 1 },
  loginContent: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  brand: { alignItems: 'center', flexDirection: 'row', gap: 10, marginBottom: 40 },
  copy: { gap: 9, marginBottom: 30 },
  eyebrow: { color: levelTheme.colors.primary, fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  title: { color: levelTheme.colors.text, fontSize: 36, fontWeight: '700', letterSpacing: -1.5 },
  description: { color: levelTheme.colors.muted, fontSize: 15, lineHeight: 22, maxWidth: 360 },
  form: {
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    borderColor: levelTheme.colors.border,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
    padding: 18,
  },
  fieldMeta: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  forgot: {
    color: levelTheme.colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  label: { color: levelTheme.colors.muted, fontSize: 12, fontWeight: '600', marginTop: 3 },
  input: { backgroundColor: levelTheme.colors.surface, borderColor: levelTheme.colors.border, borderRadius: 14, borderWidth: 1, color: levelTheme.colors.text, fontSize: 16, minHeight: 52, paddingHorizontal: 16 },
  passwordField: { alignItems: 'center', backgroundColor: levelTheme.colors.surface, borderColor: levelTheme.colors.border, borderRadius: 14, borderWidth: 1, flexDirection: 'row', minHeight: 52, paddingRight: 16 },
  passwordInput: { color: levelTheme.colors.text, flex: 1, fontSize: 16, paddingHorizontal: 16 },
  passwordHint: { color: levelTheme.colors.warning, fontSize: 12 },
  passwordGood: { color: levelTheme.colors.success },
  error: { color: levelTheme.colors.danger, fontSize: 13, lineHeight: 18 },
  divider: { alignItems: 'center', flexDirection: 'row', gap: 12, marginVertical: 2 },
  line: { backgroundColor: levelTheme.colors.border, flex: 1, height: StyleSheet.hairlineWidth },
  or: { color: levelTheme.colors.muted, fontSize: 12 },
  switchMode: { alignItems: 'center', marginTop: 24, minHeight: 44, justifyContent: 'center' },
  switchText: { color: levelTheme.colors.muted, fontSize: 14 },
  switchAccent: { color: levelTheme.colors.primary, fontWeight: '700' },
});
