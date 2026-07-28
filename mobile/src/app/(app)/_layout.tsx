import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { levelTheme } from '@/constants/level-theme';
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
  const { authenticated, loading } = useAuth();
  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={levelTheme.colors.primary} />
      </View>
    );
  }
  if (!authenticated) return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        animation: 'fade',
        headerShown: false,
        sceneStyle: { backgroundColor: 'transparent' },
        tabBarActiveTintColor: levelTheme.colors.primary,
        tabBarInactiveTintColor: levelTheme.colors.muted,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 2 },
        tabBarStyle: {
          backgroundColor: 'rgba(7, 19, 16, 0.97)',
          borderTopColor: levelTheme.colors.border,
          height: 74,
          paddingBottom: 12,
          paddingTop: 8,
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
});
