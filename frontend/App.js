import React, { useEffect } from 'react';
import { StatusBar } from './node_modules/expo-status-bar/build/StatusBar';
import { NavigationContainer } from './node_modules/@react-navigation/native/lib/typescript/src';
import { SafeAreaProvider } from 'react-native-safe-area-context';
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
        <SafeAreaProvider>
          <NavigationContainer>
            <AppBootstrap />
            <StatusBar style="dark" />
          </NavigationContainer>
        </SafeAreaProvider>
      </PersistGate>
    </Provider>
  );
}
