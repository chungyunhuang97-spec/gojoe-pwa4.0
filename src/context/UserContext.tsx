
import React, { createContext, useState, useEffect, useContext } from 'react';
import { auth, db, isFirebaseInitialized } from '../firebaseConfig';
// Import only what is needed to avoid build warnings
import * as _firebaseAuth from 'firebase/auth';
import * as _firebaseFirestore from 'firebase/firestore';

// Destructure safely for environments where firebase module resolution is strict or broken
const { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} = _firebaseAuth as any;

const { 
  doc, 
  setDoc, 
  onSnapshot,
  getDoc 
} = _firebaseFirestore as any;

// Use fallback type for User to avoid import errors
type User = any;

// --- Types ---

export interface UserProfile {
  displayName: string; 
  height: number; // cm
  weight: number; // kg
  age: number;
  gender: 'male' | 'female';
  activityLevel: number;
  goalType: 'lose_fat' | 'maintain' | 'build_muscle' | 'recomp';
  coachMode: 'strict' | 'encouraging';
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
  user: User | null; 
  authLoading: boolean;
  hasCompletedOnboarding: boolean;
  profile: UserProfile;
  goals: UserGoals;
  trainingMode: TrainingMode;
  todayStats: DailyStats;
  logs: LogEntry[];
  bodyLogs: BodyLogEntry[];
  workoutLogs: WorkoutLog[];
  isFirebaseReady: boolean;
}

export interface UserContextType extends UserState {
  login: (email: string, pass: string, rememberMe: boolean) => Promise<void>;
  signup: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (profile: Partial<UserProfile>) => void;
  updateGoals: (goals: Partial<UserGoals>) => void;
  setTrainingMode: (mode: TrainingMode) => void;
  addLog: (log: Omit<LogEntry, 'id' | 'timestamp'>) => void;
  updateLog: (updatedLog: LogEntry) => void;
  deleteLog: (id: string) => void;
  addBodyLog: (log: Omit<BodyLogEntry, 'id' | 'timestamp'>) => void;
  deleteBodyLog: (id: string) => void;
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
  displayName: 'Joe',
  height: 175,
  weight: 70,
  age: 25,
  gender: 'male',
  activityLevel: 1.55, 
  goalType: 'recomp',
  coachMode: 'encouraging'
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
  isFirebaseReady: false,
};

// --- Helper to calculate stats ---
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

// --- Context ---

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<UserState>({ 
      ...DEFAULT_STATE, 
      isFirebaseReady: isFirebaseInitialized 
  });

  // 1. Auth & Data Listener
  useEffect(() => {
    if (!isFirebaseInitialized) {
        setState(prev => ({ ...prev, authLoading: false }));
        return;
    }

    let unsubscribeFirestore: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser: any) => {
        if (currentUser) {
            // User Logged In
            const userDocRef = doc(db, "users", currentUser.uid);
            
            // Set up real-time listener
            unsubscribeFirestore = onSnapshot(userDocRef, (docSnap: any) => {
                if (docSnap.exists()) {
                    const userData = docSnap.data();
                    setState(prev => ({
                        ...prev,
                        user: currentUser,
                        authLoading: false,
                        ...userData,
                        // Merge profile carefully to keep defaults and new fields
                        profile: { ...DEFAULT_PROFILE, ...(userData.profile || {}) },
                        goals: userData.goals || DEFAULT_GOALS,
                        logs: userData.logs || [],
                        bodyLogs: userData.bodyLogs || [],
                        workoutLogs: userData.workoutLogs || [],
                        todayStats: calculateTodayStats(userData.logs || [])
                    }));
                } else {
                    // Document doesn't exist (yet), waiting for creation by signup/init
                    setState(prev => ({ ...prev, user: currentUser, authLoading: false }));
                }
            }, (error: any) => {
                console.error("Firestore Listen Error:", error);
                setState(prev => ({ ...prev, user: currentUser, authLoading: false }));
            });

        } else {
            // User Logged Out
            if (unsubscribeFirestore) unsubscribeFirestore();
            setState(prev => ({ ...DEFAULT_STATE, authLoading: false, isFirebaseReady: isFirebaseInitialized }));
        }
    });

    return () => {
        unsubscribeAuth();
        if (unsubscribeFirestore) unsubscribeFirestore();
    };
  }, []);

  // --- Unified Data Saving ---
  const saveData = async (updates: Partial<UserState>) => {
      if (!state.user) return;
      try {
          const userDocRef = doc(db, "users", state.user.uid);
          await setDoc(userDocRef, updates, { merge: true });
      } catch (e) {
          console.error("Error saving to Firestore:", e);
      }
  };

  // --- Auth Actions ---
  
  const login = async (email: string, pass: string, rememberMe: boolean) => {
      if (!isFirebaseInitialized) throw new Error("Firebase configuration error");
      
      try {
        const mode = rememberMe ? browserLocalPersistence : browserSessionPersistence;
        await setPersistence(auth, mode);
      } catch (e) {
        console.warn("Persistence setting failed, proceeding with default session:", e);
      }
      
      await signInWithEmailAndPassword(auth, email, pass);
  };

  const signup = async (email: string, pass: string) => {
      if (!isFirebaseInitialized) throw new Error("Firebase configuration error");
      
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      
      const userDocRef = doc(db, "users", cred.user.uid);
      const docSnap = await getDoc(userDocRef);
      
      if (!docSnap.exists()) {
          await setDoc(userDocRef, {
              profile: { ...DEFAULT_PROFILE, displayName: email.split('@')[0] }, 
              goals: DEFAULT_GOALS,
              logs: [],
              bodyLogs: [],
              workoutLogs: [],
              hasCompletedOnboarding: false,
              trainingMode: 'rest'
          });
      }
  };

  const logout = async () => {
      await signOut(auth);
  };

  // --- Data Actions ---

  const updateProfile = (updates: Partial<UserProfile>) => {
    const newProfile = { ...state.profile, ...updates };
    saveData({ profile: newProfile });
  };

  const updateGoals = (updates: Partial<UserGoals>) => {
    const newGoals = { ...state.goals, ...updates };
    saveData({ goals: newGoals });
  };

  const addLog = (logData: Omit<LogEntry, 'id' | 'timestamp'>) => {
    const newLog: LogEntry = {
      ...logData,
      id: Date.now().toString(),
      timestamp: Date.now(),
    };
    const newLogs = [...state.logs, newLog];
    saveData({ logs: newLogs });
  };

  const updateLog = (updatedLog: LogEntry) => {
    const newLogs = state.logs.map(log => log.id === updatedLog.id ? updatedLog : log);
    saveData({ logs: newLogs });
  };

  const deleteLog = (id: string) => {
    const newLogs = state.logs.filter(log => log.id !== id);
    saveData({ logs: newLogs });
  };

  const addBodyLog = (logData: Omit<BodyLogEntry, 'id' | 'timestamp'>) => {
    const newLog: BodyLogEntry = {
      ...logData,
      id: Date.now().toString(),
      timestamp: Date.now(),
    };
    const newBodyLogs = [...state.bodyLogs, newLog];
    const newProfile = logData.weight 
        ? { ...state.profile, weight: logData.weight } 
        : state.profile;
        
    saveData({ bodyLogs: newBodyLogs, profile: newProfile });
  };

  const deleteBodyLog = (id: string) => {
    const newBodyLogs = state.bodyLogs.filter(log => log.id !== id);
    saveData({ bodyLogs: newBodyLogs });
  };

  const addWorkoutLog = (logData: Omit<WorkoutLog, 'id' | 'timestamp'>) => {
    const newLog: WorkoutLog = {
      ...logData,
      id: Date.now().toString(),
      timestamp: Date.now(),
    };
    saveData({ workoutLogs: [...state.workoutLogs, newLog] });
  };

  const updateWorkoutLog = (id: string, updates: Partial<WorkoutLog>) => {
    const newLogs = state.workoutLogs.map(log => log.id === id ? { ...log, ...updates } : log);
    saveData({ workoutLogs: newLogs });
  };

  const deleteWorkoutLog = (id: string) => {
    const newLogs = state.workoutLogs.filter(log => log.id !== id);
    saveData({ workoutLogs: newLogs });
  };

  const getWorkoutLogByDate = (date: string) => {
    return state.workoutLogs.find(log => log.date === date);
  };

  const completeOnboarding = () => {
    saveData({ hasCompletedOnboarding: true });
  };

  const resetData = () => {
      saveData({
          hasCompletedOnboarding: false,
          logs: [],
          bodyLogs: [],
          workoutLogs: [],
          todayStats: DEFAULT_STATS
      });
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
      saveData({ trainingMode: mode });
      recalculateTargets(state.profile, mode);
  };

  return (
    <UserContext.Provider value={{ 
      ...state, 
      login, signup, logout, 
      updateProfile, updateGoals, 
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
