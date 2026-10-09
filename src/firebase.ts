import { initializeApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  indexedDBLocalPersistence,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential,
  signOut,
  User,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import firebaseConfig from '../firebase-applet-config.json';

export const isNativeApp = Capacitor.isNativePlatform();

export const app = initializeApp(firebaseConfig);
// Inside the Android WebView the default getAuth() tries to load the popup /
// redirect iframe, which never resolves there, so use plain IndexedDB persistence.
export const auth = isNativeApp
  ? initializeAuth(app, { persistence: indexedDBLocalPersistence })
  : getAuth(app);
export const db = (firebaseConfig as any).firestoreDatabaseId
  ? getFirestore(app, (firebaseConfig as any).firestoreDatabaseId)
  : getFirestore(app);

/**
 * Google sign-in that works both in the browser and in the Android app.
 * Google blocks its login page inside embedded WebViews, so on Android the
 * native account picker returns an ID token that we hand to the JS SDK.
 */
export async function signInWithGoogle(): Promise<User> {
  if (isNativeApp) {
    const result = await FirebaseAuthentication.signInWithGoogle();
    const idToken = result.credential?.idToken;
    if (!idToken) {
      throw new Error('لم يتم استلام بيانات الدخول من جوجل. حاول مرة أخرى.');
    }
    const cred = await signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
    return cred.user;
  }
  const result = await signInWithPopup(auth, new GoogleAuthProvider());
  return result.user;
}

export async function signOutEverywhere(): Promise<void> {
  if (isNativeApp) {
    await FirebaseAuthentication.signOut().catch(() => {});
  }
  await signOut(auth).catch(() => {});
}
