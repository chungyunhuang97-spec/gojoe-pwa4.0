
import React, { createContext, useState, useEffect, useContext } from 'react';
import { auth, googleProvider } from '../src/firebaseConfig';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';

// --- Types ---

export interface UserProfile {
  height: number; // cm
  weight: number; // kg
  age: number;
  gender: 'male' | 'female';
  activityLevel: number;
  goalType: 'lose_fat' | 'maintain' | 'build_muscle' | 'recomp';
  avatar?: string; 
}

export interface BudgetBreakdown {
  breakfast: number;
  lunch: number;
  dinner: number;
  snack: number;
}

export interface UserBudget {
  daily: number;
  breakdown: BudgetBreakdown;
}

export interface UserGoals {
  targetCalories: number;
  targetProtein: number; // g
  targetCarbs: number;   // g
  targetFat: number;     // g
  budget: UserBudget; 
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type TrainingMode = 'rest' | 'push_pull' | 'leg';

export interface LogEntry {
  id: string;
  foodName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  price: number;
  mealType: MealType;
  timestamp: number;
}

export interface BodyLogEntry {
  id: string;
  imageUrl: string;
  weight?: number;
  timestamp: number;
}

// --- NEW WORKOUT TYPES ---
export interface WorkoutExercise {
  id: string;
  name: string;
  equipmentType: string;
  targetMuscles: string[];
  sets: number;
  reps: number;
  weight: number; // kg
  restTime: number; // seconds
  notes: string;
  timestamp: number;
}

export interface WorkoutLog {
  id: string;
  date: string; // ISO Date String YYYY-MM-DD
  bodyParts: string[]; // e.g. ['chest', 'triceps']
  duration: number; // minutes
  exercises: WorkoutExercise[];
  timestamp: number;
}

export interface DailyStats {
  consumedCalories: number;
  consumedProtein: number;
  consumedCarbs: number;
  consumedFat: number;
  spentBudget: number;
}

export interface UserState {
  user: User | null; // Firebase Auth User
  authLoading: boolean;
  hasCompletedOnboarding: boolean;
  profile: UserProfile;
  goals: UserGoals;
  trainingMode: TrainingMode;
  todayStats: DailyStats;
  logs: LogEntry[];
  bodyLogs: BodyLogEntry[];
  workoutLogs: WorkoutLog[]; // Added
}

export interface UserContextType extends UserState {
  login: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (profile: Partial<UserProfile>) => void;
  updateGoals: (goals: Partial<UserGoals>) => void;
  setTrainingMode: (mode: TrainingMode) => void;
  addLog: (log: Omit<LogEntry, 'id' | 'timestamp'>) => void;
  updateLog: (updatedLog: LogEntry) => void;
  deleteLog: (id: string) => void;
  addBodyLog: (log: Omit<BodyLogEntry, 'id' | 'timestamp'>) => void;
  deleteBodyLog: (id: string) => void;
  // Workout Methods
  addWorkoutLog: (log: Omit<WorkoutLog, 'id' | 'timestamp'>) => void;
  updateWorkoutLog: (id: string, log: Partial<WorkoutLog>) => void;
  deleteWorkoutLog: (id: string) => void;
  getWorkoutLogByDate: (date: string) => WorkoutLog | undefined;
  
  completeOnboarding: () => void;
  resetData: () => void;
  recalculateTargets: (newProfile: UserProfile, mode?: TrainingMode) => void;
}

// --- Defaults ---

const DEFAULT_PROFILE: UserProfile = {
  height: 175,
  weight: 70,
  age: 25,
  gender: 'male',
  activityLevel: 1.55, 
  goalType: 'recomp',
};

const DEFAULT_GOALS: UserGoals = {
  targetCalories: 2500,
  targetProtein: 175,
  targetCarbs: 313,
  targetFat: 62,
  budget: {
    daily: 300,
    breakdown: {
      breakfast: 60,
      lunch: 105,
      dinner: 105,
      snack: 30
    }
  },
};

const DEFAULT_STATS: DailyStats = {
  consumedCalories: 0,
  consumedProtein: 0,
  consumedCarbs: 0,
  consumedFat: 0,
  spentBudget: 0,
};

const DEFAULT_STATE: UserState = {
  user: null,
  authLoading: true,
  hasCompletedOnboarding: false,
  profile: DEFAULT_PROFILE,
  goals: DEFAULT_GOALS,
  trainingMode: 'rest',
  todayStats: DEFAULT_STATS,
  logs: [],
  bodyLogs: [],
  workoutLogs: [],
};

// --- Context ---

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<UserState>(DEFAULT_STATE);

  // 1. Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        if (currentUser) {
            // User logged in, try to load data from localStorage key specific to user
            const saved = localStorage.getItem(`gojoe-user-${currentUser.uid}`);
            const userData = saved ? JSON.parse(saved) : {};
            
            setState(prev => ({
                ...prev,
                user: currentUser,
                authLoading: false,
                ...userData, // Load saved preferences
                // Ensure defaults if first time or missing fields
                profile: userData.profile || DEFAULT_PROFILE,
                goals: userData.goals || DEFAULT_GOALS,
                workoutLogs: userData.workoutLogs || [],
            }));
        } else {
            // User logged out
            setState(prev => ({ ...DEFAULT_STATE, authLoading: false }));
        }
    });
    return () => unsubscribe();
  }, []);

  // 2. Persist Data (Only when user is logged in)
  useEffect(() => {
    if (state.user && !state.authLoading) {
        const dataToSave = {
            hasCompletedOnboarding: state.hasCompletedOnboarding,
            profile: state.profile,
            goals: state.goals,
            trainingMode: state.trainingMode,
            logs: state.logs,
            bodyLogs: state.bodyLogs,
            workoutLogs: state.workoutLogs
        };
        localStorage.setItem(`gojoe-user-${state.user.uid}`, JSON.stringify(dataToSave));
    }
  }, [state.user, state.hasCompletedOnboarding, state.profile, state.goals, state.trainingMode, state.logs, state.bodyLogs, state.workoutLogs, state.authLoading]);

  // Auth Actions
  const login = async () => {
      try {
          await signInWithPopup(auth, googleProvider);
      } catch (error: any) {
          console.error("Login failed:", error);
          let errorMessage = "登入失敗，請重試";
          if (error.code === 'auth/popup-closed-by-user') errorMessage = "您關閉了登入視窗";
          else if (error.code === 'auth/unauthorized-domain') errorMessage = "網域未授權";
          alert(errorMessage);
      }
  };

  const logout = async () => {
      await signOut(auth);
      setState(DEFAULT_STATE);
  };

  // Helper to recalculate todayStats
  const calculateTodayStats = (logs: LogEntry[]): DailyStats => {
    const today = new Date();
    const todayLogs = logs.filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate.getDate() === today.getDate() &&
             logDate.getMonth() === today.getMonth() &&
             logDate.getFullYear() === today.getFullYear();
    });

    return todayLogs.reduce((acc, log) => ({
      consumedCalories: acc.consumedCalories + log.calories,
      consumedProtein: acc.consumedProtein + log.protein,
      consumedCarbs: acc.consumedCarbs + log.carbs,
      consumedFat: acc.consumedFat + log.fat,
      spentBudget: acc.spentBudget + log.price,
    }), { ...DEFAULT_STATS });
  };

  const updateProfile = (updates: Partial<UserProfile>) => {
    setState((prev) => ({
      ...prev,
      profile: { ...prev.profile, ...updates },
    }));
  };

  const updateGoals = (updates: Partial<UserGoals>) => {
    setState((prev) => ({
      ...prev,
      goals: { ...prev.goals, ...updates },
    }));
  };

  const addLog = (logData: Omit<LogEntry, 'id' | 'timestamp'>) => {
    const newLog: LogEntry = {
      ...logData,
      id: Date.now().toString(),
      timestamp: Date.now(),
    };
    setState((prev) => {
      const updatedLogs = [...prev.logs, newLog];
      return {
        ...prev,
        logs: updatedLogs,
        todayStats: calculateTodayStats(updatedLogs),
      };
    });
  };

  const updateLog = (updatedLog: LogEntry) => {
    setState((prev) => {
      const updatedLogs = prev.logs.map(log => log.id === updatedLog.id ? updatedLog : log);
      return {
        ...prev,
        logs: updatedLogs,
        todayStats: calculateTodayStats(updatedLogs),
      };
    });
  };

  const deleteLog = (id: string) => {
    setState((prev) => {
      const updatedLogs = prev.logs.filter(log => log.id !== id);
      return {
        ...prev,
        logs: updatedLogs,
        todayStats: calculateTodayStats(updatedLogs),
      };
    });
  };

  const addBodyLog = (logData: Omit<BodyLogEntry, 'id' | 'timestamp'>) => {
    const newLog: BodyLogEntry = {
      ...logData,
      id: Date.now().toString(),
      timestamp: Date.now(),
    };

    setState((prev) => ({
      ...prev,
      bodyLogs: [...(prev.bodyLogs || []), newLog],
      profile: logData.weight 
        ? { ...prev.profile, weight: logData.weight } 
        : prev.profile
    }));
  };

  const deleteBodyLog = (id: string) => {
    setState((prev) => ({
      ...prev,
      bodyLogs: prev.bodyLogs.filter(log => log.id !== id),
    }));
  };

  // --- WORKOUT METHODS ---
  const addWorkoutLog = (logData: Omit<WorkoutLog, 'id' | 'timestamp'>) => {
    const newLog: WorkoutLog = {
      ...logData,
      id: Date.now().toString(),
      timestamp: Date.now(),
    };
    setState(prev => ({
      ...prev,
      workoutLogs: [...prev.workoutLogs, newLog]
    }));
  };

  const updateWorkoutLog = (id: string, updates: Partial<WorkoutLog>) => {
    setState(prev => ({
      ...prev,
      workoutLogs: prev.workoutLogs.map(log => log.id === id ? { ...log, ...updates } : log)
    }));
  };

  const deleteWorkoutLog = (id: string) => {
    setState(prev => ({
      ...prev,
      workoutLogs: prev.workoutLogs.filter(log => log.id !== id)
    }));
  };

  const getWorkoutLogByDate = (date: string) => {
    return state.workoutLogs.find(log => log.date === date);
  };

  const completeOnboarding = () => {
    setState((prev) => ({
      ...prev,
      hasCompletedOnboarding: true,
      todayStats: DEFAULT_STATS,
      logs: [],
      bodyLogs: [],
      workoutLogs: []
    }));
  };

  const resetData = () => {
    setState(prev => ({
        ...DEFAULT_STATE,
        user: prev.user,
        authLoading: false
    }));
    if (state.user) {
        localStorage.removeItem(`gojoe-user-${state.user.uid}`);
    }
  };

  const recalculateTargets = (newProfile: UserProfile, mode: TrainingMode = 'rest') => {
      let bmr = (10 * newProfile.weight) + (6.25 * newProfile.height) - (5 * newProfile.age);
      bmr += newProfile.gender === 'male' ? 5 : -161;
      const tdee = Math.round(bmr * newProfile.activityLevel);
      
      let multiplier = 1.0, pRatio = 0.30, fRatio = 0.30, cRatio = 0.40;
      switch(newProfile.goalType) {
          case 'lose_fat': multiplier = 0.80; pRatio = 0.35; fRatio = 0.30; cRatio = 0.35; break;
          case 'build_muscle': multiplier = 1.10; pRatio = 0.25; fRatio = 0.25; cRatio = 0.50; break;
          case 'recomp': multiplier = 0.96; pRatio = 0.28; fRatio = 0.22; cRatio = 0.50; break;
          default: multiplier = 1.0; break;
      }

      let targetCalories = Math.round(tdee * multiplier);
      let targetProtein = Math.round((targetCalories * pRatio) / 4);
      let targetFat = Math.round((targetCalories * fRatio) / 9);
      let targetCarbs = Math.round((targetCalories * cRatio) / 4);

      if (mode === 'leg') {
          targetCalories += 300;
          targetCarbs += 60;
          targetFat = Math.max(30, targetFat - 10);
      } 

      updateGoals({ targetCalories, targetProtein, targetFat, targetCarbs });
  };

  const setTrainingMode = (mode: TrainingMode) => {
      setState(prev => ({ ...prev, trainingMode: mode }));
      recalculateTargets(state.profile, mode);
  };

  return (
    <UserContext.Provider value={{ 
      ...state, 
      login, logout, updateProfile, updateGoals, 
      addLog, updateLog, deleteLog, 
      addBodyLog, deleteBodyLog,
      addWorkoutLog, updateWorkoutLog, deleteWorkoutLog, getWorkoutLogByDate,
      completeOnboarding, resetData, recalculateTargets, setTrainingMode 
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
