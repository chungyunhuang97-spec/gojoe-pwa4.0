
import React, { useState, useRef, useEffect } from 'react';
import { useUser, UserProfile, UserGoals } from '../context/UserContext';
import { User, Ruler, Weight, Target, Wallet, LogOut, ChevronRight, Settings, Calculator, X, Save, Camera, Edit2, AlertTriangle } from 'lucide-react';

export const Profile: React.FC = () => {
  const { profile, goals, resetData, updateGoals, updateProfile, recalculateTargets, isGuest, logout } = useUser();
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [tempBudget, setTempBudget] = useState(goals.budget.daily);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<UserProfile>(profile);
  
  // Preview Stats (Real-time calculation)
  const [previewStats, setPreviewStats] = useState<{
      cals: number; protein: number; carbs: number; fat: number;
  }>({ cals: 0, protein: 0, carbs: 0, fat: 0 });

  // Initialize edit form when entering edit mode
  useEffect(() => {
      if (isEditing) {
          setEditForm(profile);
      }
  }, [isEditing, profile]);

  // Real-time Calculation for Preview
  useEffect(() => {
      const calc = () => {
          let bmr = (10 * editForm.weight) + (6.25 * editForm.height) - (5 * editForm.age);
          bmr += editForm.gender === 'male' ? 5 : -161;
          const tdee = Math.round(bmr * editForm.activityLevel);
          
          let multiplier = 1.0, pRatio = 0.30, fRatio = 0.30, cRatio = 0.40;
          switch(editForm.goalType) {
              case 'lose_fat': multiplier = 0.80; break;
              case 'build_muscle': multiplier = 1.10; pRatio = 0.30; fRatio = 0.25; cRatio = 0.45; break;
              case 'recomp': multiplier = 1.0; pRatio = 0.35; fRatio = 0.25; cRatio = 0.40; break;
              default: multiplier = 1.0; pRatio = 0.30; fRatio = 0.30; cRatio = 0.40; break;
          }

          const targetCalories = Math.round(tdee * multiplier);
          setPreviewStats({
              cals: targetCalories,
              protein: Math.round((targetCalories * pRatio) / 4),
              fat: Math.round((targetCalories * fRatio) / 9),
              carbs: Math.round((targetCalories * cRatio) / 4)
          });
      };
      calc();
  }, [editForm]);

  const bmi = (profile.weight / ((profile.height / 100) ** 2)).toFixed(1);

  const handleSaveBudget = () => {
    const newTotal = tempBudget;
    updateGoals({ 
        budget: {
            daily: newTotal,
            breakdown: {
                breakfast: Math.round(newTotal * 0.2),
                lunch: Math.round(newTotal * 0.35),
                dinner: Math.round(newTotal * 0.35),
                snack: Math.round(newTotal * 0.1),
            }
        } 
    });
    setIsBudgetModalOpen(false);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        updateProfile({ avatar: base64String });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = () => {
      // 1. Update basic profile in context
      updateProfile(editForm);
      // 2. Trigger TDEE/Macro recalculation logic in context to save permanent targets
      recalculateTargets(editForm);
      setIsEditing(false);
  };

  // Helper to determine display values (Current vs Preview)
  const display = isEditing ? {
      cals: previewStats.cals,
      protein: previewStats.protein,
      carbs: previewStats.carbs,
      fat: previewStats.fat
  } : {
      cals: goals.targetCalories,
      protein: goals.targetProtein,
      carbs: goals.targetCarbs,
      fat: goals.targetFat
  };

  return (
    <div className="h-full overflow-y-auto no-scrollbar px-5 py-6 space-y-8 animate-fade-in relative pb-32">
      
      {/* Top Action Bar */}
      <div className="absolute top-4 right-5 z-10">
          {isEditing ? (
             <button onClick={handleSaveProfile} className="bg-brand-black text-brand-green px-4 py-2 rounded-full font-bold text-xs flex items-center gap-2 shadow-lg active:scale-95 transition-transform hover:scale-105">
                 <Save size={14} /> 儲存
             </button>
          ) : (
             <button onClick={() => setIsEditing(true)} className="bg-white text-gray-500 border border-gray-200 px-4 py-2 rounded-full font-bold text-xs flex items-center gap-2 shadow-sm active:scale-95 transition-transform hover:text-brand-black hover:border-brand-green/50">
                 <Edit2 size={14} /> 編輯
             </button>
          )}
      </div>

      {/* Header Profile */}
      <div className="flex flex-col items-center pt-4">
        <button 
            onClick={handleAvatarClick}
            className="w-28 h-28 bg-gray-50 rounded-full flex items-center justify-center mb-4 shadow-lg border-4 border-white relative group active:scale-95 transition-transform overflow-hidden"
        >
            {profile.avatar ? (
                <img src={profile.avatar} alt="Profile" className="w-full h-full object-cover" />
            ) : (
                <User size={48} className="text-gray-300" />
            )}
            
            {/* Edit Overlay */}
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="text-white drop-shadow-md" size={24} />
            </div>
        </button>
        <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            className="hidden" 
        />

        <h2 className="text-2xl font-black text-gray-800">
            {isGuest ? "訪客 (Guest)" : "使用者"}
        </h2>
        
        {isEditing ? (
             <div className="flex gap-2 mt-2">
                 <select 
                    value={editForm.gender}
                    onChange={(e) => setEditForm({...editForm, gender: e.target.value as any})}
                    className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold text-gray-600 outline-none focus:border-brand-green"
                 >
                     <option value="male">男</option>
                     <option value="female">女</option>
                 </select>
                 <input 
                    type="number"
                    value={editForm.age}
                    onChange={(e) => setEditForm({...editForm, age: Number(e.target.value)})}
                    className="w-16 bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold text-gray-600 text-center outline-none focus:border-brand-green"
                 />
                 <span className="text-xs font-bold text-gray-400 py-1">歲</span>
             </div>
        ) : (
            <span className="text-sm font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-full mt-2 uppercase tracking-wide">
                {profile.gender === 'male' ? '男' : '女'} • {profile.age} 歲
            </span>
        )}
      </div>

      {/* Guest Mode Warning */}
      {isGuest && (
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-2xl flex items-start gap-3">
              <AlertTriangle className="text-yellow-600 shrink-0" size={20} />
              <div>
                  <h4 className="font-bold text-yellow-800 text-sm">訪客模式</h4>
                  <p className="text-xs text-yellow-700 mt-1">
                      您的資料僅儲存在此瀏覽器中。若清除快取，資料將會遺失。請盡快註冊以同步資料。
                  </p>
              </div>
          </div>
      )}

      {/* Goal Status Card (Updated Grid Layout) */}
      <div className="bg-white border border-gray-100 rounded-[2rem] p-6 relative overflow-hidden shadow-lg">
         <div className="relative z-10">
            <div className="flex justify-between items-start mb-6">
                <div className="flex-1">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                        {isEditing ? "預覽目標設定" : "目前目標"}
                    </p>
                    {isEditing ? (
                        <select 
                           value={editForm.goalType}
                           onChange={(e) => setEditForm({...editForm, goalType: e.target.value as any})}
                           className="bg-lime-50 text-lime-700 font-black text-lg rounded-xl p-2 w-full outline-none border border-lime-200 focus:ring-2 focus:ring-lime-500/20"
                        >
                            <option value="lose_fat">減脂 (Lose Fat)</option>
                            <option value="maintain">維持 (Maintain)</option>
                            <option value="build_muscle">增肌 (Build Muscle)</option>
                            <option value="recomp">體態重組 (Recomp)</option>
                        </select>
                    ) : (
                        <h3 className="text-3xl font-black text-gray-800">
                            {profile.goalType === 'lose_fat' && '減脂'}
                            {profile.goalType === 'maintain' && '維持'}
                            {profile.goalType === 'build_muscle' && '增肌'}
                            {profile.goalType === 'recomp' && '體態重組'}
                        </h3>
                    )}
                </div>
                <div className="bg-brand-green p-3 rounded-full ml-4 shrink-0 shadow-md text-brand-black">
                    <Target size={24} strokeWidth={2.5} />
                </div>
            </div>
            
            {/* Full Macros Grid */}
            <div className="grid grid-cols-4 gap-2 border-t border-gray-100 pt-4 text-center">
                 <div className="col-span-1">
                     <p className="text-[9px] text-gray-400 uppercase font-bold tracking-wider mb-1">Calories</p>
                     <p className="text-lg font-black text-brand-black">{display.cals}</p>
                 </div>
                 <div className="col-span-1">
                     <p className="text-[9px] text-gray-400 uppercase font-bold tracking-wider mb-1">Protein</p>
                     <p className="text-lg font-black text-brand-black">{display.protein}<span className="text-xs text-gray-300">g</span></p>
                 </div>
                 <div className="col-span-1">
                     <p className="text-[9px] text-gray-400 uppercase font-bold tracking-wider mb-1">Carbs</p>
                     <p className="text-lg font-black text-brand-black">{display.carbs}<span className="text-xs text-gray-300">g</span></p>
                 </div>
                 <div className="col-span-1">
                     <p className="text-[9px] text-gray-400 uppercase font-bold tracking-wider mb-1">Fat</p>
                     <p className="text-lg font-black text-brand-black">{display.fat}<span className="text-xs text-gray-300">g</span></p>
                 </div>
            </div>
         </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
         <div className="bg-white p-5 rounded-[1.5rem] shadow-sm border border-gray-100 flex flex-col gap-1 relative overflow-hidden">
             <div className="flex items-center gap-2 text-gray-400 mb-1">
                 <Ruler size={16} />
                 <span className="text-xs font-bold uppercase">身高</span>
             </div>
             {isEditing ? (
                 <input 
                    type="number"
                    value={editForm.height}
                    onChange={(e) => setEditForm({...editForm, height: Number(e.target.value)})}
                    className="text-3xl font-black text-gray-800 border-b-2 border-gray-100 w-full focus:border-brand-green outline-none bg-transparent"
                 />
             ) : (
                 <p className="text-3xl font-black text-gray-800">{profile.height} <span className="text-sm text-gray-400 font-bold">cm</span></p>
             )}
         </div>
         
         <div className="bg-white p-5 rounded-[1.5rem] shadow-sm border border-gray-100 flex flex-col gap-1 relative overflow-hidden">
             <div className="flex items-center gap-2 text-gray-400 mb-1">
                 <Weight size={16} />
                 <span className="text-xs font-bold uppercase">體重</span>
             </div>
             {isEditing ? (
                 <input 
                    type="number"
                    value={editForm.weight}
                    onChange={(e) => setEditForm({...editForm, weight: Number(e.target.value)})}
                    className="text-3xl font-black text-gray-800 border-b-2 border-gray-100 w-full focus:border-brand-green outline-none bg-transparent"
                 />
             ) : (
                 <p className="text-3xl font-black text-gray-800">{profile.weight} <span className="text-sm text-gray-400 font-bold">kg</span></p>
             )}
         </div>
         
         <div className="bg-white p-5 rounded-[1.5rem] shadow-sm border border-gray-100 flex flex-col gap-1 col-span-2">
             <div className="flex items-center gap-2 text-gray-400 mb-1">
                 <Calculator size={16} />
                 <span className="text-xs font-bold uppercase">BMI 指數</span>
             </div>
             <div className="flex items-center justify-between">
                 <p className="text-3xl font-black text-gray-800">{bmi}</p>
                 <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${Number(bmi) < 24 && Number(bmi) >= 18.5 ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                    {Number(bmi) < 18.5 ? '過輕' : Number(bmi) < 24 ? '正常' : '過重'}
                 </span>
             </div>
         </div>
      </div>

      {/* Actions */}
      <div className="space-y-3 pt-4">
         <button 
            onClick={() => {
                setTempBudget(goals.budget.daily);
                setIsBudgetModalOpen(true);
            }}
            className="w-full flex items-center justify-between p-5 bg-white rounded-[1.5rem] shadow-sm active:scale-95 transition-transform group border border-gray-100 hover:border-brand-green/30"
         >
             <div className="flex items-center gap-4">
                 <div className="p-3 bg-gray-50 rounded-full text-brand-black group-hover:bg-brand-green group-hover:text-black transition-colors">
                     <Wallet size={20} />
                 </div>
                 <div className="text-left">
                     <span className="block font-bold text-gray-800">修改預算</span>
                     <span className="text-xs text-gray-400 font-semibold">${goals.budget.daily} / 日</span>
                 </div>
             </div>
             <Settings size={20} className="text-gray-300" />
         </button>

         {isGuest && (
             <div className="p-4 text-center">
                 <p className="text-xs text-gray-400 mb-2">想要雲端備份資料？</p>
                 <button onClick={logout} className="text-brand-green font-bold text-sm bg-brand-black px-4 py-2 rounded-full">
                     登出並註冊帳號
                 </button>
             </div>
         )}

         {!isGuest && (
            <button 
                onClick={() => {
                    if(window.confirm('確定要重置所有數據並重新設定嗎？此動作無法復原。')) {
                        resetData();
                    }
                }}
                className="w-full flex items-center justify-between p-5 bg-red-50/50 rounded-[1.5rem] active:scale-95 transition-transform group hover:bg-red-50 border border-red-100/50"
            >
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white rounded-full text-red-400 group-hover:text-red-500 transition-colors shadow-sm">
                        <LogOut size={20} />
                    </div>
                    <span className="block font-bold text-red-400 group-hover:text-red-500 transition-colors">重置並重新設定</span>
                </div>
                <ChevronRight size={20} className="text-red-200" />
            </button>
         )}
      </div>

      {/* Footer Version */}
      <div className="text-center pb-24">
          <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Go Joe! v1.3.0</p>
      </div>

      {/* Budget Edit Modal (Local) */}
      {isBudgetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsBudgetModalOpen(false)} />
            <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 relative z-10 animate-fade-in-up shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black text-gray-800">修改預算</h3>
                    <button onClick={() => setIsBudgetModalOpen(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"><X size={20} /></button>
                </div>
                <div className="space-y-6">
                    <div>
                         <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">每日上限 (NT$)</label>
                         <input 
                            type="number" 
                            value={tempBudget}
                            onChange={(e) => setTempBudget(Number(e.target.value))}
                            className="w-full text-4xl font-black border-b-2 border-gray-100 py-2 focus:border-brand-green outline-none text-brand-black" 
                            autoFocus 
                         />
                    </div>
                    <button 
                        onClick={handleSaveBudget}
                        className="w-full bg-brand-black text-brand-green font-bold py-4 rounded-full flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg"
                    >
                        <Save size={20} />
                        <span>儲存變更</span>
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};
