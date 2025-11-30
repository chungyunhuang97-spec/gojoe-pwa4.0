
import { GoogleGenAI } from "@google/genai";

const STORAGE_KEY = 'gemini_api_key';

export const aiService = {
  /**
   * 獲取 API Key，優先順序：LocalStorage > 環境變數
   */
  getApiKey: (): string => {
    // 1. Try Local Storage
    try {
      const local = localStorage.getItem(STORAGE_KEY);
      if (local && local.trim().length > 0) return local.trim();
    } catch (e) {
      console.warn("localStorage access failed:", e);
    }

    // 2. Try Environment Variable (Standard Vite)
    // Use import.meta.env safely
    const env = import.meta.env.VITE_GEMINI_API_KEY;
    if (env && typeof env === 'string' && env.length > 0) return env.trim();

    return "";
  },

  /**
   * 檢查是否有可用的 API Key
   */
  hasApiKey: (): boolean => {
    const key = aiService.getApiKey();
    return !!key && key.startsWith('AIza');
  },

  /**
   * 儲存 API Key 到 LocalStorage
   */
  saveApiKey: (key: string) => {
    try {
      localStorage.setItem(STORAGE_KEY, key.trim());
    } catch (e) {
      console.error("Failed to save API key:", e);
    }
  },

  /**
   * 清除 API Key
   */
  removeApiKey: () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error("Failed to remove API key:", e);
    }
  },

  /**
   * 驗證 API Key 是否有效 (發送測試請求)
   */
  validateApiKey: async (key: string): Promise<boolean> => {
    if (!key || !key.startsWith('AIza')) return false;
    try {
      const ai = new GoogleGenAI({ apiKey: key });
      // 發送一個極輕量的請求來測試認證
      await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ text: 'Test' }] },
      });
      return true;
    } catch (e: any) {
      console.error("API Key Validation Failed:", e);
      return false;
    }
  },

  /**
   * 獲取已初始化的 Gemini 實例
   */
  getGenAI: (): GoogleGenAI => {
    const key = aiService.getApiKey();
    if (!key) throw new Error("API Key 未設定或無效。請至設定頁面檢查。");
    return new GoogleGenAI({ apiKey: key });
  }
};
