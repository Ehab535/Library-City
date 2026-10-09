import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.citylibrary.app',
  appName: 'مكتبة المدينة',
  webDir: 'dist',
  android: {
    // Never allow attaching Chrome DevTools to the WebView: it would let anyone
    // pull the decrypted lecture files straight out of memory.
    webContentsDebuggingEnabled: false,
    allowMixedContent: false,
  },
  plugins: {
    FirebaseAuthentication: {
      // Native Google sign-in only returns the ID token; the Firebase JS SDK
      // performs the actual sign-in so Firestore sees the same user.
      skipNativeAuth: true,
      providers: ['google.com'],
    },
  },
};

export default config;
