import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { levelTheme } from '@/constants/level-theme';
import { appConfig } from '@/lib/config';

function avatarUrl(avatar: string | null | undefined) {
  if (!avatar) return null;
  return avatar.startsWith('http')
    ? avatar
    : `${appConfig.apiUrl}/${avatar.replace(/^\/+/, '')}`;
}

function initials(name: string | null | undefined) {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'LO';
  return `${parts[0]?.[0] ?? ''}${parts.length > 1 ? parts.at(-1)?.[0] ?? '' : ''}`.toUpperCase();
}

export function ProfileAvatar({
  avatar,
  name,
  onPress,
  size = 46,
}: {
  avatar?: string | null;
  name?: string | null;
  onPress?: () => void;
  size?: number;
}) {
  const source = avatarUrl(avatar);
  const content = (
    <View
      style={[
        styles.frame,
        { borderRadius: size / 2, height: size, width: size },
      ]}>
      {source ? (
        <Image
          accessibilityLabel={`Foto de ${name || 'perfil'}`}
          contentFit="cover"
          source={{ uri: source }}
          style={{ height: size, width: size }}
          transition={160}
        />
      ) : (
        <Text adjustsFontSizeToFit numberOfLines={1} style={[styles.initials, { fontSize: size * 0.31 }]}>
          {initials(name)}
        </Text>
      )}
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable
      accessibilityHint="Abre seu perfil"
      accessibilityLabel="Abrir perfil"
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      {content}
      <View style={styles.status}>
        <Ionicons color={levelTheme.colors.background} name="chevron-forward" size={10} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { position: 'relative' },
  frame: {
    alignItems: 'center',
    backgroundColor: levelTheme.colors.primaryMuted,
    borderColor: 'rgba(49, 230, 212, 0.42)',
    borderWidth: 1,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initials: {
    color: levelTheme.colors.primary,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  pressed: { opacity: 0.72, transform: [{ scale: 0.96 }] },
  status: {
    alignItems: 'center',
    backgroundColor: levelTheme.colors.primary,
    borderColor: levelTheme.colors.background,
    borderRadius: 999,
    borderWidth: 2,
    bottom: -2,
    height: 18,
    justifyContent: 'center',
    position: 'absolute',
    right: -2,
    width: 18,
  },
});
