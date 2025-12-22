
import React, { createContext, useState, useEffect, useContext } from 'react';
import { auth, db, isFirebaseInitialized } from '../firebaseConfig';
// Import only what is needed to avoid build warnings
import * as _firebaseAuth from 'firebase/auth';
import * as _firebaseFirestore from 'firebase/firestore';

// Destructure safely for environments where firebase module resolution is strict or broken
const { 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously
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
  weight: number; // kg（預設重量，可被每組覆寫）
  restTime: number; // seconds
  notes: string;
  // 進階：每組細節（對應表格中的每一列）
  setDetails?: {
    setIndex: number;
    weight: number;
    reps: number;
    done: boolean;
  }[];
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
  loginWithGoogle: () => Promise<void>;
  loginAsGuest: () => Promise<void>;
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
    let authStateResolved = false;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser: any) => {
        console.log('Auth state changed:', currentUser?.uid, currentUser?.email);
        
        // Mark auth as resolved immediately to show UI faster
        if (!authStateResolved) {
            authStateResolved = true;
            setState(prev => ({ ...prev, authLoading: false, user: currentUser || null }));
        }

        if (currentUser) {
            // User Logged In - Use the same UID across all devices
            const userDocRef = doc(db, "users", currentUser.uid);
            
            console.log('Loading user data for UID:', currentUser.uid, 'Email:', currentUser.email);
            
            // Set up real-time listener (non-blocking)
            unsubscribeFirestore = onSnapshot(userDocRef, (docSnap: any) => {
                if (docSnap.exists()) {
                    const userData = docSnap.data();
                    console.log('User data loaded from Firestore:', {
                        hasProfile: !!userData.profile,
                        hasGoals: !!userData.goals,
                        hasCompletedOnboarding: userData.hasCompletedOnboarding,
                        logsCount: userData.logs?.length || 0
                    });
                    
                    setState(prev => ({
                        ...prev,
                        user: currentUser,
                        authLoading: false,
                        hasCompletedOnboarding: userData.hasCompletedOnboarding || false,
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
                    console.log('User document does not exist yet, will be created on first login');
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
      
      // For guest users, update local state immediately
      if ((state.user as any).isAnonymous) {
          setState(prev => ({ ...prev, ...updates }));
      }
      
      // Try to save to Firestore (but don't fail if it doesn't work for guest users)
      try {
          const userDocRef = doc(db, "users", state.user.uid);
          await setDoc(userDocRef, updates, { merge: true });
      } catch (e) {
          // For guest users, this is expected - data is stored locally
          if (!(state.user as any).isAnonymous) {
              console.error("Error saving to Firestore:", e);
          }
      }
  };

  // --- Auth Actions ---
  
  const loginWithGoogle = async () => {
      if (!isFirebaseInitialized) throw new Error("Firebase configuration error");
      
      try {
          const provider = new GoogleAuthProvider();
          // Ensure we get the same account across devices
          provider.setCustomParameters({
              prompt: 'select_account'
          });
          
          const result = await signInWithPopup(auth, provider);
          const user = result.user;
          
          console.log('Google Sign-In successful:', {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName
          });
          
          // CRITICAL DATA SAFETY LOGIC: Check if document exists FIRST
          // The UID should be the same for the same Google account across all devices
          const userDocRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(userDocRef);
      
          // IF NOT Exists: Only then create the default profile (initialize data)
          if (!docSnap.exists()) {
              console.log('Creating new user document for:', user.uid);
              // Extract display name from Google account
              const displayName = user.displayName || user.email?.split('@')[0] || 'Joe';
              const avatar = user.photoURL || undefined;
              
              await setDoc(userDocRef, {
                  profile: { 
                      ...DEFAULT_PROFILE, 
                      displayName,
                      avatar
                  }, 
                  goals: DEFAULT_GOALS,
                  logs: [],
                  bodyLogs: [],
                  workoutLogs: [],
                  hasCompletedOnboarding: false,
                  trainingMode: 'rest'
              });
              
              console.log('User document created successfully');
          } else {
              console.log('User document already exists, loading existing data');
          }
          // IF Exists: Do nothing - data will be loaded by the onSnapshot listener
          // This ensures we NEVER overwrite existing user data
      } catch (error: any) {
          console.error("Google Sign-In Error:", error);
          throw error;
      }
  };

  const loginAsGuest = async () => {
      // Development mode: Create a mock user without Firebase authentication
      // This bypasses Firebase auth requirements for testing
      try {
          // Create a mock user object
          const mockUser = {
              uid: `guest_${Date.now()}`,
              email: 'guest@test.local',
              displayName: '訪客測試用戶',
              photoURL: null,
              isAnonymous: true
          };

          // Set state directly with guest user data
          setState({
              user: mockUser as any,
              authLoading: false,
              hasCompletedOnboarding: false,
              profile: { 
                  ...DEFAULT_PROFILE, 
                  displayName: '訪客測試用戶',
                  avatar: undefined
              }, 
              goals: DEFAULT_GOALS,
              trainingMode: 'rest',
              todayStats: DEFAULT_STATS,
              logs: [],
              bodyLogs: [],
              workoutLogs: [],
              isFirebaseReady: true
          });

          // Try to save to Firestore if available (but don't fail if it doesn't work)
          try {
              const userDocRef = doc(db, "users", mockUser.uid);
              await setDoc(userDocRef, {
                  profile: { 
                      ...DEFAULT_PROFILE, 
                      displayName: '訪客測試用戶',
                      avatar: undefined
                  }, 
                  goals: DEFAULT_GOALS,
                  logs: [],
                  bodyLogs: [],
                  workoutLogs: [],
                  hasCompletedOnboarding: false,
                  trainingMode: 'rest'
              }, { merge: true });
          } catch (firestoreError) {
              // If Firestore fails, continue anyway (local-only mode)
              console.warn("Guest mode: Firestore save failed, using local-only mode", firestoreError);
          }
      } catch (error: any) {
          console.error("Guest Sign-In Error:", error);
          throw error;
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
      loginWithGoogle, loginAsGuest, logout, 
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
