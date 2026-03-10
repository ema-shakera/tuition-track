import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import {
  PrimaryButton,
  PasswordInputField,
  RoleToggle,
  ScreenHeader,
  SecondaryButton,
  StatusBanner,
  TextInputField,
} from '../components';
import { ROUTES } from '../navigation/routes';
import { clearAuthError, selectAuthError, selectAuthLoading } from '../redux/slices/authSlice';
import { registerUser } from '../redux/thunks/authThunks';

export default function RegisterScreen({ navigation }) {
  const dispatch = useDispatch();
  const isLoading = useSelector(selectAuthLoading);
  const error = useSelector(selectAuthError);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('student');
  const [submitError, setSubmitError] = useState('');

  const nameError = useMemo(() => {
    if (!name.trim()) {
      return '';
    }

    return name.trim().length >= 2 ? '' : 'Name must be at least 2 characters.';
  }, [name]);

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

    const hasLength = password.length >= 6;
    const hasNumber = /\d/.test(password);

    if (!hasLength || !hasNumber) {
      return 'Use at least 6 characters including a number.';
    }

    return '';
  }, [password]);

  const confirmPasswordError = useMemo(() => {
    if (!confirmPassword) {
      return '';
    }

    return confirmPassword === password ? '' : 'Passwords do not match.';
  }, [confirmPassword, password]);

  const handleRegister = async () => {
    dispatch(clearAuthError());
    setSubmitError('');

    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setSubmitError('All fields are required.');
      return;
    }

    if (nameError || emailError || passwordError || confirmPasswordError) {
      setSubmitError('Please fix form errors before continuing.');
      return;
    }

    try {
      await dispatch(
        registerUser({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          role,
        })
      ).unwrap();

      navigation.navigate(ROUTES.VERIFY_EMAIL);
    } catch (thunkError) {
      setSubmitError(thunkError || 'Registration failed. Please try again.');
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
          title="Create account"
          subtitle="Use Firebase Auth signup with Redux thunks."
          onBackPress={() => navigation.navigate(ROUTES.LOGIN)}
          backLabel="Login"
        />

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {(error || submitError) ? (
            <StatusBanner
              type="error"
              title="Could not create account"
              message={submitError || error}
              onClose={() => {
                dispatch(clearAuthError());
                setSubmitError('');
              }}
            />
          ) : null}

          <TextInputField
            label="Full name"
            value={name}
            onChangeText={setName}
            placeholder="Your full name"
            error={nameError}
            autoCapitalize="words"
          />

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
            placeholder="Create a password"
            error={passwordError}
          />

          <PasswordInputField
            label="Confirm password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Re-enter your password"
            error={confirmPasswordError}
          />

          <RoleToggle
            value={role}
            onChange={setRole}
            disabled={isLoading}
            accessibilityLabel="Select account role"
          />

          <PrimaryButton label="Create account" loading={isLoading} onPress={handleRegister} />
          <SecondaryButton
            label="Back to Login"
            disabled={isLoading}
            onPress={() => navigation.navigate(ROUTES.LOGIN)}
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
