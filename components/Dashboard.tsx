
import React, { useState, useEffect, useRef } from 'react';
import { Camera, ArrowUp, Zap, Dumbbell, BedDouble, Trash2, Edit3, ChevronDown, BarChart2 } from 'lucide-react';
import { useUser, TrainingMode, MealType, LogEntry } from '../context/UserContext';
import { NutritionOverview } from './NutritionOverview';
import { BudgetCard } from './BudgetCard';
import { CameraModal } from './CameraModal';
import { GoogleGenAI } from "@google/genai";

// --- Types & Helpers ---
type TabType = 'status' | 'budget';

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
  const { goals, todayStats, logs, bodyLogs, workoutLogs, addLog, deleteLog, updateLog, deleteBodyLog, addBodyLog, trainingMode, setTrainingMode, profile } = useUser();
  
  // --- UI State ---
  const [activeTab, setActiveTab] = useState<TabType>('status');
  const [showTrainingModal, setShowTrainingModal] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraMode, setCameraMode] = useState<'food' | 'body'>('food');
  
  // Edit State
  const [editingLog, setEditingLog] = useState<LogEntry | null>(null);

  // --- Chat State ---
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

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
  const getChatKey = () => `chat_history_${new Date().toISOString().split('T')[0]}`;

  useEffect(() => {
      const saved = localStorage.getItem(getChatKey());
      if (saved) {
          setMessages(JSON.parse(saved));
      } else {
          setMessages([{
              id: 'init-1',
              sender: 'ai',
              type: 'text',
              content: `你的目標是 **${goals.targetCalories} kcal**。請回報餐點。`,
              options: ['排骨便當', '地瓜 200g', '無糖豆漿']
          }]);
      }
  }, []);

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
          const apiKey = process.env.API_KEY;
          
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

          const systemInstruction = `
          角色：健身教練 "Coach Joe"。風格：直接、專業、不囉嗦。
          
          目前狀態：
          - 訓練: ${workoutContext}
          - 攝取: ${todayStats.consumedCalories}/${goals.targetCalories} kcal
          
          重要規則：
          1. **不要**主動詢問或估算價格，除非用戶明確問「這多少錢？」。價格預設為 0。
          2. 若資訊不足 (如只輸入「便當」)，回傳 "is_sufficient": false。
          3. 若資訊足夠，直接分析營養素。
          4. 如果用戶問訓練相關問題，根據上述訓練狀態回答。
          
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
             parts.push({ inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } });
             parts.push({ text: "Analyze this image." });
          }
          if (currentInput) {
             parts.push({ text: currentInput });
          }

          const response = await ai.models.generateContent({
              model: "gemini-2.5-flash",
              contents: { parts },
              config: {
                  systemInstruction,
                  responseMimeType: "application/json"
              }
          });

          const rawText = response.text || "{}";
          // Basic cleanup just in case
          const cleanJson = rawText.replace(/```json|```/g, '').trim();
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
      } catch (error) {
          console.error(error);
          setIsTyping(false);
          addAiMessage("AI 分析發生錯誤。請檢查您的 API Key 設定 (於選單中設定)。");
      }
  };

  const handleSendMessage = () => {
      if (!inputText.trim()) return;
      const text = inputText;
      setInputText('');
      analyzeWithGemini(text);
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
                            value={localData.price}
                            onChange={(e) => setLocalData({...localData, price: Number(e.target.value)})}
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
  
  const todayLogs = logs.filter(log => new Date(log.timestamp).toDateString() === new Date().toDateString());
  const todayBodyLogs = bodyLogs.filter(log => new Date(log.timestamp).toDateString() === new Date().toDateString());

  const handleDeleteLog = (log: LogEntry) => {
      deleteLog(log.id);
      addAiMessage(`系統通知：使用者刪除了 **${log.foodName}**。請更新今日剩餘熱量建議。`);
  };

  return (
    <div className="h-full flex flex-col relative bg-gray-50 pb-5 no-scrollbar overflow-y-auto">
      
      {/* 1. TOP TABS */}
      <div className="px-4 pt-4 pb-4">
          <div className="flex bg-white p-1.5 rounded-2xl shadow-sm mb-4 border border-gray-100 w-fit mx-auto">
              <button onClick={() => setActiveTab('status')} className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'status' ? 'bg-brand-black text-brand-green shadow-md' : 'text-gray-400'}`}>今日狀態</button>
              <button onClick={() => setActiveTab('budget')} className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'budget' ? 'bg-brand-black text-brand-green shadow-md' : 'text-gray-400'}`}>今日預算</button>
          </div>
          <div className="mb-6">
              {activeTab === 'status' ? <NutritionOverview goals={goals} stats={todayStats} /> : <BudgetCard goals={goals} stats={todayStats} />}
          </div>
      </div>

      {/* 2. CHAT */}
      <div className="px-4 mb-5">
          <div className="bg-white rounded-[2rem] shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[300px]">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-xs font-black text-gray-500 uppercase tracking-wider">線上 (User Key)</span>
                  </div>
                  <button onClick={() => setShowTrainingModal(true)} className="flex items-center gap-1 text-[10px] text-brand-black font-bold bg-white px-3 py-1.5 rounded-full border border-gray-200 hover:border-brand-green shadow-sm active:scale-95 transition-all">
                      {trainingMode === 'leg' ? '腿日模式' : trainingMode === 'push_pull' ? '推拉模式' : '休息日'}
                      <ChevronDown size={12} strokeWidth={3} />
                  </button>
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
                                      <button key={opt} onClick={() => analyzeWithGemini(opt)} className="bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-full text-xs font-bold hover:border-brand-green hover:text-brand-green transition-colors">{opt}</button>
                                  ))}
                              </div>
                          )}
                      </div>
                  ))}
                  {isTyping && <div className="text-xs text-gray-400 font-bold ml-4 animate-pulse">Coach Joe 正在輸入...</div>}
              </div>
              <div className="p-3 bg-gray-50 border-t border-gray-100 flex items-center gap-2">
                  <div className="flex items-center gap-1">
                      <button onClick={() => { setCameraMode('food'); setIsCameraOpen(true); }} className="p-2 bg-white rounded-full text-gray-400 hover:text-brand-black border border-gray-200" title="拍食物"><Camera size={18} /></button>
                      <button onClick={() => { setCameraMode('body'); setIsCameraOpen(true); }} className="p-2 bg-white rounded-full text-gray-400 hover:text-brand-black border border-gray-200" title="拍體態"><Dumbbell size={18} /></button>
                  </div>
                  <input value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="輸入..." className="flex-1 bg-white border border-gray-200 rounded-full px-4 py-2 text-sm font-bold focus:outline-none focus:border-brand-green" />
                  <button onClick={handleSendMessage} disabled={!inputText.trim()} className="p-2 bg-brand-black text-brand-green rounded-full disabled:opacity-50"><ArrowUp size={18} strokeWidth={3} /></button>
              </div>
          </div>
      </div>

      {/* 3. LISTS */}
      <div className="px-4 space-y-6">
          {/* Meals List */}
          <div>
              <h3 className="font-black text-lg text-gray-800 italic mb-3">今日餐點</h3>
              <div className="space-y-3">
                  {todayLogs.length === 0 ? (
                       <div className="bg-white rounded-2xl p-6 text-center border border-dashed border-gray-200"><p className="text-xs font-bold text-gray-400">今天還沒吃東西？</p></div>
                  ) : (
                      todayLogs.slice().reverse().map(log => (
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
                       {todayBodyLogs.map(log => (
                           <div key={log.id} className="relative w-24 h-32 flex-shrink-0 rounded-xl overflow-hidden shadow-sm group">
                               <img src={log.imageUrl} className="w-full h-full object-cover" alt="Body" />
                               <button onClick={() => deleteBodyLog(log.id)} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={10} /></button>
                           </div>
                       ))}
                   </div>
               )}
          </div>
      </div>

      <TrainingCheckModal isOpen={showTrainingModal} onClose={handleTrainingSet} />
      
      <CameraModal 
          isOpen={isCameraOpen} 
          onClose={() => setIsCameraOpen(false)} 
          onCapture={(base64: string) => {
              setIsCameraOpen(false);
              setTimeout(() => {
                if (cameraMode === 'food') {
                    analyzeWithGemini("分析這張食物照片", base64);
                } else {
                    const weight = prompt("請輸入目前體重 (kg):", profile.weight.toString());
                    if (weight) {
                        addBodyLog({ imageUrl: base64, weight: parseFloat(weight) });
                    }
                }
              }, 100);
          }}
      />
    </div>
  );
};
