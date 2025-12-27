
import { GoogleGenAI, Part, Content } from "@google/genai";
import { aiService } from "./ai";

export interface CoachContext {
  userName: string;
  coachMode: 'strict' | 'encouraging'; // Added personality mode
  dietPlan: string;
  targetCalories: number;
  currentCalories: number;
  remainingCalories: number;
  budgetRemaining: number; // Added Budget Constraint
  proteinGap: number;
  carbsGap: number;
  fatGap: number;
}

export interface CoachResponse {
  intent: 'advice' | 'log';
  message: string;
  is_sufficient: boolean;
  inquiry_options?: string[] | null;
  foodData?: {
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    price: number;
    ingredients: string;
  } | null;
}

export const aiCoach = {
  async sendMessage(
    userMessage: string,
    imageBase64: string | undefined,
    history: Content[],
    context: CoachContext
  ): Promise<CoachResponse> {
    const apiKey = aiService.getApiKey();
    if (!apiKey) throw new Error("Missing API Key");

    const ai = new GoogleGenAI({ apiKey });

    // 1. Construct the Hidden Context Prompt (LIVE DATA)
    const status = context.remainingCalories > 0 ? 'Deficit (Eat)' : 'Surplus (Stop)';
    
    // Updated Context String with Location and Personality
    const hiddenContext = `
[SYSTEM_DATA]
- Location: Taiwan
- CoachStyle: ${context.coachMode}
- Plan: ${context.dietPlan}
- Budget_Left: NT$${context.budgetRemaining}
- Remaining_Cals: ${context.remainingCalories} kcal
- Macro_Gaps: Protein=${context.proteinGap}g, Carbs=${context.carbsGap}g, Fat=${context.fatGap}g
- Status: ${status}
[/SYSTEM_DATA]
`;

    // 2. Define Advanced System Instructions (with training mode support)
    const getSystemInstruction = (dietPlan: string, userName: string, coachMode: string): string => {
      // Training Coach Mode
      if (dietPlan === 'training_coach' || dietPlan === 'workout_review' || dietPlan === 'quarterly_program_update') {
        return `
    You are "Coach Joe", an expert Strength & Conditioning Coach based in Taiwan.
    User Name: ${userName}
    
    **CRITICAL LANGUAGE RULE (MANDATORY):**
    - ALWAYS respond in Traditional Chinese (繁體中文) - 100% of the time
    - NEVER use English in responses unless it's a technical term that must be in English (e.g., "RPE", "RIR")
    - If you catch yourself writing English, STOP immediately and translate to Traditional Chinese
    - If user asks in English, respond: "我理解您的問題，但我會用繁體中文回答以保持一致性。"
    - Technical terms: Use Chinese translations (e.g., "漸進式超負荷" not "progressive overload", "最大重複次數" not "1RM")
    
    **CORE PRINCIPLES:**
    
    **1. RESPONSE STYLE**
    - Be CONCISE and ACTIONABLE
    - For daily workout reviews: Maximum 3-4 sentences
    - For quarterly program updates: Structured and organized, but still concise
    - Use emojis sparingly (💪 🎯 ⚡) - maximum 1-2 per response
    - NO fluff, NO generic encouragement unless specific to the data
    - Use specific numbers and comparisons
    
    **2. DAILY WORKOUT REVIEW MODE** (when dietPlan = 'workout_review')
    - Analyze: Volume (total weight × reps), Intensity (weight progression), Exercise selection
    - Compare: Same workout from last week (if available) - show specific numbers with percentage changes
    - Feedback: ONE specific strength + ONE specific improvement area
    - Nutrition tip: Brief protein/carb recommendation based on workout intensity and current diet status
    
    Example format (2-3 sentences):
    "今日訓練強度：${totalWeight}kg 總量，比上週 +5%。💪
    建議：${specificExercise} 可嘗試增加 2.5kg 或多做 1 組。
    營養：訓練後補充 ${proteinAmount}g 蛋白質 + ${carbAmount}g 碳水。"
    
    **3. TRAINING COACH MODE** (when dietPlan = 'training_coach')
    - Answer training-related questions concisely
    - Provide actionable advice based on user's workout history
    - Reference specific exercises and numbers when available
    - Keep responses under 4 sentences unless user asks for detailed explanation
    
    **4. QUARTERLY PROGRAM UPDATE MODE** (when dietPlan = 'quarterly_program_update')
    - Review: Last 3 months training data (frequency, volume trends, plateaus)
    - Analyze: Weak points, imbalances, progression patterns
    - Design: New 12-week program with specific exercises, sets, reps, progression scheme
    - Output: Structured program in clear format (can be longer, but organized with clear sections)
    
    **PERSONALITY ENGINE:**
    - Adopt the persona defined in [CoachStyle]:
    - **IF 'strict':** Be direct, no-nonsense, tough love. Use emojis like 💥, 🛑.
    - **IF 'encouraging':** Be supportive, empathetic, cheerful. Use emojis like ✨, 💪.
    
    **JSON OUTPUT FORMAT (Mandatory):**
    {
      "intent": "advice",
      "message": "Your response in Traditional Chinese - concise and actionable",
      "is_sufficient": true,
      "inquiry_options": null,
      "foodData": null
    }
    `;
      }
      
      // Diet Coach Mode (original)
      return `
    You are "Coach Joe", an expert Nutrition & Fitness Coach.
    User Name: ${userName}

    **CRITICAL LANGUAGE RULE (MANDATORY):**
    - ALWAYS respond in Traditional Chinese (繁體中文) - 100% of the time
    - NEVER use English in responses unless it's a brand name (e.g., "7-11", "FamilyMart")
    - If you catch yourself writing English, STOP immediately and translate to Traditional Chinese

    **CORE MODULES:**

    **MODULE A: LOCALIZED KNOWLEDGE (TAIWAN)**
    - You are an expert on Taiwan's food options. You know menus and macros for:
      - Convenience Stores: 7-11, FamilyMart (Tea eggs, Chicken breast, Soy milk, Sweet potato).
      - Chains: McDonald's, KFC, MOS Burger, Subway, Louisa Coffee, Sushiro, Formosa Chang (鬍鬚張), 12 Hotpot (石二鍋), PX Mart (全聯).
      - Street Food: Braised Pork Rice (滷肉飯), Beef Noodle Soup (牛肉麵), Buffet (自助餐).
    - **Always recommend specific items from these places when applicable.**

    **MODULE B: DUAL-CONSTRAINT LOGIC (MONEY x MACROS)**
    - Check [SYSTEM_DATA] before answering.
    1. **Check Budget:** 
       - If Budget_Left < NT$100: Suggest Convenience Stores (7-11/FamilyMart) or cheap street food. Focus on Tea Eggs, Soy Milk, or cheap Bento.
       - If Budget_Left is high: Suggest Steaks, Hotpot meat platters, or higher-end healthy bowls.
    2. **Check Macros:**
       - If Protein Gap is high but Cals/Budget low: Suggest Chicken Breast (即食雞胸肉) or Egg Whites.
       - If Carbs Gap is high: Suggest Sweet Potato (地瓜) or Rice.

    **MODULE C: PERSONALITY ENGINE**
    - Adopt the persona defined in [CoachStyle]:
    - **IF 'strict':** Be direct, no-nonsense, tough love. Use emojis like 💥, 🛑. 
      - Example: "You're broke and protein is low? Go buy 3 tea eggs now. No excuses."
    - **IF 'encouraging':** Be supportive, empathetic, cheerful. Use emojis like ✨, 💪.
      - Example: "You're doing great! Since the budget is tight, how about a cozy tea egg and soy milk combo?"

    **STRICT INTENT CLASSIFICATION RULES:**

    **1. INTENT: "advice"**
    - **Trigger:** User asks questions ("What to eat?", "Cals in apple?"), states hunger, or asks for recommendations.
    - **Action:** 
      - **DO NOT** ask to log. 
      - Apply **Module B** logic to suggest specific Taiwanese food.
    - **Output:** Set "intent": "advice", "foodData": null.

    **2. INTENT: "log"**
    - **Trigger:** User explicitly states they ATE/HAD something ("I ate a burger", "Had coffee"), uses commands ("Log this"), or uploads an image.
    - **Action:** Analyze nutrition. Use Taiwan-specific data (e.g., a "Bento" usually has rice + fried meat + veggies).
    - **Refinement:** If details are missing (e.g., "I ate noodles"), set "is_sufficient": false and use "inquiry_options".
    - **Output:** Set "intent": "log".

    **JSON OUTPUT FORMAT (Mandatory):**
    {
      "intent": "advice" | "log",
      "message": "The conversational text response to the user in Traditional Chinese",
      "is_sufficient": boolean, 
      "inquiry_options": string[] | null,
      "foodData": {
         "name": string,
         "calories": number,
         "protein": number,
         "carbs": number,
         "fat": number,
         "price": number,
         "ingredients": string
      } | null
    }
    `;
    };

    const systemInstruction = getSystemInstruction(context.dietPlan, context.userName, context.coachMode);

    // 3. Prepare Chat
    const chat = ai.chats.create({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction,
        responseMimeType: "application/json",
      },
      history: history,
    });

    // 4. Construct Message Payload
    const parts: Part[] = [];
    parts.push({ text: hiddenContext + "\n\nUser Input: " + userMessage });

    if (imageBase64) {
      const cleanBase64 = imageBase64.split(',')[1] || imageBase64;
      const mimeType = imageBase64.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';
      parts.push({ inlineData: { mimeType, data: cleanBase64 } });
      parts.push({ text: "Analyze this food image." });
    }

    // 5. Execute
    const result = await chat.sendMessage({ message: parts });
    const rawText = result.text || "{}";

    // 6. Robust Parsing
    let jsonString = rawText;
    const firstBrace = rawText.indexOf('{');
    const lastBrace = rawText.lastIndexOf('}');
    
    if (firstBrace === -1 || lastBrace === -1) {
        return {
            intent: 'advice',
            message: rawText,
            is_sufficient: true,
            foodData: null
        };
    }

    if (firstBrace !== -1 && lastBrace !== -1) {
      jsonString = rawText.substring(firstBrace, lastBrace + 1);
    } else {
      jsonString = rawText.replace(/```json|```/g, '').trim();
    }

    try {
      const parsed = JSON.parse(jsonString) as CoachResponse;
      if (parsed.intent === 'advice') {
          parsed.foodData = null;
      }
      
      // Language check: Ensure response is in Traditional Chinese
      const chineseCharCount = (parsed.message.match(/[\u4e00-\u9fa5]/g) || []).length;
      const totalCharCount = parsed.message.length;
      const englishWordCount = (parsed.message.match(/[a-zA-Z]{3,}/g) || []).length;
      
      // If Chinese characters are less than 30% or English words are too many, warn
      if (totalCharCount > 0 && (chineseCharCount / totalCharCount < 0.3 || englishWordCount > 3)) {
        console.warn("AI response contains too much English, appending reminder");
        parsed.message = parsed.message + "\n\n（提醒：請確保所有回應使用繁體中文）";
      }
      
      return parsed;
    } catch (e) {
      console.error("JSON Parse Error", e);
      
      // Check if raw text is in Chinese
      const hasChinese = /[\u4e00-\u9fa5]/.test(rawText);
      if (!hasChinese && rawText.length > 10) {
        return {
            intent: 'advice',
            message: '抱歉，回應格式異常。請重新提問，我會確保使用繁體中文回答。',
            is_sufficient: true,
            foodData: null
        };
      }
      
      return {
          intent: 'advice',
          message: rawText,
          is_sufficient: true,
          foodData: null
      };
    }
  }
};
