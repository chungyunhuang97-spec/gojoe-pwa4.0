
import React, { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { Onboarding } from './components/Onboarding';
import { History } from './components/History';
import { Profile } from './components/Profile';
import { Login } from './components/Login';
import { ApiKeySetup } from './components/ApiKeySetup';
import { Training } from './components/Training';
import { Analytics } from './components/Analytics';
import { UserProvider, useUser } from './context/UserContext';
import { Menu, User, X, ChevronRight, Settings, LogOut, History as HistoryIcon, Home, Key, Dumbbell, BarChart3 } from 'lucide-react';
import { aiService } from './services/ai';

type ViewType = 'dashboard' | 'history' | 'profile' | 'settings' | 'apikey' | 'training' | 'analytics';

// --- Sidebar ---
const Sidebar: React.FC<{ isOpen: boolean; onClose: () => void; onViewChange: (view: ViewType) => void }> = ({ isOpen, onClose, onViewChange }) => {
  const { logout } = useUser();
  const menuItems: { icon: any, label: string, view: ViewType }[] = [
    { icon: Home, label: '首頁', view: 'dashboard' },
    { icon: Dumbbell, label: '訓練記錄', view: 'training' },
    { icon: HistoryIcon, label: '歷史紀錄', view: 'history' },
    { icon: BarChart3, label: '數據分析', view: 'analytics' },
    { icon: User, label: '個人檔案', view: 'profile' },
    { icon: Key, label: 'API Key 設定', view: 'apikey' },
  ];

  return (
    <>
      <div className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-[80] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose} />
      <div className={`fixed top-0 left-0 h-[100dvh] w-[80%] max-w-[300px] bg-white z-[90] transform transition-transform duration-300 ease-out shadow-2xl flex flex-col border-r border-gray-100 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex flex-col h-full">
          <div className="flex justify-between items-center mb-10 shrink-0">
            <h2 className="text-2xl font-extrabold italic tracking-tighter text-brand-black">GO JOE<span className="text-brand-green">!</span></h2>
            <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="p-2 bg-gray-50 rounded-full active:scale-95 transition-transform hover:bg-gray-100"><X className="w-6 h-6 text-gray-500" /></button>
          </div>
          <nav className="space-y-2 flex-1 overflow-y-auto">
            {menuItems.map((item) => (
              <button key={item.label} onClick={(e) => { e.stopPropagation(); onViewChange(item.view); onClose(); }} className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-gray-50 active:scale-95 transition-all group focus:outline-none">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-gray-50 rounded-full text-gray-400 group-hover:bg-brand-green group-hover:text-brand-black transition-colors"><item.icon size={20} /></div>
                  <span className="font-bold text-lg text-gray-600 group-hover:text-brand-black">{item.label}</span>
                </div>
                <ChevronRight className="text-gray-300 group-hover:text-brand-green transition-colors" size={20} />
              </button>
            ))}
          </nav>
          <button onClick={() => { logout(); onClose(); }} className="flex items-center gap-3 p-4 text-gray-400 font-bold mt-auto shrink-0 active:scale-95 transition-transform hover:text-red-500">
            <LogOut size={20} /><span>登出</span>
          </button>
        </div>
      </div>
    </>
  );
};

const PlaceholderView: React.FC<{ title: string }> = ({ title }) => (
    <div className="flex flex-col items-center justify-center h-full text-gray-400 p-10 text-center">
        <Settings size={48} className="mb-4 opacity-20" />
        <h2 className="text-xl font-black text-gray-300">{title}</h2>
        <p className="text-sm font-bold mt-2">Coming Soon</p>
    </div>
);

const MainApp: React.FC = () => {
  const { user, hasCompletedOnboarding, profile, authLoading } = useUser();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [hasApiKey, setHasApiKey] = useState(false);

  // Check for API Key on mount using the new service
  useEffect(() => {
    const checkKey = async () => {
      // 1. Check local/env key presence via service
      if (aiService.hasApiKey()) {
        setHasApiKey(true);
      } 
      // 2. Check OAuth flow
      else if ((window as any).aistudio && await (window as any).aistudio.hasSelectedApiKey()) {
        setHasApiKey(true);
      }
    };
    checkKey();
  }, []);

  if (authLoading) return <div className="min-h-screen flex items-center justify-center text-gray-400 font-bold">Loading...</div>;

  if (!user) return <Login />;

  // API Key Gate
  if (!hasApiKey && currentView !== 'apikey') {
    return <ApiKeySetup onComplete={() => setHasApiKey(true)} />;
  }

  // If viewing API Key setup manually from menu
  if (currentView === 'apikey') {
     return (
       <div className="min-h-screen bg-gray-100 sm:py-8 sm:px-4 flex justify-center items-start overflow-hidden">
          <div className="w-full sm:max-w-[420px] bg-white min-h-screen sm:min-h-[850px] sm:h-[90vh] sm:rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col font-nunito border border-gray-200">
             <header className="px-5 pt-12 pb-2 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-[50]">
                <button onClick={() => setCurrentView('dashboard')} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-transform active:scale-95 text-gray-500 font-bold text-sm flex items-center gap-1">
                   <ChevronRight className="rotate-180" size={20} /> 返回
                </button>
             </header>
             <div className="flex-1 overflow-y-auto">
                 <ApiKeySetup onComplete={() => { setHasApiKey(true); setCurrentView('dashboard'); }} />
             </div>
          </div>
       </div>
     );
  }

  if (!hasCompletedOnboarding) {
    return (
       <div className="min-h-screen bg-gray-100 sm:py-8 sm:px-4 flex justify-center items-start overflow-hidden">
          <div className="w-full sm:max-w-[420px] bg-white min-h-screen sm:min-h-[850px] sm:h-[90vh] sm:rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col font-nunito border border-gray-200">
             <Onboarding />
          </div>
       </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 sm:py-8 sm:px-4 flex justify-center items-start overflow-hidden">
      <div className="w-full sm:max-w-[420px] bg-white min-h-screen sm:min-h-[850px] sm:h-[90vh] sm:rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col font-nunito border border-gray-200/50">
        
        <header className="px-5 pt-12 pb-2 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-[50]">
          <button onClick={() => setIsMenuOpen(true)} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-transform active:scale-95"><Menu className="w-7 h-7 text-brand-black" strokeWidth={2.5} /></button>
          <h1 className="text-2xl font-black tracking-tight italic select-none text-brand-black">GO JOE<span className="text-brand-green">!</span></h1>
          <button onClick={() => setCurrentView('profile')} className={`p-1 rounded-full transition-transform active:scale-95 overflow-hidden border-2 ${currentView === 'profile' ? 'border-brand-green' : 'border-transparent'}`}>
            {profile.avatar ? <img src={profile.avatar} alt="Avatar" className="w-9 h-9 rounded-full object-cover" /> : <div className={`p-1 rounded-full ${currentView === 'profile' ? 'bg-brand-green text-brand-black' : 'text-gray-400 bg-gray-100'}`}><User className="w-7 h-7" strokeWidth={2.5} /></div>}
          </button>
        </header>

        <main className="flex-1 overflow-hidden relative z-0 flex flex-col">
          {currentView === 'dashboard' && <Dashboard />}
          {currentView === 'training' && <Training />}
          {currentView === 'history' && <History />}
          {currentView === 'analytics' && <Analytics />}
          {currentView === 'profile' && <Profile />}
          {currentView === 'settings' && <PlaceholderView title="設定" />}
        </main>

        <Sidebar isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} onViewChange={setCurrentView} />
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <UserProvider>
      <MainApp />
    </UserProvider>
  );
};

export default App;
