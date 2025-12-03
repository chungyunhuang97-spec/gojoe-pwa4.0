
import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { Mail, Lock, Loader2, ArrowRight, AlertTriangle, ExternalLink, Activity, Globe, Copy, Check, Settings, Save, User, UserPlus } from 'lucide-react';
import { isFirebaseInitialized, saveManualConfig } from '../firebaseConfig';

export const Login: React.FC = () => {
  const { login, signup, loginAsGuest, loginWithGoogle, isFirebaseReady } = useUser();
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

  useEffect(() => {
      // Auto-expand diagnostics if config is missing in preview to help users
      if (isPreviewEnv && !isFirebaseReady) {
          // Optional: setShowDiagnostics(true);
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
        handleAuthError(err);
    } finally {
        setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
      setError('');
      setIsLoading(true);
      try {
          await loginWithGoogle();
      } catch (err: any) {
          handleAuthError(err);
          setIsLoading(false);
      }
  };

  const handleGuestLogin = async () => {
      setError('');
      setIsLoading(true);
      try {
          await loginAsGuest();
      } catch (err: any) {
          handleAuthError(err);
          setIsLoading(false);
      }
  };

  const handleAuthError = (err: any) => {
      console.error(err);
      if (err.message && (err.message.includes("Firebase configuration error") || err.message.includes("Firebase not initialized"))) {
          setError("系統未設定，無法連接資料庫。請檢查設定。");
          setShowDiagnostics(true);
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
          setError("帳號或密碼錯誤");
      } else if (err.code === 'auth/email-already-in-use') {
          setError("此 Email 已被註冊，請直接登入");
      } else if (err.code === 'auth/weak-password') {
          setError("密碼強度不足 (至少 6 位數)");
      } else if (err.code === 'auth/operation-not-allowed') {
          setError("登入方式未啟用 (請至 Firebase Console 開啟)");
          setConfigError(true);
      } else if (err.code === 'auth/network-request-failed' || (err.message && err.message.includes('network'))) {
          setError("網路連線失敗。若為預覽環境，請確認網域已授權。");
          if (isPreviewEnv) setShowDiagnostics(true);
      } else if (err.code === 'auth/popup-closed-by-user') {
          setError("登入已取消");
      } else {
          setError(err.message || "發生錯誤，請稍後再試");
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

        {/* --- MAIN ACTIONS --- */}
        <div className="w-full space-y-3 mb-6">
            <button 
                onClick={handleGoogleLogin}
                disabled={isLoading || !isFirebaseReady}
                className="w-full bg-white border border-gray-200 text-gray-700 py-3.5 rounded-2xl font-bold text-sm shadow-sm hover:bg-gray-50 active:scale-95 transition-all flex items-center justify-center gap-3 relative overflow-hidden group"
            >
                <div className="w-5 h-5 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-full h-full">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                </div>
                Continue with Google
            </button>

            <button 
                onClick={handleGuestLogin}
                disabled={isLoading || !isFirebaseReady}
                className="w-full bg-gray-100 text-gray-600 py-3.5 rounded-2xl font-bold text-sm shadow-sm hover:bg-gray-200 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
                <User size={18} />
                以訪客身份繼續
            </button>
        </div>

        <div className="relative w-full py-2 mb-4 flex items-center justify-center">
            <div className="absolute w-full border-t border-gray-200"></div>
            <div className="relative bg-white px-4 text-xs font-black text-gray-400">———— OR ————</div>
        </div>

        {/* --- EMAIL FORM --- */}
        <form onSubmit={handleSubmit} className="w-full space-y-4 animate-fade-in-up">
          <div className="space-y-1">
              <div className="relative">
                  <div className="absolute left-4 top-3.5 text-gray-400"><Mail size={18} /></div>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3 pl-12 pr-4 font-bold text-gray-800 outline-none focus:border-brand-green transition-all disabled:opacity-50"
                    placeholder="Email"
                    disabled={isLoading || !isFirebaseReady}
                  />
              </div>
          </div>

          <div className="space-y-1">
              <div className="relative">
                  <div className="absolute left-4 top-3.5 text-gray-400"><Lock size={18} /></div>
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3 pl-12 pr-4 font-bold text-gray-800 outline-none focus:border-brand-green transition-all disabled:opacity-50"
                    placeholder="密碼"
                    disabled={isLoading || !isFirebaseReady}
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
            className="w-full bg-brand-black text-brand-green py-4 rounded-2xl font-black text-lg shadow-lg hover:shadow-brand-green/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
             {isLoading ? <Loader2 className="animate-spin" /> : (
                 <>
                    {isSignUp ? "註冊" : "登入"}
                    <ArrowRight size={20} />
                 </>
             )}
          </button>
        </form>
        
        <div className="mt-6 text-center">
            <button 
                onClick={() => { setIsSignUp(!isSignUp); setError(''); setConfigError(false); }}
                className="text-sm font-black text-brand-black border-b-2 border-brand-green pb-0.5 hover:opacity-70 transition-opacity"
            >
                {isSignUp ? "已有帳號？登入" : "還沒有帳號？註冊"}
            </button>
        </div>

        {/* --- DIAGNOSTICS & MANUAL CONFIG --- */}
        {(!isFirebaseReady || showDiagnostics) && (
            <div className="w-full mt-8 bg-gray-50 border border-gray-200 rounded-2xl p-4 animate-fade-in text-left shadow-inner">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                        <Activity size={16} className="text-gray-500" />
                        <span className="text-xs font-black text-gray-600 uppercase">系統診斷</span>
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
                        <div className="bg-yellow-50 p-2 rounded text-[10px] text-yellow-800 font-bold">
                            請輸入 Firebase Config (API Key, Project ID)
                        </div>
                        <input 
                            value={manualForm.apiKey}
                            onChange={e => setManualForm({...manualForm, apiKey: e.target.value})}
                            className="w-full text-xs p-2 rounded border border-gray-300 font-mono focus:border-brand-green outline-none"
                            placeholder="API Key (AIza...)"
                        />
                        <input 
                            value={manualForm.projectId}
                            onChange={e => setManualForm({...manualForm, projectId: e.target.value})}
                            className="w-full text-xs p-2 rounded border border-gray-300 font-mono focus:border-brand-green outline-none"
                            placeholder="Project ID (go-joe-xxx)"
                        />
                        <button 
                            onClick={handleManualSave}
                            className="w-full bg-brand-black text-brand-green py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2"
                        >
                            <Save size={12} /> 儲存並重整
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="space-y-1 mb-3">
                            <div className="flex justify-between items-center text-[10px]">
                                <span className="text-gray-400 font-bold uppercase">Config Status</span>
                                <span className={`font-mono font-bold ${isFirebaseInitialized ? 'text-green-600' : 'text-red-500'}`}>
                                    {isFirebaseInitialized ? 'Loaded' : 'Missing'}
                                </span>
                            </div>
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
                                <p className="text-[9px] text-blue-400 mt-1 leading-tight">
                                    若登入失敗 (auth/network-request-failed)，請將此網域加入 Firebase Console → Authentication → Settings → Authorized Domains。
                                </p>
                            </div>
                        )}
                    </>
                )}
            </div>
        )}

        {/* Operation Not Allowed Help */}
        {configError && (
             <div className="w-full bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mt-4 flex items-start gap-3 animate-fade-in-up">
                <div className="p-2 bg-yellow-100 rounded-full text-yellow-600 shrink-0"><AlertTriangle size={16} /></div>
                <div>
                    <h3 className="text-xs font-black text-yellow-700 uppercase mb-1">功能未啟用</h3>
                    <p className="text-xs text-yellow-600 leading-relaxed font-bold mb-2">
                        Firebase 專案尚未開啟對應的登入方式 (Email/Anonymous/Google)。
                    </p>
                    <a 
                      href="https://console.firebase.google.com/u/0/project/_/authentication/providers" 
                      target="_blank" 
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] font-black bg-white border border-yellow-200 px-3 py-1.5 rounded-lg text-yellow-700 hover:bg-yellow-50 transition-colors"
                    >
                        前往 Console 啟用 <ExternalLink size={10} />
                    </a>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};
