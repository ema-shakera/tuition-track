import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function ScreenHeader({
  title,
  subtitle,
  onBackPress,
  backLabel = 'Back',
  rightAction,
  containerStyle,
}) {
  return (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.row}>
        {onBackPress ? (
          <Pressable
            onPress={onBackPress}
            accessibilityRole="button"
            accessibilityLabel={backLabel}
            hitSlop={8}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <Text style={styles.backLabel}>{backLabel}</Text>
          </Pressable>
        ) : (
          <View style={styles.backSpacer} />
        )}
        <View style={styles.rightAction}>{rightAction}</View>
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 32,
  },
  backButton: {
    minHeight: 32,
    justifyContent: 'center',
    paddingRight: 12,
  },
  backLabel: {
    color: '#1D4ED8',
    fontSize: 15,
    fontWeight: '600',
  },
  backSpacer: {
    width: 56,
  },
  rightAction: {
    minWidth: 56,
    alignItems: 'flex-end',
  },
  title: {
    marginTop: 10,
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: '#64748B',
  },
  pressed: {
    opacity: 0.75,
  },
});
