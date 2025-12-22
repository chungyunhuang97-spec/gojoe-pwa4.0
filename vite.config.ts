
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 1. Load env from .env files (local dev)
  const loadedEnv = loadEnv(mode, (process as any).cwd(), '');
  
  // 2. Merge with process.env
  const env = { ...loadedEnv, ...process.env };

  return {
    plugins: [react()],
    server: {
      port: 3000
    },
    build: {
      // 优化构建输出
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false, // 生产环境不生成 sourcemap，加快构建
      minify: 'esbuild', // 使用 esbuild 压缩（更快，默认）
      rollupOptions: {
        output: {
          // 代码分割优化
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
            'vendor-ai': ['@google/genai']
          }
        }
      }
    },
    // Alias configuration removed to enforce standard relative paths
    define: {
      // Force replace import.meta.env vars
      'import.meta.env.VITE_FIREBASE_API_KEY': JSON.stringify(env.VITE_FIREBASE_API_KEY || ''),
      'import.meta.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify(env.VITE_FIREBASE_AUTH_DOMAIN || ''),
      'import.meta.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify(env.VITE_FIREBASE_PROJECT_ID || ''),
      'import.meta.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify(env.VITE_FIREBASE_STORAGE_BUCKET || ''),
      'import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(env.VITE_FIREBASE_MESSAGING_SENDER_ID || ''),
      'import.meta.env.VITE_FIREBASE_APP_ID': JSON.stringify(env.VITE_FIREBASE_APP_ID || ''),
      'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || ''),
      
      // Polyfill process.env
      'process.env': {}
    }
  }
})
