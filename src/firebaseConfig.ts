
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import type { Auth } from "firebase/auth";

// Safe Environment Variable Accessor
const getEnv = (key: string) => {
  try {
    // @ts-ignore
    if (import.meta && import.meta.env && import.meta.env[key]) {
      // @ts-ignore
      return import.meta.env[key];
    }
  } catch (e) {}
  return "";
};

const config = {
  apiKey: getEnv('VITE_FIREBASE_API_KEY'),
  authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnv('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnv('VITE_FIREBASE_APP_ID')
};

let app;
// Explicitly type these to avoid "implicitly has type 'any'" errors
let auth: Auth | any;
let googleProvider: GoogleAuthProvider | any;
let isFirebaseInitialized = false;

try {
    // Validation: If apiKey is empty (from fallback), throw error
    if (!config.apiKey || config.apiKey === '') {
        throw new Error("Firebase API Key is empty.");
    }

    app = initializeApp(config);
    auth = getAuth(app);
    
    googleProvider = new GoogleAuthProvider();
    googleProvider.addScope('profile');
    googleProvider.addScope('email');
    
    isFirebaseInitialized = true;
    console.log("✅ Firebase Initialized Successfully");

} catch (error) {
    console.warn("⚠️ Firebase Initialization Error (Preview Mode):", error);
    
    // Mock Auth object to prevent white screen crash
    // Cast to any to bypass strict Auth type checks for the mock
    auth = {
        currentUser: null,
        onAuthStateChanged: (callback: any) => {
            callback(null); 
            return () => {}; 
        },
        signInWithPopup: async () => {
            throw new Error("Firebase 未正確初始化 (缺少 API Key)，無法登入。請檢查環境變數。");
        },
        signInWithRedirect: async () => {
            throw new Error("Firebase 未正確初始化 (缺少 API Key)，無法登入。請檢查環境變數。");
        },
        signOut: async () => {}
    };

    googleProvider = new GoogleAuthProvider();
    isFirebaseInitialized = false;
}

export { auth, googleProvider, isFirebaseInitialized };
export default app;
