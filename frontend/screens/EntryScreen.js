import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { PrimaryButton, SecondaryButton, StatusBanner } from '../components';
import { ROUTES } from '../navigation/routes';
import { clearAuthError, selectAuthError, selectAuthLoading } from '../redux/slices/authSlice';

export default function EntryScreen({ navigation }) {
  const dispatch = useDispatch();
  const error = useSelector(selectAuthError);
  const isLoading = useSelector(selectAuthLoading);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>TuitionTrack</Text>
        <Text style={styles.subtitle}>Track tuition, homework, and progress in one place.</Text>

        {error ? (
          <StatusBanner
            type="error"
            title="Session notice"
            message={error}
            onClose={() => dispatch(clearAuthError())}
            style={styles.banner}
          />
        ) : null}

        <View style={styles.actions}>
          <PrimaryButton
            label="Continue to Login"
            loading={isLoading}
            onPress={() => {
              dispatch(clearAuthError());
              navigation.navigate(ROUTES.LOGIN);
            }}
          />
          <SecondaryButton
            label="Create account"
            disabled={isLoading}
            onPress={() => {
              dispatch(clearAuthError());
              navigation.navigate(ROUTES.REGISTER);
            }}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: '#475569',
  },
  banner: {
    marginTop: 20,
  },
  actions: {
    marginTop: 22,
    gap: 12,
  },
});
