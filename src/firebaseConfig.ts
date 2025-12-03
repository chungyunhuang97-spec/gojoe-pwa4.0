
import { initializeApp as _initializeApp } from "firebase/app";
import * as _firebaseApp from "firebase/app";
import * as _firebaseAuth from "firebase/auth";
import * as _firebaseFirestore from "firebase/firestore";

// Workaround for TypeScript errors in environments where firebase module resolution is strict or broken
// We import as namespace and cast to any to retrieve named exports safely.
const { initializeApp } = _firebaseApp as any;
const { 
  getAuth, 
  GoogleAuthProvider, 
  initializeAuth, 
  inMemoryPersistence, 
  browserLocalPersistence,
  signInAnonymously 
} = _firebaseAuth as any;
const { getFirestore } = _firebaseFirestore as any;

// Helper to save manual config
export const saveManualConfig = (newConfig: any) => {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem('manual_firebase_config', JSON.stringify(newConfig));
      window.location.reload();
    }
  } catch (e) {
    console.error("Failed to save manual config", e);
  }
};

const getManualConfig = () => {
  try {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('manual_firebase_config');
      if (stored) return JSON.parse(stored);
    }
  } catch (e) {}
  return null;
};

const manualConfig = getManualConfig();

// --- CORRECT CONFIGURATION (mystical-moon) ---
// Hardcoded as requested to ensure immediate preview functionality
const firebaseConfig = {
  apiKey: "AIzaSyDzT5ZQdYlGu0drWrVbM1ZzaJ_qjHMD6yA",
  authDomain: "mystical-moon-470013-v2.firebaseapp.com",
  projectId: "mystical-moon-470013-v2",
  storageBucket: "mystical-moon-470013-v2.firebasestorage.app",
  messagingSenderId: "149028327425",
  appId: "1:149028327425:web:35415800b24fb19a42f000",
  measurementId: "G-M52MT9BVGN"
};

// Determine Final Config
// Use manual if exists (for debugging), otherwise use the hardcoded correct config
const config = manualConfig || firebaseConfig;

let app;
let auth: any;
let db: any;
let googleProvider: any;
let isFirebaseInitialized = false;

console.log("🔍 Firebase Config Init:", {
  projectId: config.projectId,
  usingManual: !!manualConfig
});

try {
  // 1. Initialize App
  app = initializeApp(config);

  // 2. Robust Auth Initialization for Iframes/Previews
  // Preview environments (like AI Studio) block IndexedDB, causing standard getAuth() to crash.
  // We detect this and force inMemoryPersistence.
  try {
    const isPreview = typeof window !== 'undefined' && (
      window.location.hostname.includes('webcontainer') ||
      window.location.hostname.includes('googleusercontent') ||
      window.location.hostname.includes('ai.studio') || 
      window.location.hostname.includes('scf.usercontent')
    );

    if (isPreview) {
      console.log("⚠️ Preview Environment Detected: Using inMemoryPersistence for Auth.");
      auth = initializeAuth(app, {
        persistence: inMemoryPersistence
      });
    } else {
      // Standard initialization for production/localhost
      auth = getAuth(app);
    }
  } catch (authError) {
    console.warn("⚠️ Standard Auth Init failed, falling back to memory persistence:", authError);
    // Ultimate fallback
    auth = initializeAuth(app, {
      persistence: inMemoryPersistence
    });
  }

  db = getFirestore(app);
  googleProvider = new GoogleAuthProvider();
  
  isFirebaseInitialized = true;
  console.log("✅ Firebase Initialized Successfully");

} catch (error) {
  console.error("🔥 Firebase Critical Initialization Error:", error);
  
  // 3. Mock Fallback (Prevent White Screen of Death)
  let mockCurrentUser: any = null;
  
  auth = {
    currentUser: mockCurrentUser,
    onAuthStateChanged: (callback: any) => {
      callback(mockCurrentUser);
      return () => {}; 
    },
    signInWithEmailAndPassword: async () => { throw new Error("Firebase is offline"); },
    createUserWithEmailAndPassword: async () => { throw new Error("Firebase is offline"); },
    signInWithPopup: async () => { throw new Error("Google Login unavailable in offline mode"); },
    signOut: async () => { mockCurrentUser = null; },
    signInAnonymously: async () => {
      const guestUid = 'offline-guest-' + Math.random().toString(36).substr(2, 9);
      mockCurrentUser = {
        uid: guestUid,
        isAnonymous: true,
        email: null,
        displayName: 'Guest User (Offline)',
        photoURL: null
      };
      return { user: mockCurrentUser };
    }
  };
  
  db = {}; 
  googleProvider = {};
  isFirebaseInitialized = false;
}

export { auth, db, googleProvider, isFirebaseInitialized };
export default app;
