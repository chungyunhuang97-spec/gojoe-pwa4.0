
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
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

// 1. Try to get manual config from LocalStorage (Fallback for Preview Environments)
let manualConfig: any = {};
try {
    const stored = localStorage.getItem('firebase_manual_config');
    if (stored) manualConfig = JSON.parse(stored);
} catch (e) {
    console.warn("Failed to load manual config", e);
}

// 2. Prioritize Environment Variables, then Manual Config
const config = {
  apiKey: getEnv('VITE_FIREBASE_API_KEY') || manualConfig.apiKey,
  authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN') || manualConfig.authDomain,
  projectId: getEnv('VITE_FIREBASE_PROJECT_ID') || manualConfig.projectId,
  storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET') || manualConfig.storageBucket,
  messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID') || manualConfig.messagingSenderId,
  appId: getEnv('VITE_FIREBASE_APP_ID') || manualConfig.appId
};

let app;
// Explicitly type these to avoid "implicitly has type 'any'" errors
let auth: Auth | any;
let db: any;
let googleProvider: any;
let isFirebaseInitialized = false;

// Helper to save manual config from UI
export const saveManualConfig = (newConfig: any) => {
    try {
        localStorage.setItem('firebase_manual_config', JSON.stringify(newConfig));
        window.location.reload(); // Reload to apply
    } catch (e) {
        console.error("Failed to save config", e);
    }
};

export const clearManualConfig = () => {
    localStorage.removeItem('firebase_manual_config');
    window.location.reload();
};

try {
    // Validation: If apiKey is empty, throw error
    if (!config.apiKey || config.apiKey === '') {
        throw new Error("Firebase API Key is empty.");
    }

    app = initializeApp(config);
    auth = getAuth(app);
    db = getFirestore(app);
    googleProvider = new GoogleAuthProvider();
    
    isFirebaseInitialized = true;
    console.log("✅ Firebase Initialized Successfully");

} catch (error) {
    console.warn("⚠️ Firebase Initialization Error (Preview Mode):", error);
    
    // Mock Auth object to prevent white screen crash
    auth = {
        currentUser: null,
        onAuthStateChanged: (callback: any) => {
            callback(null); 
            return () => {}; 
        },
        signInWithEmailAndPassword: async () => { throw new Error("Firebase not initialized"); },
        createUserWithEmailAndPassword: async () => { throw new Error("Firebase not initialized"); },
        signOut: async () => {}
    };
    db = {}; // Mock DB
    googleProvider = {};

    isFirebaseInitialized = false;
}

export { auth, db, googleProvider, isFirebaseInitialized };
export default app;
