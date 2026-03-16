import React from 'react';
import { useSelector } from 'react-redux';
import AppLoader from '../components/AppLoader';
import {
  selectAuthHydrated,
  selectAuthIsVerified,
  selectAuthLoading,
  selectAuthToken,
} from '../redux/slices/authSlice';
import AuthStack from './AuthStack';
import AppStack from './AppStack';
import { ROUTES } from './routes';

export default function AppNav() {
  const userToken = useSelector(selectAuthToken);
  const isHydrated = useSelector(selectAuthHydrated);
  const isLoading = useSelector(selectAuthLoading);
  const isVerified = useSelector(selectAuthIsVerified);

  if (!isHydrated) {
    return <AppLoader label="Restoring session..." />;
  }

  if (isLoading && !userToken) {
    return <AppLoader label="Signing in..." />;
  }

  if (!userToken) {
    return <AuthStack />;
  }

  if (!isVerified) {
    return <AuthStack initialRouteName={ROUTES.VERIFY_EMAIL} />;
  }

  return <AppStack />;
}
