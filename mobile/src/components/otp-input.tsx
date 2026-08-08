import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { levelTheme } from '@/constants/level-theme';

export type NativeOtpStatus = 'idle' | 'error' | 'success';

function OtpCell({
  digit,
  index,
  length,
  progress,
  inputRef,
  onChange,
  onKeyPress,
  disabled,
}: {
  digit: string;
  index: number;
  length: number;
  progress: SharedValue<number>;
  inputRef: (input: TextInput | null) => void;
  onChange: (text: string) => void;
  onKeyPress: (key: string) => void;
  disabled?: boolean;
}) {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [1, 0]),
    transform: [{ translateX: ((length - 1) / 2 - index) * 48 * progress.value }, { scale: 1 - progress.value * .26 }],
  }));

  return (
    <Animated.View style={style}>
      <TextInput
        ref={inputRef}
        accessibilityLabel={`Código de verificação, dígito ${index + 1} de ${length}`}
        autoComplete={index === 0 ? 'one-time-code' : 'off'}
        editable={!disabled}
        keyboardType="number-pad"
        maxLength={length}
        onChangeText={onChange}
        onKeyPress={(event) => onKeyPress(event.nativeEvent.key)}
        selectTextOnFocus
        style={styles.cell}
        textContentType={index === 0 ? 'oneTimeCode' : 'none'}
        value={digit}
      />
    </Animated.View>
  );
}

export function NativeOtpInput({
  value,
  onChange,
  status = 'idle',
  disabled,
  length = 6,
  label = 'Código do autenticador',
  hint = 'Cole o código ou digite os seis números.',
}: {
  value: string;
  onChange: (value: string) => void;
  status?: NativeOtpStatus;
  disabled?: boolean;
  length?: number;
  label?: string;
  hint?: string;
}) {
  const refs = useRef<(TextInput | null)[]>([]);
  const reduceMotion = useReducedMotion();
  const success = useSharedValue(status === 'success' ? 1 : 0);
  const shake = useSharedValue(0);
  const clean = value.replace(/\D/g, '').slice(0, length);
  const digits = Array.from({ length }, (_, index) => clean[index] || '');

  useEffect(() => {
    success.value = withTiming(status === 'success' ? 1 : 0, {
      duration: reduceMotion ? 0 : 280,
      easing: Easing.out(Easing.cubic),
    });
    if (status === 'success') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (status === 'error') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      shake.value = reduceMotion ? 0 : withSequence(
        withTiming(-5, { duration: 55 }),
        withTiming(5, { duration: 70 }),
        withTiming(-3, { duration: 60 }),
        withTiming(0, { duration: 55 }),
      );
    }
  }, [reduceMotion, shake, status, success]);

  const groupStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));
  const successStyle = useAnimatedStyle(() => ({
    opacity: success.value,
    transform: [{ scale: .74 + success.value * .26 }],
  }));

  const updateAt = (index: number, text: string) => {
    const incoming = text.replace(/\D/g, '');
    if (incoming.length > 1) {
      const pasted = incoming.slice(0, length);
      onChange(pasted);
      refs.current[Math.min(pasted.length, length) - 1]?.focus();
      return;
    }
    const next = digits.slice();
    next[index] = incoming.slice(-1);
    onChange(next.join(''));
    if (incoming && index < length - 1) refs.current[index + 1]?.focus();
  };

  return (
    <View style={styles.root}>
      <Text style={styles.label}>{label}</Text>
      <Animated.View accessibilityRole="none" style={[styles.group, groupStyle]}>
        {digits.map((digit, index) => (
          <OtpCell
            key={index}
            digit={digit}
            disabled={disabled}
            index={index}
            inputRef={(input) => { refs.current[index] = input; }}
            length={length}
            onChange={(text) => updateAt(index, text)}
            onKeyPress={(key) => {
              if (key === 'Backspace' && !digit && index > 0) {
                const next = digits.slice();
                next[index - 1] = '';
                onChange(next.join(''));
                refs.current[index - 1]?.focus();
              }
            }}
            progress={success}
          />
        ))}
        <Animated.View accessibilityLiveRegion="polite" style={[styles.success, successStyle]}>
          <View style={styles.successIcon}><Ionicons color={levelTheme.colors.success} name="checkmark" size={25} /></View>
        </Animated.View>
      </Animated.View>
      <Text style={[styles.hint, status === 'error' && styles.error, status === 'success' && styles.verified]}>
        {status === 'error' ? 'Código inválido ou expirado.' : status === 'success' ? 'Verificado com sucesso' : hint}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 9 },
  label: { color: levelTheme.colors.text, fontSize: 13, fontWeight: '600' },
  group: { alignItems: 'center', flexDirection: 'row', gap: 6, justifyContent: 'center', minHeight: 52, position: 'relative' },
  cell: {
    backgroundColor: levelTheme.colors.surfaceRaised,
    borderColor: levelTheme.colors.border,
    borderRadius: 11,
    borderWidth: 1,
    color: levelTheme.colors.text,
    fontSize: 18,
    fontWeight: '700',
    height: 50,
    padding: 0,
    textAlign: 'center',
    width: 44,
  },
  success: { alignItems: 'center', bottom: 0, justifyContent: 'center', left: 0, position: 'absolute', right: 0, top: 0 },
  successIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(103, 211, 145, 0.12)',
    borderColor: 'rgba(103, 211, 145, 0.38)',
    borderRadius: 12,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  hint: { color: levelTheme.colors.muted, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  error: { color: levelTheme.colors.danger },
  verified: { color: levelTheme.colors.success, fontWeight: '600' },
});
