
import React, { useState, useEffect, useRef } from 'react';
import { Camera, ArrowUp, Zap, Dumbbell, BedDouble, Trash2, Edit3, ChevronDown, BarChart2 } from 'lucide-react';
import { useUser, TrainingMode, MealType, LogEntry, BodyLogEntry } from '../context/UserContext';
import { NutritionOverview } from './NutritionOverview';
import { BudgetCard } from './BudgetCard';
import { CameraModal } from './CameraModal';
import { GoogleGenAI } from "@google/genai";
import { aiService } from '../services/ai';
import { aiCoach, CoachContext } from '../services/aiCoach';
import { parseXunjiWorkout, convertToWorkoutLog } from '../services/workoutImporter';
import { Upload } from 'lucide-react';

// --- Types & Helpers ---

interface Message {
  id: string;
  sender: 'ai' | 'user';
  type: 'text' | 'image' | 'card' | 'error';
  content?: string; 
  image?: string;
  cardData?: any; 
  options?: string[];
}

const MarkdownText: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null;
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return (
    <span className="whitespace-pre-wrap leading-relaxed text-sm">
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="font-black text-gray-900">{part.slice(2, -2)}</strong>;
        }
        return part;
      })}
    </span>
  );
};

// Helper to detect mime type from base64 header
const getMimeType = (base64String: string) => {
    if (base64String.startsWith('data:image/png')) return 'image/png';
    if (base64String.startsWith('data:image/jpeg')) return 'image/jpeg';
    if (base64String.startsWith('data:image/webp')) return 'image/webp';
    return 'image/jpeg'; // Default
};

// --- Daily Training Check Modal ---
const TrainingCheckModal: React.FC<{ isOpen: boolean, onClose: (mode: TrainingMode) => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
            <div className="bg-white rounded-[2rem] p-6 w-full max-w-sm shadow-2xl transform scale-100">
                <h2 className="text-2xl font-black text-center mb-2">早安 Joe! ☀️</h2>
                <p className="text-gray-500 font-bold text-center text-sm mb-6">今天的訓練計畫是什麼？</p>
                <div className="space-y-3">
                    {[
                        { id: 'rest', label: '休息日 (Rest)', icon: BedDouble, color: 'bg-gray-100 text-gray-600' },
                        { id: 'push_pull', label: '推拉訓練 (Push/Pull)', icon: Dumbbell, color: 'bg-blue-50 text-blue-600' },
                        { id: 'leg', label: '腿部訓練 (Leg Day)', icon: Zap, color: 'bg-brand-green/20 text-brand-black' }
                    ].map((mode) => (
                        <button 
                            key={mode.id}
                            onClick={() => onClose(mode.id as TrainingMode)}
                            className={`w-full p-4 rounded-2xl flex items-center gap-4 active:scale-95 transition-transform ${mode.color} font-bold text-lg`}
                        >
                            <div className="bg-white/50 p-2 rounded-full">
                                <mode.icon size={20} />
                            </div>
                            {mode.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export const Dashboard: React.FC = () => {
  const { goals, todayStats, logs, bodyLogs, workoutLogs, addLog, deleteLog, updateLog, deleteBodyLog, addBodyLog, trainingMode, setTrainingMode, profile, addWorkoutLog } = useUser();
  
  // --- UI State ---
  const [carouselIndex, setCarouselIndex] = useState(0); // 0 = status, 1 = budget
  const [showTrainingModal, setShowTrainingModal] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraMode, setCameraMode] = useState<'food' | 'workout' | 'body'>('food');
  
  // Edit State
  const [editingLog, setEditingLog] = useState<LogEntry | null>(null);

  // --- Chat State ---
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [coachMode, setCoachMode] = useState<'diet' | 'training'>('diet'); // AI Coach mode

  // --- 1. Training Mode Check ---
  useEffect(() => {
      const lastCheck = localStorage.getItem('lastTrainingCheckDate');
      const todayStr = new Date().toDateString();
      if (lastCheck !== todayStr) {
          setShowTrainingModal(true);
      }
  }, []);

  const handleTrainingSet = (mode: TrainingMode) => {
      setTrainingMode(mode);
      localStorage.setItem('lastTrainingCheckDate', new Date().toDateString());
      setShowTrainingModal(false);
      addAiMessage(`早安！已為你設定為 **${mode === 'leg' ? '腿日模式 (高碳水)' : mode === 'push_pull' ? '推拉模式 (高蛋白)' : '休息模式 (低熱量)'}**。請回報你的第一餐。`);
  };

  // --- 2. Chat Persistence ---
  const getChatKey = () => `chat_history_${coachMode}_${new Date().toISOString().split('T')[0]}`;

  useEffect(() => {
      const saved = localStorage.getItem(getChatKey());
      if (saved) {
          setMessages(JSON.parse(saved));
      } else {
          if (coachMode === 'diet') {
              setMessages([{
                  id: 'init-1',
                  sender: 'ai',
                  type: 'text',
                  content: `你的目標是 **${goals.targetCalories} kcal**。請回報餐點。`,
                  options: ['排骨便當', '地瓜 200g', '無糖豆漿']
              }]);
          } else {
              setMessages([{
                  id: 'init-1',
                  sender: 'ai',
                  type: 'text',
                  content: `我是你的訓練教練！可以幫你檢討訓練成果。請匯入今日的訓練紀錄或告訴我你的訓練內容。`,
                  options: ['匯入訓記紀錄', '檢討今日訓練']
              }]);
          }
      }
  }, [coachMode, goals.targetCalories]);

  useEffect(() => {
      if (messages.length > 0) {
          localStorage.setItem(getChatKey(), JSON.stringify(messages));
          if (chatContainerRef.current) {
              chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
          }
      }
  }, [messages, isTyping]);


  // --- 3. Chat Logic (CLIENT-SIDE) ---
  const addAiMessage = (text: string, options: string[] = [], cardData?: any) => {
      setMessages(prev => [...prev, {
          id: Date.now().toString(),
          sender: 'ai',
          type: cardData ? 'card' : 'text',
          content: text,
          options,
          cardData
      }]);
  };

  const addUserMessage = (text: string, image?: string) => {
      setMessages(prev => [...prev, {
          id: Date.now().toString(),
          sender: 'user',
          type: image ? 'image' : 'text',
          content: text,
          image
      }]);
  };

  const getMealTypeByTime = (): MealType => {
      const h = new Date().getHours();
      if(h < 10) return 'breakfast';
      if(h < 15) return 'lunch';
      if(h < 20) return 'dinner';
      return 'snack';
  };

  const analyzeWithGemini = async (currentInput: string, imageBase64?: string) => {
      setIsTyping(true);
      if (imageBase64) addUserMessage("", imageBase64);
      else addUserMessage(currentInput);

      try {
          const apiKey = aiService.getApiKey();
          if (!apiKey) {
             throw new Error("Missing API Key");
          }

          const ai = new GoogleGenAI({ apiKey });
          
          // Get today's workout for context
          const todayDate = new Date().toISOString().split('T')[0];
          const todayWorkout = workoutLogs.find(l => l.date === todayDate);
          const workoutContext = todayWorkout 
            ? `今日訓練: ${todayWorkout.bodyParts.join(', ')} (${todayWorkout.duration}mins), 動作數: ${todayWorkout.exercises.length}` 
            : "今日尚未紀錄訓練";

          // 計算營養進度百分比
          const proteinPercent = Math.round((todayStats.consumedProtein / goals.targetProtein) * 100);
          const carbsPercent = Math.round((todayStats.consumedCarbs / goals.targetCarbs) * 100);
          const fatPercent = Math.round((todayStats.consumedFat / goals.targetFat) * 100);
          const caloriesPercent = Math.round((todayStats.consumedCalories / goals.targetCalories) * 100);
          
          const systemInstruction = `
          你是【NutriMax - 精準營養大師】，一位頂級營養與體態轉變教練。你的職責是分析用戶上傳的食物照片或文字紀錄。

          【核心性格】
          專業、觀察入微、鼓勵但不放縱。你相信「數據不會說謊，但飲食可以優化」。

          【目前狀態】
          - 今日訓練: ${workoutContext}
          - 今日攝取: ${todayStats.consumedCalories}/${goals.targetCalories} kcal (${caloriesPercent}%)
          - 蛋白質: ${todayStats.consumedProtein}/${goals.targetProtein}g (${proteinPercent}%)
          - 碳水: ${todayStats.consumedCarbs}/${goals.targetCarbs}g (${carbsPercent}%)
          - 脂肪: ${todayStats.consumedFat}/${goals.targetFat}g (${fatPercent}%)
          - 目標類型: ${profile.goalType === 'lose_fat' ? '減脂' : profile.goalType === 'build_muscle' ? '增肌' : profile.goalType === 'recomp' ? '重組' : '維持'}

          【任務指令】
          1. **數據分析**：精準估算該餐的熱量與蛋白質、碳水、脂肪比例。對比目標給予百分比進度。
          2. **抓出陷阱**：主動指出飲食中隱藏的危機（如：醬汁過油、隱藏糖分、蔬菜不足、加工食品過多）。
          3. **即時修正**：不要只說哪裡不好，要給出「下一餐建議」。例如：「這餐脂肪超標了，建議晚餐減少油脂，多補足 30g 蛋白質。」
          4. **訓練聯動**：如果今日有訓練（特別是腿日），主動建議增加碳水化合物補充。
          5. **情緒價值**：表現出對用戶體態目標的在乎。若用戶吃得很好，請給予極高評價；若亂吃，請嚴厲但具建設性地提醒其紀律。

          【輸出格式要求】
          你的回覆必須包含以下結構（用自然語言呈現，不要用標題格式）：
          - 今日營養總評（對比目標的整體評估）
          - 數據估算表格（該餐的營養素明細）
          - 亮點與紅字警告（指出好的地方和需要改進的地方）
          - 下餐執行策略（具體的下一餐建議）

          【重要規則】
          1. **不要**主動詢問或估算價格，除非用戶明確問「這多少錢？」。價格預設為 0。
          2. 若資訊不足 (如只輸入「便當」)，回傳 "is_sufficient": false，並提供具體的詢問選項。
          3. 若資訊足夠，直接分析營養素並給出完整的教練回饋。
          4. 如果用戶問訓練相關問題，根據上述訓練狀態回答，並結合飲食建議。

          JSON Schema:
          {
            "is_sufficient": boolean,
            "missing_info_question": string,
            "inquiry_options": string[],
            "food_name": string,
            "ingredients_breakdown": string,
            "nutrition": { "calories": number, "protein": number, "carbs": number, "fat": number },
            "price": number,
            "coach_lecture": string
          }
          `;

          const parts: any[] = [];
          if (imageBase64) {
             const cleanBase64 = imageBase64.split(',')[1] || imageBase64;
             const mimeType = getMimeType(imageBase64);
             parts.push({ inlineData: { mimeType, data: cleanBase64 } });
             parts.push({ text: "Analyze this image." });
          }
          if (currentInput) {
             parts.push({ text: currentInput });
          }

          console.log('📤 Sending to Gemini...');
          const response = await ai.models.generateContent({
              model: "gemini-2.5-flash",
              contents: { parts },
              config: {
                  systemInstruction,
                  responseMimeType: "application/json"
              }
          });

          const rawText = response.text || "{}";
          console.log('📥 Response:', rawText.substring(0, 100) + '...');

          // Basic cleanup just in case
          let cleanJson = rawText;
          const firstBrace = rawText.indexOf('{');
          const lastBrace = rawText.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace !== -1) {
              cleanJson = rawText.substring(firstBrace, lastBrace + 1);
          } else {
              cleanJson = rawText.replace(/```json|```/g, '').trim();
          }
          
          const data = JSON.parse(cleanJson);
          
          setIsTyping(false);

          if (!data.is_sufficient) {
              addAiMessage(data.missing_info_question, data.inquiry_options);
          } else {
              addAiMessage(data.coach_lecture);
              setTimeout(() => {
                  addAiMessage("", [], {
                      foodName: data.food_name,
                      calories: data.nutrition.calories,
                      macros: data.nutrition,
                      price: 0,
                      ingredients: data.ingredients_breakdown
                  });
              }, 500);
          }
      } catch (error: any) {
          console.error("Gemini Error Details:", {
              message: error.message,
              status: error.status,
              errorCode: error.code,
              fullError: error
          });
          setIsTyping(false);
          
          let errorMsg = error.message || JSON.stringify(error);
          if (error.message?.includes('API key not valid')) {
              errorMsg = "❌ API Key 無效：請檢查您輸入的 Key 是否正確（不能有空格）。";
          } else if (error.message?.includes('JSON')) {
              errorMsg = "❌ 回應解析錯誤：AI 回傳的格式異常，請重試。";
          } else if (error.message?.includes('403') || error.message?.includes('permission denied')) {
              errorMsg = "❌ 權限不足 (403)：您的 API Key 可能沒有權限或已過期。";
          } else if (error.message?.includes('429')) {
              errorMsg = "❌ 請求過於頻繁 (429)：請稍候後再試。";
          } else if (!navigator.onLine) {
              errorMsg = "❌ 網路錯誤：請檢查您的網路連線。";
          }
          
          addAiMessage(`AI 分析發生錯誤: ${errorMsg}`);
      }
  };

  // --- 3c. Import Workout from 训记 App ---
  // 匯入功能：從訓記App導入文字/JSON格式的訓練紀錄，解析後保存並由AI教練檢討
  const handleImportWorkout = async () => {
      const text = prompt('請貼上訓記 App 導出的訓練紀錄（文字或 JSON）：\n\n提示：可以從訓記App的訓練紀錄頁面複製文字內容，或貼上JSON格式的數據。');
      if (!text || !text.trim()) return;

      setIsTyping(true);
      addAiMessage('正在解析訓練紀錄...', []);

      try {
          const parsed = parseXunjiWorkout(text);
          if (!parsed) {
              setIsTyping(false);
              addAiMessage('❌ 無法解析訓練紀錄，請確認格式正確。\n\n提示：請確保貼上的是訓記App導出的完整訓練紀錄文字或JSON格式。', []);
              return;
          }

          // Convert and save workout log
          const workoutLog = convertToWorkoutLog(parsed);
          addWorkoutLog(workoutLog);
          
          addAiMessage(`✅ 已成功匯入訓練紀錄！\n訓練部位：${workoutLog.bodyParts.join(', ')}\n動作數：${workoutLog.exercises.length}\n總重量：${parsed.totalWeight}kg`, []);

          // Analyze with AI coach
          const todayDate = new Date().toISOString().split('T')[0];
          const context: CoachContext = {
              userName: profile.displayName || 'Joe',
              coachMode: profile.coachMode || 'encouraging',
              dietPlan: 'workout_review',
              targetCalories: goals.targetCalories,
              currentCalories: todayStats.consumedCalories,
              remainingCalories: Math.max(0, goals.targetCalories - todayStats.consumedCalories),
              budgetRemaining: Math.max(0, goals.budget.daily - todayStats.spentBudget),
              proteinGap: Math.max(0, goals.targetProtein - todayStats.consumedProtein),
              carbsGap: Math.max(0, goals.targetCarbs - todayStats.consumedCarbs),
              fatGap: Math.max(0, goals.targetFat - todayStats.consumedFat),
          };

          // 獲取上週同一天的訓練數據進行對比
          const lastWeekDate = new Date();
          lastWeekDate.setDate(lastWeekDate.getDate() - 7);
          const lastWeekDateStr = lastWeekDate.toISOString().split('T')[0];
          const lastWeekWorkout = workoutLogs.find(l => l.date === lastWeekDateStr);
          
          const workoutSummary = `
          本次訓練數據：
          - 訓練部位：${workoutLog.bodyParts.join(', ')}
          - 總重量：${parsed.totalWeight}kg
          - 動作數：${workoutLog.exercises.length}
          - 耗時：${workoutLog.duration}分鐘
          - 動作詳情：${workoutLog.exercises.map(e => `${e.name} (${e.sets}組, ${e.reps}次, ${e.weight}kg)`).join('; ')}
          `;
          
          const comparisonText = lastWeekWorkout 
            ? `\n上週同期訓練：${lastWeekWorkout.bodyParts.join(', ')}，總重量：${lastWeekWorkout.exercises.reduce((sum, e) => sum + (e.weight * e.reps * e.sets), 0)}kg`
            : '\n（無上週同期數據可對比）';
          
          const prompt = `請以【IronLogic - 鋼鐵意志分析官】的身份檢討這次訓練。

          ${workoutSummary}
          ${comparisonText}
          
          今日飲食狀況：
          - 熱量：${todayStats.consumedCalories}/${goals.targetCalories} kcal
          - 蛋白質：${todayStats.consumedProtein}/${goals.targetProtein}g
          - 碳水：${todayStats.consumedCarbs}/${goals.targetCarbs}g
          
          請提供：
          1. 本次訓練強度分析
          2. 對比上週進展（漸進式超負荷檢核）
          3. 教練督促/鼓勵語
          4. 下次訓練重點建議
          5. 根據今日訓練強度，給出營養補充建議（結合飲食教練數據）`;

          const res = await aiCoach.sendMessage(prompt, undefined, [], context);
          setIsTyping(false);
          addAiMessage(res.message || '已完成訓練檢討。');
      } catch (error: any) {
          console.error('Workout import/review error:', error);
          setIsTyping(false);
          addAiMessage('❌ 訓練檢討失敗：請稍後再試。');
      }
  };

  // --- 3b. Workout Form Analysis ---
  const analyzeWorkoutForm = async (imageBase64: string) => {
      setIsTyping(true);
      addUserMessage("", imageBase64);

      try {
          const apiKey = aiService.getApiKey();
          if (!apiKey) {
              throw new Error("Missing API Key");
          }

          const ai = new GoogleGenAI({ apiKey });
          const todayDate = new Date().toISOString().split('T')[0];
          const todayWorkout = workoutLogs.find(l => l.date === todayDate);

          const workoutContext = todayWorkout 
            ? `今日訓練部位：${todayWorkout.bodyParts.join(', ')}，動作數：${todayWorkout.exercises.length}。`
            : "今日尚未紀錄訓練。";

          const systemInstruction = `
          你是【IronLogic - 鋼鐵意志分析官】，一位專精於運動科學、肌肥大與力量訓練的首席教練。

          【核心性格】
          硬派、數據驅動、嚴謹、具有遠瞻性。你對偷懶行為零容忍，對進步極度讚賞。

          【目前狀態】
          - 今日訓練：${workoutContext}
          - 今日飲食：${todayStats.consumedCalories}/${goals.targetCalories} kcal，蛋白質：${todayStats.consumedProtein}/${goals.targetProtein}g

          【任務指令】
          1. **動作姿勢分析**：仔細分析這張訓練動作照片，檢查姿勢正確性、關節角度、動作軌跡。
          2. **安全性監控**：識別潛在的安全風險（如：下背過度彎曲、肩關節不穩定、膝蓋內扣等）。
          3. **即時修正建議**：提供具體、可執行的調整建議，包括：
             - 身體姿勢調整
             - 動作幅度優化
             - 呼吸節奏
             - 替代動作（如果原動作不適合）
          4. **訓練聯動**：如果今日有訓練紀錄，結合訓練內容給出針對性建議。
          5. **營養提醒**：如果動作強度高，提醒用戶注意營養補充（特別是蛋白質和碳水）。

          【輸出要求】
          - 用專業但易懂的方式回覆
          - 使用繁體中文
          - 結構化呈現：姿勢分析 → 安全警告 → 修正建議 → 進階提示
          - 語氣要硬派但具建設性，對錯誤要嚴厲指出，對正確要大力讚賞
          `;

          const cleanBase64 = imageBase64.split(',')[1] || imageBase64;
          const mimeType = imageBase64.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';

          // 優化圖片解析提示，特別是針對訓記App的截圖格式
          const imageAnalysisPrompt = `請仔細分析這張圖片。

          如果是訓練動作照片：
          - 分析動作姿勢的正確性、關節角度、身體對齊
          - 檢查動作軌跡和動作幅度
          - 識別潛在的安全風險（下背過度彎曲、肩關節不穩定、膝蓋內扣等）
          - 提供具體、可執行的修正建議

          如果是訓記App的訓練紀錄截圖：
          - 優先使用OCR技術提取所有文字數據
          - 識別表格結構（動作名稱、重量、次數、組數、日期、訓練部位）
          - 提取關鍵信息：日期、訓練部位、總重量、總耗時、每個動作的詳細數據
          - 將提取的數據結構化整理成JSON格式
          - 特別注意識別啞鈴動作的雙邊重量標記（如：15+15kg）
          
          請提供詳細的分析報告。`;

          const response = await ai.models.generateContent({
              model: "gemini-2.5-flash",
              contents: { 
                  parts: [
                      { inlineData: { mimeType, data: cleanBase64 } },
                      { text: imageAnalysisPrompt }
                  ]
              },
              config: {
                  systemInstruction,
                  responseMimeType: "text/plain"
              }
          });

          const message = response.text || '已完成動作檢查。';
          setIsTyping(false);
          addAiMessage(message);
      } catch (error: any) {
          console.error('Workout form check error:', error);
          setIsTyping(false);
          
          let errorMsg = error.message || '動作分析失敗';
          if (error.message?.includes('API key not valid')) {
              errorMsg = "❌ API Key 無效：請檢查您輸入的 Key 是否正確。";
          } else if (error.message?.includes('403') || error.message?.includes('permission denied')) {
              errorMsg = "❌ 權限不足 (403)：您的 API Key 可能沒有權限或已過期。";
          } else if (error.message?.includes('429')) {
              errorMsg = "❌ 請求過於頻繁 (429)：請稍候後再試。";
          } else if (!navigator.onLine) {
              errorMsg = "❌ 網路錯誤：請檢查您的網路連線。";
          } else {
              errorMsg = `❌ 動作分析失敗：${errorMsg}。請稍後再試。`;
          }
          
          addAiMessage(errorMsg);
      }
  };

  const handleSendMessage = () => {
      if (!inputText.trim()) return;
      const text = inputText;
      setInputText('');
      
      if (coachMode === 'diet') {
          analyzeWithGemini(text);
      } else {
          // Training coach mode
          handleTrainingCoachMessage(text);
      }
  };

  const handleTrainingCoachMessage = async (message: string) => {
      setIsTyping(true);
      addUserMessage(message);

      try {
          const todayDate = new Date().toISOString().split('T')[0];
          const todayWorkout = workoutLogs.find(l => l.date === todayDate);
          
          const context: CoachContext = {
              userName: profile.displayName || 'Joe',
              coachMode: profile.coachMode || 'encouraging',
              dietPlan: 'training_coach',
              targetCalories: goals.targetCalories,
              currentCalories: todayStats.consumedCalories,
              remainingCalories: Math.max(0, goals.targetCalories - todayStats.consumedCalories),
              budgetRemaining: Math.max(0, goals.budget.daily - todayStats.spentBudget),
              proteinGap: Math.max(0, goals.targetProtein - todayStats.consumedProtein),
              carbsGap: Math.max(0, goals.targetCarbs - todayStats.consumedCarbs),
              fatGap: Math.max(0, goals.targetFat - todayStats.consumedFat),
          };

          const workoutContext = todayWorkout 
              ? `今日訓練：${todayWorkout.bodyParts.join(', ')} (${todayWorkout.duration}分鐘)，動作數：${todayWorkout.exercises.length}。`
              : "今日尚未紀錄訓練。";

          const fullPrompt = `${message}\n\n背景資訊：${workoutContext} 今日飲食：${todayStats.consumedCalories}/${goals.targetCalories} kcal，蛋白質：${todayStats.consumedProtein}/${goals.targetProtein}g。`;

          const res = await aiCoach.sendMessage(fullPrompt, undefined, [], context);
          setIsTyping(false);
          addAiMessage(res.message || '已完成回覆。');
      } catch (error: any) {
          console.error('Training coach error:', error);
          setIsTyping(false);
          addAiMessage('❌ 回覆失敗：請稍後再試。');
      }
  };

  const confirmLog = (data: any) => {
      addLog({
          foodName: data.foodName,
          calories: data.calories,
          protein: data.macros.protein,
          carbs: data.macros.carbs,
          fat: data.macros.fat,
          price: data.price,
          mealType: getMealTypeByTime()
      });
      setMessages(prev => [...prev, { 
          id: Date.now().toString(), 
          sender: 'ai', 
          type: 'text', 
          content: `✅ 已紀錄 **${data.foodName}** (${data.calories} kcal)。` 
      }]);
  };

  // ... (ResultCard same as before) ...
  const ResultCard = ({ data }: { data: any }) => {
      const [localData, setLocalData] = useState(data);

      return (
        <div className="bg-white rounded-2xl p-4 shadow-md border border-gray-200 w-full max-w-[280px]">
            <h4 className="font-bold text-lg mb-1">{localData.foodName}</h4>
            <p className="text-xs text-gray-500 mb-3">{localData.ingredients}</p>
            <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-brand-black text-brand-green p-2 rounded-xl text-center">
                    <span className="block text-[10px] uppercase">Cals</span>
                    <span className="font-black text-xl">{localData.calories}</span>
                </div>
                <div className="bg-gray-100 text-gray-800 p-2 rounded-xl text-center border border-gray-200">
                    <span className="block text-[10px] uppercase text-gray-400">Price</span>
                    <div className="flex items-center justify-center">
                        <span className="text-xs font-bold mr-1">$</span>
                        <input 
                            type="number"
                            value={localData.price === 0 ? '' : localData.price}
                            onChange={(e) => {
                                const val = e.target.value === '' ? 0 : Number(e.target.value);
                                setLocalData({...localData, price: val});
                            }}
                            onFocus={(e) => {
                                if (localData.price === 0) {
                                    e.target.value = '';
                                }
                            }}
                            className="font-black text-xl bg-transparent w-16 text-center outline-none focus:border-b focus:border-brand-green"
                            placeholder="0"
                        />
                    </div>
                </div>
            </div>
            <button 
                onClick={() => confirmLog(localData)}
                className="w-full bg-brand-green text-brand-black py-2 rounded-xl font-bold text-sm hover:brightness-105 active:scale-95 transition-all"
            >
                確認並紀錄
            </button>
        </div>
      );
  };
  
  const todayLogs = logs.filter((log: LogEntry) => new Date(log.timestamp).toDateString() === new Date().toDateString());
  const todayBodyLogs = bodyLogs.filter((log: BodyLogEntry) => new Date(log.timestamp).toDateString() === new Date().toDateString());

  const handleDeleteLog = (log: LogEntry) => {
      deleteLog(log.id);
      addAiMessage(`系統通知：使用者刪除了 **${log.foodName}**。請更新今日剩餘熱量建議。`);
  };

  return (
    <div className="h-full flex flex-col relative bg-gray-50 overflow-hidden">
      
      {/* 1. CAROUSEL - Nutrition & Budget */}
      <div className="px-4 pt-4 pb-2 shrink-0">
          <div className="relative overflow-hidden mb-4">
              <div 
                  className="flex transition-transform duration-300 ease-out"
                  style={{ transform: `translateX(-${carouselIndex * 100}%)` }}
              >
                  <div className="min-w-full">
                      <NutritionOverview goals={goals} stats={todayStats} />
                  </div>
                  <div className="min-w-full">
                      <BudgetCard goals={goals} stats={todayStats} />
                  </div>
              </div>
              
              {/* Carousel Indicators */}
              <div className="flex justify-center gap-2 mt-3">
                  <button 
                      onClick={() => setCarouselIndex(0)}
                      className={`w-2 h-2 rounded-full transition-all ${carouselIndex === 0 ? 'bg-brand-green w-6' : 'bg-gray-300'}`}
                  />
                  <button 
                      onClick={() => setCarouselIndex(1)}
                      className={`w-2 h-2 rounded-full transition-all ${carouselIndex === 1 ? 'bg-brand-green w-6' : 'bg-gray-300'}`}
                  />
              </div>
          </div>
      </div>

      {/* 2. LISTS - 今日餐點與體態紀錄 */}
      <div className="px-4 mb-4 space-y-6 shrink-0">
          {/* Meals List */}
          <div>
              <h3 className="font-black text-lg text-gray-800 italic mb-3">今日餐點</h3>
              <div className="space-y-3">
                  {todayLogs.length === 0 ? (
                       <div className="bg-white rounded-2xl p-6 text-center border border-dashed border-gray-200"><p className="text-xs font-bold text-gray-400">今天還沒吃東西？</p></div>
                  ) : (
                      todayLogs.slice().reverse().map((log: LogEntry) => (
                          <div key={log.id} className="bg-white p-4 rounded-2xl flex items-center justify-between border border-gray-100 shadow-sm relative group">
                              <div className="flex items-center gap-4">
                                  <div className={`w-2 h-10 rounded-full ${log.mealType === 'breakfast' ? 'bg-yellow-400' : log.mealType === 'lunch' ? 'bg-brand-green' : log.mealType === 'dinner' ? 'bg-blue-400' : 'bg-purple-400'}`} />
                                  <div>
                                      <h4 className="font-bold text-gray-800 text-sm">{log.foodName}</h4>
                                      <div className="flex gap-2 text-[10px] text-gray-400 font-bold uppercase mt-1">
                                          <span>P: {log.protein}</span><span>C: {log.carbs}</span><span>F: {log.fat}</span>
                                      </div>
                                  </div>
                              </div>
                              <div className="text-right mr-2">
                                  <span className="block font-black text-brand-black text-lg">{log.calories}</span>
                                  <span className="text-[9px] font-bold text-gray-400">KCAL</span>
                              </div>
                              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => setEditingLog(log)} className="bg-gray-100 text-gray-500 p-1.5 rounded-full hover:bg-gray-200"><Edit3 size={14} /></button>
                                  <button onClick={() => handleDeleteLog(log)} className="bg-red-50 text-red-500 p-1.5 rounded-full hover:bg-red-100"><Trash2 size={14} /></button>
                              </div>
                          </div>
                      ))
                  )}
              </div>
          </div>
          {/* Body Log List */}
          <div>
               <div className="flex items-center justify-between mb-3">
                   <h3 className="font-black text-lg text-gray-800 italic">體態紀錄</h3>
                   <button onClick={() => { setCameraMode('body'); setIsCameraOpen(true); }} className="text-xs font-bold text-brand-green bg-brand-black px-3 py-1.5 rounded-full flex items-center gap-1 active:scale-95 transition-transform"><Camera size={12} /> 新增</button>
               </div>
               {todayBodyLogs.length === 0 ? (
                   <div className="bg-white rounded-2xl p-6 text-center border border-dashed border-gray-200"><p className="text-xs font-bold text-gray-400">今天還沒紀錄體態</p></div>
               ) : (
                   <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
                       {todayBodyLogs.map((log: BodyLogEntry) => (
                           <div key={log.id} className="relative w-24 h-32 flex-shrink-0 rounded-xl overflow-hidden shadow-sm group">
                               <img src={log.imageUrl} className="w-full h-full object-cover" alt="Body" />
                               <button onClick={() => deleteBodyLog(log.id)} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={10} /></button>
                           </div>
                       ))}
                   </div>
               )}
          </div>
      </div>

      {/* 3. CHAT - AI教練 */}
      <div className="px-4 pb-4 flex-1 flex flex-col min-h-0 max-h-[60vh] sm:max-h-none overflow-hidden">
          <div className="bg-white rounded-[2rem] shadow-sm border border-gray-200 overflow-hidden flex flex-col flex-1 min-h-0">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-xs font-black text-gray-500 tracking-wider">線上（使用者 API Key）</span>
                  </div>
                  <div className="flex items-center gap-2">
                      {/* Coach Mode Tabs */}
                      <div className="flex bg-white p-1 rounded-full border border-gray-200">
                          <button 
                              onClick={() => setCoachMode('diet')}
                              className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${
                                  coachMode === 'diet' 
                                      ? 'bg-brand-green text-brand-black' 
                                      : 'text-gray-400 hover:text-gray-600'
                              }`}
                          >
                              飲食
                          </button>
                          <button 
                              onClick={() => setCoachMode('training')}
                              className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${
                                  coachMode === 'training' 
                                      ? 'bg-brand-green text-brand-black' 
                                      : 'text-gray-400 hover:text-gray-600'
                              }`}
                          >
                              訓練
                          </button>
                      </div>
                      {coachMode === 'diet' && (
                          <button onClick={() => setShowTrainingModal(true)} className="flex items-center gap-1 text-[10px] text-brand-black font-bold bg-white px-3 py-1.5 rounded-full border border-gray-200 hover:border-brand-green shadow-sm active:scale-95 transition-all">
                              {trainingMode === 'leg' ? '腿日模式' : trainingMode === 'push_pull' ? '推拉模式' : '休息日'}
                              <ChevronDown size={12} strokeWidth={3} />
                          </button>
                      )}
                      {coachMode === 'training' && (
                          <button onClick={handleImportWorkout} className="flex items-center gap-1 text-[10px] text-brand-black font-bold bg-white px-3 py-1.5 rounded-full border border-gray-200 hover:border-brand-green shadow-sm active:scale-95 transition-all">
                              <Upload size={12} />
                              匯入
                          </button>
                      )}
                  </div>
              </div>
              <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-white scroll-smooth">
                  {messages.map((msg) => (
                      <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} animate-fade-in-up`}>
                          {msg.type === 'text' && (
                              <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm font-medium leading-relaxed ${msg.sender === 'user' ? 'bg-brand-black text-brand-green rounded-tr-none' : 'bg-gray-100 text-gray-800 rounded-tl-none'}`}>
                                  <MarkdownText text={msg.content || ""} />
                              </div>
                          )}
                          {msg.type === 'image' && msg.image && <img src={msg.image} className="w-32 h-32 object-cover rounded-xl border border-gray-200" alt="sent" />}
                          {msg.type === 'card' && msg.cardData && <ResultCard data={msg.cardData} />}
                          {msg.sender === 'ai' && msg.options && msg.options.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                  {msg.options.map(opt => (
                                      <button 
                                          key={opt} 
                                          onClick={() => {
                                              if (coachMode === 'diet') {
                                                  analyzeWithGemini(opt);
                                              } else {
                                                  if (opt === '匯入訓記紀錄') {
                                                      handleImportWorkout();
                                                  } else {
                                                      handleTrainingCoachMessage(opt);
                                                  }
                                              }
                                          }} 
                                          className="bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-full text-xs font-bold hover:border-brand-green hover:text-brand-green transition-colors"
                                      >
                                          {opt}
                                      </button>
                                  ))}
                              </div>
                          )}
                      </div>
                  ))}
                  {isTyping && <div className="text-xs text-gray-400 font-bold ml-4 animate-pulse">Coach Joe 正在輸入...</div>}
              </div>
              <div className="p-3 bg-gray-50 border-t border-gray-100 flex items-center gap-2">
                  <button
                    onClick={() => {
                        // 根据教练模式自动设置相机类型
                        if (coachMode === 'diet') {
                            setCameraMode('food');
                        } else {
                            setCameraMode('workout');
                        }
                        setIsCameraOpen(true);
                    }}
                    className="p-2 bg-white rounded-full text-gray-400 hover:text-brand-black border border-gray-200"
                    title={coachMode === 'diet' ? '拍食物' : '拍動作'}
                  >
                    <Camera size={18} />
                  </button>
                  <input value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="輸入..." className="flex-1 bg-white border border-gray-200 rounded-full px-4 py-2 text-sm font-bold focus:outline-none focus:border-brand-green" />
                  <button onClick={handleSendMessage} disabled={!inputText.trim()} className="p-2 bg-brand-black text-brand-green rounded-full disabled:opacity-50"><ArrowUp size={18} strokeWidth={3} /></button>
              </div>
          </div>
      </div>


      <TrainingCheckModal isOpen={showTrainingModal} onClose={handleTrainingSet} />
      
      <CameraModal 
          isOpen={isCameraOpen} 
          onClose={() => setIsCameraOpen(false)} 
          label={
            coachMode === 'diet'
              ? '拍攝餐點'
              : '檢查動作姿勢'
          }
          onCapture={(base64: string) => {
              setIsCameraOpen(false);
              setTimeout(() => {
                if (coachMode === 'diet') {
                    // 饮食教练：分析食物
                    analyzeWithGemini("分析這張食物照片", base64);
                } else {
                    // 训练教练：检查动作姿势
                    analyzeWorkoutForm(base64);
                }
              }, 100);
          }}
      />
    </div>
  );
};
