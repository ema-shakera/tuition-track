import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { PrimaryButton, ScreenHeader, SecondaryButton, StatusBanner } from '../components';
import { ROUTES } from '../navigation/routes';
import {
  clearAuthError,
  clearAuthSuccess,
  selectAuthError,
  selectAuthLoading,
  selectAuthSuccess,
  selectAuthUser,
} from '../redux/slices/authSlice';
import { logoutUser, refreshVerificationStatus, resendVerificationEmail } from '../redux/thunks/authThunks';

export default function VerifyEmailScreen({ navigation }) {
  const dispatch = useDispatch();
  const user = useSelector(selectAuthUser);
  const isLoading = useSelector(selectAuthLoading);
  const error = useSelector(selectAuthError);
  const success = useSelector(selectAuthSuccess);

  const helperMessage = useMemo(() => {
    if (!user?.email) {
      return 'No signed-in user found. Please sign in again.';
    }

    return `A verification email has been sent to ${user.email}. Verify your email before continuing.`;
  }, [user?.email]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader
        title="Verify email"
        subtitle="Account verification is required before accessing dashboard features."
        onBackPress={() => navigation.navigate(ROUTES.LOGIN)}
        backLabel="Login"
      />

      <View style={styles.content}>
        <Text style={styles.body}>{helperMessage}</Text>

        {error ? (
          <StatusBanner
            type="error"
            title="Verification needed"
            message={error}
            onClose={() => dispatch(clearAuthError())}
          />
        ) : null}

        {!error && success ? (
          <StatusBanner type="success" title="Update" message={success} onClose={() => dispatch(clearAuthSuccess())} />
        ) : null}

        <PrimaryButton
          label="I verified my email"
          loading={isLoading}
          onPress={() => dispatch(refreshVerificationStatus())}
        />

        <SecondaryButton
          label="Resend verification email"
          disabled={isLoading || !user?.email}
          onPress={() => dispatch(resendVerificationEmail())}
        />

        <SecondaryButton
          label="Sign out"
          disabled={isLoading}
          onPress={() => dispatch(logoutUser())}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 14,
  },
  body: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 21,
  },
});
