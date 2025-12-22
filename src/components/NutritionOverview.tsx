import React from 'react';
import { Zap, AlertTriangle } from 'lucide-react';
import { UserGoals, DailyStats } from '../context/UserContext';

interface Props {
  goals: UserGoals;
  stats: DailyStats;
}

export const NutritionOverview: React.FC<Props> = ({ goals, stats }) => {
  const caloriesLeft = Math.max(goals.targetCalories - stats.consumedCalories, 0);
  const percentConsumed = Math.min((stats.consumedCalories / goals.targetCalories) * 100, 100);
  const fatPercent = (stats.consumedFat / goals.targetFat) * 100;
  
  const getPercent = (curr: number, total: number) => Math.min((curr / total) * 100, 100);

  // SVG Config
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentConsumed / 100) * circumference;

  return (
    <div className="bg-white/70 backdrop-blur-xl border border-white/60 shadow-lg rounded-[2.5rem] p-4 flex flex-row items-center gap-3 animate-fade-in relative overflow-hidden group h-[160px]">
      
      {/* Decorative Glow */}
      <div className="absolute -top-10 -left-10 w-40 h-40 bg-brand-green/20 rounded-full blur-3xl pointer-events-none group-hover:bg-brand-green/30 transition-colors duration-700"></div>

      {/* Left: SVG Donut Chart */}
      <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
         {/* Chart Container */}
         <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
             {/* Background Circle */}
             <circle 
                cx="50" cy="50" r={radius} 
                stroke="#E5E7EB" strokeWidth="10" fill="none" 
             />
             {/* Progress Circle */}
             <circle 
                cx="50" cy="50" r={radius} 
                stroke="#CCFF00" strokeWidth="10" fill="none" 
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out drop-shadow-sm"
             />
         </svg>
        
        {/* Center Label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
             <div className="flex items-center gap-0.5 text-gray-400 mb-0.5">
                <Zap size={12} fill="currentColor" />
                <span className="text-[10px] font-bold uppercase tracking-wider">剩餘</span>
             </div>
             <span className="text-2xl font-black text-gray-800 tracking-tighter leading-none">
                {caloriesLeft}
             </span>
             <span className="text-[10px] font-bold text-gray-400 mt-1">kcal</span>
        </div>
      </div>

      {/* Right: Macros & Progress - Side by Side Layout */}
      <div className="flex-1 w-full">
          {/* Header Stats - Compact */}
          <div className="flex justify-between items-end border-b border-gray-100 pb-1.5 mb-2">
              <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">今日進度</p>
                  <p className="text-base font-black text-gray-800">{Math.round(percentConsumed)}%</p>
              </div>
              <div className="text-right">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">目標</p>
                  <p className="text-base font-black text-gray-800">{goals.targetCalories} <span className="text-[10px] text-gray-400 font-bold">kcal</span></p>
              </div>
          </div>

          {/* FAT WARNING - Compact */}
          {fatPercent > 70 && (
             <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-1.5 flex items-center gap-1.5 animate-pulse mb-2">
                <AlertTriangle size={12} className="text-yellow-600 shrink-0" />
                <span className="text-[9px] font-bold text-yellow-700">
                   脂肪即將用盡!
                </span>
             </div>
          )}

          {/* Macro Bars - Side by Side */}
          <div className="grid grid-cols-3 gap-2">
              {/* Protein */}
              <div className="space-y-1">
                  <div className="text-center">
                      <p className="text-[9px] font-bold text-gray-500 uppercase mb-0.5">蛋白質 (P)</p>
                      <p className="text-xs font-black text-gray-800">{stats.consumedProtein}/{goals.targetProtein}g</p>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                      <div className="h-full bg-brand-green rounded-full shadow-[0_0_8px_rgba(204,255,0,0.4)] transition-all duration-1000" style={{ width: `${getPercent(stats.consumedProtein, goals.targetProtein)}%` }}></div>
                  </div>
              </div>

              {/* Carbs */}
              <div className="space-y-1">
                  <div className="text-center">
                      <p className="text-[9px] font-bold text-gray-500 uppercase mb-0.5">碳水 (C)</p>
                      <p className="text-xs font-black text-gray-800">{stats.consumedCarbs}/{goals.targetCarbs}g</p>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                      <div className="h-full bg-blue-400 rounded-full transition-all duration-1000" style={{ width: `${getPercent(stats.consumedCarbs, goals.targetCarbs)}%` }}></div>
                  </div>
              </div>

              {/* Fat */}
              <div className="space-y-1">
                  <div className="text-center">
                      <p className="text-[9px] font-bold text-gray-500 uppercase mb-0.5">脂肪 (F)</p>
                      <p className={`text-xs font-black transition-colors ${fatPercent > 70 ? 'text-red-500' : 'text-gray-800'}`}>
                          {stats.consumedFat}/{goals.targetFat}g
                      </p>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                      <div className={`h-full rounded-full transition-all duration-1000 ${fatPercent > 70 ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]' : 'bg-yellow-400'}`} style={{ width: `${getPercent(stats.consumedFat, goals.targetFat)}%` }}></div>
                  </div>
              </div>
          </div>

      </div>
    </div>
  );
};