import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen, TuitionDetailScreen } from '../screens';
import { ROUTES } from './routes';

const Stack = createNativeStackNavigator();

export default function AppStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name={ROUTES.HOME} component={HomeScreen} options={{ title: 'TuitionTrack' }} />
      <Stack.Screen name={ROUTES.TUITION_DETAIL} component={TuitionDetailScreen} options={{ title: 'Tuition Details' }} />
    </Stack.Navigator>
  );
}
