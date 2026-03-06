import React from 'react';
import { useSelector } from 'react-redux';
import AuthStack from './AuthStack';
import AppStack from './AppStack';

export default function AppNav() {
  const userToken = useSelector((state) => state.auth.userToken);

  return userToken ? <AppStack /> : <AuthStack />;
}
