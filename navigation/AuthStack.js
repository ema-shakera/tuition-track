import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { EntryScreen, LoginScreen, RegisterScreen, VerifyEmailScreen } from '../screens';
import { ROUTES } from './routes';

const Stack = createNativeStackNavigator();

export default function AuthStack({ initialRouteName = ROUTES.ENTRY }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRouteName}>
      <Stack.Screen name={ROUTES.ENTRY} component={EntryScreen} />
      <Stack.Screen name={ROUTES.LOGIN} component={LoginScreen} />
      <Stack.Screen name={ROUTES.REGISTER} component={RegisterScreen} />
        <Stack.Screen name={ROUTES.VERIFY_EMAIL} component={VerifyEmailScreen} />
    </Stack.Navigator>
  );
}
