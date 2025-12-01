
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
let db: any;
let googleProvider: any;
let isFirebaseInitialized = false;

try {
    // Validation: If apiKey is empty (from fallback), throw error
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
