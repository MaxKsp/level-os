import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { levelTheme } from '@/constants/level-theme';

export function AnimatedNumber({
  value,
  format,
  duration = 700,
}: {
  value: number;
  format: (value: number) => string;
  duration?: number;
}) {
  const reducedMotion = useReducedMotion();
  const [display, setDisplay] = useState(reducedMotion ? value : 0);

  useEffect(() => {
    if (reducedMotion) {
      setDisplay(value);
      return;
    }
    const from = display;
    const started = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + (value - from) * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // `display` is intentionally captured once as the animation start.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration, reducedMotion, value]);

  return <Text style={styles.number}>{format(display)}</Text>;
}

export function Sparkline({
  values,
  height = 120,
}: {
  values: number[];
  height?: number;
}) {
  const width = 360;
  const points = useMemo(() => {
    if (!values.length) return [];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = Math.max(1, max - min);
    return values.map((value, index) => ({
      x: values.length === 1 ? width / 2 : (index / (values.length - 1)) * width,
      y: height - 12 - ((value - min) / span) * (height - 24),
    }));
  }, [height, values]);

  if (!points.length) return null;
  const path = points.map((point, index) =>
    `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');
  const area = `${path} L ${width} ${height} L 0 ${height} Z`;

  return (
    <View style={[styles.chart, { height }]}>
      <Svg height="100%" preserveAspectRatio="none" viewBox={`0 0 ${width} ${height}`} width="100%">
        <Defs>
          <LinearGradient id="levelArea" x1="0" x2="0" y1="0" y2="1">
            <Stop offset="0" stopColor={levelTheme.colors.primary} stopOpacity="0.28" />
            <Stop offset="1" stopColor={levelTheme.colors.primary} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Path d={area} fill="url(#levelArea)" />
        <Path
          d={path}
          fill="none"
          stroke={levelTheme.colors.primary}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.4"
        />
        {points.map((point, index) => (
          <Circle
            cx={point.x}
            cy={point.y}
            fill={levelTheme.colors.background}
            key={`${point.x}-${index}`}
            r="3"
            stroke={levelTheme.colors.primary}
            strokeWidth="1.6"
          />
        ))}
      </Svg>
    </View>
  );
}

export function Donut({
  segments,
  size = 132,
}: {
  segments: { value: number; color: string; label: string }[];
  size?: number;
}) {
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const total = Math.max(1, segments.reduce((sum, item) => sum + Math.max(0, item.value), 0));
  let offset = 0;
  return (
    <View style={styles.donutRow}>
      <Svg height={size} viewBox="0 0 120 120" width={size}>
        <Circle cx="60" cy="60" fill="none" r={radius} stroke={levelTheme.colors.surfaceRaised} strokeWidth="14" />
        {segments.map((segment) => {
          const length = circumference * (Math.max(0, segment.value) / total);
          const dashOffset = -offset;
          offset += length;
          return (
            <Circle
              cx="60"
              cy="60"
              fill="none"
              key={segment.label}
              r={radius}
              rotation="-90"
              stroke={segment.color}
              strokeDasharray={`${length} ${circumference - length}`}
              strokeDashoffset={dashOffset}
              strokeLinecap="butt"
              strokeWidth="14"
              transform="rotate(-90 60 60)"
            />
          );
        })}
      </Svg>
      <View style={styles.legend}>
        {segments.map((segment) => (
          <View key={segment.label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: segment.color }]} />
            <Text style={styles.legendText}>{segment.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  number: {
    color: levelTheme.colors.text,
    fontSize: 25,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    letterSpacing: -0.7,
  },
  chart: { overflow: 'hidden', width: '100%' },
  donutRow: { alignItems: 'center', flexDirection: 'row', gap: 18 },
  legend: { flex: 1, gap: 9 },
  legendItem: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  legendDot: { borderRadius: 99, height: 9, width: 9 },
  legendText: { color: levelTheme.colors.muted, flex: 1, fontSize: 12 },
});
