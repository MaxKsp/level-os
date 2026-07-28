import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { levelTheme } from '@/constants/level-theme';

export function LevelMark({ size = 38 }: { size?: number }) {
  return (
    <Svg
      accessibilityLabel="Símbolo do Level OS"
      height={size}
      role="img"
      viewBox="0 0 512 512"
      width={size}>
      <Rect fill="#08090C" height="512" rx="104" width="512" />
      <Path
        d="m112 338 144-144 144 144"
        fill="none"
        opacity={0.42}
        stroke="#31E6D4"
        strokeLinecap="square"
        strokeLinejoin="miter"
        strokeWidth="48"
      />
      <Path
        d="m112 246 144-144 144 144"
        fill="none"
        stroke="#31E6D4"
        strokeLinecap="square"
        strokeLinejoin="miter"
        strokeWidth="48"
      />
    </Svg>
  );
}

export function LevelLogo({
  size = 38,
  showName = true,
}: {
  size?: number;
  showName?: boolean;
}) {
  return (
    <View accessibilityLabel="Level OS" style={styles.brand}>
      <View
        style={[
          styles.icon,
          {
            borderRadius: Math.max(8, Math.round(size * 0.22)),
            height: size,
            width: size,
          },
        ]}>
        <LevelMark size={size} />
      </View>
      {showName ? <Text style={styles.name}>LEVEL OS</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  brand: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 11,
  },
  icon: {
    backgroundColor: levelTheme.colors.background,
    borderColor: 'rgba(49, 230, 212, 0.24)',
    borderWidth: 1,
  },
  name: {
    color: levelTheme.colors.text,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1.6,
  },
});
