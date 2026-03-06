import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { Provider, useDispatch } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import AppLoader from './components/AppLoader';
import { AppNav } from './navigation';
import { persistor, store } from './redux/store';
import { bootstrapAuthState } from './redux/thunks/authThunks';

function AppBootstrap() {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(bootstrapAuthState());
  }, [dispatch]);

  return <AppNav />;
}

export default function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={<AppLoader label="Restoring session..." />} persistor={persistor}>
        <NavigationContainer>
          <AppBootstrap />
          <StatusBar style="dark" />
        </NavigationContainer>
      </PersistGate>
    </Provider>
  );
}
