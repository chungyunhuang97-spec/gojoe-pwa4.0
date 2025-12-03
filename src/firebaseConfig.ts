import { initializeApp } from "firebase/app";
import { getAuth, initializeAuth, inMemoryPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

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

let app;
let auth;
let db;
let isFirebaseInitialized = false;

try {
  app = initializeApp(firebaseConfig);

  // Initialize Auth with persistence fallback for iframes/previews
  try {
      auth = getAuth(app);
  } catch (e) {
      console.warn("Standard Auth Init failed, using fallback:", e);
      auth = initializeAuth(app, { persistence: inMemoryPersistence });
  }

  db = getFirestore(app);
  isFirebaseInitialized = true;
  console.log("✅ Firebase Initialized");
} catch (error) {
  console.error("🔥 Firebase Init Error:", error);
}

export { auth, db, isFirebaseInitialized };
export default app;