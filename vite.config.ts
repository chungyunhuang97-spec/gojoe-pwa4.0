
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 1. Load env from .env files (local dev)
  const loadedEnv = loadEnv(mode, (process as any).cwd(), '');
  
  // 2. Merge with process.env (crucial for Zeabur/CI environments where .env might not exist)
  // We prioritize process.env over loadedEnv to respect deployment settings
  const env = { ...loadedEnv, ...process.env };

  return {
    plugins: [react()],
    server: {
      port: 3000
    },
    define: {
      // Force replace import.meta.env vars with static strings.
      // This is the safest way to handle env vars in Vite to avoid runtime undefined errors.
      'import.meta.env.VITE_FIREBASE_API_KEY': JSON.stringify(env.VITE_FIREBASE_API_KEY || ''),
      'import.meta.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify(env.VITE_FIREBASE_AUTH_DOMAIN || ''),
      'import.meta.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify(env.VITE_FIREBASE_PROJECT_ID || ''),
      'import.meta.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify(env.VITE_FIREBASE_STORAGE_BUCKET || ''),
      'import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(env.VITE_FIREBASE_MESSAGING_SENDER_ID || ''),
      'import.meta.env.VITE_FIREBASE_APP_ID': JSON.stringify(env.VITE_FIREBASE_APP_ID || ''),
      'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || ''),
      
      // Polyfill process.env to avoid crashes in some third-party libs
      'process.env': {}
    }
  }
})
