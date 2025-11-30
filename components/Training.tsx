
import React, { useState, useEffect, useRef } from 'react';
import { useUser, WorkoutLog, WorkoutExercise } from '../context/UserContext';
import { Dumbbell, Plus, Timer, X, Check, Calendar, ChevronLeft, ChevronRight, Play, Pause, SkipForward, Trash2 } from 'lucide-react';
import { EXERCISE_LIBRARY, ExerciseDef } from '../data/exerciseLibrary';

const formatDate = (date: Date) => date.toISOString().split('T')[0];

export const Training: React.FC = () => {
  const { workoutLogs, addWorkoutLog, updateWorkoutLog, profile } = useUser();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const dateKey = formatDate(selectedDate);
  
  // Active Workout State
  const [activeLog, setActiveLog] = useState<WorkoutLog | null>(null);
  
  // UI State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [restTimer, setRestTimer] = useState<number | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load log for selected date
  useEffect(() => {
    const existing = workoutLogs.find(l => l.date === dateKey);
    if (existing) {
        setActiveLog(existing);
    } else {
        // Init empty state visually, don't save yet until first exercise
        setActiveLog({
            id: 'temp',
            date: dateKey,
            bodyParts: [],
            duration: 60,
            exercises: [],
            timestamp: Date.now()
        });
    }
  }, [dateKey, workoutLogs]);

  // Timer Logic
  useEffect(() => {
    let interval: any;
    if (timerRunning && restTimer !== null && restTimer > 0) {
        interval = setInterval(() => {
            setRestTimer(prev => {
                if (prev === 1) {
                    // Play Sound
                    const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
                    audio.play().catch(e => console.log('Audio play failed', e));
                    setTimerRunning(false);
                    return 0;
                }
                return (prev || 0) - 1;
            });
        }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning, restTimer]);

  const handleSaveExercise = (ex: WorkoutExercise) => {
     let newLog = { ...activeLog! };
     
     // Ensure real ID if temp
     if (newLog.id === 'temp') {
        newLog.id = Date.now().toString();
        addWorkoutLog(newLog); // First time save
     }

     const updatedExercises = [...newLog.exercises, ex];
     
     // Update log
     updateWorkoutLog(newLog.id, { exercises: updatedExercises });
     
     // Start Timer
     if (ex.restTime > 0) {
         setRestTimer(ex.restTime);
         setTimerRunning(true);
     }
  };

  const handleDeleteExercise = (exId: string) => {
      if (!activeLog) return;
      const updated = activeLog.exercises.filter(e => e.id !== exId);
      updateWorkoutLog(activeLog.id, { exercises: updated });
  };

  const handleUpdateDuration = (mins: number) => {
      if(activeLog && activeLog.id !== 'temp') {
          updateWorkoutLog(activeLog.id, { duration: mins });
      } else if (activeLog) {
          setActiveLog({...activeLog, duration: mins});
      }
  };

  const toggleBodyPart = (part: string) => {
      if (!activeLog) return;
      const current = activeLog.bodyParts || [];
      const updated = current.includes(part) ? current.filter(p => p !== part) : [...current, part];
      
      if (activeLog.id !== 'temp') {
          updateWorkoutLog(activeLog.id, { bodyParts: updated });
      } else {
          setActiveLog({ ...activeLog, bodyParts: updated });
      }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 pb-24 relative overflow-hidden">
        
        {/* Date Header */}
        <div className="bg-white p-4 shadow-sm z-10">
            <div className="flex items-center justify-between bg-gray-100 rounded-xl p-1">
                <button onClick={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() - 1)))} className="p-2 hover:bg-white rounded-lg transition-colors"><ChevronLeft size={20} /></button>
                <div className="flex items-center gap-2 font-black text-gray-700">
                    <Calendar size={18} />
                    {selectedDate.toLocaleDateString()}
                </div>
                <button onClick={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() + 1)))} className="p-2 hover:bg-white rounded-lg transition-colors"><ChevronRight size={20} /></button>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
            
            {/* Workout Config Card */}
            <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-black text-brand-black flex items-center gap-2">
                        <Dumbbell className="text-brand-green" fill="black" /> 訓練設定
                    </h2>
                    {activeLog?.id === 'temp' && <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded">未開始</span>}
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">訓練部位 (多選)</label>
                        <div className="flex flex-wrap gap-2">
                            {['胸', '背', '腿', '肩', '手臂', '核心'].map(part => (
                                <button 
                                    key={part}
                                    onClick={() => toggleBodyPart(part)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                                        activeLog?.bodyParts.includes(part) 
                                        ? 'bg-brand-black text-brand-green border-brand-black' 
                                        : 'bg-white text-gray-500 border-gray-200'
                                    }`}
                                >
                                    {part}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">預計時長 (分鐘)</label>
                        <input 
                            type="number" 
                            value={activeLog?.duration || 60}
                            onChange={(e) => handleUpdateDuration(Number(e.target.value))}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 font-black text-gray-800 focus:border-brand-green outline-none"
                        />
                    </div>
                </div>
            </div>

            {/* Exercises List */}
            <div className="space-y-3">
                <div className="flex items-center justify-between px-2">
                    <h3 className="font-black text-gray-800 italic">動作紀錄</h3>
                    <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-1 text-xs font-bold bg-brand-black text-brand-green px-3 py-1.5 rounded-full active:scale-95 transition-transform">
                        <Plus size={14} /> 新增動作
                    </button>
                </div>

                {activeLog && activeLog.exercises.length > 0 ? (
                    activeLog.exercises.map((ex, idx) => (
                        <div key={ex.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm relative group">
                             <div className="flex justify-between items-start mb-2">
                                 <div>
                                     <h4 className="font-bold text-gray-800">{ex.name}</h4>
                                     <span className="text-[10px] text-gray-400 font-bold bg-gray-50 px-1.5 rounded uppercase">{ex.equipmentType}</span>
                                 </div>
                                 <button onClick={() => handleDeleteExercise(ex.id)} className="text-gray-300 hover:text-red-500 transition-colors p-1">
                                     <Trash2 size={16} />
                                 </button>
                             </div>
                             <div className="flex gap-4 text-sm font-medium text-gray-600">
                                 <div className="bg-gray-50 px-3 py-1 rounded-lg">
                                     <span className="font-black text-brand-black">{ex.weight}</span> kg
                                 </div>
                                 <div className="bg-gray-50 px-3 py-1 rounded-lg">
                                     <span className="font-black text-brand-black">{ex.sets}</span> 組 x <span className="font-black text-brand-black">{ex.reps}</span> 下
                                 </div>
                             </div>
                             {ex.notes && <p className="text-xs text-gray-400 mt-2 italic border-l-2 border-brand-green pl-2">{ex.notes}</p>}
                        </div>
                    ))
                ) : (
                    <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-gray-200">
                        <Dumbbell className="mx-auto text-gray-300 mb-2" size={32} />
                        <p className="text-xs font-bold text-gray-400">還沒有動作紀錄</p>
                    </div>
                )}
            </div>
        </div>

        {/* Timer Overlay */}
        {restTimer !== null && restTimer > 0 && (
            <div className="fixed bottom-24 right-4 bg-brand-black text-brand-green p-4 rounded-2xl shadow-2xl z-40 flex items-center gap-4 border border-brand-green/20 animate-fade-in-up">
                <div className="text-center">
                    <span className="block text-[10px] uppercase font-bold text-gray-400">Rest</span>
                    <span className="text-2xl font-black">{restTimer}s</span>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setTimerRunning(!timerRunning)} className="p-2 bg-white/10 rounded-full hover:bg-white/20">
                        {timerRunning ? <Pause size={18} /> : <Play size={18} />}
                    </button>
                    <button onClick={() => { setRestTimer(null); setTimerRunning(false); }} className="p-2 bg-white/10 rounded-full hover:bg-white/20">
                        <SkipForward size={18} />
                    </button>
                </div>
            </div>
        )}

        {/* Add Exercise Modal */}
        {isAddModalOpen && (
            <AddExerciseModal onClose={() => setIsAddModalOpen(false)} onSave={handleSaveExercise} />
        )}
    </div>
  );
};

// --- Subcomponent: Add Exercise Modal ---
const AddExerciseModal: React.FC<{ onClose: () => void, onSave: (ex: WorkoutExercise) => void }> = ({ onClose, onSave }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDef, setSelectedDef] = useState<ExerciseDef | null>(null);
    const [step, setStep] = useState<'SELECT' | 'DETAILS'>('SELECT');
    
    // Form State
    const [form, setForm] = useState({
        sets: 3, reps: 10, weight: 20, restTime: 60, notes: ''
    });

    const filteredExercises = EXERCISE_LIBRARY.filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const handleConfirm = () => {
        if (!selectedDef) return;
        
        const newEx: WorkoutExercise = {
            id: Date.now().toString(),
            name: selectedDef.name,
            equipmentType: selectedDef.equipmentType,
            targetMuscles: selectedDef.targetMuscles,
            sets: form.sets,
            reps: form.reps,
            weight: form.weight,
            restTime: form.restTime,
            notes: form.notes,
            timestamp: Date.now()
        };
        onSave(newEx);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-white w-full sm:max-w-md h-[85vh] sm:h-auto sm:rounded-[2.5rem] rounded-t-[2.5rem] p-6 flex flex-col relative animate-fade-in-up">
                <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-gray-100 rounded-full"><X size={20} /></button>
                
                <h3 className="text-xl font-black text-brand-black mb-6">
                    {step === 'SELECT' ? '選擇動作' : '詳細數據'}
                </h3>

                {step === 'SELECT' ? (
                    <div className="flex-1 overflow-hidden flex flex-col">
                        <input 
                            placeholder="搜尋動作..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold mb-4 focus:border-brand-green outline-none"
                        />
                        <div className="flex-1 overflow-y-auto space-y-2">
                            {filteredExercises.map(ex => (
                                <button 
                                    key={ex.id}
                                    onClick={() => { setSelectedDef(ex); setStep('DETAILS'); }}
                                    className="w-full p-4 bg-white border border-gray-100 hover:border-brand-green rounded-xl text-left transition-all active:scale-95 shadow-sm"
                                >
                                    <h4 className="font-bold text-gray-800">{ex.name}</h4>
                                    <p className="text-xs text-gray-400 capitalize">{ex.equipmentType} • {ex.targetMuscles.join(', ')}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                         <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                             <h4 className="font-bold text-gray-800">{selectedDef?.name}</h4>
                             <p className="text-xs text-gray-400">{selectedDef?.targetMuscles.join(', ')}</p>
                         </div>

                         <div className="grid grid-cols-2 gap-4">
                             <div>
                                 <label className="text-[10px] font-bold text-gray-400 uppercase">重量 (KG)</label>
                                 <input type="number" value={form.weight} onChange={e => setForm({...form, weight: Number(e.target.value)})} className="w-full text-2xl font-black border-b border-gray-200 focus:border-brand-green outline-none py-1" />
                             </div>
                             <div>
                                 <label className="text-[10px] font-bold text-gray-400 uppercase">組數 (Sets)</label>
                                 <input type="number" value={form.sets} onChange={e => setForm({...form, sets: Number(e.target.value)})} className="w-full text-2xl font-black border-b border-gray-200 focus:border-brand-green outline-none py-1" />
                             </div>
                             <div>
                                 <label className="text-[10px] font-bold text-gray-400 uppercase">次數 (Reps)</label>
                                 <input type="number" value={form.reps} onChange={e => setForm({...form, reps: Number(e.target.value)})} className="w-full text-2xl font-black border-b border-gray-200 focus:border-brand-green outline-none py-1" />
                             </div>
                             <div>
                                 <label className="text-[10px] font-bold text-gray-400 uppercase">休息 (秒)</label>
                                 <input type="number" value={form.restTime} onChange={e => setForm({...form, restTime: Number(e.target.value)})} className="w-full text-2xl font-black border-b border-gray-200 focus:border-brand-green outline-none py-1" />
                             </div>
                         </div>

                         <div>
                             <label className="text-[10px] font-bold text-gray-400 uppercase">筆記</label>
                             <textarea 
                                value={form.notes}
                                onChange={e => setForm({...form, notes: e.target.value})}
                                className="w-full bg-gray-50 rounded-xl p-3 text-sm font-bold border border-gray-200 h-20 outline-none focus:border-brand-green"
                                placeholder="感覺如何..."
                             />
                         </div>

                         <div className="flex gap-3 pt-2">
                             <button onClick={() => setStep('SELECT')} className="p-4 rounded-xl bg-gray-100 font-bold text-gray-500">重選</button>
                             <button onClick={handleConfirm} className="flex-1 bg-brand-green text-brand-black font-black rounded-xl p-4 shadow-lg active:scale-95 transition-transform">
                                 確認新增
                             </button>
                         </div>
                    </div>
                )}
            </div>
        </div>
    );
};
