import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

export default function AppLoader({ label = 'Loading...' }) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#1D4ED8" />
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
  label: {
    marginTop: 12,
    color: '#475569',
    fontSize: 14,
  },
});
