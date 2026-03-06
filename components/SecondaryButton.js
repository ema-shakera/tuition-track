import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

export default function SecondaryButton({
  label,
  onPress,
  disabled = false,
  fullWidth = true,
  accessibilityLabel,
  style,
  textStyle,
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      style={({ pressed }) => [
        styles.button,
        fullWidth && styles.fullWidth,
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      <Text style={[styles.label, disabled && styles.labelDisabled, textStyle]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1D4ED8',
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  fullWidth: {
    width: '100%',
  },
  label: {
    color: '#1D4ED8',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonDisabled: {
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  labelDisabled: {
    color: '#94A3B8',
  },
  pressed: {
    opacity: 0.85,
  },
});
