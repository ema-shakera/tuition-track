import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const THEME = {
  success: {
    backgroundColor: '#ECFDF3',
    borderColor: '#22C55E',
    titleColor: '#166534',
    bodyColor: '#166534',
  },
  error: {
    backgroundColor: '#FEF2F2',
    borderColor: '#EF4444',
    titleColor: '#991B1B',
    bodyColor: '#B91C1C',
  },
  info: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
    titleColor: '#1E3A8A',
    bodyColor: '#1D4ED8',
  },
};

export default function StatusBanner({
  type = 'info',
  title,
  message,
  onClose,
  actionLabel,
  onAction,
  style,
}) {
  const palette = THEME[type] || THEME.info;

  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.container,
        { backgroundColor: palette.backgroundColor, borderColor: palette.borderColor },
        style,
      ]}
    >
      <View style={styles.content}>
        {title ? <Text style={[styles.title, { color: palette.titleColor }]}>{title}</Text> : null}
        {message ? <Text style={[styles.message, { color: palette.bodyColor }]}>{message}</Text> : null}
        {actionLabel && onAction ? (
          <Pressable
            onPress={onAction}
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
          >
            <Text style={[styles.actionText, { color: palette.bodyColor }]}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
      {onClose ? (
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Dismiss status banner"
          hitSlop={8}
          style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
        >
          <Text style={[styles.closeText, { color: palette.bodyColor }]}>Dismiss</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  content: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
  },
  closeButton: {
    minHeight: 28,
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionButton: {
    marginTop: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.75,
  },
});
