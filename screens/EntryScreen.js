import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function EntryScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>TuitionTrack</Text>
      <Text style={styles.subtitle}>Foundation entry screen (Chunk 1)</Text>
      <Pressable style={styles.button} onPress={() => navigation.navigate('Login')}>
        <Text style={styles.buttonLabel}>Go to Login</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtitle: {
    marginTop: 8,
    color: '#475569',
  },
  button: {
    marginTop: 20,
    backgroundColor: '#1D4ED8',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
  },
  buttonLabel: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
