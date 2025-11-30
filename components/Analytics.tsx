
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

  // 2. Monthly Duration (Group by Week)
  const monthlyDurationData = useMemo(() => {
      // Mock weeks for simplicity or calculate dynamic
      const data = [
          { name: 'W1', minutes: 0 }, { name: 'W2', minutes: 0 },
          { name: 'W3', minutes: 0 }, { name: 'W4', minutes: 0 }
      ];
      // Simple distribution logic (just mapping all logs to buckets)
      workoutLogs.forEach((log, i) => {
          const idx = i % 4; // Mock logic
          data[idx].minutes += log.duration;
      });
      return data;
  }, [workoutLogs]);

  // 3. Muscle Distribution
  const muscleData = useMemo(() => {
      const counts: Record<string, number> = {};
      workoutLogs.forEach(log => {
          log.bodyParts.forEach(part => {
              counts[part] = (counts[part] || 0) + 1;
          });
      });
      return Object.keys(counts).map(key => ({ name: key, value: counts[key] }));
  }, [workoutLogs]);

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
    </div>
  );
};
