
import { onRequest } from "firebase-functions/v2/https";
import { GoogleGenAI, Type } from "@google/genai";

// 1. 初始化 Gemini API (後端環境變數)
const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey });

/**
 * Cloud Function: analyzeWithGemini
 * Description: 這是前端唯一的 AI 呼叫入口。
 * 它接收前端的 Prompt, 圖片, 以及 History, 
 * 並使用後端的 Key 呼叫 Gemini, 回傳 JSON 結構。
 */
export const analyzeWithGemini = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  try {
    const { message, image, history, systemInstruction } = req.body;

    // 建構 Request 內容
    const parts: any[] = [];
    if (image) {
        // 假設 image 是 Base64 字串 (data:image/jpeg;base64,...)
        const cleanBase64 = image.split(',')[1] || image;
        parts.push({ inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } });
        parts.push({ text: "Analyze this image." });
    }
    if (message) {
        parts.push({ text: message });
    }

    // 呼叫 Gemini
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: { 
            role: 'user', 
            parts 
        },
        config: {
            systemInstruction: systemInstruction, // 使用前端傳來的 Prompt 或後端寫死
            responseMimeType: "application/json",
            // 在此可定義更嚴格的 Schema，目前為求彈性先允許自由 JSON
        }
    });

    res.status(200).json({
      text: response.text
    });

  } catch (error: any) {
    console.error("Gemini Proxy Error:", error);
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
});
