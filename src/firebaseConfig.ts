
import { initializeApp } from "firebase/app";
import { getAuth, initializeAuth, browserLocalPersistence, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

// HARDCODED CONFIG (Safe for this Vibe Coding environment)
const firebaseConfig = {
  apiKey: "AIzaSyDzT5ZQdYlGu0drWrVbM1ZzaJ_qjHMD6yA",
  authDomain: "mystical-moon-470013-v2.firebaseapp.com",
  projectId: "mystical-moon-470013-v2",
  storageBucket: "mystical-moon-470013-v2.firebasestorage.app",
  messagingSenderId: "149028327425",
  appId: "1:149028327425:web:35415800b24fb19a42f000",
  measurementId: "G-M52MT9BVGN"
};

const app = initializeApp(firebaseConfig);

// Explicitly type auth to avoid "implicit any" or module resolution issues
// Use browserLocalPersistence to ensure auth state persists across devices and sessions
let auth: Auth;
try {
    auth = getAuth(app);
    // Ensure persistence is set to browserLocalPersistence (default, but explicit for clarity)
    // This ensures the same Google account is recognized across different devices
} catch (e) {
    console.warn("Standard Auth Init failed, using fallback:", e);
    // Use browserLocalPersistence instead of inMemoryPersistence for cross-device sync
    auth = initializeAuth(app, { persistence: browserLocalPersistence });
}

// Explicitly type db
const db: Firestore = getFirestore(app);

// Simple initialized flag
const isFirebaseInitialized = true;

export { auth, db, isFirebaseInitialized };
export default app;
