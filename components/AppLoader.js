import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

export default function AppLoader({
  label = 'Loading...',
  fullScreen = true,
  size = 'large',
  color = '#1D4ED8',
}) {
  return (
    <View style={[styles.container, !fullScreen && styles.inlineContainer]}>
      <ActivityIndicator size={size} color={color} accessibilityLabel="Loading indicator" />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  inlineContainer: {
    flex: 0,
    paddingVertical: 16,
  },
  label: {
    marginTop: 12,
    color: '#475569',
    fontSize: 14,
  },
});
