
import React, { useState, useEffect, useRef } from 'react';
import { X, ArrowUp, Camera, Check, Edit3, AlertTriangle, Search, MessageSquare, ArrowLeft, Image as ImageIcon, Key } from 'lucide-react';
import { useUser, MealType } from '../context/UserContext';
import { Content, Part } from "@google/genai"; 
import { aiCoach, CoachContext, CoachResponse } from '../services/aiCoach';
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

// --- Markdown Helper ---
const MarkdownText: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null;
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return (
    <span className="whitespace-pre-wrap leading-relaxed">
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
  const { addLog, profile, goals, todayStats, trainingMode } = useUser();
  const [step, setStep] = useState<FlowStep>('CHAT');
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Safety Alert State
  const [alertInfo, setAlertInfo] = useState<{ type: 'danger' | 'warning', title: string, msg: string, dataToSave: any } | null>(null);

  // API Key Missing State
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [pendingRequest, setPendingRequest] = useState<{text: string, image?: string} | null>(null);
  const [tempApiKey, setTempApiKey] = useState('');

  // Camera Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hasCameraPerm, setHasCameraPerm] = useState<boolean | null>(null);

  // --- Helper Functions ---
  const getDietPlanString = (mode: string) => {
      switch(mode) {
          case 'leg': return 'High Carb (Leg Day)';
          case 'push_pull': return 'High Protein (Push/Pull)';
          case 'rest': return 'Low Carb (Rest Day)';
          default: return 'Balanced';
      }
  };

  // --- Initialization ---
  useEffect(() => {
    if (isOpen) {
      setStep(initialMode === 'camera' ? 'CAMERA' : 'CHAT');
      setMessages([]);
      setInputText('');
      setAlertInfo(null);
      setShowApiKeyModal(false);
      
      if (initialMode === 'text') {
          const plan = getDietPlanString(trainingMode);
          const remaining = Math.max(0, goals.targetCalories - todayStats.consumedCalories);
          const greeting = profile.coachMode === 'strict' 
            ? `Joe，今日模式 ${plan}。還剩 ${remaining} kcal。回報食物。`
            : `早安 Joe！今日是 ${plan}。還有 ${remaining} kcal 的空間喔！需要推薦嗎？`;

          setTimeout(() => {
              addAiMessage(greeting, [
                  `🍌 我還剩 ${remaining} kcal 該吃什麼？`,
                  '🍱 紀錄便當',
                  '☕ 紀錄咖啡'
              ]);
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

  // --- AI Logic using Service ---

  const generateHistory = (): Content[] => {
    const validMessages = messages.filter(m => m.type !== 'error');
    if (validMessages.length === 0) return [];

    const history: Content[] = [];
    let lastRole: 'user' | 'model' | null = null;

    validMessages.forEach(m => {
        const role = m.sender === 'user' ? 'user' : 'model';
        const parts: Part[] = [];
        
        if (m.content) parts.push({ text: m.content });
        if (m.image) {
             const cleanBase64 = m.image.split(',')[1] || m.image;
             parts.push({ inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } });
        }
        if (m.type === 'card' && m.cardData) {
            parts.push({ text: `[System Memory] AI has previously analyzed: ${JSON.stringify(m.cardData)}` });
        }

        if (parts.length === 0) return;

        if (lastRole === role) {
            const lastTurn = history[history.length - 1];
            if (lastTurn && lastTurn.parts) {
                lastTurn.parts = [...lastTurn.parts, ...parts];
            }
        } else {
            history.push({ role, parts });
            lastRole = role;
        }
    });

    if (history.length > 0 && history[0].role === 'model') {
        history.shift();
    }

    return history;
  };

  const analyzeWithGemini = async (currentInput: string, imageBase64?: string) => {
    setIsTyping(true);

    try {
        const history = generateHistory();

        // Prepare Real-Time Context
        const context: CoachContext = {
            userName: profile.displayName || 'Joe',
            coachMode: profile.coachMode || 'encouraging', // Pass Personality
            dietPlan: getDietPlanString(trainingMode), 
            targetCalories: goals.targetCalories,
            currentCalories: todayStats.consumedCalories,
            remainingCalories: Math.max(0, goals.targetCalories - todayStats.consumedCalories),
            budgetRemaining: Math.max(0, goals.budget.daily - todayStats.spentBudget), // Pass Budget
            proteinGap: Math.max(0, goals.targetProtein - todayStats.consumedProtein),
            carbsGap: Math.max(0, goals.targetCarbs - todayStats.consumedCarbs),
            fatGap: Math.max(0, goals.targetFat - todayStats.consumedFat),
        };

        // Call Service
        const responseData = await aiCoach.sendMessage(currentInput, imageBase64, history, context);
        
        setIsTyping(false);
        
        // --- LOGIC: INTENT HANDLING ---

        // 1. Intent: Advice -> Text Only
        if (responseData.intent === 'advice') {
            addAiMessage(responseData.message);
            return;
        }

        // 2. Intent: Log -> Check Sufficiency
        // If not sufficient, show questions options
        if (!responseData.is_sufficient) {
            addAiMessage(
                responseData.message || "資訊不足，請補充細節。",
                responseData.inquiry_options || []
            );
            return;
        }

        // 3. Intent: Log + Sufficient -> Show Card
        addAiMessage(responseData.message || "分析完成。");
        
        // STRICT CONDITION: Only show card if intent is 'log' AND foodData exists.
        if (responseData.intent === 'log' && responseData.foodData) {
            setTimeout(() => {
                addAiMessage("", [], {
                    foodName: responseData.foodData?.name || "Unknown",
                    ingredients: responseData.foodData?.ingredients || "N/A",
                    calories: responseData.foodData?.calories || 0,
                    price: responseData.foodData?.price || 0,
                    macros: {
                        protein: responseData.foodData?.protein || 0,
                        carbs: responseData.foodData?.carbs || 0,
                        fat: responseData.foodData?.fat || 0
                    }
                });
            }, 600);
        } else {
            // Fallback for weird edge cases
            if (responseData.intent === 'log' && !responseData.foodData) {
                 addAiMessage("收到，但我無法讀取詳細數據。請重試。");
            }
        }

    } catch (error: any) {
        console.error("Coach Error:", error);
        setIsTyping(false);
        
        // --- INTERCEPT MISSING KEY ERROR ---
        if (error.message === "MISSING_API_KEY") {
            setPendingRequest({ text: currentInput, image: imageBase64 });
            setShowApiKeyModal(true);
            return;
        }

        let errorMsg = error.message || "發生未知錯誤";
        if (error.message?.includes('403')) errorMsg = "API Key 權限不足或無效 (403)";
        addErrorMessage(`Coach 暫時無法回應: ${errorMsg}`);
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
      onClose();
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

                {/* API KEY MISSING MODAL (Gatekeeper) */}
                {showApiKeyModal && (
                    <div className="absolute inset-0 z-[70] bg-white/95 backdrop-blur flex flex-col items-center justify-center p-6 text-center animate-fade-in">
                        <div className="bg-brand-black p-4 rounded-full text-brand-green mb-4 shadow-lg shadow-brand-green/20">
                            <Key size={32} strokeWidth={2.5} />
                        </div>
                        <h3 className="text-2xl font-black text-brand-black mb-2">需要 API Key</h3>
                        <p className="text-gray-500 font-bold text-sm mb-6 max-w-xs leading-relaxed">
                            AI 教練功能需要您的 Gemini API Key 才能運作。請輸入您的 Key 以繼續。
                        </p>
                        
                        <div className="w-full max-w-xs space-y-4">
                            <input
                                type="password"
                                value={tempApiKey}
                                onChange={(e) => setTempApiKey(e.target.value)}
                                placeholder="貼上 AIza 開頭的 Key..."
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 font-bold text-lg outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 transition-all text-center"
                            />
                            
                            <button
                                onClick={() => {
                                    if(tempApiKey.trim().length > 10) {
                                        aiService.saveApiKey(tempApiKey.trim());
                                        setShowApiKeyModal(false);
                                        // Retry the pending request immediately
                                        if (pendingRequest) {
                                            analyzeWithGemini(pendingRequest.text, pendingRequest.image);
                                            setPendingRequest(null);
                                        }
                                    } else {
                                        alert("API Key 格式似乎不正確");
                                    }
                                }}
                                className="w-full bg-brand-black text-brand-green py-4 rounded-2xl font-black text-lg shadow-lg active:scale-95 transition-transform hover:shadow-brand-green/20"
                            >
                                儲存並重試
                            </button>
                            
                            <button 
                                onClick={() => { setShowApiKeyModal(false); setPendingRequest(null); }} 
                                className="text-gray-400 font-bold text-sm hover:text-gray-600 transition-colors"
                            >
                                取消
                            </button>
                        </div>
                        
                        <a 
                            href="https://aistudio.google.com/app/apikey" 
                            target="_blank" 
                            rel="noreferrer"
                            className="mt-8 text-[10px] font-bold text-brand-green bg-brand-black/5 px-3 py-1 rounded-full flex items-center gap-1 hover:bg-brand-black/10 transition-colors"
                        >
                            沒有 Key? 前往 Google AI Studio 獲取 <ArrowLeft className="rotate-180" size={10} />
                        </a>
                    </div>
                )}

            </div>
        )}

      </div>
    </div>
  );
};
