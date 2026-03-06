import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from './firebase';
import { setAxiosAuthToken, clearAxiosAuthToken } from './axiosClient';

const ensureFirebase = () => {
  if (!isFirebaseConfigured || !auth) {
    throw new Error('Firebase is not configured. Check EXPO_PUBLIC_FIREBASE_* values.');
  }
};

const mapAuthUser = async (firebaseUser) => {
  const userToken = await firebaseUser.getIdToken();
  return {
    user: {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      name: firebaseUser.displayName || '',
    },
    userToken,
  };
};

export const authApi = {
  async login(email, password) {
    ensureFirebase();
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const mapped = await mapAuthUser(credential.user);
    setAxiosAuthToken(mapped.userToken);
    return mapped;
  },

  async register({ email, password, name }) {
    ensureFirebase();
    const credential = await createUserWithEmailAndPassword(auth, email, password);

    if (name) {
      await updateProfile(credential.user, { displayName: name });
    }

    const mapped = await mapAuthUser(credential.user);
    setAxiosAuthToken(mapped.userToken);
    return mapped;
  },

  async logout() {
    if (auth) {
      await signOut(auth);
    }
    clearAxiosAuthToken();
  },

  async restoreSession() {
    if (!auth?.currentUser) {
      clearAxiosAuthToken();
      return { user: null, userToken: null };
    }

    const mapped = await mapAuthUser(auth.currentUser);
    setAxiosAuthToken(mapped.userToken);
    return mapped;
  },

  // TODO(Chunk 5): Add OTP verification + profile fetch from backend services.
};
