import { useSelector } from 'react-redux';
import {
  selectAuthError,
  selectAuthHydrated,
  selectAuthLoading,
  selectAuthToken,
  selectAuthUser,
} from '../redux/slices/authSlice';

export function useAuth() {
  const user = useSelector(selectAuthUser);
  const userToken = useSelector(selectAuthToken);
  const isLoading = useSelector(selectAuthLoading);
  const error = useSelector(selectAuthError);
  const isHydrated = useSelector(selectAuthHydrated);

  return {
    user,
    userToken,
    isLoading,
    error,
    isHydrated,
    isAuthenticated: Boolean(userToken),
  };
}
