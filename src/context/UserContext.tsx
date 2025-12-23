
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
  updateDoc,
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
  updateProfile: (profile: Partial<UserProfile>) => Promise<void>;
  updateGoals: (goals: Partial<UserGoals>) => Promise<void>;
  setTrainingMode: (mode: TrainingMode) => Promise<void>;
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
  recalculateTargets: (newProfile: UserProfile, mode?: TrainingMode) => Promise<void>;
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
                    
                    // 确保 hasCompletedOnboarding 正确加载
                    const completedOnboarding = userData.hasCompletedOnboarding === true;
                    
                    // 合并数据：使用 Firestore 中的数据（这是最新的真实数据）
                    setState(prev => ({
                        ...prev,
                        user: currentUser,
                        authLoading: false,
                        hasCompletedOnboarding: completedOnboarding,
                        // 使用 Firestore 中的数据，确保 profile 字段完整
                        profile: userData.profile ? { ...DEFAULT_PROFILE, ...userData.profile } : prev.profile,
                        goals: userData.goals || prev.goals || DEFAULT_GOALS,
                        logs: userData.logs || prev.logs || [],
                        bodyLogs: userData.bodyLogs || prev.bodyLogs || [],
                        workoutLogs: userData.workoutLogs || prev.workoutLogs || [],
                        todayStats: calculateTodayStats(userData.logs || prev.logs || [])
                    }));
                    
                    console.log('✅ User data loaded - hasCompletedOnboarding:', completedOnboarding);
                } else {
                    // Document doesn't exist (yet), waiting for creation by signup/init
                    console.log('User document does not exist yet, will be created on first login');
                    // 新用户，hasCompletedOnboarding 应该是 false
                    setState(prev => ({ 
                        ...prev, 
                        user: currentUser, 
                        authLoading: false,
                        hasCompletedOnboarding: false  // 明确设置为 false，表示需要完成 onboarding
                    }));
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
  // 确保所有数据都保存到 Firestore，包括访客用户
  const saveData = async (updates: Partial<UserState>) => {
      if (!state.user) {
          console.warn("Cannot save data: No user logged in");
          return;
      }
      
      // 先更新本地状态（立即反馈）
      const newState = { ...state, ...updates };
      // 确保 profile 字段完整合并（如果 updates 中有 profile）
      if (updates.profile) {
          newState.profile = { ...state.profile, ...updates.profile };
      }
      setState(newState);
      
      // 检查是否是使用 localStorage 的访客用户（fallback 方案）
      const isLocalStorageGuest = (state.user as any).isAnonymous && 
                                  state.user.uid.startsWith('guest_') && 
                                  !state.user.uid.includes('firebase');
      
      if (isLocalStorageGuest) {
          // 使用 localStorage 保存（fallback 方案）
          const guestUid = state.user.uid;
          const dataToSave = {
              profile: newState.profile,
              goals: newState.goals,
              logs: newState.logs,
              bodyLogs: newState.bodyLogs,
              workoutLogs: newState.workoutLogs,
              hasCompletedOnboarding: newState.hasCompletedOnboarding,
              trainingMode: newState.trainingMode
          };
          try {
              localStorage.setItem(`guest_data_${guestUid}`, JSON.stringify(dataToSave));
              console.log('Data saved to localStorage for guest user');
          } catch (e) {
              console.error("Failed to save to localStorage:", e);
          }
          return;
      }
      
      // 保存到 Firestore（正常用户和 Firebase 匿名用户）
      try {
          const userDocRef = doc(db, "users", state.user.uid);
          
          // 合并当前状态和更新，确保数据完整
          // 重要：如果 updates 中有 profile，使用 updates.profile；否则保留现有的 profile
          const dataToSave: any = {};
          
          // 明确处理每个字段，优先使用 updates 中的值
          if (updates.profile !== undefined) {
              dataToSave.profile = updates.profile;
          } else {
              dataToSave.profile = newState.profile;
          }
          
          if (updates.goals !== undefined) {
              dataToSave.goals = updates.goals;
          } else {
              dataToSave.goals = newState.goals;
          }
          
          if (updates.logs !== undefined) {
              dataToSave.logs = updates.logs;
          } else {
              dataToSave.logs = newState.logs;
          }
          
          if (updates.bodyLogs !== undefined) {
              dataToSave.bodyLogs = updates.bodyLogs;
          } else {
              dataToSave.bodyLogs = newState.bodyLogs;
          }
          
          if (updates.workoutLogs !== undefined) {
              dataToSave.workoutLogs = updates.workoutLogs;
          } else {
              dataToSave.workoutLogs = newState.workoutLogs;
          }
          
          if (updates.hasCompletedOnboarding !== undefined) {
              dataToSave.hasCompletedOnboarding = updates.hasCompletedOnboarding;
          } else {
              dataToSave.hasCompletedOnboarding = newState.hasCompletedOnboarding;
          }
          
          if (updates.trainingMode !== undefined) {
              dataToSave.trainingMode = updates.trainingMode;
          } else {
              dataToSave.trainingMode = newState.trainingMode;
          }
          
          console.log('Saving to Firestore:', { 
              profile: dataToSave.profile, 
              profileKeys: Object.keys(dataToSave.profile || {}),
              profileDisplayName: dataToSave.profile?.displayName,
              profileHeight: dataToSave.profile?.height,
              profileWeight: dataToSave.profile?.weight,
              updatesKeys: Object.keys(updates)
          });
          
          // 使用 updateDoc 而不是 setDoc，更精确地更新字段
          // 只更新提供的字段，避免覆盖其他数据
          const updateData: any = {};
          if (updates.profile !== undefined) updateData.profile = newState.profile;
          if (updates.goals !== undefined) updateData.goals = newState.goals;
          if (updates.logs !== undefined) updateData.logs = newState.logs;
          if (updates.bodyLogs !== undefined) updateData.bodyLogs = newState.bodyLogs;
          if (updates.workoutLogs !== undefined) updateData.workoutLogs = newState.workoutLogs;
          if (updates.hasCompletedOnboarding !== undefined) updateData.hasCompletedOnboarding = newState.hasCompletedOnboarding;
          if (updates.trainingMode !== undefined) updateData.trainingMode = newState.trainingMode;
          
          if (Object.keys(updateData).length > 0) {
              await updateDoc(userDocRef, updateData);
              console.log('✅ Data saved to Firestore successfully with updateDoc:', Object.keys(updateData));
              
              // 保存后，直接从 Firestore 读取最新数据来更新状态（确保数据一致性）
              const docSnap = await getDoc(userDocRef);
              if (docSnap.exists()) {
                  const latestData = docSnap.data();
                  console.log('Reading latest data from Firestore after save:', {
                      profile: latestData.profile,
                      profileDisplayName: latestData.profile?.displayName,
                      profileHeight: latestData.profile?.height,
                      profileWeight: latestData.profile?.weight
                  });
                  
                  // 更新状态为 Firestore 中的最新数据
                  setState(prev => ({
                      ...prev,
                      profile: latestData.profile ? { ...DEFAULT_PROFILE, ...latestData.profile } : prev.profile,
                      goals: latestData.goals || prev.goals,
                      logs: latestData.logs || prev.logs,
                      bodyLogs: latestData.bodyLogs || prev.bodyLogs,
                      workoutLogs: latestData.workoutLogs || prev.workoutLogs,
                      hasCompletedOnboarding: latestData.hasCompletedOnboarding !== undefined ? latestData.hasCompletedOnboarding : prev.hasCompletedOnboarding,
                      trainingMode: latestData.trainingMode || prev.trainingMode
                  }));
              }
          } else {
              console.warn('No data to save, updateData is empty');
          }
      } catch (e: any) {
          console.error("❌ Error saving to Firestore:", e);
          
          // 如果 Firestore 保存失败，尝试保存到 localStorage 作为备份
          if ((state.user as any).isAnonymous) {
              const guestUid = state.user.uid;
              const dataToSave = {
                  profile: newState.profile,
                  goals: newState.goals,
                  logs: newState.logs,
                  bodyLogs: newState.bodyLogs,
                  workoutLogs: newState.workoutLogs,
                  hasCompletedOnboarding: newState.hasCompletedOnboarding,
                  trainingMode: newState.trainingMode
              };
              try {
                  localStorage.setItem(`guest_data_${guestUid}`, JSON.stringify(dataToSave));
                  console.log('⚠️ Fallback: Data saved to localStorage');
              } catch (localError) {
                  console.error("Failed to save to localStorage:", localError);
              }
          }
          
          if (e.code === 'permission-denied') {
              console.error("Firestore permission denied - check security rules");
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
      // 使用 Firebase 匿名认证，确保数据能保存到 Firestore
      if (!isFirebaseInitialized) throw new Error("Firebase configuration error");
      
      try {
          // 尝试使用 Firebase 匿名认证
          let result;
          try {
              result = await signInAnonymously(auth);
          } catch (authError: any) {
              // 如果匿名认证未启用，使用本地存储方案
              console.warn("Anonymous auth not available, using localStorage fallback:", authError);
              
              // 使用固定的访客UID（从localStorage读取或创建）
              let guestUid = localStorage.getItem('guest_uid');
              if (!guestUid) {
                  guestUid = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                  localStorage.setItem('guest_uid', guestUid);
              }
              
              // 创建模拟用户对象
              const mockUser = {
                  uid: guestUid,
                  email: 'guest@test.local',
                  displayName: '訪客測試用戶',
                  photoURL: null,
                  isAnonymous: true
              };
              
              // 从 localStorage 加载数据
              const savedData = localStorage.getItem(`guest_data_${guestUid}`);
              const initialData = savedData ? JSON.parse(savedData) : {
                  profile: { ...DEFAULT_PROFILE, displayName: '訪客測試用戶' },
                  goals: DEFAULT_GOALS,
                  logs: [],
                  bodyLogs: [],
                  workoutLogs: [],
                  hasCompletedOnboarding: false,
                  trainingMode: 'rest'
              };
              
              setState({
                  user: mockUser as any,
                  authLoading: false,
                  hasCompletedOnboarding: initialData.hasCompletedOnboarding || false,
                  profile: initialData.profile || { ...DEFAULT_PROFILE, displayName: '訪客測試用戶' },
                  goals: initialData.goals || DEFAULT_GOALS,
                  trainingMode: initialData.trainingMode || 'rest',
                  todayStats: calculateTodayStats(initialData.logs || []),
                  logs: initialData.logs || [],
                  bodyLogs: initialData.bodyLogs || [],
                  workoutLogs: initialData.workoutLogs || [],
                  isFirebaseReady: true
              });
              
              // 监听状态变化，自动保存到 localStorage
              return;
          }
          
          // 如果匿名认证成功，使用正常的 Firebase 流程
          const user = result.user;
          console.log('Guest signed in with Firebase anonymous auth:', user.uid);
          
          // 检查是否已有数据
          const userDocRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(userDocRef);
          
          if (!docSnap.exists()) {
              // 创建新访客数据
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
              });
          }
          // 数据会通过 onAuthStateChanged 的 onSnapshot 自动加载
          
      } catch (error: any) {
          console.error("Guest Sign-In Error:", error);
          throw error;
      }
  };

  const logout = async () => {
      await signOut(auth);
  };

  // --- Data Actions ---

  const updateProfile = async (updates: Partial<UserProfile>) => {
    const newProfile = { ...state.profile, ...updates };
    console.log('updateProfile called:', { 
        updates, 
        newProfile, 
        currentProfile: state.profile,
        displayName: newProfile.displayName,
        height: newProfile.height,
        weight: newProfile.weight
    });
    
    // 先更新本地状态（立即反馈）
    setState(prev => ({ ...prev, profile: newProfile }));
    
    // 然后保存到 Firestore
    await saveData({ profile: newProfile });
    
    console.log('updateProfile completed, profile should be saved');
  };

  const updateGoals = async (updates: Partial<UserGoals>) => {
    const newGoals = { ...state.goals, ...updates };
    await saveData({ goals: newGoals });
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

  const recalculateTargets = async (newProfile: UserProfile, mode: TrainingMode = 'rest') => {
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

      await updateGoals({ targetCalories, targetProtein, targetFat, targetCarbs });
  };

  const setTrainingMode = async (mode: TrainingMode) => {
      await saveData({ trainingMode: mode });
      await recalculateTargets(state.profile, mode);
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
