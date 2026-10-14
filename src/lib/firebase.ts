import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithCustomToken as firebaseSignInWithCustomToken } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleAuthProvider = new GoogleAuthProvider();

export async function authenticateWithCustomToken(customToken: string) {
  if (!customToken) return null;
  try {
    const userCredential = await firebaseSignInWithCustomToken(auth, customToken);
    return userCredential.user;
  } catch (err) {
    console.warn('[Firebase Auth Client] Custom token sign in notice:', err);
    return null;
  }
}

