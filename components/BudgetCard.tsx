
import React from 'react';
import { Wallet, AlertCircle } from 'lucide-react';
import { UserGoals, DailyStats } from '../context/UserContext';

interface Props {
  goals: UserGoals;
  stats: DailyStats;
}

export const BudgetCard: React.FC<Props> = ({ goals, stats }) => {
  const remaining = Math.max(goals.budget.daily - stats.spentBudget, 0);
  const percentUsed = Math.min((stats.spentBudget / goals.budget.daily) * 100, 100);
  
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentUsed / 100) * circumference;
  
  const isOverBudget = stats.spentBudget > goals.budget.daily;

  return (
    <div className="bg-white/70 backdrop-blur-xl border border-white/60 shadow-lg rounded-[2.5rem] p-6 flex flex-row items-center gap-4 animate-fade-in relative overflow-hidden h-[220px]">
      
       {/* Decorative Glow */}
       <div className="absolute -top-10 -right-10 w-40 h-40 bg-brand-black/5 rounded-full blur-3xl pointer-events-none"></div>

       {/* Chart */}
       <div className="relative w-32 h-32 shrink-0 flex items-center justify-center">
         <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
             <circle cx="50" cy="50" r={radius} stroke="#E5E7EB" strokeWidth="10" fill="none" />
             <circle 
                cx="50" cy="50" r={radius} 
                stroke={isOverBudget ? '#EF4444' : '#111111'} 
                strokeWidth="10" fill="none" 
                strokeDasharray={circumference}
                strokeDashoffset={isOverBudget ? 0 : offset}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
             />
         </svg>
         <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
             <div className="flex items-center gap-1 text-gray-400 mb-0.5">
                <Wallet size={12} fill="currentColor" />
                <span className="text-[10px] font-bold uppercase tracking-wider">剩餘</span>
             </div>
             <span className={`text-2xl font-black tracking-tighter leading-none ${remaining === 0 ? 'text-red-500' : 'text-gray-800'}`}>
                ${remaining}
             </span>
             <span className="text-[10px] font-bold text-gray-400 mt-1">TWD</span>
        </div>
       </div>

       {/* Details */}
       <div className="flex-1 w-full space-y-4">
            <div className="flex justify-between items-end border-b border-gray-100 pb-2">
                <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">今日花費</p>
                    <p className="text-lg font-black text-gray-800">${stats.spentBudget}</p>
                </div>
                <div className="text-right">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">預算</p>
                    <p className="text-lg font-black text-gray-800">${goals.budget.daily}</p>
                </div>
            </div>

            {isOverBudget && (
                <div className="bg-red-50 p-2 rounded-xl flex items-center gap-2 border border-red-100 animate-pulse">
                    <AlertCircle size={16} className="text-red-500" />
                    <span className="text-xs font-bold text-red-500">預算超支了！請節省開銷。</span>
                </div>
            )}
            
            {!isOverBudget && (
                <div className="grid grid-cols-4 gap-2">
                    {Object.entries(goals.budget.breakdown).map(([meal, amount]) => (
                        <div key={meal} className="bg-gray-50 rounded-lg p-1.5 text-center">
                            <span className="block text-[9px] text-gray-400 uppercase font-bold mb-1">{meal.slice(0,1)}</span>
                            <span className="block text-xs font-black text-gray-700">${amount}</span>
                        </div>
                    ))}
                </div>
            )}
       </div>
    </div>
  );
};
