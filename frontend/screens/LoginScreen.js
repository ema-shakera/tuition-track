import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import {
  PrimaryButton,
  PasswordInputField,
  ScreenHeader,
  SecondaryButton,
  StatusBanner,
  TextInputField,
} from '../components';
import { ROUTES } from '../navigation/routes';
import { clearAuthError, selectAuthError, selectAuthLoading } from '../redux/slices/authSlice';
import { loginUser } from '../redux/thunks/authThunks';

export default function LoginScreen({ navigation }) {
  const dispatch = useDispatch();
  const isLoading = useSelector(selectAuthLoading);
  const error = useSelector(selectAuthError);
  const [email, setEmail] = useState('teacher@tuitiontrack.dev');
  const [password, setPassword] = useState('Password123');
  const [submitError, setSubmitError] = useState('');

  const emailError = useMemo(() => {
    if (!email.trim()) {
      return '';
    }
    return /\S+@\S+\.\S+/.test(email.trim()) ? '' : 'Enter a valid email address.';
  }, [email]);

  const passwordError = useMemo(() => {
    if (!password) {
      return '';
    }
    return password.length >= 6 ? '' : 'Password must be at least 6 characters.';
  }, [password]);

  const handleLogin = async () => {
    dispatch(clearAuthError());
    setSubmitError('');

    if (!email.trim() || !password) {
      setSubmitError('Email and password are required.');
      return;
    }

    if (emailError || passwordError) {
      setSubmitError('Please fix form errors before continuing.');
      return;
    }

    try {
      await dispatch(loginUser({ email: email.trim().toLowerCase(), password })).unwrap();
    } catch (thunkError) {
      const normalizedError = String(thunkError || 'Login failed. Please try again.');
      setSubmitError(normalizedError);

      if (normalizedError.toLowerCase().includes('verify')) {
        navigation.navigate(ROUTES.VERIFY_EMAIL);
      }
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 16 : 0}
        style={styles.flex}
      >
        <ScreenHeader
          title="Welcome back"
          subtitle="Sign in with Firebase Auth."
          onBackPress={() => navigation.navigate(ROUTES.ENTRY)}
          backLabel="Entry"
        />

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {(error || submitError) ? (
            <StatusBanner
              type="error"
              title="Unable to continue"
              message={submitError || error}
              onClose={() => {
                dispatch(clearAuthError());
                setSubmitError('');
              }}
            />
          ) : null}

          <TextInputField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            error={emailError}
            autoCapitalize="none"
          />

          <PasswordInputField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            error={passwordError}
          />

          <PrimaryButton label="Sign In" loading={isLoading} onPress={handleLogin} />
          <SecondaryButton
            label="Create account"
            disabled={isLoading}
            onPress={() => navigation.navigate(ROUTES.REGISTER)}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 14,
  },
});
