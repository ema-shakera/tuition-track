import { useSelector } from 'react-redux';

export function useAuth() {
  const { user, userToken, isLoading, error, isHydrated } = useSelector((state) => state.auth);

  return {
    user,
    userToken,
    isLoading,
    error,
    isHydrated,
    isAuthenticated: Boolean(userToken),
  };
}
