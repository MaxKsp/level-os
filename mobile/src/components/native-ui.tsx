import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  type TextStyle,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { levelTheme } from '@/constants/level-theme';

type IconName = keyof typeof Ionicons.glyphMap;

export function NativeScreen({
  children,
  refreshing,
  onRefresh,
}: React.PropsWithChildren<{ refreshing?: boolean; onRefresh?: () => void }>) {
  const reducedMotion = useReducedMotion();
  const entrance = useSharedValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    entrance.value = withTiming(1, {
      duration: reducedMotion ? 0 : 420,
      easing: Easing.out(Easing.cubic),
    });
  }, [entrance, reducedMotion]);

  const entranceStyle = useAnimatedStyle(() => ({
    opacity: entrance.value,
    transform: [{ translateY: (1 - entrance.value) * 12 }],
  }));

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.screen}
        keyboardShouldPersistTaps="handled"
        refreshControl={onRefresh ? (
          <RefreshControl
            colors={[levelTheme.colors.primary]}
            onRefresh={onRefresh}
            refreshing={refreshing ?? false}
            tintColor={levelTheme.colors.primary}
          />
        ) : undefined}>
        <Animated.View style={[styles.screenContent, entranceStyle]}>
          {children}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerCopy}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title}>{title}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
      {action}
    </View>
  );
}

export function Section({
  title,
  caption,
  children,
}: React.PropsWithChildren<{ title: string; caption?: string }>) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeading}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {caption ? <Text style={styles.sectionCaption}>{caption}</Text> : null}
      </View>
      <View style={styles.hairline} />
      {children}
    </View>
  );
}

export function Metric({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'positive' | 'negative';
}) {
  const valueStyle: TextStyle =
    tone === 'positive'
      ? { color: levelTheme.colors.success }
      : tone === 'negative'
        ? { color: levelTheme.colors.danger }
        : {};
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.metricValue, valueStyle]}>
        {value}
      </Text>
    </View>
  );
}

export function Row({
  icon,
  title,
  subtitle,
  value,
  onPress,
}: {
  icon?: IconName;
  title: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
}) {
  const content = (
    <>
      {icon ? (
        <View style={styles.rowIcon}>
          <Ionicons color={levelTheme.colors.primary} name={icon} size={18} />
        </View>
      ) : null}
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>{title}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      {onPress ? <Ionicons color={levelTheme.colors.muted} name="chevron-forward" size={18} /> : null}
    </>
  );

  if (!onPress) return <View style={styles.row}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      {content}
    </Pressable>
  );
}

export function NativeButton({
  label,
  icon,
  onPress,
  disabled,
  variant = 'primary',
  style,
}: {
  label: string;
  icon?: IconName;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  style?: ViewStyle;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [
        styles.button,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'danger' && styles.buttonDanger,
        (pressed || disabled) && styles.buttonDimmed,
        style,
      ]}>
      {icon ? (
        <Ionicons
          color={variant === 'primary' ? levelTheme.colors.background : levelTheme.colors.text}
          name={icon}
          size={18}
        />
      ) : null}
      <Text style={[styles.buttonText, variant !== 'primary' && styles.buttonTextSecondary]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function EmptyState({ icon, title, description }: { icon: IconName; title: string; description: string }) {
  return (
    <View style={styles.empty}>
      <Ionicons color={levelTheme.colors.primary} name={icon} size={28} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDescription}>{description}</Text>
    </View>
  );
}

export function ErrorState({ retry }: { retry: () => void }) {
  return (
    <View style={styles.error}>
      <Text style={styles.errorText}>Não foi possível carregar os dados.</Text>
      <Pressable accessibilityRole="button" onPress={retry}>
        <Text style={styles.retry}>Tentar novamente</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: 'transparent', flex: 1 },
  screen: { paddingBottom: 120, paddingHorizontal: 20, paddingTop: 18 },
  screenContent: { gap: 28 },
  header: { alignItems: 'flex-start', flexDirection: 'row', gap: 16, justifyContent: 'space-between' },
  headerCopy: { flex: 1, gap: 6 },
  eyebrow: { color: levelTheme.colors.primary, fontSize: 12, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  title: { color: levelTheme.colors.text, fontSize: 30, fontWeight: '700', letterSpacing: -1.1 },
  description: { color: levelTheme.colors.muted, fontSize: 15, lineHeight: 22 },
  section: { gap: 14 },
  sectionHeading: { gap: 4 },
  sectionTitle: { color: levelTheme.colors.text, fontSize: 18, fontWeight: '600' },
  sectionCaption: { color: levelTheme.colors.muted, fontSize: 13 },
  hairline: { backgroundColor: levelTheme.colors.border, height: StyleSheet.hairlineWidth },
  metric: { flex: 1, gap: 6, minWidth: 140, paddingVertical: 8 },
  metricLabel: { color: levelTheme.colors.muted, fontSize: 13 },
  metricValue: { color: levelTheme.colors.text, fontSize: 25, fontVariant: ['tabular-nums'], fontWeight: '700', letterSpacing: -0.7 },
  row: { alignItems: 'center', borderBottomColor: levelTheme.colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: 12, minHeight: 66, paddingVertical: 10 },
  rowIcon: { alignItems: 'center', backgroundColor: levelTheme.colors.primaryMuted, borderRadius: 10, height: 38, justifyContent: 'center', width: 38 },
  rowCopy: { flex: 1, gap: 3 },
  rowTitle: { color: levelTheme.colors.text, fontSize: 15, fontWeight: '600' },
  rowSubtitle: { color: levelTheme.colors.muted, fontSize: 12, lineHeight: 17 },
  rowValue: { color: levelTheme.colors.text, fontSize: 14, fontVariant: ['tabular-nums'], fontWeight: '600' },
  pressed: { opacity: 0.65 },
  button: { alignItems: 'center', backgroundColor: levelTheme.colors.primary, borderRadius: 14, flexDirection: 'row', gap: 8, justifyContent: 'center', minHeight: 48, paddingHorizontal: 18 },
  buttonSecondary: { backgroundColor: levelTheme.colors.surfaceRaised, borderColor: levelTheme.colors.border, borderWidth: 1 },
  buttonDanger: { backgroundColor: '#3A171A', borderColor: '#682328', borderWidth: 1 },
  buttonDimmed: { opacity: 0.55 },
  buttonText: { color: levelTheme.colors.background, fontSize: 15, fontWeight: '700' },
  buttonTextSecondary: { color: levelTheme.colors.text },
  empty: { alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 32 },
  emptyTitle: { color: levelTheme.colors.text, fontSize: 16, fontWeight: '600', marginTop: 4 },
  emptyDescription: { color: levelTheme.colors.muted, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  error: { alignItems: 'center', backgroundColor: '#2D1517', borderRadius: 14, gap: 8, padding: 18 },
  errorText: { color: levelTheme.colors.danger, fontSize: 14 },
  retry: { color: levelTheme.colors.text, fontSize: 14, fontWeight: '700' },
});
