
import React, { useState } from 'react';
import { useUser } from '../context/UserContext';
import { Mail, Lock, Loader2, ArrowRight, AlertTriangle } from 'lucide-react';

export const Login: React.FC = () => {
  const { login, signup, isFirebaseReady } = useUser();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
        setError("請填寫完整資訊");
        return;
    }
    setError('');
    setIsLoading(true);

    try {
        if (isSignUp) {
            await signup(email, password);
        } else {
            await login(email, password);
        }
    } catch (err: any) {
        console.error(err);
        if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
            setError("帳號或密碼錯誤");
        } else if (err.code === 'auth/email-already-in-use') {
            setError("此 Email 已被註冊，請直接登入");
        } else if (err.code === 'auth/weak-password') {
            setError("密碼強度不足 (至少 6 位數)");
        } else if (err.message.includes('Firebase not initialized')) {
            setError("系統未設定 Firebase，請檢查環境變數");
        } else {
            setError(err.message || "發生錯誤，請稍後再試");
        }
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 relative overflow-hidden font-nunito">
      {/* Background Decor */}
      <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-brand-green/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-80 h-80 bg-brand-black/5 rounded-full blur-3xl"></div>

      <div className="w-full max-w-sm z-10 flex flex-col items-center">
        {/* Logo Area */}
        <div className="mb-10 text-center">
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

        {/* Config Warning Banner */}
        {!isFirebaseReady && (
            <div className="w-full bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 flex items-start gap-3 animate-fade-in-up">
                <AlertTriangle className="text-red-500 shrink-0" size={20} />
                <div>
                    <h3 className="text-xs font-black text-red-600 uppercase mb-1">系統尚未設定</h3>
                    <p className="text-xs text-red-500 leading-relaxed">
                        無法連接到資料庫。請確認您已正確設定 Firebase 環境變數 (API Key 等)。
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

          {error && (
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
                onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
                className="text-sm font-black text-brand-black border-b-2 border-brand-green pb-0.5 hover:opacity-70 transition-opacity"
            >
                {isSignUp ? "直接登入" : "立即註冊"}
            </button>
        </div>

      </div>
    </div>
  );
};
