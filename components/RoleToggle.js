import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const DEFAULT_OPTIONS = [
  { label: 'Teacher', value: 'teacher' },
  { label: 'Student', value: 'student' },
];

export default function RoleToggle({
  value,
  onChange,
  options = DEFAULT_OPTIONS,
  disabled = false,
  accessibilityLabel = 'Select role',
}) {
  return (
    <View accessible accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel} style={styles.container}>
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange?.(option.value)}
            disabled={disabled}
            accessibilityRole="radio"
            accessibilityState={{ selected: isActive, disabled }}
            accessibilityLabel={option.label}
            style={({ pressed }) => [
              styles.option,
              isActive && styles.optionActive,
              disabled && styles.optionDisabled,
              pressed && !disabled && styles.pressed,
            ]}
          >
            <Text style={[styles.optionLabel, isActive && styles.optionLabelActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    padding: 4,
    flexDirection: 'row',
    gap: 8,
  },
  option: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionActive: {
    backgroundColor: '#1D4ED8',
  },
  optionDisabled: {
    opacity: 0.65,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
  },
  optionLabelActive: {
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.85,
  },
});
