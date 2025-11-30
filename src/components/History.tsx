
import React, { useMemo, useState } from 'react';
import { useUser, BodyLogEntry, LogEntry, WorkoutLog } from '../context/UserContext';
import { ChevronLeft, ChevronRight, ChevronDown, Camera, Flame, Target, X, ZoomIn, Dumbbell } from 'lucide-react';

// --- Helpers ---

const getDaysInMonth = (date: Date) => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
};

const getFirstDayOfMonth = (date: Date) => {
  return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
};

const formatDateKey = (date: Date) => {
    const offset = date.getTimezoneOffset() * 60000;
    return (new Date(date.getTime() - offset)).toISOString().slice(0, 10);
};

const isSameDay = (d1: Date, d2: Date) => {
    return d1.getDate() === d2.getDate() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getFullYear() === d2.getFullYear();
};

// --- Components ---

export const History: React.FC = () => {
  const { logs, bodyLogs, workoutLogs, goals } = useUser();
  
  // State
  const [viewDate, setViewDate] = useState(new Date()); // The month we are viewing
  const [selectedDate, setSelectedDate] = useState(new Date()); // The specific day selected
  const [isYearPickerOpen, setIsYearPickerOpen] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<BodyLogEntry | null>(null);

  // Derived State: Data Dictionary
  const dailyDataMap = useMemo(() => {
    const map: Record<string, { 
        cals: number; 
        protein: number; 
        carbs: number; 
        fat: number; 
        cost: number;
        hasBodyLog: boolean;
        foodItems: LogEntry[];
        bodyItems: BodyLogEntry[];
        workout?: WorkoutLog;
    }> = {};

    // Process Food Logs
    logs.forEach(log => {
        const key = formatDateKey(new Date(log.timestamp));
        if (!map[key]) map[key] = { cals: 0, protein: 0, carbs: 0, fat: 0, cost: 0, hasBodyLog: false, foodItems: [], bodyItems: [] };
        
        map[key].cals += log.calories;
        map[key].protein += log.protein;
        map[key].carbs += log.carbs;
        map[key].fat += log.fat;
        map[key].cost += log.price;
        map[key].foodItems.push(log);
    });

    // Process Body Logs
    bodyLogs.forEach(log => {
        const key = formatDateKey(new Date(log.timestamp));
        if (!map[key]) map[key] = { cals: 0, protein: 0, carbs: 0, fat: 0, cost: 0, hasBodyLog: false, foodItems: [], bodyItems: [] };
        map[key].hasBodyLog = true;
        map[key].bodyItems.push(log);
    });
    
    // Process Workout Logs
    workoutLogs.forEach(log => {
        const key = log.date;
        if (!map[key]) map[key] = { cals: 0, protein: 0, carbs: 0, fat: 0, cost: 0, hasBodyLog: false, foodItems: [], bodyItems: [] };
        map[key].workout = log;
    });

    return map;
  }, [logs, bodyLogs, workoutLogs]);

  // Calendar Navigation
  const changeMonth = (offset: number) => {
    const newDate = new Date(viewDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setViewDate(newDate);
  };

  const changeYear = (year: number) => {
      const newDate = new Date(viewDate);
      newDate.setFullYear(year);
      setViewDate(newDate);
      setIsYearPickerOpen(false);
  };

  // Calendar Generation
  const daysInMonth = getDaysInMonth(viewDate);
  const startDay = getFirstDayOfMonth(viewDate);
  
  const calendarDays = [];
  // Empty slots for previous month
  for (let i = 0; i < startDay; i++) {
      calendarDays.push(null);
  }
  // Days of current month
  for (let i = 1; i <= daysInMonth; i++) {
      calendarDays.push(new Date(viewDate.getFullYear(), viewDate.getMonth(), i));
  }

  // Selected Data
  const selectedKey = formatDateKey(selectedDate);
  const selectedData = dailyDataMap[selectedKey] || { 
      cals: 0, protein: 0, carbs: 0, fat: 0, cost: 0, hasBodyLog: false, foodItems: [], bodyItems: [], workout: undefined
  };

  // Helper to determine day status color
  const getDayStatus = (date: Date) => {
      const key = formatDateKey(date);
      const data = dailyDataMap[key];
      
      if (!data) return 'bg-transparent text-gray-500 hover:bg-gray-100'; // No Data

      const hasWorkout = !!data.workout;
      const hasFood = data.cals > 0;
      
      if (hasWorkout && hasFood) return 'bg-brand-black text-brand-green shadow-md shadow-brand-black/20';
      if (hasWorkout) return 'bg-gray-800 text-white';
      if (data.cals > goals.targetCalories * 1.1) return 'bg-red-500 text-white';
      if (hasFood) return 'bg-brand-green text-brand-black';
      
      return 'bg-gray-100 text-gray-400';
  };

  // Years for picker
  const currentYear = new Date().getFullYear();
  const years = Array.from({length: 5}, (_, i) => currentYear - 2 + i);

  return (
    <div className="h-full overflow-y-auto no-scrollbar pb-32 bg-gray-50/50">
      
      {/* --- CALENDAR HEADER --- */}
      <div className="bg-white pb-6 pt-4 rounded-b-[2.5rem] shadow-sm relative z-20">
        <div className="flex items-center justify-between px-6 mb-6">
            <button onClick={() => changeMonth(-1)} className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 active:scale-95 transition-transform">
                <ChevronLeft size={20} className="text-gray-600" />
            </button>
            
            <button 
                onClick={() => setIsYearPickerOpen(!isYearPickerOpen)}
                className="flex items-center gap-2 text-xl font-black text-brand-black uppercase tracking-tighter active:opacity-70"
            >
                {viewDate.toLocaleString('default', { month: 'long' })} {viewDate.getFullYear()}
                <ChevronDown size={16} className={`text-brand-green transition-transform ${isYearPickerOpen ? 'rotate-180' : ''}`} strokeWidth={3} />
            </button>

            <button onClick={() => changeMonth(1)} className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 active:scale-95 transition-transform">
                <ChevronRight size={20} className="text-gray-600" />
            </button>
        </div>

        {/* Year Picker Overlay */}
        {isYearPickerOpen && (
            <div className="absolute top-16 left-0 right-0 bg-white/95 backdrop-blur-md p-4 grid grid-cols-3 gap-3 border-b border-gray-100 shadow-xl animate-fade-in z-30">
                {years.map(y => (
                    <button 
                        key={y} 
                        onClick={() => changeYear(y)}
                        className={`py-3 rounded-xl font-bold text-sm ${y === viewDate.getFullYear() ? 'bg-brand-black text-brand-green' : 'bg-gray-50 text-gray-600'}`}
                    >
                        {y}
                    </button>
                ))}
            </div>
        )}

        {/* Days Header */}
        <div className="grid grid-cols-7 px-4 mb-2">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <div key={i} className="text-center text-[10px] font-extrabold text-gray-300 uppercase">
                    {d}
                </div>
            ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 px-4 gap-y-2">
            {calendarDays.map((date, idx) => {
                if (!date) return <div key={`empty-${idx}`} />;
                
                const isSelected = isSameDay(date, selectedDate);
                const isToday = isSameDay(date, new Date());
                const statusClass = getDayStatus(date);
                const hasBodyLog = dailyDataMap[formatDateKey(date)]?.hasBodyLog;

                return (
                    <div key={idx} className="flex flex-col items-center">
                        <button
                            onClick={() => setSelectedDate(date)}
                            className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all relative ${statusClass} ${isSelected ? 'ring-2 ring-brand-black ring-offset-2 scale-105 z-10' : ''} ${!isSelected && isToday ? 'ring-2 ring-gray-200' : ''}`}
                        >
                            {date.getDate()}
                            {hasBodyLog && (
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple-500 rounded-full border-2 border-white" />
                            )}
                        </button>
                    </div>
                );
            })}
        </div>
      </div>

      {/* --- SELECTED DATE DETAILS --- */}
      <div className="px-5 py-6 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-black italic text-brand-black">
                  {selectedDate.toLocaleDateString('zh-TW', { month: 'long', day: 'numeric' })}
              </h3>
              {selectedData.cals > 0 && (
                  <div className="flex items-center gap-1 bg-white px-3 py-1 rounded-full shadow-sm border border-gray-100">
                      <Flame size={14} className="text-orange-500" fill="currentColor" />
                      <span className="text-xs font-bold text-gray-800">{selectedData.cals} kcal</span>
                  </div>
              )}
          </div>

          {!selectedData.cals && !selectedData.hasBodyLog && !selectedData.workout ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-300 border-2 border-dashed border-gray-200 rounded-[2rem]">
                  <Target size={48} className="mb-2 opacity-20" />
                  <p className="font-bold">這天沒有紀錄</p>
              </div>
          ) : (
              <div className="space-y-4">
                  
                  {/* WORKOUT SUMMARY */}
                  {selectedData.workout && (
                      <div className="bg-brand-black text-white p-5 rounded-[2rem] shadow-lg relative overflow-hidden">
                          <div className="relative z-10">
                              <div className="flex items-center gap-2 mb-3">
                                  <Dumbbell className="text-brand-green" size={20} />
                                  <span className="font-bold text-brand-green uppercase text-xs tracking-wider">訓練完成</span>
                              </div>
                              <div className="flex gap-4">
                                  <div>
                                      <span className="block text-2xl font-black">{selectedData.workout.duration}</span>
                                      <span className="text-[10px] text-gray-400 font-bold uppercase">Mins</span>
                                  </div>
                                  <div>
                                      <span className="block text-2xl font-black">{selectedData.workout.exercises.length}</span>
                                      <span className="text-[10px] text-gray-400 font-bold uppercase">Moves</span>
                                  </div>
                              </div>
                              <div className="mt-3 flex flex-wrap gap-1">
                                  {selectedData.workout.bodyParts.map(p => (
                                      <span key={p} className="text-[10px] font-bold bg-gray-800 px-2 py-1 rounded-full">{p}</span>
                                  ))}
                              </div>
                          </div>
                      </div>
                  )}

                  {/* Summary Card */}
                  {selectedData.cals > 0 && (
                    <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100">
                        {/* Macro Bars */}
                        <div className="space-y-2">
                             {[
                                 { label: 'P', val: selectedData.protein, max: goals.targetProtein, color: 'bg-brand-green' },
                                 { label: 'C', val: selectedData.carbs, max: goals.targetCarbs, color: 'bg-blue-400' },
                                 { label: 'F', val: selectedData.fat, max: goals.targetFat, color: 'bg-yellow-400' },
                             ].map(m => (
                                 <div key={m.label} className="flex items-center gap-3">
                                     <span className="w-4 text-[10px] font-bold text-gray-400">{m.label}</span>
                                     <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                         <div className={`h-full ${m.color}`} style={{ width: `${Math.min((m.val/m.max)*100, 100)}%` }} />
                                     </div>
                                     <span className="w-8 text-[10px] font-bold text-gray-600 text-right">{m.val}g</span>
                                 </div>
                             ))}
                        </div>
                    </div>
                  )}

                  {/* Body Log Section */}
                  {selectedData.bodyItems.length > 0 && (
                      <div className="bg-gray-900 p-5 rounded-[2rem] shadow-lg relative overflow-hidden text-white">
                          <div className="flex items-center gap-2 mb-4">
                              <Camera size={18} className="text-brand-green" />
                              <span className="font-bold text-brand-green uppercase tracking-wider text-xs">體態紀錄</span>
                          </div>
                          <div className="flex gap-3 overflow-x-auto no-scrollbar">
                              {selectedData.bodyItems.map(item => (
                                  <button 
                                    key={item.id} 
                                    onClick={() => setZoomedImage(item)}
                                    className="w-20 h-28 bg-gray-800 rounded-xl overflow-hidden shrink-0 relative group"
                                  >
                                      <img src={item.imageUrl} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                      {item.weight && (
                                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-[9px] font-bold text-center py-1">
                                              {item.weight}kg
                                          </div>
                                      )}
                                  </button>
                              ))}
                          </div>
                      </div>
                  )}

                  {/* Food List */}
                  {selectedData.foodItems.length > 0 && (
                      <div className="space-y-3">
                          {selectedData.foodItems.sort((a,b) => b.timestamp - a.timestamp).map(item => (
                              <div key={item.id} className="bg-white p-4 rounded-2xl flex items-center justify-between border border-gray-100 shadow-sm">
                                  <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-xs font-black text-gray-400">
                                          {new Date(item.timestamp).getHours().toString().padStart(2, '0')}:{new Date(item.timestamp).getMinutes().toString().padStart(2, '0')}
                                      </div>
                                      <div>
                                          <p className="font-bold text-gray-800 text-sm line-clamp-1">{item.foodName}</p>
                                          <p className="text-[10px] font-bold text-gray-400 uppercase">{item.mealType}</p>
                                      </div>
                                  </div>
                                  <div className="text-right">
                                      <span className="block font-black text-brand-black">{item.calories}</span>
                                      <span className="text-[9px] font-bold text-gray-400">KCAL</span>
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}

              </div>
          )}
      </div>

      {/* --- ZOOM MODAL --- */}
      {zoomedImage && (
          <div className="fixed inset-0 z-50 bg-black flex flex-col animate-fade-in" onClick={() => setZoomedImage(null)}>
              <div className="absolute top-6 right-6 z-10">
                  <button onClick={() => setZoomedImage(null)} className="p-3 bg-white/20 backdrop-blur rounded-full text-white">
                      <X size={24} />
                  </button>
              </div>
              <div className="flex-1 flex items-center justify-center p-4">
                  <img 
                    src={zoomedImage.imageUrl} 
                    alt="Zoomed Body Check" 
                    className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl" 
                    onClick={(e) => e.stopPropagation()} 
                  />
              </div>
              <div className="p-8 bg-gradient-to-t from-black via-black/80 to-transparent text-white">
                  <p className="text-sm font-bold text-brand-green uppercase tracking-wider mb-1">
                      {new Date(zoomedImage.timestamp).toLocaleDateString('zh-TW', { dateStyle: 'full' })}
                  </p>
                  {zoomedImage.weight && (
                      <p className="text-4xl font-black">{zoomedImage.weight} <span className="text-lg text-gray-400 font-bold">KG</span></p>
                  )}
              </div>
          </div>
      )}

    </div>
  );
};
