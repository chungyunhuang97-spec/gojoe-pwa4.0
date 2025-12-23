import React, { useMemo } from 'react';
import { useUser, WorkoutLog } from '../context/UserContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Dumbbell, Flame, TrendingUp } from 'lucide-react';

const COLORS = ['#CCFF00', '#111111', '#9CA3AF', '#60A5FA', '#F472B6'];

export const Analytics: React.FC = () => {
  const { workoutLogs, logs } = useUser();

  // 1. Weekly Workout Frequency (Last 7 days)
  const weeklyFreq = useMemo(() => {
      const now = new Date();
      let count = 0;
      for (let i = 0; i < 7; i++) {
          const d = new Date();
          d.setDate(now.getDate() - i);
          const key = d.toISOString().split('T')[0];
          if (workoutLogs.some(l => l.date === key)) count++;
      }
      return count;
  }, [workoutLogs]);

  // 2. Monthly Duration (Group by Week) - 按实际日期分组
  const monthlyDurationData = useMemo(() => {
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const weeks: { name: string; minutes: number; startDate: Date }[] = [];
      
      // 计算本月有多少周
      let currentWeekStart = new Date(firstDayOfMonth);
      while (currentWeekStart <= now) {
          let weekEnd = new Date(currentWeekStart);
          weekEnd.setDate(weekEnd.getDate() + 6);
          if (weekEnd > now) weekEnd = new Date(now);
          
          const weekNum = weeks.length + 1;
          weeks.push({
              name: `W${weekNum}`,
              minutes: 0,
              startDate: new Date(currentWeekStart)
          });
          
          currentWeekStart.setDate(currentWeekStart.getDate() + 7);
      }
      
      // 分配训练记录到对应的周
      workoutLogs.forEach(log => {
          const logDate = new Date(log.date);
          if (logDate >= firstDayOfMonth && logDate <= now) {
              const weekIndex = weeks.findIndex(w => {
                  const weekEnd = new Date(w.startDate);
                  weekEnd.setDate(weekEnd.getDate() + 6);
                  return logDate >= w.startDate && logDate <= weekEnd;
              });
              if (weekIndex >= 0) {
                  weeks[weekIndex].minutes += log.duration || 0;
              }
          }
      });
      
      return weeks.map(w => ({ name: w.name, minutes: w.minutes }));
  }, [workoutLogs]);

  // 3. Muscle Distribution - 翻译部位名称
  const muscleData = useMemo(() => {
      const counts: Record<string, number> = {};
      workoutLogs.forEach(log => {
          log.bodyParts.forEach(part => {
              counts[part] = (counts[part] || 0) + 1;
          });
      });
      
      // 部位名称翻译
      const partTranslations: Record<string, string> = {
          'shoulders': '肩膀',
          'triceps': '三頭',
          'biceps': '二頭',
          'chest': '胸',
          'back': '背',
          'legs': '腿',
          'quadriceps': '股四',
          'hamstrings': '胭繩',
          'calves': '小腿',
          'abs': '腹部',
          'traps': '斜方',
          'forearms': '小臂',
          'full_body': '全身'
      };
      
      return Object.keys(counts).map(key => ({ 
          name: partTranslations[key] || key, 
          value: counts[key] 
      }));
  }, [workoutLogs]);
  
  // 4. 总训练统计（从训记导入的数据）
  const totalStats = useMemo(() => {
      const totalWeight = workoutLogs.reduce((sum, log) => {
          return sum + log.exercises.reduce((exSum, ex) => exSum + (ex.weight * ex.reps * ex.sets), 0);
      }, 0);
      const totalDuration = workoutLogs.reduce((sum, log) => sum + (log.duration || 0), 0);
      const totalExercises = workoutLogs.reduce((sum, log) => sum + log.exercises.length, 0);
      
      return { totalWeight, totalDuration, totalExercises, totalWorkouts: workoutLogs.length };
  }, [workoutLogs]);

  // 如果没有数据，显示空状态
  if (workoutLogs.length === 0) {
    return (
      <div className="h-full overflow-y-auto no-scrollbar pb-32 bg-gray-50 p-6 space-y-6">
        <h2 className="text-2xl font-black text-brand-black italic mb-6">數據分析</h2>
        <div className="bg-white rounded-[2rem] p-12 text-center border border-gray-100 shadow-sm">
          <Dumbbell size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-gray-400 font-bold mb-2">尚無訓練紀錄</p>
          <p className="text-xs text-gray-300">請先從首頁 AI 教練匯入訓記 App 的訓練紀錄</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto no-scrollbar pb-32 bg-gray-50 p-6 space-y-6">
        <h2 className="text-2xl font-black text-brand-black italic mb-6">數據分析</h2>

        {/* Frequency Card */}
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-brand-black text-brand-green rounded-full"><Dumbbell size={20} /></div>
                <h3 className="font-bold text-gray-800">本週訓練頻率</h3>
            </div>
            <div className="flex items-end gap-2 mb-2">
                <span className="text-4xl font-black text-brand-black">{weeklyFreq}</span>
                <span className="text-gray-400 font-bold mb-1">/ 5 次目標</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-brand-green rounded-full transition-all duration-1000" style={{ width: `${Math.min((weeklyFreq/5)*100, 100)}%` }} />
            </div>
        </div>

        {/* Duration Chart */}
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 h-64 flex flex-col">
             <h3 className="font-bold text-gray-800 mb-4">本月訓練時長 (分)</h3>
             <div className="flex-1">
                 <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={monthlyDurationData}>
                         <XAxis dataKey="name" tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                         <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                         <Bar dataKey="minutes" fill="#111111" radius={[4,4,0,0]} barSize={20} />
                     </BarChart>
                 </ResponsiveContainer>
             </div>
        </div>

        {/* Muscle Pie */}
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 h-64 flex flex-col">
            <h3 className="font-bold text-gray-800 mb-4">部位分佈</h3>
            <div className="flex-1 flex items-center justify-center">
                 {muscleData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={muscleData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                {muscleData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                 ) : (
                     <p className="text-xs text-gray-400 font-bold">尚無數據</p>
                 )}
            </div>
        </div>

        {/* Total Stats Card - 显示从训记导入的总体数据 */}
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-brand-green text-brand-black rounded-full"><TrendingUp size={20} /></div>
                <h3 className="font-bold text-gray-800">累計訓練統計</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-400 font-bold mb-1">總訓練次數</p>
                    <p className="text-2xl font-black text-brand-black">{totalStats.totalWorkouts}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-400 font-bold mb-1">總動作數</p>
                    <p className="text-2xl font-black text-brand-black">{totalStats.totalExercises}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-400 font-bold mb-1">總重量</p>
                    <p className="text-2xl font-black text-brand-black">{Math.round(totalStats.totalWeight)}<span className="text-sm text-gray-400">kg</span></p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-400 font-bold mb-1">總時長</p>
                    <p className="text-2xl font-black text-brand-black">{totalStats.totalDuration}<span className="text-sm text-gray-400">分</span></p>
                </div>
            </div>
            {workoutLogs.length > 0 && (
                <p className="text-xs text-gray-400 font-bold mt-4 text-center">
                    * 包含從訓記App匯入的訓練紀錄
                </p>
            )}
        </div>
    </div>
  );
};