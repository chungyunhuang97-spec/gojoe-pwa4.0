import React, { useEffect, useState } from 'react';
import { useUser, WorkoutLog, WorkoutExercise } from '../context/UserContext';
import { Dumbbell, Plus, Check, Trash2 } from 'lucide-react';
import { BodyPartKey, EXERCISE_LIBRARY, ExerciseDef, WORKOUT_TEMPLATES } from '../data/exerciseLibrary';

type ViewMode = 'templates' | 'active';

const todayKey = () => new Date().toISOString().split('T')[0];

export const Training: React.FC = () => {
  const { workoutLogs, addWorkoutLog, updateWorkoutLog } = useUser();

  const [mode, setMode] = useState<ViewMode>('templates');
  const [activeLog, setActiveLog] = useState<WorkoutLog | null>(null);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [libraryFilter, setLibraryFilter] = useState<BodyPartKey | 'all'>('all');

  useEffect(() => {
    const existing = workoutLogs.find(l => l.date === todayKey());
    if (existing) {
      setActiveLog(existing);
      setMode('active');
    }
  }, [workoutLogs]);

  const ensureLog = (): WorkoutLog => {
    if (activeLog) return activeLog;
    const draft: WorkoutLog = {
      id: 'temp',
      date: todayKey(),
      bodyParts: [],
      duration: 60,
      exercises: [],
      timestamp: Date.now(),
    };
    setActiveLog(draft);
    return draft;
  };

  const persistIfTemp = (log: WorkoutLog): WorkoutLog => {
    if (log.id !== 'temp') return log;
    const realId = Date.now().toString();
    const saved: WorkoutLog = { ...log, id: realId };
    addWorkoutLog(saved);
    setActiveLog(saved);
    return saved;
  };

  const startWithTemplate = (templateId: string) => {
    const tpl = WORKOUT_TEMPLATES.find(t => t.id === templateId);
    if (!tpl) return;

    const exercises: WorkoutExercise[] = tpl.exercises.map((tEx, idx) => {
      const def = EXERCISE_LIBRARY.find(e => e.id === tEx.exerciseId)!;
      const baseWeight = def.equipmentType === 'bodyweight' ? 0 : 20;
      const setDetails = Array.from({ length: tEx.defaultSets }).map((_, i) => ({
        setIndex: i + 1,
        weight: baseWeight,
        reps: tEx.defaultReps,
        done: false,
      }));
      return {
        id: `${Date.now()}_${idx}`,
        name: def.name,
        equipmentType: def.equipmentType,
        targetMuscles: def.targetMuscles,
        sets: tEx.defaultSets,
        reps: tEx.defaultReps,
        weight: baseWeight,
        restTime: 60,
        notes: '',
        setDetails,
        timestamp: Date.now(),
      };
    });

    const draft: WorkoutLog = {
      id: 'temp',
      date: todayKey(),
      bodyParts: tpl.bodyParts,
      duration: 60,
      exercises,
      timestamp: Date.now(),
    };
    setActiveLog(draft);
    setMode('active');
  };

  const startEmptyWorkout = () => {
    const draft: WorkoutLog = {
      id: 'temp',
      date: todayKey(),
      bodyParts: [],
      duration: 60,
      exercises: [],
      timestamp: Date.now(),
    };
    setActiveLog(draft);
    setMode('active');
  };

  const saveExercise = (ex: WorkoutExercise) => {
    let log = ensureLog();
    log = persistIfTemp(log);
    const exercises = [...(log.exercises || []), ex];
    updateWorkoutLog(log.id, { exercises });
    setActiveLog({ ...log, exercises });
  };

  const updateSetDetail = (exId: string, setIndex: number, field: 'weight' | 'reps' | 'done', value: number | boolean) => {
    if (!activeLog) return;
    const log = persistIfTemp(activeLog);
    const exercises = (log.exercises || []).map(ex => {
      if (ex.id !== exId) return ex;
      const details = ex.setDetails || [];
      const updatedDetails = details.map(s => (s.setIndex === setIndex ? { ...s, [field]: value } : s));
      return { ...ex, setDetails: updatedDetails };
    });
    updateWorkoutLog(log.id, { exercises });
    setActiveLog({ ...log, exercises });
  };

  const addSet = (exId: string) => {
    if (!activeLog) return;
    const log = persistIfTemp(activeLog);
    const exercises = (log.exercises || []).map(ex => {
      if (ex.id !== exId) return ex;
      const details = ex.setDetails || [];
      const last = details[details.length - 1];
      const nextIndex = details.length + 1;
      const newDetail = {
        setIndex: nextIndex,
        weight: last ? last.weight : ex.weight,
        reps: last ? last.reps : ex.reps,
        done: false,
      };
      const newDetails = [...details, newDetail];
      return { ...ex, sets: newDetails.length, setDetails: newDetails };
    });
    updateWorkoutLog(log.id, { exercises });
    setActiveLog({ ...log, exercises });
  };

  const removeSet = (exId: string, setIndex: number) => {
    if (!activeLog) return;
    const log = persistIfTemp(activeLog);
    const exercises = (log.exercises || []).map(ex => {
      if (ex.id !== exId) return ex;
      const details = (ex.setDetails || [])
        .filter(s => s.setIndex !== setIndex)
        .map((s, idx) => ({ ...s, setIndex: idx + 1 }));
      return { ...ex, sets: details.length, setDetails: details };
    });
    updateWorkoutLog(log.id, { exercises });
    setActiveLog({ ...log, exercises });
  };

  const deleteExercise = (exId: string) => {
    if (!activeLog) return;
    const log = persistIfTemp(activeLog);
    const exercises = (log.exercises || []).filter(ex => ex.id !== exId);
    updateWorkoutLog(log.id, { exercises });
    setActiveLog({ ...log, exercises });
  };

  const getPreviousSetText = (exerciseName: string, setIndex: number): string => {
    const today = todayKey();
    const pastLogs = workoutLogs
      .filter(l => l.date < today)
      .sort((a, b) => (a.date < b.date ? 1 : -1));
    for (const log of pastLogs) {
      const ex = (log.exercises || []).find(e => e.name === exerciseName);
      if (ex && ex.setDetails && ex.setDetails.length >= setIndex) {
        const s = ex.setDetails[setIndex - 1];
        return `${s.weight}kg × ${s.reps}`;
      }
    }
    return '-';
  };

  const bodyPartTabs: { key: BodyPartKey | 'all'; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'chest', label: '胸' },
    { key: 'back', label: '背' },
    { key: 'legs', label: '腿' },
    { key: 'shoulders', label: '肩' },
    { key: 'arms', label: '手臂' },
    { key: 'core', label: '核心' },
  ];

  const renderTemplates = () => (
    <div className="h-full flex flex-col bg-[#18181C] pb-6">
      <div className="px-4 pt-5 pb-3 flex items-center justify-between">
        <span className="text-sm font-bold text-gray-400">個人模板</span>
      </div>
      <div className="px-4 mb-4">
        <button
          onClick={startEmptyWorkout}
          className="w-full py-3 rounded-2xl bg-brand-green text-brand-black font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          <Plus size={16} /> 從空白開始訓練
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 space-y-4">
        <div className="grid grid-cols-1 gap-3">
          {WORKOUT_TEMPLATES.map(tpl => {
            const names = tpl.exercises
              .map(e => EXERCISE_LIBRARY.find(d => d.id === e.exerciseId)?.name?.split('(')[0]?.trim())
              .filter(Boolean)
              .join('，');
            return (
              <button
                key={tpl.id}
                onClick={() => startWithTemplate(tpl.id)}
                className="bg-[#26262C] rounded-3xl p-4 text-left active:scale-95 transition-transform"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-white">{tpl.name}</span>
                  <Dumbbell className="text-brand-green" size={18} />
                </div>
                <p className="text-[11px] text-gray-300 leading-5 line-clamp-3">{names}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderActive = () => (
    <div className="h-full flex flex-col bg-gray-50 pb-20">
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <button
          onClick={() => setMode('templates')}
          className="text-xs font-bold text-brand-green"
        >
          ← 返回模板
        </button>
        <span className="text-[11px] text-gray-400">{todayKey()}</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 space-y-4 pb-6">
        {activeLog && activeLog.exercises.length > 0 ? (
          activeLog.exercises.map(ex => (
            <div key={ex.id} className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-bold text-gray-900">{ex.name}</h4>
                  <span className="text-[10px] text-gray-400 font-bold bg-gray-50 px-1.5 rounded uppercase">
                    {ex.equipmentType}
                  </span>
                </div>
                <button
                  onClick={() => deleteExercise(ex.id)}
                  className="text-gray-300 hover:text-red-500 p-1"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="w-full overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="text-gray-400">
                      <th className="pb-2 text-left w-10">組</th>
                      <th className="pb-2 text-left">前次</th>
                      <th className="pb-2 text-right w-16">重量</th>
                      <th className="pb-2 text-right w-16">次數</th>
                      <th className="pb-2 text-center w-16">完成</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(ex.setDetails || []).map(set => (
                      <tr key={set.setIndex} className="border-t border-gray-100">
                        <td className="py-2 font-bold text-gray-600">{set.setIndex}</td>
                        <td className="py-2 text-gray-400">
                          {getPreviousSetText(ex.name, set.setIndex)}
                        </td>
                        <td className="py-2 text-right">
                          <input
                            type="number"
                            className="w-14 bg-gray-50 border border-gray-200 rounded-lg px-1 py-1 text-right font-bold text-gray-800"
                            value={set.weight}
                            onChange={e =>
                              updateSetDetail(ex.id, set.setIndex, 'weight', Number(e.target.value))
                            }
                          />
                        </td>
                        <td className="py-2 text-right">
                          <input
                            type="number"
                            className="w-14 bg-gray-50 border border-gray-200 rounded-lg px-1 py-1 text-right font-bold text-gray-800"
                            value={set.reps}
                            onChange={e =>
                              updateSetDetail(ex.id, set.setIndex, 'reps', Number(e.target.value))
                            }
                          />
                        </td>
                        <td className="py-2 text-center">
                          <button
                            onClick={() =>
                              updateSetDetail(ex.id, set.setIndex, 'done', !set.done)
                            }
                            className={`w-6 h-6 rounded-full border flex items-center justify-center ${
                              set.done
                                ? 'bg-brand-green border-brand-green text-brand-black'
                                : 'border-gray-300 text-gray-300'
                            }`}
                          >
                            <Check size={14} />
                          </button>
                          {ex.setDetails && ex.setDetails.length > 1 && (
                            <button
                              onClick={() => removeSet(ex.id, set.setIndex)}
                              className="block mx-auto mt-1 text-[10px] text-gray-300"
                            >
                              刪除
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                onClick={() => addSet(ex.id)}
                className="mt-3 text-xs font-bold text-brand-green bg-brand-black px-3 py-1.5 rounded-full active:scale-95 transition-transform"
              >
                新增一組
              </button>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-10 text-center">
            <Dumbbell className="mx-auto mb-2 text-gray-300" size={32} />
            <p className="text-xs font-bold text-gray-400">還沒有動作，從模板或動作庫開始吧</p>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full sm:max-w-[420px] px-4 pb-6 pt-3 bg-gradient-to-t from-white via-white/90 to-transparent">
        <button
          onClick={() => setIsLibraryOpen(true)}
          className="w-full py-3 rounded-2xl bg-brand-black text-brand-green font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          <Plus size={16} /> 新增動作
        </button>
      </div>

      {isLibraryOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end justify-center p-0 sm:p-4">
          <div className="bg-[#18181C] w-full sm:max-w-md h-[90vh] sm:h-[80vh] sm:rounded-[2.5rem] rounded-t-[2.5rem] p-6 flex flex-col relative text-white">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setIsLibraryOpen(false)} className="text-sm font-bold text-brand-green">
                返回
              </button>
              <span className="text-sm font-black">動作庫</span>
              <div className="w-10" />
            </div>

            <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
              {bodyPartTabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setLibraryFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                    libraryFilter === tab.key ? 'bg-brand-green text-black' : 'bg-[#28282F] text-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-3">
              {(libraryFilter === 'all'
                ? EXERCISE_LIBRARY
                : EXERCISE_LIBRARY.filter(e => e.bodyPart === libraryFilter)
              ).map(ex => (
                <button
                  key={ex.id}
                  onClick={() => {
                    const baseWeight = ex.equipmentType === 'bodyweight' ? 0 : 20;
                    const setDetails = Array.from({ length: 3 }).map((_, i) => ({
                      setIndex: i + 1,
                      weight: baseWeight,
                      reps: 10,
                      done: false,
                    }));
                    saveExercise({
                      id: Date.now().toString(),
                      name: ex.name,
                      equipmentType: ex.equipmentType,
                      targetMuscles: ex.targetMuscles,
                      sets: setDetails.length,
                      reps: 10,
                      weight: baseWeight,
                      restTime: 60,
                      notes: '',
                      setDetails,
                      timestamp: Date.now(),
                    });
                    setIsLibraryOpen(false);
                  }}
                  className="bg-[#26262C] rounded-2xl p-3 text-left active:scale-95 transition-transform"
                >
                  <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center mb-2">
                    <Dumbbell className="text-brand-green" size={18} />
                  </div>
                  <p className="text-[11px] font-bold leading-5">{ex.name}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};









