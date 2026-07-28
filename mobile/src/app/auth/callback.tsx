import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { LevelLogo } from '@/components/level-logo';
import { levelTheme } from '@/constants/level-theme';

export default function AuthCallbackScreen() {
  return (
    <View style={styles.screen}>
      <LevelLogo size={44} />
      <ActivityIndicator color={levelTheme.colors.primary} size="large" />
      <Text style={styles.title}>Concluindo seu acesso</Text>
      <Text style={styles.caption}>Validando sua conta com segurança…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  caption: {
    color: levelTheme.colors.muted,
    fontSize: 14,
    textAlign: 'center',
  },
  screen: {
    alignItems: 'center',
    backgroundColor: levelTheme.colors.background,
    flex: 1,
    gap: 16,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: levelTheme.colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
});
