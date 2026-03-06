import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import TextInputField from './TextInputField';

export default function PasswordInputField({
  initiallyVisible = false,
  toggleVisibilityLabel,
  ...props
}) {
  const [isVisible, setIsVisible] = useState(initiallyVisible);

  const label = useMemo(() => {
    if (toggleVisibilityLabel) {
      return toggleVisibilityLabel;
    }
    return isVisible ? 'Hide password' : 'Show password';
  }, [isVisible, toggleVisibilityLabel]);

  return (
    <TextInputField
      {...props}
      secureTextEntry={!isVisible}
      autoCapitalize="none"
      autoCorrect={false}
      rightAccessory={
        <Pressable
          onPress={() => setIsVisible((prev) => !prev)}
          accessibilityRole="button"
          accessibilityLabel={label}
          hitSlop={8}
          style={({ pressed }) => [styles.toggleButton, pressed && styles.pressed]}
        >
          <Text style={styles.toggleText}>{isVisible ? 'Hide' : 'Show'}</Text>
        </Pressable>
      }
    />
  );
}

const styles = StyleSheet.create({
  toggleButton: {
    minHeight: 30,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1D4ED8',
  },
  pressed: {
    opacity: 0.75,
  },
});
