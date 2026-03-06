import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const STATUS_THEME = {
  pending: { backgroundColor: '#FEF9C3', textColor: '#854D0E' },
  submitted: { backgroundColor: '#DBEAFE', textColor: '#1E40AF' },
  completed: { backgroundColor: '#DCFCE7', textColor: '#166534' },
  overdue: { backgroundColor: '#FEE2E2', textColor: '#991B1B' },
};

export default function HomeworkCard({
  title,
  subject,
  dueDate,
  status = 'pending',
  description,
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
      accessibilityLabel={`Homework card ${title}`}
      style={({ pressed }) => [styles.card, disabled && styles.cardDisabled, pressed && onPress && styles.pressed, style]}
    >
      <View style={styles.topRow}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        <View style={[styles.badge, { backgroundColor: palette.backgroundColor }]}>
          <Text style={[styles.badgeText, { color: palette.textColor }]}>{status}</Text>
        </View>
      </View>

      {subject ? <Text style={styles.subject}>{subject}</Text> : null}
      {description ? (
        <Text style={styles.description} numberOfLines={2}>
          {description}
        </Text>
      ) : null}
      {dueDate ? <Text style={styles.meta}>Due: {dueDate}</Text> : null}
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
    gap: 6,
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
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
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
  subject: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    color: '#64748B',
  },
  meta: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  pressed: {
    opacity: 0.85,
  },
});
