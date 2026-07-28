import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect } from 'react';
import {
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  type TextInputProps,
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

export function ActionTile({
  icon,
  title,
  description,
  onPress,
  accent = false,
  style,
}: {
  icon: IconName;
  title: string;
  description: string;
  onPress: () => void;
  accent?: boolean;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      accessibilityHint={description}
      accessibilityLabel={title}
      accessibilityRole="button"
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => [
        styles.actionTile,
        accent && styles.actionTileAccent,
        pressed && styles.actionTilePressed,
        style,
      ]}>
      <View style={[styles.actionTileIcon, accent && styles.actionTileIconAccent]}>
        <Ionicons
          color={accent ? levelTheme.colors.background : levelTheme.colors.primary}
          name={icon}
          size={20}
        />
      </View>
      <View style={styles.actionTileCopy}>
        <Text style={[styles.actionTileTitle, accent && styles.actionTileTitleAccent]}>{title}</Text>
        <Text
          numberOfLines={2}
          style={[styles.actionTileDescription, accent && styles.actionTileDescriptionAccent]}>
          {description}
        </Text>
      </View>
      <Ionicons
        color={accent ? levelTheme.colors.background : levelTheme.colors.muted}
        name="arrow-forward"
        size={17}
      />
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

export function SegmentedTabs<T extends string>({
  items,
  value,
  onChange,
}: {
  items: { id: T; label: string; icon?: IconName }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <ScrollView
      horizontal
      contentContainerStyle={styles.segmentedContent}
      showsHorizontalScrollIndicator={false}
      style={styles.segmented}>
      {items.map((item) => {
        const selected = item.id === value;
        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            key={item.id}
            onPress={() => {
              void Haptics.selectionAsync();
              onChange(item.id);
            }}
            style={({ pressed }) => [
              styles.segment,
              selected && styles.segmentActive,
              pressed && styles.pressed,
            ]}>
            {item.icon ? (
              <Ionicons
                color={selected ? levelTheme.colors.background : levelTheme.colors.muted}
                name={item.icon}
                size={16}
              />
            ) : null}
            <Text style={[styles.segmentText, selected && styles.segmentTextActive]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function NativeModal({
  visible,
  title,
  description,
  children,
  onClose,
}: React.PropsWithChildren<{
  visible: boolean;
  title: string;
  description?: string;
  onClose: () => void;
}>) {
  const reducedMotion = useReducedMotion();
  return (
    <Modal
      animationType={reducedMotion ? 'none' : 'slide'}
      onRequestClose={onClose}
      presentationStyle="pageSheet"
      statusBarTranslucent
      transparent
      visible={visible}>
      <View style={styles.modalBackdrop}>
        <SafeAreaView edges={['top', 'bottom']} style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderCopy}>
              <Text style={styles.modalTitle}>{title}</Text>
              {description ? <Text style={styles.modalDescription}>{description}</Text> : null}
            </View>
            <Pressable
              accessibilityLabel="Fechar"
              accessibilityRole="button"
              hitSlop={12}
              onPress={onClose}
              style={styles.modalClose}>
              <Ionicons color={levelTheme.colors.text} name="close" size={22} />
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={styles.modalBody}
            keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

export function NativeField({
  label,
  hint,
  multiline,
  style,
  ...props
}: TextInputProps & {
  label: string;
  hint?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        multiline={multiline}
        placeholderTextColor={levelTheme.colors.muted}
        style={[styles.fieldInput, multiline && styles.fieldInputMultiline, style]}
        {...props}
      />
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

export function ChoiceChips<T extends string>({
  items,
  value,
  onChange,
}: {
  items: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.choices}>
      {items.map((item) => {
        const selected = item.value === value;
        return (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            key={item.value}
            onPress={() => onChange(item.value)}
            style={[styles.choice, selected && styles.choiceActive]}>
            <Text style={[styles.choiceText, selected && styles.choiceTextActive]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ToggleRow({
  title,
  description,
  value,
  onChange,
}: {
  title: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>{title}</Text>
        {description ? <Text style={styles.rowSubtitle}>{description}</Text> : null}
      </View>
      <Switch
        accessibilityLabel={title}
        onValueChange={onChange}
        thumbColor={value ? levelTheme.colors.background : '#D8E2E0'}
        trackColor={{ false: '#354440', true: levelTheme.colors.primary }}
        value={value}
      />
    </View>
  );
}

export function ProgressBar({ value }: { value: number }) {
  const width = `${Math.max(0, Math.min(100, value))}%` as `${number}%`;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value) }}
      style={styles.progressTrack}>
      <View style={[styles.progressFill, { width }]} />
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
  actionTile: {
    alignItems: 'center',
    backgroundColor: levelTheme.colors.surface,
    borderColor: levelTheme.colors.border,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 12,
    minHeight: 86,
    padding: 14,
    width: '100%',
  },
  actionTileAccent: {
    backgroundColor: levelTheme.colors.primary,
    borderColor: levelTheme.colors.primary,
  },
  actionTilePressed: {
    opacity: 0.72,
    transform: [{ scale: 0.985 }],
  },
  actionTileIcon: {
    alignItems: 'center',
    backgroundColor: levelTheme.colors.primaryMuted,
    borderRadius: 12,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  actionTileIconAccent: {
    backgroundColor: 'rgba(6, 17, 15, 0.12)',
  },
  actionTileCopy: {
    flex: 1,
    gap: 3,
  },
  actionTileTitle: {
    color: levelTheme.colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  actionTileDescription: {
    color: levelTheme.colors.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  actionTileDescriptionAccent: {
    color: 'rgba(6, 17, 15, 0.72)',
  },
  actionTileTitleAccent: {
    color: levelTheme.colors.background,
  },
  empty: { alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 32 },
  emptyTitle: { color: levelTheme.colors.text, fontSize: 16, fontWeight: '600', marginTop: 4 },
  emptyDescription: { color: levelTheme.colors.muted, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  error: { alignItems: 'center', backgroundColor: '#2D1517', borderRadius: 14, gap: 8, padding: 18 },
  errorText: { color: levelTheme.colors.danger, fontSize: 14 },
  retry: { color: levelTheme.colors.text, fontSize: 14, fontWeight: '700' },
  segmented: { marginHorizontal: -20 },
  segmentedContent: { gap: 8, paddingHorizontal: 20 },
  segment: {
    alignItems: 'center',
    borderColor: levelTheme.colors.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 7,
    minHeight: 42,
    paddingHorizontal: 14,
  },
  segmentActive: {
    backgroundColor: levelTheme.colors.primary,
    borderColor: levelTheme.colors.primary,
  },
  segmentText: { color: levelTheme.colors.muted, fontSize: 13, fontWeight: '700' },
  segmentTextActive: { color: levelTheme.colors.background },
  modalBackdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.64)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#071310',
    borderColor: levelTheme.colors.border,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: StyleSheet.hairlineWidth,
    maxHeight: '94%',
  },
  modalHeader: {
    alignItems: 'flex-start',
    borderBottomColor: levelTheme.colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 16,
    padding: 20,
  },
  modalHeaderCopy: { flex: 1, gap: 4 },
  modalTitle: { color: levelTheme.colors.text, fontSize: 22, fontWeight: '700' },
  modalDescription: { color: levelTheme.colors.muted, fontSize: 13, lineHeight: 19 },
  modalClose: {
    alignItems: 'center',
    backgroundColor: levelTheme.colors.surfaceRaised,
    borderRadius: 999,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  modalBody: { gap: 18, padding: 20, paddingBottom: 36 },
  field: { gap: 7 },
  fieldLabel: { color: levelTheme.colors.text, fontSize: 13, fontWeight: '600' },
  fieldInput: {
    backgroundColor: levelTheme.colors.surface,
    borderColor: levelTheme.colors.border,
    borderRadius: 14,
    borderWidth: 1,
    color: levelTheme.colors.text,
    fontSize: 15,
    minHeight: 50,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  fieldInputMultiline: { minHeight: 104, textAlignVertical: 'top' },
  fieldHint: { color: levelTheme.colors.muted, fontSize: 11, lineHeight: 16 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: {
    borderColor: levelTheme.colors.border,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 40,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  choiceActive: {
    backgroundColor: levelTheme.colors.primaryMuted,
    borderColor: levelTheme.colors.primary,
  },
  choiceText: { color: levelTheme.colors.muted, fontSize: 13, fontWeight: '600' },
  choiceTextActive: { color: levelTheme.colors.primary },
  toggleRow: {
    alignItems: 'center',
    borderBottomColor: levelTheme.colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 16,
    minHeight: 68,
    paddingVertical: 10,
  },
  progressTrack: {
    backgroundColor: levelTheme.colors.surfaceRaised,
    borderRadius: 999,
    height: 8,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: levelTheme.colors.primary,
    borderRadius: 999,
    height: '100%',
  },
});
