
import React, { useState, useEffect, useRef } from 'react';
import { X, ArrowUp, Camera, Check, Edit3, AlertTriangle, Search, MessageSquare, ArrowLeft, Image as ImageIcon } from 'lucide-react';
import { useUser, MealType } from '../context/UserContext';
import { GoogleGenAI, Part, Content } from "@google/genai";
import { aiService } from '../services/ai';

interface LogFoodFlowProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode: 'text' | 'camera';
}

type FlowStep = 'CAMERA' | 'CHAT';

interface Message {
  id: string;
  sender: 'ai' | 'user';
  type: 'text' | 'image' | 'card' | 'error';
  content?: string; 
  image?: string;
  cardData?: any; 
  options?: string[];
}

// --- Helper for MimeType ---
const getMimeType = (base64String: string) => {
    if (base64String.startsWith('data:image/png')) return 'image/png';
    if (base64String.startsWith('data:image/jpeg')) return 'image/jpeg';
    if (base64String.startsWith('data:image/webp')) return 'image/webp';
    return 'image/jpeg';
};

// --- Markdown Helper ---
const MarkdownText: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null;
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return (
    <span className="whitespace-pre-wrap">
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="font-black text-gray-900">{part.slice(2, -2)}</strong>;
        }
        return part;
      })}
    </span>
  );
};

export const LogFoodFlow: React.FC<LogFoodFlowProps> = ({ isOpen, onClose, initialMode }) => {
  const { addLog, profile, goals, logs, todayStats, trainingMode } = useUser();
  const [step, setStep] = useState<FlowStep>('CHAT');
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Safety Alert State
  const [alertInfo, setAlertInfo] = useState<{ type: 'danger' | 'warning', title: string, msg: string, dataToSave: any } | null>(null);

  // Camera Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hasCameraPerm, setHasCameraPerm] = useState<boolean | null>(null);

  // --- Initialization ---
  useEffect(() => {
    if (isOpen) {
      setStep(initialMode === 'camera' ? 'CAMERA' : 'CHAT');
      setMessages([]);
      setInputText('');
      setAlertInfo(null);
      
      if (initialMode === 'text') {
          // Initial greeting
          setTimeout(() => {
              addAiMessage("我是 Coach Joe。請回報你的餐點。", ['排骨便當', '地瓜 200g', '拿鐵 (無糖)']);
          }, 500);
      }
    } else {
      stopCamera();
    }
  }, [isOpen, initialMode]);

  // Scroll to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // --- Helper Functions ---
  const addAiMessage = (text: string, options?: string[], cardData?: any) => {
    if (!text && !cardData && (!options || options.length === 0)) return;

    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      sender: 'ai',
      type: cardData ? 'card' : 'text',
      content: text,
      options,
      cardData
    }]);
  };

  const addErrorMessage = (errorText: string) => {
      setMessages(prev => [...prev, {
          id: Date.now().toString(),
          sender: 'ai',
          type: 'error',
          content: errorText
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

  // --- AI Logic: Gemini with Memory ---

  const generateHistory = (): Content[] => {
    // 1. Filter out error messages
    const validMessages = messages.filter(m => m.type !== 'error');
    if (validMessages.length === 0) return [];

    const history: Content[] = [];
    let lastRole: 'user' | 'model' | null = null;

    // 2. Coalesce consecutive messages from the same sender
    validMessages.forEach(m => {
        const role = m.sender === 'user' ? 'user' : 'model';
        const parts: Part[] = [];
        
        // Text Content
        if (m.content) parts.push({ text: m.content });
        
        // Image Content
        if (m.image) {
             const cleanBase64 = m.image.split(',')[1] || m.image;
             const mimeType = getMimeType(m.image);
             parts.push({ inlineData: { mimeType, data: cleanBase64 } });
        }
        
        // System Memory Injection (Card Data)
        if (m.type === 'card' && m.cardData) {
            parts.push({ text: `[System Memory] AI has previously analyzed: ${JSON.stringify(m.cardData)}` });
        }

        if (parts.length === 0) return;

        if (lastRole === role) {
            // Append parts to the previous turn
            const lastTurn = history[history.length - 1];
            if (lastTurn && lastTurn.parts) {
                lastTurn.parts = [...lastTurn.parts, ...parts];
            }
        } else {
            // Start a new turn
            history.push({ role, parts });
            lastRole = role;
        }
    });

    // 3. Ensure History Starts with 'user'
    // Gemini Chat API often requires history to start with the user turn.
    // If the first message is the AI greeting ('model'), remove it to prevent 400 errors.
    if (history.length > 0 && history[0].role === 'model') {
        history.shift();
    }

    return history;
  };

  const analyzeWithGemini = async (currentInput: string, imageBase64?: string) => {
    setIsTyping(true);

    try {
        // 安全地讀取 API Key，添加多層檢查
        let apiKey: string | null = null;
        
        try {
            apiKey = localStorage.getItem('gemini_api_key');
        } catch (e) {
            console.warn("localStorage 不可用:", e);
        }

        if (!apiKey || apiKey.trim() === '') {
            throw new Error("API Key 未設置。請在設定中輸入你的 Gemini API Key。");
        }

        const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
        
        // 1. Prepare History (Strictly formatted)
        const history = generateHistory();
        
        // 2. System Instruction (Strict but Encouraging Coach Persona with Structured Options)
        const systemInstruction = `
        角色：你是一位專注於「增肌減脂」的全方位私人健身教練 "Coach Joe"。你的風格是「專業、數據導向、但富有激勵性」。
        
        使用者名字：Joe。
        核心原則：**你不是Joe。請直接稱呼使用者為 "Joe"。**

        用戶核心數據 (Context)：
        - 主要目標：${profile.goalType === 'lose_fat' ? '減脂' : profile.goalType === 'build_muscle' ? '增肌' : profile.goalType === 'recomp' ? '同時增肌減脂' : '維持'}
        - 總熱量目標 (TDEE)：${goals.targetCalories} Kcal
        - 蛋白質目標 (P)：${goals.targetProtein} 克
        - 脂肪目標 (F)：嚴格控制在 ${goals.targetFat} 克以內
        - 碳水目標 (C)：${goals.targetCarbs} 克
        - 今日已攝取：熱量 ${todayStats.consumedCalories}, P ${todayStats.consumedProtein}, F ${todayStats.consumedFat}

        核心職責與溝通原則：
        1. **法醫級數據偵訊 (Forensic Interrogation)**：
           - **台灣飲食陷阱**：針對「便當」、「乾麵」、「滷肉飯」等高變異食物，必須追問：
             - 烹調方式（炸/滷/煎/蒸）？
             - 醬汁（有無淋肉燥/沙拉醬/美乃滋）？
             - 飯量（一碗/半碗）？
             - 肉類部位（帶皮/去皮）？
           - 若資訊不足，**拒絕估算**，並回傳 \`is_sufficient: false\`。
           - **關鍵：** 在追問時，必須提供 \`inquiry_options\`，讓用戶可以直接點選。

        2. **脂肪拆解 (Fat Breakdown)**：
           - 在 \`ingredients_breakdown\` 中，針對高脂食物，請明確指出油脂來源。
           - 例如：「雞腿便當 (脂肪 35g: 炸皮 15g + 肉本身 10g + 炒菜油 10g)」。

        3. **脂肪監控與警示 (F-Limit)**：
           - 單餐脂肪 > 15g 或 總量接近 ${goals.targetFat}g 時，請發出理性警告。

        4. **正向激勵 (Positive Reinforcement)**：
           - 如果這餐營養素分配完美 (高蛋白、低脂)，請在結語加上：『✅ 漂亮！蛋白質達標且油脂控制完美，離目標身材更近一步！』

        輸出格式 (JSON ONLY - 必須是有效的 JSON，不要包含任何 markdown 代碼塊)：
        {
          "is_sufficient": boolean, // 若資訊太模糊 (如只說 "便當") 則為 false
          "missing_info_question": string | null, // 若 false，在此填寫追問問題
          "inquiry_options": string[] | null, // 若 false，在此提供 3-5 個選項供用戶選擇 (例如 ["炸排骨", "滷排骨", "煎排骨"])
          "food_name": string, // 精確名稱，如 "滷雞腿便當 (去皮/飯一半)"
          "ingredients_breakdown": string, // 成分拆解 (含脂肪來源)
          "nutrition": {
            "calories": number,
            "protein": number,
            "carbs": number,
            "fat": number
          },
          "price": number,
          "coach_lecture": string // 教練分析與建議
        }
        `;

        // 3. Create Chat Session
        const chat = ai.chats.create({
            model: "gemini-2.5-flash", 
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
            },
            history: history
        });

        // 4. Send Message
        const messageParts: Part[] = [];
        if (imageBase64) {
            const cleanBase64 = imageBase64.split(',')[1] || imageBase64; 
            const mimeType = getMimeType(imageBase64);
            messageParts.push({ inlineData: { mimeType, data: cleanBase64 } });
            messageParts.push({ text: `Analyze this image.` });
        } else {
            messageParts.push({ text: currentInput });
        }

        console.log('📤 Sending to Gemini...');
        const result = await chat.sendMessage({ message: messageParts });
        const rawText = result.text;
        
        console.log('📥 Response:', rawText?.substring(0, 200) + '...');
        
        // 5. Parse Response
        if (!rawText) throw new Error("Gemini 返回空回應");
        // Extract JSON if wrapped in markdown code blocks
        let jsonString = rawText;
        // Robust extraction: find first '{' and last '}'
        const firstBrace = rawText.indexOf('{');
        const lastBrace = rawText.lastIndexOf('}');
        
        if (firstBrace !== -1 && lastBrace !== -1) {
            jsonString = rawText.substring(firstBrace, lastBrace + 1);
        } else {
             // Fallback cleanup
             jsonString = rawText.replace(/```json|```/g, '').trim();
        }

        const responseData = JSON.parse(jsonString);
        
        setIsTyping(false);
        
        // 6. Handle Logic
        if (!responseData.is_sufficient) {
            // Case: Need more info - Provide Options if available
            addAiMessage(
                responseData.missing_info_question || "資訊不足，請補充細節。",
                responseData.inquiry_options || []
            );
        } else {
            // Case: Success
            // Show Coach Lecture
            addAiMessage(responseData.coach_lecture || "分析完成。");
            
            // Show Data Card
            setTimeout(() => {
                addAiMessage("", [], {
                    foodName: responseData.food_name || "Unknown",
                    ingredients: responseData.ingredients_breakdown || "N/A",
                    calories: responseData.nutrition?.calories || 0,
                    price: responseData.price || 0,
                    macros: responseData.nutrition || { protein: 0, carbs: 0, fat: 0 }
                });
            }, 600);
        }

    } catch (error: any) {
        console.error("Gemini Error Details:", {
            message: error.message,
            status: error.status,
            errorCode: error.code,
            fullError: error
        });
        setIsTyping(false);
        addErrorMessage(`分析錯誤: ${error.message || '未知錯誤'}`);
    }
  };

  const handleSend = () => {
    if (!inputText.trim()) return;
    const text = inputText;
    setInputText('');
    addUserMessage(text);
    analyzeWithGemini(text);
  };

  const handleOptionClick = (opt: string) => {
    addUserMessage(opt);
    analyzeWithGemini(opt);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result as string;
            setStep('CHAT');
            addUserMessage("分析這張照片", base64);
            analyzeWithGemini("IMAGE_UPLOAD", base64);
        };
        reader.readAsDataURL(file);
    }
  };

  const confirmLog = (finalData: any) => {
      addLog({
          foodName: finalData.foodName,
          calories: finalData.calories,
          protein: finalData.macros.protein,
          carbs: finalData.macros.carbs,
          fat: finalData.macros.fat,
          price: finalData.price,
          mealType: getMealTypeByTime()
      });
      setMessages(prev => [...prev, { 
          id: Date.now().toString(), 
          sender: 'ai', 
          type: 'text', 
          content: `✅ 已紀錄 **${finalData.foodName}** (${finalData.calories} kcal)。` 
      }]);
  };

  // --- Safety Check Logic ---
  const handleCheckAndConfirm = (data: any) => {
      // 1. Fat Red Line Check
      const potentialFat = todayStats.consumedFat + (data.macros.fat || 0);
      const fatRatio = potentialFat / goals.targetFat;
      
      if (fatRatio > 0.7) {
          setAlertInfo({
              type: 'danger',
              title: '🚨 警告！脂肪額度告急',
              msg: `今日脂肪額度即將耗盡 (已達 70%)！教練建議：停止攝取任何額外油脂，否則今日將以失敗收場。`,
              dataToSave: data
          });
          return;
      }

      // 2. Protein Check
      if ((data.macros.protein || 0) < 30) {
          setAlertInfo({
              type: 'warning',
              title: '⚠️ 蛋白質不足',
              msg: `本餐蛋白質僅 ${data.macros.protein}g (<30g)。這餐是無效進食嗎？請在下一餐補足！`,
              dataToSave: data
          });
          return;
      }

      // 3. Pre-workout Fuel Check (Leg Day + Afternoon + Low Carbs)
      const hour = new Date().getHours();
      const isAfternoon = hour >= 13 && hour < 18;
      if (trainingMode === 'leg' && isAfternoon && todayStats.consumedCarbs < 50) {
           setAlertInfo({
              type: 'warning',
              title: '⚡️ 燃料不足警示',
              msg: `你打算空腹練腿嗎？目前碳水庫存過低，快去補足 50g 碳水！`,
              dataToSave: data
          });
          return;
      }

      // Safe to proceed
      confirmLog(data);
  };

  // --- Camera Logic ---
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setHasCameraPerm(true);
      }
    } catch (err) {
      console.error(err);
      setHasCameraPerm(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
  };

  const handleCapture = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
      const imgData = canvas.toDataURL('image/jpeg');
      
      setStep('CHAT');
      addUserMessage("分析這張照片", imgData);
      analyzeWithGemini("IMAGE_UPLOAD", imgData);
    }
  };

  // --- Components ---

  const ReviewCard = ({ data }: { data: any }) => {
      const [localData, setLocalData] = useState(data);
      const [isCooldown, setIsCooldown] = useState(false);
      const [cooldownTime, setCooldownTime] = useState(0);
      const [commitmentText, setCommitmentText] = useState("");
      const isFatHigh = (localData.macros?.fat || 0) > 20;

      useEffect(() => {
          if (isFatHigh) {
              setIsCooldown(true);
              setCooldownTime(3);
              const timer = setInterval(() => {
                  setCooldownTime(prev => {
                      if (prev <= 1) {
                          clearInterval(timer);
                          return 0;
                      }
                      return prev - 1;
                  });
              }, 1000);
              return () => clearInterval(timer);
          }
      }, []);

      const canConfirm = !isCooldown || (cooldownTime === 0 && commitmentText === "我接受後果");

      return (
          <div className="bg-white rounded-[1.5rem] p-5 shadow-xl border border-gray-100 mt-2 max-w-[95%] animate-fade-in-up w-full">
               {/* Header */}
               <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2">
                   <div className="flex items-center gap-2">
                       <Search size={14} className="text-brand-green" />
                       <span className="font-black text-[10px] text-gray-400 uppercase tracking-wider">Analysis Verdict</span>
                   </div>
                   <div className="flex items-center gap-2">
                       <input 
                          value={localData.foodName}
                          onChange={(e) => setLocalData({...localData, foodName: e.target.value})}
                          className="font-bold text-gray-800 text-right bg-transparent outline-none w-36 focus:border-b focus:border-brand-green"
                       />
                       <Edit3 size={12} className="text-gray-300 shrink-0" />
                   </div>
               </div>

               {/* Ingredients Breakdown */}
               <div className="bg-gray-50 rounded-xl p-3 mb-4 border border-gray-100">
                   <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">詳細成分 (Forensic Analysis)</p>
                   <p className="text-xs text-gray-600 font-medium leading-relaxed">
                       {localData.ingredients || "分析中..."}
                   </p>
               </div>

               {/* Main Stats Grid - Row 1 */}
               <div className="grid grid-cols-2 gap-3 mb-3">
                   <div className="bg-brand-black p-3 rounded-2xl border border-gray-800 relative overflow-hidden group">
                       <div className="absolute top-0 right-0 p-2 opacity-10">
                           <ArrowUp className="text-brand-green" size={24} />
                       </div>
                       <span className="text-[9px] font-bold text-gray-400 uppercase block mb-0.5">Calories</span>
                       <div className="flex items-baseline">
                            <input 
                                type="number"
                                value={localData.calories}
                                onChange={(e) => setLocalData({...localData, calories: Number(e.target.value)})}
                                className="w-full font-black text-2xl text-brand-green bg-transparent outline-none"
                            />
                            <span className="text-[10px] text-gray-500 font-bold ml-1">kcal</span>
                       </div>
                   </div>
                   <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                       <span className="text-[9px] font-bold text-gray-400 uppercase block mb-0.5">Price</span>
                       <div className="flex items-baseline">
                            <span className="text-sm font-bold text-gray-400 mr-1">$</span>
                            <input 
                                type="number"
                                value={localData.price}
                                onChange={(e) => setLocalData({...localData, price: Number(e.target.value)})}
                                className="w-full font-black text-xl text-gray-800 bg-transparent outline-none"
                            />
                       </div>
                   </div>
               </div>

               {/* Macros Grid - Row 2 */}
               <div className="grid grid-cols-3 gap-2 mb-4">
                   <div className="bg-gray-50 p-2 rounded-xl border border-gray-100 text-center">
                       <span className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Protein</span>
                       <div className="flex items-center justify-center">
                           <input 
                                type="number"
                                value={localData.macros?.protein || 0}
                                onChange={(e) => setLocalData({
                                    ...localData, 
                                    macros: { ...localData.macros, protein: Number(e.target.value) }
                                })}
                                className="w-12 font-bold text-sm text-gray-800 bg-transparent outline-none text-center border-b border-transparent focus:border-brand-green"
                            />
                            <span className="text-[10px] text-gray-400">g</span>
                       </div>
                   </div>
                   <div className="bg-gray-50 p-2 rounded-xl border border-gray-100 text-center">
                       <span className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Carbs</span>
                       <div className="flex items-center justify-center">
                           <input 
                                type="number"
                                value={localData.macros?.carbs || 0}
                                onChange={(e) => setLocalData({
                                    ...localData, 
                                    macros: { ...localData.macros, carbs: Number(e.target.value) }
                                })}
                                className="w-12 font-bold text-sm text-gray-800 bg-transparent outline-none text-center border-b border-transparent focus:border-blue-400"
                            />
                            <span className="text-[10px] text-gray-400">g</span>
                       </div>
                   </div>
                   <div className="bg-gray-50 p-2 rounded-xl border border-gray-100 text-center">
                       <span className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Fat</span>
                       <div className="flex items-center justify-center">
                           <input 
                                type="number"
                                value={localData.macros?.fat || 0}
                                onChange={(e) => setLocalData({
                                    ...localData, 
                                    macros: { ...localData.macros, fat: Number(e.target.value) }
                                })}
                                className={`w-12 font-bold text-sm bg-transparent outline-none text-center border-b border-transparent focus:border-yellow-400 ${isFatHigh ? 'text-red-500' : 'text-gray-800'}`}
                            />
                            <span className="text-[10px] text-gray-400">g</span>
                       </div>
                   </div>
               </div>
               
               {/* High Fat Friction UI */}
               {isCooldown && (
                   <div className="mb-4 bg-red-50 p-3 rounded-xl border border-red-100">
                       <p className="text-xs font-bold text-red-500 mb-2">⚠️ 高脂警告！請輸入「我接受後果」以解鎖紀錄。</p>
                       <input 
                          value={commitmentText}
                          onChange={(e) => setCommitmentText(e.target.value)}
                          placeholder="我接受後果"
                          disabled={cooldownTime > 0}
                          className="w-full p-2 text-sm border border-red-200 rounded-lg outline-none focus:border-red-500"
                       />
                   </div>
               )}

               <button 
                  onClick={() => handleCheckAndConfirm(localData)}
                  disabled={!canConfirm}
                  className={`w-full py-4 rounded-2xl font-black text-sm shadow-lg transition-all flex items-center justify-center gap-2 ${
                      canConfirm 
                        ? 'bg-brand-green text-brand-black hover:shadow-brand-green/20 active:scale-95' 
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
               >
                   {cooldownTime > 0 ? (
                       <span>冷靜期... {cooldownTime}s</span>
                   ) : (
                       <>
                           <Check size={18} strokeWidth={3} />
                           <span>確認並記錄</span>
                       </>
                   )}
               </button>
          </div>
      );
  };

  if (!isOpen) return null;

  return (
    // FULL PAGE CONTAINER: Fixed to viewport, white background, high Z-index
    <div className="fixed inset-0 z-[60] bg-white flex flex-col items-center justify-center sm:bg-black/80">
      
      <div className="w-full h-full sm:max-w-[420px] sm:h-[90vh] sm:max-h-[850px] bg-white sm:rounded-[2.5rem] flex flex-col overflow-hidden relative shadow-2xl animate-fade-in-up">
        
        {/* Navbar */}
        <div className="flex items-center justify-between p-4 pt-10 sm:pt-6 bg-white/95 backdrop-blur-sm border-b border-gray-100 z-20">
           <button 
             onClick={onClose} 
             className="p-2 -ml-2 rounded-full hover:bg-gray-50 text-gray-600 flex items-center gap-1 active:scale-95 transition-transform"
           >
              <ArrowLeft size={24} />
              <span className="font-bold text-sm">返回</span>
           </button>
           
           <h2 className="text-lg font-black italic text-brand-black flex items-center gap-2">
               <div className="bg-brand-black text-brand-green p-1.5 rounded-full">
                   <MessageSquare size={14} fill="currentColor" />
               </div>
               飲食紀錄對話
           </h2>
           
           <div className="w-10" /> {/* Spacer for centering */}
        </div>

        {/* --- MODE: CAMERA --- */}
        {step === 'CAMERA' && (
             <div className="flex-1 bg-black relative flex flex-col">
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    hidden 
                    accept="image/*" 
                    onChange={handleFileImport} 
                />
                
                {hasCameraPerm === false ? (
                    <div className="flex-1 flex items-center justify-center text-white p-8 text-center">
                        <p>請允許相機權限以進行拍照分析</p>
                    </div>
                ) : (
                    <video ref={videoRef} autoPlay playsInline muted className="flex-1 w-full h-full object-cover" />
                )}
                
                <div className="absolute bottom-0 w-full h-40 bg-gradient-to-t from-black via-black/50 to-transparent flex items-center justify-center gap-12 pb-12">
                    <button onClick={() => setStep('CHAT')} className="p-4 bg-white/20 rounded-full text-white backdrop-blur-md active:scale-95 transition-transform">
                        <Edit3 size={24} />
                    </button>
                    <button onClick={handleCapture} className="w-20 h-20 bg-transparent border-[6px] border-white rounded-full flex items-center justify-center active:scale-95 transition-transform shadow-lg">
                         <div className="w-16 h-16 bg-white rounded-full" />
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className="p-4 bg-white/20 rounded-full text-white backdrop-blur-md active:scale-95 transition-transform">
                        <ImageIcon size={24} />
                    </button>
                </div>
             </div>
        )}

        {/* --- MODE: CHAT --- */}
        {step === 'CHAT' && (
            <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
                {/* Chat Area */}
                <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth no-scrollbar pb-32">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} animate-fade-in-up`}>
                            
                            {/* Avatar for AI */}
                            {msg.sender === 'ai' && msg.type !== 'error' && (
                                <div className="flex items-center gap-2 mb-1 ml-1">
                                    <div className="w-6 h-6 bg-brand-black rounded-full flex items-center justify-center text-brand-green text-[10px] font-black shadow-sm border border-gray-100">
                                        JOE
                                    </div>
                                    <span className="text-[10px] font-bold text-gray-400">Coach</span>
                                </div>
                            )}

                            {/* Text Bubble */}
                            {msg.type === 'text' && msg.content && (
                                <div className={`max-w-[85%] p-4 rounded-2xl text-sm font-medium shadow-sm leading-relaxed ${
                                    msg.sender === 'user' 
                                    ? 'bg-brand-green text-brand-black rounded-tr-none' 
                                    : 'bg-gray-100 text-gray-800 rounded-tl-none'
                                }`}>
                                    <MarkdownText text={msg.content || ""} />
                                </div>
                            )}
                            
                            {/* Error Bubble */}
                            {msg.type === 'error' && (
                                <div className="max-w-[85%] p-3 rounded-2xl text-xs font-bold shadow-sm leading-relaxed bg-red-50 text-red-500 border border-red-100 flex items-center gap-2">
                                    <AlertTriangle size={14} />
                                    <span>{msg.content}</span>
                                </div>
                            )}

                            {/* Image Bubble */}
                            {msg.type === 'image' && msg.image && (
                                <div className="w-48 h-48 rounded-2xl overflow-hidden border-2 border-brand-green shadow-md relative group">
                                    <img src={msg.image} className="w-full h-full object-cover" alt="upload" />
                                </div>
                            )}

                            {/* Result Card */}
                            {msg.type === 'card' && msg.cardData && (
                                <ReviewCard data={msg.cardData} />
                            )}
                            
                            {/* Quick Options (Structured Buttons) */}
                            {msg.sender === 'ai' && msg.options && msg.options.length > 0 && messages.indexOf(msg) === messages.length - 1 && !isTyping && (
                                <div className="flex flex-wrap gap-2 mt-2 max-w-[95%] pl-1">
                                    {msg.options.map(opt => (
                                        <button 
                                            key={opt} 
                                            onClick={() => handleOptionClick(opt)} 
                                            className="bg-brand-green/20 text-brand-black border border-brand-green/30 hover:bg-brand-green hover:border-brand-green px-5 py-2.5 rounded-full text-xs font-bold shadow-sm active:scale-95 transition-all"
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}

                    {isTyping && (
                        <div className="flex items-center gap-2 ml-2 mt-2">
                            <div className="w-12 h-8 bg-gray-50 rounded-2xl rounded-tl-none flex items-center justify-center border border-gray-100">
                                <div className="flex gap-1">
                                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}} />
                                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}} />
                                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}} />
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="h-6" /> {/* Bottom spacer */}
                </div>

                {/* Input Area - Fixed at Bottom with Safe Area */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-gray-100 pb-8 sm:pb-6">
                     <div className="flex items-end gap-3">
                         <button onClick={() => setStep('CAMERA')} className="p-3 bg-gray-50 rounded-full text-gray-400 hover:bg-gray-100 hover:text-brand-black transition-colors border border-gray-100 active:scale-95 mb-0.5">
                             <Camera size={22} />
                         </button>
                         <div className="flex-1 relative">
                             <textarea
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                placeholder="輸入食物名稱 (例如: 雞腿便當 飯一半)..."
                                className="w-full bg-gray-50 border border-gray-200 rounded-[1.5rem] py-3.5 px-5 text-gray-800 font-bold focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all placeholder-gray-400 resize-none min-h-[50px] max-h-[120px]"
                                rows={1}
                                onKeyDown={(e) => {
                                    if(e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                             />
                         </div>
                         <button 
                            onClick={handleSend}
                            disabled={!inputText.trim()}
                            className={`p-3.5 rounded-full transition-all shadow-lg border border-transparent mb-0.5 ${
                                inputText.trim() 
                                ? 'bg-brand-green text-brand-black rotate-0 scale-100 hover:shadow-brand-green/30' 
                                : 'bg-gray-100 text-gray-300 scale-90 border-gray-100 cursor-not-allowed'
                            }`}
                         >
                             <ArrowUp size={22} strokeWidth={3} />
                         </button>
                     </div>
                </div>

                {/* SAFETY ALERT MODAL */}
                {alertInfo && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-fade-in">
                        <div className={`w-full max-w-sm bg-white rounded-[2rem] p-6 shadow-2xl transform transition-transform scale-100 border-2 ${alertInfo.type === 'danger' ? 'border-red-500' : 'border-yellow-400'}`}>
                             <div className="flex items-start gap-4 mb-4">
                                 <div className={`p-3 rounded-full shrink-0 ${alertInfo.type === 'danger' ? 'bg-red-100 text-red-500' : 'bg-yellow-100 text-yellow-600'}`}>
                                     <AlertTriangle size={32} strokeWidth={2.5} />
                                 </div>
                                 <div>
                                     <h3 className={`text-xl font-black ${alertInfo.type === 'danger' ? 'text-red-500' : 'text-gray-800'}`}>
                                         {alertInfo.title}
                                     </h3>
                                     <p className="text-sm font-bold text-gray-500 mt-2 leading-relaxed">
                                         {alertInfo.msg}
                                     </p>
                                 </div>
                             </div>
                             
                             <div className="space-y-3">
                                 <button 
                                     onClick={() => setAlertInfo(null)}
                                     className="w-full py-3 rounded-xl font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 active:scale-95 transition-all"
                                 >
                                     返回修改
                                 </button>
                                 <button 
                                     onClick={() => {
                                         confirmLog(alertInfo.dataToSave);
                                         setAlertInfo(null);
                                     }}
                                     className={`w-full py-3 rounded-xl font-bold active:scale-95 transition-all ${alertInfo.type === 'danger' ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-brand-green text-brand-black hover:brightness-105'}`}
                                 >
                                     {alertInfo.type === 'danger' ? '無視警告並紀錄' : '我知道了，確認紀錄'}
                                 </button>
                             </div>
                        </div>
                    </div>
                )}

            </div>
        )}

      </div>
    </div>
  );
};
