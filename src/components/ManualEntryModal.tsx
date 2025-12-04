
import React, { useState, useEffect } from 'react';
import { X, Save, Sparkles, Loader2, Utensils, Zap } from 'lucide-react';
import { useUser, MealType } from '../context/UserContext';

interface ManualEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type EntryStep = 'INPUT' | 'ANALYZING' | 'REVIEW';

export const ManualEntryModal: React.FC<ManualEntryModalProps> = ({ isOpen, onClose }) => {
  const { addLog, goals } = useUser();
  const [step, setStep] = useState<EntryStep>('INPUT');
  const [inputText, setInputText] = useState('');
  
  // Form Data
  const [formData, setFormData] = useState({
    foodName: '',
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    price: 0,
    mealType: 'lunch' as MealType
  });

  useEffect(() => {
    if (isOpen) {
      setStep('INPUT');
      setInputText('');
      setFormData({
        foodName: '',
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        price: 0,
        mealType: getCurrentMealType()
      });
    }
  }, [isOpen]);

  const getCurrentMealType = (): MealType => {
    const hour = new Date().getHours();
    if (hour < 11) return 'breakfast';
    if (hour < 17) return 'lunch';
    if (hour < 21) return 'dinner';
    return 'snack';
  };

  const handleAnalyze = () => {
    if (!inputText.trim()) return;
    setStep('ANALYZING');
    
    // Simulate AI Delay
    setTimeout(() => {
      // Mock AI Logic based on simple keywords or random plausible values
      const isRice = inputText.includes('飯') || inputText.includes('便當');
      const isNoodle = inputText.includes('麵');
      const isMeat = inputText.includes('肉') || inputText.includes('雞') || inputText.includes('排');
      
      let estCals = 500;
      let estProtein = 20;
      let estCarbs = 60;
      let estFat = 15;
      let estPrice = 100;

      if (isRice && isMeat) {
          estCals = 750; estProtein = 35; estCarbs = 85; estFat = 25; estPrice = 130;
      } else if (isNoodle) {
          estCals = 600; estProtein = 15; estCarbs = 90; estFat = 20; estPrice = 90;
      } else if (inputText.includes('蛋') || inputText.includes('豆漿')) {
          estCals = 150; estProtein = 12; estCarbs = 10; estFat = 8; estPrice = 35;
      }

      setFormData(prev => ({
        ...prev,
        foodName: inputText,
        calories: estCals,
        protein: estProtein,
        carbs: estCarbs,
        fat: estFat,
        price: estPrice
      }));
      setStep('REVIEW');
    }, 1500);
  };

  const handleSave = () => {
    addLog({
      foodName: formData.foodName,
      calories: formData.calories,
      protein: formData.protein,
      carbs: formData.carbs,
      fat: formData.fat,
      price: formData.price,
      mealType: formData.mealType
    });
    onClose();
  };

  const mealTypes: { id: MealType; label: string }[] = [
      { id: 'breakfast', label: '早餐' },
      { id: 'lunch', label: '午餐' },
      { id: 'dinner', label: '晚餐' },
      { id: 'snack', label: '點心' },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 relative z-10 animate-fade-in-up shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
             <div className="flex items-center gap-2">
                 <div className="p-2 bg-brand-black text-brand-green rounded-full">
                    {step === 'INPUT' ? <Zap size={18} /> : <Utensils size={18} />}
                 </div>
                 <h3 className="text-xl font-black text-brand-black">
                    {step === 'INPUT' ? '手動紀錄' : step === 'ANALYZING' ? '分析中...' : '確認餐點'}
                 </h3>
             </div>
             <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><X size={20} /></button>
         </div>

        {/* --- STEP 1: INPUT --- */}
        {step === 'INPUT' && (
          <div className="space-y-6">
             <label className="block">
                 <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">你吃了什麼？</span>
                 <input 
                    type="text" 
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="例如：滷雞腿便當" 
                    className="w-full text-2xl font-bold border-b-2 border-gray-200 py-2 focus:border-brand-green outline-none bg-transparent" 
                    autoFocus 
                    onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                 />
             </label>
             
             <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <p className="text-xs text-gray-500 font-bold mb-2">試試輸入：</p>
                <div className="flex flex-wrap gap-2">
                    {['雞胸肉 100g', '拿鐵', '排骨飯'].map(tag => (
                        <button key={tag} onClick={() => setInputText(tag)} className="px-3 py-1 bg-white rounded-full text-xs font-bold shadow-sm border border-gray-200 hover:border-brand-green transition-colors">
                            {tag}
                        </button>
                    ))}
                </div>
             </div>

             <button 
                onClick={handleAnalyze}
                disabled={!inputText.trim()}
                className="w-full bg-brand-green text-brand-black font-bold py-4 rounded-full flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-green/20"
             >
                <Sparkles size={20} />
                <span>AI 智慧分析</span>
             </button>
          </div>
        )}

        {/* --- STEP 2: ANALYZING --- */}
        {step === 'ANALYZING' && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-gray-100 border-t-brand-green rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Sparkles size={24} className="text-brand-black" />
                    </div>
                </div>
                <p className="text-brand-black font-bold text-lg">正在估算營養成分...</p>
                <p className="text-gray-400 text-sm font-semibold">分析食物：{inputText}</p>
            </div>
        )}

        {/* --- STEP 3: REVIEW --- */}
        {step === 'REVIEW' && (
            <div className="space-y-5 animate-fade-in-right">
                
                {/* Name & Meal Type */}
                <div>
                    <input 
                        value={formData.foodName} 
                        onChange={e => setFormData({...formData, foodName: e.target.value})}
                        className="w-full text-xl font-black text-brand-black border-b border-gray-100 pb-2 mb-4 focus:outline-none focus:border-brand-green"
                    />
                    <div className="flex bg-gray-100 p-1 rounded-xl">
                        {mealTypes.map(m => (
                            <button 
                                key={m.id}
                                onClick={() => setFormData({...formData, mealType: m.id})}
                                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${formData.mealType === m.id ? 'bg-white shadow text-brand-black' : 'text-gray-400'}`}
                            >
                                {m.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Macros Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <label className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">熱量 (kcal)</span>
                        <input 
                            type="number" 
                            value={formData.calories}
                            onChange={e => setFormData({...formData, calories: Number(e.target.value)})}
                            className="w-full bg-transparent font-black text-xl outline-none"
                        />
                    </label>
                     <label className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">價格 ($)</span>
                        <input 
                            type="number" 
                            value={formData.price}
                            onChange={e => setFormData({...formData, price: Number(e.target.value)})}
                            className="w-full bg-transparent font-black text-xl outline-none text-brand-black"
                        />
                    </label>
                </div>

                <div className="flex gap-3">
                    {[
                        { label: 'Prot', val: formData.protein, key: 'protein', color: 'text-brand-green bg-brand-black' },
                        { label: 'Carb', val: formData.carbs, key: 'carbs', color: 'text-blue-600 bg-blue-100' },
                        { label: 'Fat', val: formData.fat, key: 'fat', color: 'text-yellow-600 bg-yellow-100' },
                    ].map((item) => (
                        <div key={item.label} className="flex-1 flex flex-col items-center p-2 rounded-2xl bg-gray-50 border border-gray-100">
                            <span className="text-[10px] font-bold text-gray-400 uppercase mb-1">{item.label}</span>
                            <input 
                                type="number"
                                value={item.val}
                                onChange={e => setFormData({...formData, [item.key]: Number(e.target.value)})}
                                className="w-full text-center font-black text-lg bg-transparent outline-none"
                            />
                        </div>
                    ))}
                </div>

                <button 
                    onClick={handleSave}
                    className="w-full bg-brand-green text-brand-black font-bold py-4 rounded-full flex items-center justify-center gap-2 active:scale-95 transition-transform mt-2 shadow-lg shadow-brand-green/20"
                >
                    <Save size={20} strokeWidth={2.5} />
                    <span>確認並儲存</span>
                </button>
            </div>
        )}

      </div>
    </div>
  );
};
