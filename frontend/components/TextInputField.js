import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

export default function TextInputField({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  helperText,
  disabled = false,
  required = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  autoCorrect = false,
  secureTextEntry = false,
  rightAccessory,
  accessibilityLabel,
  containerStyle,
  inputStyle,
  ...rest
}) {
  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Text style={styles.label}>
          {label}
          {required ? <Text style={styles.required}> *</Text> : null}
        </Text>
      ) : null}
      <View style={[styles.inputRow, error && styles.inputRowError, disabled && styles.inputRowDisabled]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          editable={!disabled}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          secureTextEntry={secureTextEntry}
          accessibilityLabel={accessibilityLabel || label || placeholder}
          style={[styles.input, inputStyle]}
          {...rest}
        />
        {rightAccessory ? <View style={styles.rightAccessory}>{rightAccessory}</View> : null}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {!error && helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    marginBottom: 8,
    color: '#334155',
    fontSize: 14,
    fontWeight: '600',
  },
  required: {
    color: '#DC2626',
  },
  inputRow: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputRowError: {
    borderColor: '#DC2626',
  },
  inputRowDisabled: {
    backgroundColor: '#F8FAFC',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#0F172A',
    paddingVertical: 10,
  },
  rightAccessory: {
    marginLeft: 8,
  },
  helperText: {
    marginTop: 6,
    fontSize: 13,
    color: '#64748B',
  },
  errorText: {
    marginTop: 6,
    fontSize: 13,
    color: '#DC2626',
  },
});
