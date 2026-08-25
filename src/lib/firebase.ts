import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

// Authentication provider
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    // Check if we are in a mobile/Capacitor environment
    const isCapacitor = (window as any).Capacitor !== undefined;

    if (isCapacitor) {
      // signInWithPopup often fails in WebViews, use Redirect instead
      await signInWithRedirect(auth, googleProvider);
      return null;
    } else {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    }
  } catch (error) {
    console.error("Error signing in with Google:", error);
    throw error;
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out:", error);
    throw error;
  }
};
