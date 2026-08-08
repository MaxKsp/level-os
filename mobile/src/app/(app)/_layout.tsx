import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Redirect, Tabs } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { levelTheme } from '@/constants/level-theme';
import { LevelLogo } from '@/components/level-logo';
import { useAuth } from '@/providers/auth-provider';

type IconName = keyof typeof Ionicons.glyphMap;

const icon = (name: IconName) =>
  function TabIcon({ color, size, focused }: { color: string; size: number; focused: boolean }) {
    const reducedMotion = useReducedMotion();
    const active = useSharedValue(focused ? 1 : 0);

    useEffect(() => {
      active.value = reducedMotion
        ? withTiming(focused ? 1 : 0, { duration: 0 })
        : withSpring(focused ? 1 : 0, { damping: 17, mass: 0.65, stiffness: 190 });
    }, [active, focused, reducedMotion]);

    const animatedStyle = useAnimatedStyle(() => ({
      opacity: 0.72 + active.value * 0.28,
      transform: [{ scale: 0.92 + active.value * 0.08 }],
    }));

    return (
      <Animated.View style={[styles.tabIcon, focused && styles.tabIconActive, animatedStyle]}>
        <Ionicons color={color} name={focused ? name.replace('-outline', '') as IconName : name} size={size} />
      </Animated.View>
    );
  };

export default function NativeAppLayout() {
  const insets = useSafeAreaInsets();
  const { authenticated, loading, locked, unlock } = useAuth();
  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={levelTheme.colors.primary} />
      </View>
    );
  }
  if (!authenticated) return <Redirect href="/login" />;
  if (locked) {
    return (
      <View style={styles.locked}>
        <LevelLogo size={46} />
        <View style={styles.lockCopy}>
          <Text style={styles.lockTitle}>Level OS bloqueado</Text>
          <Text style={styles.lockCaption}>
            Confirme sua biometria ou o desbloqueio do aparelho para continuar.
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => void unlock()}
          style={({ pressed }) => [styles.unlockButton, pressed && styles.unlockButtonPressed]}>
          <Ionicons color="#001512" name="finger-print-outline" size={21} />
          <Text style={styles.unlockLabel}>Desbloquear</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Tabs
      screenListeners={{
        tabPress: () => {
          void Haptics.selectionAsync();
        },
      }}
      screenOptions={{
        animation: 'fade',
        headerShown: false,
        sceneStyle: { backgroundColor: 'transparent' },
        tabBarActiveTintColor: levelTheme.colors.primary,
        tabBarInactiveTintColor: levelTheme.colors.muted,
        tabBarHideOnKeyboard: true,
        tabBarItemStyle: { paddingTop: 3 },
        tabBarLabelStyle: { fontSize: 10.5, fontWeight: '700', marginTop: 1 },
        tabBarStyle: {
          backgroundColor: '#000000',
          borderTopColor: levelTheme.colors.border,
          height: 62 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 5,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Início', tabBarIcon: icon('grid-outline') }}
      />
      <Tabs.Screen
        name="finance"
        options={{ title: 'Finanças', tabBarIcon: icon('wallet-outline') }}
      />
      <Tabs.Screen
        name="routine"
        options={{ title: 'Rotina', tabBarIcon: icon('calendar-outline') }}
      />
      <Tabs.Screen
        name="training"
        options={{ title: 'Treinos', tabBarIcon: icon('barbell-outline') }}
      />
      <Tabs.Screen
        name="more"
        options={{ title: 'Mais', tabBarIcon: icon('apps-outline') }}
      />
      <Tabs.Screen
        name="nutrition"
        options={{ href: null, title: 'Nutrição' }}
      />
      <Tabs.Screen
        name="profile"
        options={{ href: null, title: 'Perfil' }}
      />
      <Tabs.Screen
        name="assistant"
        options={{ href: null, title: 'Agente de IA' }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    flex: 1,
    justifyContent: 'center',
  },
  lockCaption: {
    color: levelTheme.colors.muted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  lockCopy: {
    alignItems: 'center',
    gap: 8,
    maxWidth: 310,
  },
  locked: {
    alignItems: 'center',
    backgroundColor: levelTheme.colors.background,
    flex: 1,
    gap: 28,
    justifyContent: 'center',
    padding: 24,
  },
  lockTitle: {
    color: levelTheme.colors.text,
    fontSize: 24,
    fontWeight: '700',
  },
  tabIcon: {
    alignItems: 'center',
    borderRadius: 12,
    height: 34,
    justifyContent: 'center',
    width: 42,
  },
  tabIconActive: {
    backgroundColor: 'rgba(49, 230, 212, 0.12)',
    borderColor: 'rgba(49, 230, 212, 0.2)',
    borderWidth: StyleSheet.hairlineWidth,
  },
  unlockButton: {
    alignItems: 'center',
    backgroundColor: levelTheme.colors.primary,
    borderRadius: 16,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 24,
  },
  unlockButtonPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.98 }],
  },
  unlockLabel: {
    color: '#001512',
    fontSize: 16,
    fontWeight: '700',
  },
});
