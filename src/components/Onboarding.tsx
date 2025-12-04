
import React, { useState, useEffect } from 'react';
import { useUser, UserProfile, BudgetBreakdown } from '../context/UserContext';
import { ChevronRight, Check, Ruler, Weight, User as UserIcon, Wallet, TrendingDown, Minus, TrendingUp, Dumbbell, ArrowLeft } from 'lucide-react';

export const Onboarding: React.FC = () => {
  const { profile, updateProfile, updateGoals, completeOnboarding } = useUser();
  const [step, setStep] = useState(1);
  const [calculatedTDEE, setCalculatedTDEE] = useState(0);
  
  // Local state for Step 4
  const [localCalories, setLocalCalories] = useState(2000);
  const [calorieRange, setCalorieRange] = useState({ min: 1200, max: 3000 });
  
  // Budget State
  const [localBudget, setLocalBudget] = useState(300);
  const [budgetBreakdown, setBudgetBreakdown] = useState<BudgetBreakdown>({
      breakfast: 60, lunch: 105, dinner: 105, snack: 30
  });
  const [isCustomBudget, setIsCustomBudget] = useState(false);

  // --- Navigation & Validation ---
  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const isStepValid = () => {
    switch (step) {
      case 1: return profile.height > 0 && profile.weight > 0 && profile.age > 0;
      case 2: return profile.activityLevel > 0;
      case 3: return !!profile.goalType;
      case 4: return localBudget > 0 && !!profile.coachMode;
      default: return false;
    }
  };

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      // Finalize Data
      const { protein, carbs, fat } = calculateMacros(localCalories, profile.goalType);
      
      updateGoals({ 
        targetCalories: localCalories,
        targetProtein: protein,
        targetCarbs: carbs,
        targetFat: fat,
        budget: {
            daily: localBudget,
            breakdown: budgetBreakdown
        }
      });
      completeOnboarding();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    updateProfile({ [name]: name === 'gender' ? value : Number(value) });
  };

  // --- Budget Logic ---
  const handleBudgetChange = (total: number) => {
      setLocalBudget(total);
      if (!isCustomBudget) {
          // Auto Split: Breakfast 20%, Lunch 35%, Dinner 35%, Snack 10%
          setBudgetBreakdown({
              breakfast: Math.round(total * 0.20),
              lunch: Math.round(total * 0.35),
              dinner: Math.round(total * 0.35),
              snack: Math.round(total * 0.10),
          });
      }
  };

  const handleBreakdownChange = (key: keyof BudgetBreakdown, val: number) => {
      const newBreakdown = { ...budgetBreakdown, [key]: val };
      setBudgetBreakdown(newBreakdown);
      // Update total to match sum of parts
      setLocalBudget((Object.values(newBreakdown) as number[]).reduce((a: number, b: number) => a + b, 0));
  };

  // --- Calorie & Macro Logic ---
  const calculateMacros = (calories: number, type: UserProfile['goalType']) => {
    let pRatio = 0.30;
    let fRatio = 0.30;
    let cRatio = 0.40;

    if (type === 'recomp') {
      // Recomp (Simultaneous Muscle Gain & Fat Loss)
      // High Protein (~28%), Controlled Fat (~22%), High Carb (~50%) for training fuel
      pRatio = 0.28; fRatio = 0.22; cRatio = 0.50;
    } else if (type === 'build_muscle') {
      // Bulking
      pRatio = 0.25; fRatio = 0.25; cRatio = 0.50;
    } else if (type === 'lose_fat') {
      // Cutting
      pRatio = 0.35; fRatio = 0.30; cRatio = 0.35;
    }

    const protein = Math.round((calories * pRatio) / 4);
    const fat = Math.round((calories * fRatio) / 9);
    const carbs = Math.round((calories * cRatio) / 4);
    return { protein, fat, carbs };
  };

  useEffect(() => {
    if (step === 4) {
      // 1. Calculate BMR
      let bmr = (10 * profile.weight) + (6.25 * profile.height) - (5 * profile.age);
      bmr += profile.gender === 'male' ? 5 : -161;
      
      // 2. Calculate TDEE
      const tdee = Math.round(bmr * profile.activityLevel);
      setCalculatedTDEE(tdee);
      
      // 3. Smart Range Logic
      let minMult = 0.9, maxMult = 1.1, defMult = 1.0;

      switch (profile.goalType) {
          case 'lose_fat':
              minMult = 0.75; maxMult = 0.90; defMult = 0.80;
              break;
          case 'build_muscle':
              minMult = 1.05; maxMult = 1.20; defMult = 1.10;
              break;
          case 'recomp':
              // Recomp: Mild deficit to maintenance (approx 2500 for a 2600 TDEE)
              minMult = 0.90; maxMult = 1.05; defMult = 0.96; 
              break;
          default: // maintain
              minMult = 0.95; maxMult = 1.05; defMult = 1.0;
      }

      const minC = Math.round(tdee * minMult);
      const maxC = Math.round(tdee * maxMult);
      const defC = Math.round(tdee * defMult);

      setCalorieRange({ min: minC, max: maxC });
      setLocalCalories(defC);
    }
  }, [step, profile]); 

  // --- Data Options ---
  const activityLevels = [
    { val: 1.2, label: '久坐不動', desc: '辦公室工作，幾乎不運動' },
    { val: 1.375, label: '輕度活動', desc: '每週運動 1-3 天，以低強度有氧或肌力訓練為主' },
    { val: 1.55, label: '中度活動', desc: '每週運動 3-5 天，包含中高強度肌力訓練' },
    { val: 1.725, label: '高度活動', desc: '每週高強度運動 6-7 天' },
  ];

  const goalTypes = [
    { type: 'recomp', label: '同時增肌減脂', desc: '降低體脂，同時透過高強度訓練提升肌肉量（目標為溫和熱量赤字或維持）', icon: Dumbbell, color: 'text-purple-500' },
    { type: 'lose_fat', label: '減脂', desc: '降低體脂，保持肌肉', icon: TrendingDown, color: 'text-blue-500' },
    { type: 'maintain', label: '維持', desc: '保持目前體重與體態', icon: Minus, color: 'text-green-500' },
    { type: 'build_muscle', label: '增肌', desc: '增加肌肉量與力量', icon: TrendingUp, color: 'text-red-500' },
  ];

  // --- Components ---
  const StepIndicator = () => (
    <div className="flex gap-2 mb-4 justify-center">
      {[1, 2, 3, 4].map((s) => (
        <div 
          key={s} 
          className={`h-1.5 rounded-full transition-all duration-300 ${s <= step ? 'w-10 bg-brand-green' : 'w-4 bg-gray-200'}`}
        />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-white flex flex-col font-nunito relative pb-32">
      {/* Header with Back Button */}
      <div className="pt-6 pb-2 text-center px-6 relative">
        {step > 1 && (
            <button 
                onClick={handleBack}
                className="absolute left-6 top-7 p-2 bg-gray-100 rounded-full hover:bg-gray-200 active:scale-95 transition-transform"
            >
                <ArrowLeft size={20} className="text-brand-black" />
            </button>
        )}
        <h1 className="text-2xl font-extrabold italic tracking-tighter text-brand-black mt-1">
          設定你的 <span className="text-brand-green">GO JOE!</span>
        </h1>
        <p className="text-gray-400 font-bold text-xs tracking-widest uppercase mt-1">讓我們認識你</p>
      </div>

      <StepIndicator />

      {/* Content Area */}
      <div className="flex-1 px-8 flex flex-col overflow-y-auto no-scrollbar">
        
        {/* --- STEP 1: 基本資料 --- */}
        {step === 1 && (
          <div className="space-y-8 animate-fade-in-right py-4">
            <h2 className="text-2xl font-black text-brand-black mb-4">基本資料</h2>
            
            <div className="grid grid-cols-2 gap-6">
              <label className="block col-span-2">
                <span className="flex items-center gap-2 text-gray-500 font-bold mb-2 uppercase text-xs tracking-wider">
                  生理性別
                </span>
                <div className="flex bg-gray-100 p-1 rounded-2xl">
                  {['male', 'female'].map((g) => (
                    <button
                      key={g}
                      onClick={() => updateProfile({ gender: g as 'male' | 'female' })}
                      className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                        profile.gender === g 
                          ? 'bg-white shadow-md text-brand-black' 
                          : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      {g === 'male' ? '男' : '女'}
                    </button>
                  ))}
                </div>
              </label>

              <label className="block col-span-2">
                <span className="flex items-center gap-2 text-gray-500 font-bold mb-2 uppercase text-xs tracking-wider">
                  <UserIcon size={16} /> 年齡
                </span>
                <input 
                  type="number" 
                  name="age"
                  value={profile.age || ''}
                  onChange={handleInputChange}
                  className="w-full text-4xl font-black border-b-2 border-gray-200 py-2 focus:border-brand-green focus:outline-none bg-transparent placeholder-gray-300 transition-colors"
                  placeholder="25"
                />
              </label>

              <label className="block">
                <span className="flex items-center gap-2 text-gray-500 font-bold mb-2 uppercase text-xs tracking-wider">
                  <Ruler size={16} /> 身高 (cm)
                </span>
                <input 
                  type="number" 
                  name="height"
                  value={profile.height || ''}
                  onChange={handleInputChange}
                  className="w-full text-3xl font-black border-b-2 border-gray-200 py-2 focus:border-brand-green focus:outline-none bg-transparent placeholder-gray-300 transition-colors"
                  placeholder="175"
                />
              </label>

              <label className="block">
                <span className="flex items-center gap-2 text-gray-500 font-bold mb-2 uppercase text-xs tracking-wider">
                  <Weight size={16} /> 體重 (kg)
                </span>
                <input 
                  type="number" 
                  name="weight"
                  value={profile.weight || ''}
                  onChange={handleInputChange}
                  className="w-full text-3xl font-black border-b-2 border-gray-200 py-2 focus:border-brand-green focus:outline-none bg-transparent placeholder-gray-300 transition-colors"
                  placeholder="70"
                />
              </label>
            </div>
          </div>
        )}

        {/* --- STEP 2: 活動量 --- */}
        {step === 2 && (
          <div className="space-y-4 animate-fade-in-right py-4">
            <h2 className="text-2xl font-black text-brand-black mb-4">你的日常活動量？</h2>
            
            {activityLevels.map((level) => (
              <button
                key={level.val}
                onClick={() => updateProfile({ activityLevel: level.val })}
                className={`w-full p-5 rounded-[1.5rem] text-left border-2 transition-all duration-200 active:scale-95 ${
                  profile.activityLevel === level.val 
                    ? 'border-brand-green bg-brand-green/10 shadow-lg' 
                    : 'border-transparent bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className={`font-extrabold text-lg ${profile.activityLevel === level.val ? 'text-brand-black' : 'text-gray-600'}`}>
                    {level.label}
                  </span>
                  {profile.activityLevel === level.val && (
                    <div className="bg-brand-black text-brand-green rounded-full p-1">
                      <Check size={14} strokeWidth={4} />
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-500 font-semibold">{level.desc}</p>
              </button>
            ))}
          </div>
        )}

        {/* --- STEP 3: 目標 --- */}
        {step === 3 && (
            <div className="space-y-4 animate-fade-in-right py-4">
              <h2 className="text-2xl font-black text-brand-black mb-4">你的目標是？</h2>
              {goalTypes.map((g) => (
                <button
                  key={g.type}
                  onClick={() => updateProfile({ goalType: g.type as any })}
                  className={`w-full p-6 rounded-[1.5rem] text-left border-2 transition-all duration-200 active:scale-95 flex items-center gap-4 ${
                    profile.goalType === g.type
                      ? 'border-brand-black bg-white shadow-lg' 
                      : 'border-transparent bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className={`p-3 rounded-full bg-gray-100 ${g.color}`}>
                     <g.icon size={24} strokeWidth={2.5} />
                  </div>
                  <div className="flex-1">
                     <span className={`block font-extrabold text-lg ${profile.goalType === g.type ? 'text-brand-black' : 'text-gray-600'}`}>
                        {g.label}
                     </span>
                     <span className="text-sm text-gray-500 font-semibold">{g.desc}</span>
                  </div>
                  {profile.goalType === g.type && (
                    <div className="bg-brand-green text-brand-black rounded-full p-1">
                      <Check size={14} strokeWidth={4} />
                    </div>
                  )}
                </button>
              ))}
            </div>
        )}

        {/* --- STEP 4: 摘要與調整 --- */}
        {step === 4 && (
          <div className="space-y-8 animate-fade-in-right py-4 pb-12">
             
             {/* TDEE INFO */}
             <div className="flex items-center justify-between bg-gray-50 p-4 rounded-3xl border border-gray-100">
               <div>
                  <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mb-1">估算 TDEE</p>
                  <p className="text-2xl font-black text-gray-600">{calculatedTDEE}</p>
               </div>
               <div className="text-right">
                  <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mb-1">建議目標區間</p>
                  <p className="text-lg font-bold text-brand-black">{calorieRange.min} - {calorieRange.max}</p>
               </div>
             </div>

             {/* Calorie Goal Slider */}
             <div>
               <div className="flex justify-between items-end mb-4">
                 <span className="font-extrabold text-lg text-brand-black">熱量目標</span>
                 <span className={`font-bold px-3 py-1 rounded-full text-xs uppercase tracking-wider bg-brand-black text-brand-green`}>
                   {goalTypes.find(g => g.type === profile.goalType)?.label}
                 </span>
               </div>
               
               <div className="bg-white border-2 border-brand-green rounded-3xl p-6 shadow-lg relative overflow-hidden">
                  <div className="text-center mb-6">
                    <span className="text-6xl font-black text-brand-black tracking-tighter">{localCalories}</span>
                    <span className="text-lg font-bold text-gray-400 ml-1">kcal</span>
                  </div>
                  
                  {/* Macro Preview */}
                  <div className="flex justify-center gap-6 text-xs font-bold text-gray-500 mb-8">
                      <div className="text-center">
                          <span className="block text-xl text-brand-black font-extrabold">{calculateMacros(localCalories, profile.goalType).protein}g</span>
                          <span className="text-[10px] uppercase tracking-wide">Protein</span>
                      </div>
                      <div className="text-center">
                          <span className="block text-xl text-brand-black font-extrabold">{calculateMacros(localCalories, profile.goalType).carbs}g</span>
                          <span className="text-[10px] uppercase tracking-wide">Carbs</span>
                      </div>
                      <div className="text-center">
                          <span className="block text-xl text-brand-black font-extrabold">{calculateMacros(localCalories, profile.goalType).fat}g</span>
                          <span className="text-[10px] uppercase tracking-wide">Fat</span>
                      </div>
                  </div>

                  <input 
                    type="range" 
                    min={calorieRange.min} 
                    max={calorieRange.max} 
                    step="50"
                    value={localCalories}
                    onChange={(e) => setLocalCalories(Number(e.target.value))}
                    className="w-full h-4 bg-gray-100 rounded-full appearance-none cursor-pointer accent-brand-black hover:accent-brand-green transition-all"
                  />
                  <div className="flex justify-between text-[10px] font-bold text-gray-400 mt-2 px-1">
                      <span>{calorieRange.min}</span>
                      <span>{calorieRange.max}</span>
                  </div>
               </div>
             </div>

             {/* Budget Input Section */}
             <div>
                <div className="flex items-center justify-between mb-4">
                    <span className="block font-extrabold text-lg text-brand-black">每日餐費預算</span>
                    <button 
                        onClick={() => setIsCustomBudget(!isCustomBudget)}
                        className="text-xs font-bold text-brand-green bg-brand-black px-3 py-1.5 rounded-full active:scale-95 transition-transform"
                    >
                        {isCustomBudget ? '自動分配' : '自訂細項'}
                    </button>
                </div>
                
                {/* Total Budget Input */}
                <label className="flex items-center bg-gray-50 p-5 rounded-3xl border border-gray-100 focus-within:border-brand-green focus-within:ring-2 focus-within:ring-brand-green/20 transition-all mb-4">
                  <div className="bg-white p-2.5 rounded-full shadow-sm mr-4 text-brand-green bg-black">
                    <Wallet size={20} />
                  </div>
                  <div className="flex-1">
                     <input 
                        type="number" 
                        value={localBudget}
                        onChange={(e) => handleBudgetChange(Number(e.target.value))}
                        disabled={isCustomBudget}
                        className={`w-full text-3xl font-black bg-transparent focus:outline-none text-brand-black placeholder-gray-300 ${isCustomBudget ? 'opacity-50' : ''}`}
                        placeholder="300"
                      />
                  </div>
                  <span className="text-gray-400 font-bold">TWD</span>
                </label>

                {/* Detailed Breakdown (Collapsible) */}
                {isCustomBudget && (
                    <div className="grid grid-cols-2 gap-3 animate-fade-in-up">
                        {Object.entries(budgetBreakdown).map(([key, val]) => (
                            <div key={key} className="bg-white border border-gray-200 rounded-2xl p-3">
                                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                    {key === 'breakfast' && '早餐 (20%)'}
                                    {key === 'lunch' && '午餐 (35%)'}
                                    {key === 'dinner' && '晚餐 (35%)'}
                                    {key === 'snack' && '點心 (10%)'}
                                </span>
                                <input 
                                    type="number"
                                    value={val as number}
                                    onChange={(e) => handleBreakdownChange(key as keyof BudgetBreakdown, Number(e.target.value))}
                                    className="w-full text-xl font-extrabold text-brand-black focus:outline-none border-b border-transparent focus:border-brand-green"
                                />
                            </div>
                        ))}
                    </div>
                )}
             </div>

             {/* Coach Mode Selection */}
             <div className="mt-2">
               <p className="text-sm font-extrabold text-brand-black mb-3">教練模式</p>
               <div className="flex bg-gray-100 rounded-2xl p-1">
                 <button
                   type="button"
                   onClick={() => updateProfile({ coachMode: 'encouraging' })}
                   className={`flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-1 ${
                     profile.coachMode === 'encouraging'
                       ? 'bg-white shadow-md text-green-600'
                       : 'text-gray-500'
                   }`}
                 >
                   <span>😊</span>
                   <span>天使模式（鼓勵）</span>
                 </button>
                 <button
                   type="button"
                   onClick={() => updateProfile({ coachMode: 'strict' })}
                   className={`flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-1 ${
                     profile.coachMode === 'strict'
                       ? 'bg-white shadow-md text-red-600'
                       : 'text-gray-500'
                   }`}
                 >
                   <span>🔥</span>
                   <span>魔鬼模式（嚴格）</span>
                 </button>
               </div>
             </div>
          </div>
        )}
      </div>

      {/* --- Sticky Footer Button --- */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full sm:max-w-[420px] bg-white/90 backdrop-blur-md border-t border-gray-100 p-6 pb-8 z-30">
        <button 
          onClick={handleNext}
          disabled={!isStepValid()}
          className={`w-full py-4 rounded-full font-extrabold text-lg tracking-wide flex items-center justify-center gap-2 transition-all duration-300 active:scale-95 shadow-xl ${
            isStepValid() 
              ? 'bg-brand-green text-brand-black hover:brightness-105 shadow-brand-green/30' 
              : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
          }`}
        >
          {step === 4 ? '完成設定' : '下一步'}
          {step !== 4 && <ChevronRight strokeWidth={3} size={20} />}
        </button>
      </div>

    </div>
  );
};
