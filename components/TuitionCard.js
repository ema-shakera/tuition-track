import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const STATUS_THEME = {
  paid: { backgroundColor: '#DCFCE7', textColor: '#166534' },
  pending: { backgroundColor: '#FEF9C3', textColor: '#854D0E' },
  overdue: { backgroundColor: '#FEE2E2', textColor: '#991B1B' },
};

export default function TuitionCard({
  studentName,
  subject,
  amount,
  dueDate,
  status = 'pending',
  note,
  onPress,
  disabled = false,
  style,
}) {
  const palette = STATUS_THEME[status] || STATUS_THEME.pending;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      accessibilityRole="button"
      accessibilityLabel={`Tuition card ${studentName || ''}`.trim()}
      style={({ pressed }) => [styles.card, disabled && styles.cardDisabled, pressed && onPress && styles.pressed, style]}
    >
      <View style={styles.topRow}>
        <View style={styles.titleWrap}>
          {studentName ? <Text style={styles.studentName}>{studentName}</Text> : null}
          {subject ? <Text style={styles.subject}>{subject}</Text> : null}
        </View>
        <View style={[styles.badge, { backgroundColor: palette.backgroundColor }]}>
          <Text style={[styles.badgeText, { color: palette.textColor }]}>{status}</Text>
        </View>
      </View>

      <Text style={styles.amount}>{amount}</Text>
      {dueDate ? <Text style={styles.meta}>Due: {dueDate}</Text> : null}
      {note ? (
        <Text style={styles.note} numberOfLines={2}>
          {note}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 14,
    gap: 8,
  },
  cardDisabled: {
    opacity: 0.6,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  titleWrap: {
    flex: 1,
    gap: 2,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  subject: {
    fontSize: 13,
    color: '#64748B',
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  amount: {
    fontSize: 24,
    color: '#1E293B',
    fontWeight: '800',
  },
  meta: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  note: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.85,
  },
});
