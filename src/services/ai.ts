
import { GoogleGenAI } from "@google/genai";

const STORAGE_KEY = 'user_gemini_key';

export const aiService = {
  /**
   * Get API Key with Strict Enforcement
   * Priority: 1. User Custom Key (localStorage) -> 2. Environment Var
   * Throws Error if missing.
   */
  getApiKey: (): string => {
    // 1. Try Local Storage (User Custom Key)
    try {
      const local = localStorage.getItem(STORAGE_KEY);
      if (local && local.trim().length > 0) {
        return local.trim();
      }
    } catch (e) {
      console.warn("localStorage access failed:", e);
    }

    // 2. Try Environment Variable (Vite)
    const envKey = import.meta.env?.VITE_GEMINI_API_KEY;
    if (envKey && envKey.length > 10) {
        console.log("🔑 Using Environment API Key");
        return envKey;
    }

    // 3. Fail strictly
    throw new Error("MISSING_API_KEY");
  },

  /**
   * Check if a custom user key is set
   */
  isUserKeySet: (): boolean => {
    try {
      const local = localStorage.getItem(STORAGE_KEY);
      return !!local && local.trim().length > 0;
    } catch (e) {
      return false;
    }
  },

  /**
   * Save API Key to LocalStorage
   */
  saveApiKey: (key: string) => {
    try {
      localStorage.setItem(STORAGE_KEY, key.trim());
      // Force reload or just let the app pick it up next time
      // We don't force reload here to allow seamless retry in UI
    } catch (e) {
      console.error("Failed to save API key:", e);
    }
  },

  /**
   * Remove API Key
   */
  removeApiKey: () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      window.location.reload();
    } catch (e) {
      console.error("Failed to remove API key:", e);
    }
  },

  /**
   * Get Initialized GoogleGenAI Instance
   */
  getGenAI: (): GoogleGenAI => {
    const key = aiService.getApiKey();
    return new GoogleGenAI({ apiKey: key });
  }
};
