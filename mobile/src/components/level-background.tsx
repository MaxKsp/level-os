import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const GRID_LINES = Array.from({ length: 9 }, (_, index) => index);
const PARTICLES = [
  { left: '8%', top: '15%', size: 3 },
  { left: '18%', top: '68%', size: 2 },
  { left: '31%', top: '34%', size: 2 },
  { left: '46%', top: '82%', size: 3 },
  { left: '58%', top: '18%', size: 2 },
  { left: '71%', top: '58%', size: 3 },
  { left: '84%', top: '28%', size: 2 },
  { left: '92%', top: '76%', size: 2 },
] as const;

export function LevelBackground() {
  const reducedMotion = useReducedMotion();
  const drift = useSharedValue(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) {
      drift.value = 0.35;
      pulse.value = 0.5;
      return;
    }

    drift.value = withRepeat(
      withTiming(1, { duration: 18_000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    pulse.value = withRepeat(
      withTiming(1, { duration: 8_000, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );

    return () => {
      cancelAnimation(drift);
      cancelAnimation(pulse);
    };
  }, [drift, pulse, reducedMotion]);

  const upperGlow = useAnimatedStyle(() => ({
    opacity: 0.18 + pulse.value * 0.12,
    transform: [
      { translateX: -34 + drift.value * 78 },
      { translateY: -18 + drift.value * 46 },
      { scale: 0.92 + pulse.value * 0.12 },
    ],
  }));

  const lowerGlow = useAnimatedStyle(() => ({
    opacity: 0.12 + (1 - pulse.value) * 0.1,
    transform: [
      { translateX: 44 - drift.value * 92 },
      { translateY: 34 - drift.value * 42 },
      { scale: 1.04 - pulse.value * 0.08 },
    ],
  }));

  const orbit = useAnimatedStyle(() => ({
    opacity: 0.16 + pulse.value * 0.08,
    transform: [
      { rotate: `${drift.value * 14 - 7}deg` },
      { scale: 0.96 + pulse.value * 0.05 },
    ],
  }));

  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none" style={styles.root}>
      <LinearGradient
        colors={['#06110F', '#071310', '#06100F']}
        locations={[0, 0.56, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.grid}>
        {GRID_LINES.map((index) => (
          <View key={`horizontal-${index}`} style={[styles.horizontal, { top: `${index * 12.5}%` }]} />
        ))}
        {GRID_LINES.map((index) => (
          <View key={`vertical-${index}`} style={[styles.vertical, { left: `${index * 12.5}%` }]} />
        ))}
      </View>

      <Animated.View style={[styles.glow, styles.upperGlow, upperGlow]} />
      <Animated.View style={[styles.glow, styles.lowerGlow, lowerGlow]} />
      <Animated.View style={[styles.orbit, orbit]} />

      {PARTICLES.map((particle, index) => (
        <View
          key={`${particle.left}-${particle.top}`}
          style={[
            styles.particle,
            {
              height: particle.size,
              left: particle.left,
              opacity: index % 2 === 0 ? 0.34 : 0.2,
              top: particle.top,
              width: particle.size,
            },
          ]}
        />
      ))}

      <LinearGradient
        colors={['rgba(6,17,15,0.04)', 'rgba(6,17,15,0.54)', '#06110F']}
        locations={[0, 0.68, 1]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  grid: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.42,
    transform: [{ rotate: '-7deg' }, { scale: 1.16 }],
  },
  horizontal: {
    backgroundColor: 'rgba(49,230,212,0.045)',
    height: StyleSheet.hairlineWidth,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  vertical: {
    backgroundColor: 'rgba(49,230,212,0.04)',
    bottom: 0,
    position: 'absolute',
    top: 0,
    width: StyleSheet.hairlineWidth,
  },
  glow: {
    backgroundColor: 'rgba(49,230,212,0.24)',
    borderRadius: 999,
    position: 'absolute',
  },
  upperGlow: {
    height: 280,
    right: -122,
    top: -84,
    width: 280,
  },
  lowerGlow: {
    bottom: -154,
    height: 340,
    left: -176,
    width: 340,
  },
  orbit: {
    borderColor: 'rgba(49,230,212,0.13)',
    borderRadius: 999,
    borderWidth: 1,
    height: 330,
    position: 'absolute',
    right: -184,
    top: '31%',
    width: 330,
  },
  particle: {
    backgroundColor: '#78FFF0',
    borderRadius: 999,
    position: 'absolute',
  },
});
