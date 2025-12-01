
import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { Mail, Lock, Loader2, ArrowRight, AlertTriangle, ExternalLink, Activity, Globe, Copy, Check, Settings, Save, User } from 'lucide-react';
import { isFirebaseInitialized, saveManualConfig } from '../firebaseConfig';

export const Login: React.FC = () => {
  const { login, signup, loginAsGuest, isFirebaseReady } = useUser();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [configError, setConfigError] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [showManualConfig, setShowManualConfig] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);

  // Manual Config State
  const [manualForm, setManualForm] = useState({
      apiKey: '',
      authDomain: '',
      projectId: ''
  });

  // Check if we are in a preview environment
  const currentHostname = window.location.hostname;
  const isPreviewEnv = currentHostname.includes('scf.usercontent.goog') || 
                       currentHostname.includes('ai.studio') ||
                       currentHostname.includes('webcontainer.io');

  // Auto-show diagnostics if config is missing in a preview environment
  useEffect(() => {
      if (isPreviewEnv && !isFirebaseReady) {
          // Keep diagnostics hidden initially, user can opt-in
      }
  }, [isFirebaseReady, isPreviewEnv]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
        setError("請填寫完整資訊");
        return;
    }
    setError('');
    setConfigError(false);
    setIsLoading(true);

    try {
        if (isSignUp) {
            await signup(email, password);
        } else {
            await login(email, password);
        }
    } catch (err: any) {
        console.error(err);
        setIsLoading(false);

        if (err.message.includes("Firebase configuration error") || err.message.includes("Firebase not initialized")) {
            setError("系統未設定。請使用訪客模式或手動設定。");
            setShowDiagnostics(true);
        } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
            setError("帳號或密碼錯誤");
        } else if (err.code === 'auth/email-already-in-use') {
            setError("此 Email 已被註冊，請直接登入");
        } else if (err.code === 'auth/weak-password') {
            setError("密碼強度不足 (至少 6 位數)");
        } else if (err.code === 'auth/operation-not-allowed') {
            setError("Email 登入功能未啟用");
            setConfigError(true);
        } else if (err.code === 'auth/network-request-failed' || err.message.includes('network')) {
            setError("連線失敗 (網域未授權)。請嘗試訪客模式。");
            if (isPreviewEnv) setShowDiagnostics(true);
        } else {
            setError(err.message || "發生錯誤，請稍後再試");
        }
    } finally {
        setIsLoading(false);
    }
  };

  const handleManualSave = () => {
      if (!manualForm.apiKey || !manualForm.projectId) {
          alert("請至少填寫 API Key 和 Project ID");
          return;
      }
      saveManualConfig({
          ...manualForm,
          authDomain: manualForm.authDomain || `${manualForm.projectId}.firebaseapp.com`,
          storageBucket: `${manualForm.projectId}.appspot.com`
      });
  };

  const copyDomain = () => {
      navigator.clipboard.writeText(currentHostname);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2000);
  };

  // Diagnostic Data
  const envStatus = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY ? 'Present' : 'Missing',
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ? 'Present' : 'Missing',
      hostname: currentHostname,
      firebaseInit: isFirebaseInitialized ? 'Success' : 'Failed'
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 relative overflow-hidden font-nunito">
      {/* Background Decor */}
      <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-brand-green/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-80 h-80 bg-brand-black/5 rounded-full blur-3xl"></div>

      <div className="w-full max-w-sm z-10 flex flex-col items-center">
        {/* Logo Area */}
        <div className="mb-8 text-center" onDoubleClick={() => setShowDiagnostics(!showDiagnostics)}>
          <div className="w-24 h-24 bg-brand-black rounded-[2rem] flex items-center justify-center shadow-2xl shadow-brand-green/20 mb-6 mx-auto transform rotate-3">
             <span className="text-4xl">💪</span>
          </div>
          <h1 className="text-4xl font-black italic tracking-tighter text-brand-black mb-2">
            GO JOE<span className="text-brand-green">!</span>
          </h1>
          <p className="text-gray-400 font-bold text-sm tracking-widest uppercase">
              {isSignUp ? "建立您的帳號" : "歡迎回來"}
          </p>
        </div>

        {/* --- GUEST MODE BUTTON --- */}
        <div className="w-full mb-6 animate-fade-in-up">
            <button 
                onClick={loginAsGuest}
                className="w-full bg-white border-2 border-brand-green text-brand-black py-3 rounded-2xl font-black text-sm shadow-md hover:bg-brand-green/10 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
                <User size={18} strokeWidth={2.5} />
                訪客模式 (免註冊試用)
            </button>
            <div className="flex items-center gap-2 my-4">
                <div className="h-px bg-gray-200 flex-1"></div>
                <span className="text-[10px] text-gray-400 font-bold uppercase">OR</span>
                <div className="h-px bg-gray-200 flex-1"></div>
            </div>
        </div>

        {/* Diagnostics & Manual Config Panel */}
        {showDiagnostics && (
            <div className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 mb-6 animate-fade-in text-left shadow-lg">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                        <Activity size={16} className="text-gray-500" />
                        <span className="text-xs font-black text-gray-600 uppercase">預覽環境診斷</span>
                    </div>
                    <button 
                        onClick={() => setShowManualConfig(!showManualConfig)}
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                        <Settings size={12} /> {showManualConfig ? '隱藏設定' : '手動設定'}
                    </button>
                </div>
                
                {showManualConfig ? (
                    <div className="space-y-3">
                        <div className="bg-yellow-50 p-2 rounded text-[10px] text-yellow-800 font-bold mb-2">
                            請輸入 Firebase Config (API Key, Project ID)
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">API Key</label>
                            <input 
                                value={manualForm.apiKey}
                                onChange={e => setManualForm({...manualForm, apiKey: e.target.value})}
                                className="w-full text-xs p-2 rounded border border-gray-300 font-mono focus:border-brand-green outline-none"
                                placeholder="AIza..."
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Project ID</label>
                            <input 
                                value={manualForm.projectId}
                                onChange={e => setManualForm({...manualForm, projectId: e.target.value})}
                                className="w-full text-xs p-2 rounded border border-gray-300 font-mono focus:border-brand-green outline-none"
                                placeholder="go-joe-xxx"
                            />
                        </div>
                        <button 
                            onClick={handleManualSave}
                            className="w-full bg-brand-black text-brand-green py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2 mt-2"
                        >
                            <Save size={12} /> 儲存並重整
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="space-y-1.5 mb-4">
                            <div className="flex justify-between items-center text-[10px]">
                                <span className="text-gray-400 font-bold uppercase">Config Status</span>
                                <span className={`font-mono font-bold ${isFirebaseInitialized ? 'text-green-600' : 'text-red-500'}`}>
                                    {isFirebaseInitialized ? 'Loaded' : 'Missing'}
                                </span>
                            </div>
                            {!isFirebaseInitialized && (
                                <p className="text-[10px] text-red-500 font-bold bg-red-50 p-2 rounded leading-relaxed">
                                    找不到環境變數。請使用「訪客模式」或點擊右上角「手動設定」。
                                </p>
                            )}
                        </div>

                        {isPreviewEnv && (
                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <Globe size={14} className="text-blue-500" />
                                    <span className="text-[10px] font-black text-blue-600 uppercase">網域授權檢查</span>
                                </div>
                                <div className="flex items-center gap-2 bg-white rounded-lg border border-blue-100 p-2">
                                    <code className="flex-1 text-[10px] font-mono text-gray-600 truncate">{currentHostname}</code>
                                    <button onClick={copyDomain} className="text-blue-500 hover:text-blue-700 active:scale-95">
                                        {copiedDomain ? <Check size={14} /> : <Copy size={14} />}
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        )}

        {/* Config Warning Banner - Minimized if manual config not showing */}
        {!isFirebaseReady && !showDiagnostics && (
            <div className="w-full bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 flex items-start gap-3 animate-fade-in-up cursor-pointer" onClick={() => setShowDiagnostics(true)}>
                <AlertTriangle className="text-red-500 shrink-0" size={20} />
                <div>
                    <h3 className="text-xs font-black text-red-600 uppercase mb-1">系統尚未連線</h3>
                    <p className="text-xs text-red-500 leading-relaxed">
                        無法連接到資料庫。點此進行診斷或設定。
                    </p>
                </div>
            </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="w-full space-y-4 animate-fade-in-up">
          
          <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Email</label>
              <div className="relative">
                  <div className="absolute left-4 top-3.5 text-gray-400">
                      <Mail size={18} />
                  </div>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3 pl-12 pr-4 font-bold text-gray-800 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 transition-all disabled:opacity-50"
                    placeholder="joe@example.com"
                    disabled={!isFirebaseReady}
                  />
              </div>
          </div>

          <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">密碼</label>
              <div className="relative">
                  <div className="absolute left-4 top-3.5 text-gray-400">
                      <Lock size={18} />
                  </div>
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3 pl-12 pr-4 font-bold text-gray-800 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 transition-all disabled:opacity-50"
                    placeholder="••••••••"
                    disabled={!isFirebaseReady}
                  />
              </div>
          </div>

          {error && !configError && (
              <div className="bg-red-50 text-red-500 text-xs font-bold p-3 rounded-xl border border-red-100 text-center animate-shake">
                  {error}
              </div>
          )}

          <button 
            type="submit"
            disabled={isLoading || !isFirebaseReady}
            className="w-full bg-brand-black text-brand-green py-4 rounded-2xl font-black text-lg shadow-lg hover:shadow-brand-green/20 active:scale-95 transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
             {isLoading ? <Loader2 className="animate-spin" /> : (
                 <>
                    {isSignUp ? "註冊帳號" : "登入"}
                    <ArrowRight size={20} />
                 </>
             )}
          </button>
        </form>
        
        {/* Toggle Mode */}
        <div className="mt-8 text-center">
            <p className="text-xs font-bold text-gray-400 mb-2">
                {isSignUp ? "已經有帳號了嗎？" : "還沒有帳號？"}
            </p>
            <button 
                onClick={() => { setIsSignUp(!isSignUp); setError(''); setConfigError(false); }}
                className="text-sm font-black text-brand-black border-b-2 border-brand-green pb-0.5 hover:opacity-70 transition-opacity"
            >
                {isSignUp ? "直接登入" : "立即註冊"}
            </button>
        </div>

        {/* Version Footer */}
        <div className="mt-12 text-[10px] font-bold text-gray-300">
            Go Joe! v1.3.0 {isFirebaseReady ? <span className="text-green-400">●</span> : <span className="text-red-400">●</span>}
        </div>

      </div>
    </div>
  );
};
