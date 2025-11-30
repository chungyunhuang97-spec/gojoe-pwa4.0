
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Access variables directly so Vite's `define` plugin can replace them with static strings.
// Do NOT destructure import.meta.env here to avoid "Cannot read properties of undefined".
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

let app;
let auth;
let googleProvider;
let isFirebaseInitialized = false;

try {
    // Validation: If apiKey is empty string (from fallback), throw error
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
    console.warn("⚠️ Firebase Initialization Error:", error);
    
    // Mock Auth object to prevent white screen crash
    auth = {
        currentUser: null,
        onAuthStateChanged: (callback: any) => {
            callback(null); 
            return () => {}; 
        },
        signInWithPopup: async () => {
            throw new Error("Firebase 未正確初始化 (缺少 API Key)，無法登入。");
        },
        signInWithRedirect: async () => {
            throw new Error("Firebase 未正確初始化 (缺少 API Key)，無法登入。");
        },
        signOut: async () => {}
    } as any;

    googleProvider = new GoogleAuthProvider();
    isFirebaseInitialized = false;
}

export { auth, googleProvider, isFirebaseInitialized };
export default app;
