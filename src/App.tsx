
import React, { useState, useEffect, Suspense, lazy } from 'react';
import { UserProvider, useUser } from './context/UserContext';
import { CameraProvider, useCamera } from './context/CameraContext';
import { History as HistoryIcon, Home, User, Settings, ChevronRight } from 'lucide-react';

// Lazy load components for better initial load performance
const Dashboard = lazy(() => import('./components/Dashboard').then(m => ({ default: m.Dashboard })));
const Onboarding = lazy(() => import('./components/Onboarding').then(m => ({ default: m.Onboarding })));
const History = lazy(() => import('./components/History').then(m => ({ default: m.History })));
const Profile = lazy(() => import('./components/Profile').then(m => ({ default: m.Profile })));
const Login = lazy(() => import('./components/Login').then(m => ({ default: m.Login })));
const ApiKeySetup = lazy(() => import('./components/ApiKeySetup').then(m => ({ default: m.ApiKeySetup })));
const Training = lazy(() => import('./components/Training').then(m => ({ default: m.Training })));
const Analytics = lazy(() => import('./components/Analytics').then(m => ({ default: m.Analytics })));

// Loading fallback component
const LoadingFallback: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center text-gray-400 font-bold">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-4 border-brand-green border-t-transparent rounded-full animate-spin"></div>
      <span>載入中...</span>
    </div>
  </div>
);

type ViewType = 'dashboard' | 'history' | 'profile' | 'settings' | 'apikey' | 'training' | 'analytics';

// --- TabBar ---
const TabBar: React.FC<{ currentView: ViewType; onViewChange: (view: ViewType) => void }> = ({ currentView, onViewChange }) => {
  const tabs = [
    { icon: HistoryIcon, label: '歷史紀錄', view: 'history' as ViewType, useImage: false },
    { icon: Home, label: 'Go', view: 'dashboard' as ViewType, useImage: true, imagePath: '/go-tab-icon.png', isMain: true },
    { icon: User, label: '個人檔案', view: 'profile' as ViewType, useImage: false },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-brand-black border-t border-gray-200 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-full sm:max-w-[420px] sm:rounded-t-3xl shadow-lg">
      <div className="flex items-center justify-around h-20 px-2 pb-4 sm:pb-2 relative">
        {tabs.map((tab, index) => {
          const isActive = currentView === tab.view;
          const isMainTab = tab.isMain;
          
          // 主要 tab (Go) - 圆形浮动按钮
          if (isMainTab) {
            return (
              <div key={tab.view} className="flex-1 flex justify-center items-center">
                <button
                  onClick={() => onViewChange(tab.view)}
                  className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all transform active:scale-95 ${
                    isActive 
                      ? 'bg-brand-green shadow-lg shadow-brand-green/50 scale-110' 
                      : 'bg-brand-green shadow-md'
                  }`}
                  style={{
                    marginTop: '-24px', // 向上浮动
                  }}
                >
                  {tab.useImage && tab.imagePath ? (
                    <img 
                      src={tab.imagePath} 
                      alt={tab.label}
                      className="w-8 h-8 object-contain brightness-0"
                    />
                  ) : (
                    <tab.icon size={28} strokeWidth={2.5} className="text-brand-black" />
                  )}
                </button>
              </div>
            );
          }
          
          // 普通 tab
          return (
            <button
              key={tab.view}
              onClick={() => onViewChange(tab.view)}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-all ${
                isActive ? 'text-brand-green' : 'text-gray-400'
              }`}
            >
              <div className="p-2">
                {tab.useImage && tab.imagePath ? (
                  <img 
                    src={tab.imagePath} 
                    alt={tab.label}
                    className={`w-6 h-6 object-contain transition-all ${
                      isActive ? 'opacity-100' : 'opacity-40 grayscale'
                    }`}
                  />
                ) : (
                  <tab.icon size={24} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-brand-green' : 'text-gray-400'} />
                )}
              </div>
              <span className={`text-[11px] font-bold mt-1 ${isActive ? 'text-brand-green' : 'text-gray-400'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const PlaceholderView: React.FC<{ title: string }> = ({ title }) => (
    <div className="flex flex-col items-center justify-center h-full text-gray-400 p-10 text-center">
        <Settings size={48} className="mb-4 opacity-20" />
        <h2 className="text-xl font-black text-gray-300">{title}</h2>
        <p className="text-sm font-bold mt-2">敬請期待</p>
    </div>
);

const MainApp: React.FC = () => {
  const { user, hasCompletedOnboarding, profile, authLoading } = useUser();
  const { isCameraOpen } = useCamera();
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [hasApiKey, setHasApiKey] = useState(false);

  // Check for API Key on mount (LocalStorage OR Injected)
  useEffect(() => {
    const checkKey = async () => {
      const storedKey = localStorage.getItem('user_gemini_key'); // Updated key
      const envKey = process.env.API_KEY;
      
      // If we have a stored key OR if the environment has one injected
      if (storedKey || (envKey && envKey.length > 10)) {
        setHasApiKey(true);
      } else if ((window as any).aistudio && await (window as any).aistudio.hasSelectedApiKey()) {
        setHasApiKey(true);
      }
    };
    checkKey();
  }, []);

  if (authLoading) return <LoadingFallback />;

  if (!user) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <Login />
      </Suspense>
    );
  }

  // --- 新用戶流程判定 ---
  // hasCompletedOnboarding 為 false 時，視為需要走「API Key → Onboarding」的新用戶流程。
  // 重要：如果 profile 已经有数据（height > 0），说明已经完成过 onboarding，应该跳过
  // 这样可以处理旧数据中 hasCompletedOnboarding 字段缺失的情况
  const hasProfileData = profile && profile.height > 0 && profile.weight > 0 && profile.age > 0;
  const isNewUserFlow = !hasCompletedOnboarding && !hasProfileData;
  
  console.log('App render check:', {
    hasUser: !!user,
    hasCompletedOnboarding,
    hasProfileData,
    profileHeight: profile.height,
    profileWeight: profile.weight,
    isNewUserFlow,
    hasApiKey
  });

  // Step 3：API Key 設定（僅新用戶且尚未設定時會出現）
  if (isNewUserFlow && !hasApiKey && currentView !== 'apikey') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <ApiKeySetup onComplete={() => setHasApiKey(true)} />
      </Suspense>
    );
  }

  // 手動從側邊選單開啟 API Key 設定
  if (currentView === 'apikey') {
     return (
       <div className="min-h-screen bg-gray-100 sm:py-8 sm:px-4 flex justify-center items-start overflow-hidden">
          <div className="w-full sm:max-w-[420px] bg-white min-h-screen sm:min-h-[850px] sm:h-[90vh] sm:rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col font-nunito border border-gray-200">
             <header className="px-5 pt-12 pb-2 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-50">
                <button onClick={() => setCurrentView('dashboard')} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-transform active:scale-95 text-gray-500 font-bold text-sm flex items-center gap-1">
                   <ChevronRight className="rotate-180" size={20} /> 返回
                </button>
             </header>
             <div className="flex-1 overflow-y-auto">
                 <Suspense fallback={<LoadingFallback />}>
                   <ApiKeySetup onComplete={() => { setHasApiKey(true); setCurrentView('dashboard'); }} />
                 </Suspense>
             </div>
          </div>
       </div>
     );
  }

  // Step 4：Onboarding 精靈（僅新用戶，且已完成 API Key 設定）
  if (isNewUserFlow && hasApiKey) {
    return (
       <div className="min-h-screen bg-gray-100 sm:py-8 sm:px-4 flex justify-center items-start overflow-hidden">
          <div className="w-full sm:max-w-[420px] bg-white min-h-screen sm:min-h-[850px] sm:h-[90vh] sm:rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col font-nunito border border-gray-200">
             <Suspense fallback={<LoadingFallback />}>
               <Onboarding />
             </Suspense>
          </div>
       </div>
    );
  }

  return (
    <div className="h-screen bg-gray-100 sm:py-8 sm:px-4 flex justify-center items-start overflow-hidden">
      <div className="w-full sm:max-w-[420px] bg-white h-screen sm:h-[90vh] sm:rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col font-nunito border border-gray-200/50">
        
        {!isCameraOpen && (
          <header className="px-5 pt-4 sm:pt-12 pb-2 flex justify-center items-center bg-white/95 backdrop-blur-md sticky top-0 z-50 shrink-0 border-b border-gray-100/50">
            <h1 className="text-2xl font-black tracking-tight italic select-none text-brand-black leading-none">
              GO JOE<span className="text-brand-green">!</span>
            </h1>
          </header>
        )}

        <main className={`flex-1 overflow-y-auto relative z-0 flex flex-col min-h-0 ${isCameraOpen ? 'pb-0' : 'pb-20 sm:pb-20'}`}>
          <Suspense fallback={<LoadingFallback />}>
            {currentView === 'dashboard' && <Dashboard />}
            {/* 訓練記錄功能已整合到首頁AI教練中，此頁面已移除 */}
            {currentView === 'training' && <PlaceholderView title="訓練記錄已整合到首頁AI教練" />}
            {currentView === 'history' && <History />}
            {currentView === 'analytics' && <PlaceholderView title="數據分析已整合到個人檔案" />}
            {currentView === 'profile' && <Profile />}
            {currentView === 'settings' && <PlaceholderView title="設定" />}
          </Suspense>
        </main>

        {!isCameraOpen && <TabBar currentView={currentView} onViewChange={setCurrentView} />}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <UserProvider>
      <CameraProvider>
        <MainApp />
      </CameraProvider>
    </UserProvider>
  );
};

export default App;
