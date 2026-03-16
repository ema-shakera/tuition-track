import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

function StatCard({
  label,
  value,
  caption,
  trend,
  trendDirection = 'neutral',
  style,
}) {
  return (
    <View style={[styles.card, style]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
      {trend ? (
        <Text
          style={[
            styles.trend,
            trendDirection === 'up' && styles.trendUp,
            trendDirection === 'down' && styles.trendDown,
          ]}
        >
          {trend}
        </Text>
      ) : null}
    </View>
  );
}

export default React.memo(StatCard);

const styles = StyleSheet.create({
  card: {
    minWidth: 140,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 4,
  },
  label: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  value: {
    fontSize: 28,
    color: '#0F172A',
    fontWeight: '800',
  },
  caption: {
    fontSize: 12,
    color: '#94A3B8',
  },
  trend: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  trendUp: {
    color: '#16A34A',
  },
  trendDown: {
    color: '#DC2626',
  },
});
