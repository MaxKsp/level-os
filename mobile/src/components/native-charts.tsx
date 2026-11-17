import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
  size = 220,
  format = (value) => String(value),
}: {
  segments: { value: number; color: string; label: string }[];
  size?: number;
  format?: (value: number) => string;
}) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const total = Math.max(1, segments.reduce((sum, item) => sum + Math.max(0, item.value), 0));
  const selected = selectedIndex === null ? null : segments[selectedIndex];
  let offset = 0;

  return (
    <View style={styles.donutStack}>
      <View style={[styles.donutChart, { height: size, width: size }]}>
        <Svg height={size} viewBox="0 0 120 120" width={size}>
          <Circle
            cx="60"
            cy="60"
            fill="none"
            r={radius}
            stroke={levelTheme.colors.surfaceRaised}
            strokeWidth="15"
          />
          {segments.map((segment, index) => {
            const length = circumference * (Math.max(0, segment.value) / total);
            const gap = Math.min(3.5, length * 0.08);
            const visibleLength = Math.max(0, length - gap);
            const dashOffset = -offset;
            offset += length;
            return (
              <Circle
                accessibilityLabel={`${segment.label}: ${format(segment.value)}`}
                cx="60"
                cy="60"
                fill="none"
                key={segment.label}
                onPress={() => setSelectedIndex((current) => current === index ? null : index)}
                opacity={selectedIndex === null || selectedIndex === index ? 1 : 0.28}
                r={radius}
                stroke={segment.color}
                strokeDasharray={`${visibleLength} ${circumference - visibleLength}`}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                strokeWidth={selectedIndex === index ? 18 : 15}
                transform="rotate(-90 60 60)"
              />
            );
          })}
        </Svg>
        <View pointerEvents="none" style={styles.donutCenter}>
          <Text numberOfLines={1} style={styles.donutCenterLabel}>
            {selected?.label ?? 'Total'}
          </Text>
          <Text adjustsFontSizeToFit numberOfLines={1} style={styles.donutCenterValue}>
            {format(selected?.value ?? total)}
          </Text>
          <Text style={styles.donutCenterPercent}>
            {selected
              ? `${((selected.value / total) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
              : `${segments.length} categorias`}
          </Text>
        </View>
      </View>
      <View style={styles.legend}>
        {segments.map((segment, index) => {
          const percentage = (segment.value / total) * 100;
          return (
            <Pressable
              accessibilityLabel={`${segment.label}: ${format(segment.value)}, ${percentage.toFixed(1)}%`}
              accessibilityRole="button"
              key={segment.label}
              onPress={() => setSelectedIndex((current) => current === index ? null : index)}
              style={({ pressed }) => [
                styles.legendItem,
                selectedIndex === index && styles.legendItemActive,
                pressed && styles.legendItemPressed,
              ]}>
              <View style={[styles.legendBar, { backgroundColor: segment.color }]} />
              <View style={styles.legendCopy}>
                <Text numberOfLines={1} style={styles.legendText}>{segment.label}</Text>
                <Text style={styles.legendPercent}>
                  {percentage.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%
                </Text>
              </View>
              <Text style={styles.legendValue}>{format(segment.value)}</Text>
            </Pressable>
          );
        })}
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
  donutCenter: {
    alignItems: 'center',
    bottom: 42,
    justifyContent: 'center',
    left: 42,
    position: 'absolute',
    right: 42,
    top: 42,
  },
  donutCenterLabel: {
    color: levelTheme.colors.muted,
    fontSize: 11,
    maxWidth: 112,
  },
  donutCenterPercent: {
    color: levelTheme.colors.muted,
    fontSize: 10,
    marginTop: 3,
  },
  donutCenterValue: {
    color: levelTheme.colors.text,
    fontSize: 19,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    marginTop: 4,
    maxWidth: 130,
  },
  donutChart: {
    alignSelf: 'center',
    position: 'relative',
  },
  donutStack: { gap: 18 },
  legend: {
    borderTopColor: levelTheme.colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  legendBar: {
    borderRadius: 3,
    height: 28,
    width: 4,
  },
  legendCopy: {
    flex: 1,
    gap: 2,
  },
  legendItem: {
    alignItems: 'center',
    borderBottomColor: levelTheme.colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 11,
    minHeight: 54,
    paddingHorizontal: 4,
  },
  legendItemActive: {
    backgroundColor: 'rgba(49, 230, 212, 0.06)',
  },
  legendItemPressed: {
    opacity: 0.65,
  },
  legendPercent: {
    color: levelTheme.colors.muted,
    fontSize: 10,
  },
  legendText: {
    color: levelTheme.colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  legendValue: {
    color: levelTheme.colors.text,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
  },
});
