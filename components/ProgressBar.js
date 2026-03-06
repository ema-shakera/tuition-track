import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function ProgressBar({
  progress = 0,
  label,
  showPercent = true,
  color = '#1D4ED8',
  trackColor = '#E2E8F0',
  style,
}) {
  const clamped = useMemo(() => Math.max(0, Math.min(1, progress)), [progress]);
  const percent = Math.round(clamped * 100);

  return (
    <View style={[styles.container, style]}>
      {(label || showPercent) && (
        <View style={styles.headerRow}>
          {label ? <Text style={styles.label}>{label}</Text> : <View />}
          {showPercent ? <Text style={styles.percent}>{percent}%</Text> : null}
        </View>
      )}
      <View style={[styles.track, { backgroundColor: trackColor }]}>
        <View style={[styles.fill, { width: `${percent}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  headerRow: {
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
  },
  percent: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '700',
  },
  track: {
    width: '100%',
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
});
