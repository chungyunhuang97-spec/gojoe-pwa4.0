
import React, { useState } from 'react';
import { useUser } from '../context/UserContext';
import { Mail, Lock, Loader2, ArrowRight, CheckSquare, Square, Key } from 'lucide-react';
import { aiService } from '../services/ai';

export const Login: React.FC = () => {
  const { login, signup } = useUser();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
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
            if (apiKey.trim()) {
                aiService.saveApiKey(apiKey);
            }
        } else {
            await login(email, password, rememberMe);
        }
    } catch (err: any) {
        console.error(err);
        let msg = "發生錯誤，請稍後再試";
        if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
            msg = "帳號或密碼錯誤";
        } else if (err.code === 'auth/email-already-in-use') {
            msg = "此 Email 已被註冊";
        } else if (err.code === 'auth/weak-password') {
            msg = "密碼強度不足 (至少6位)";
        } else {
            msg = err.message || msg;
        }
        setError(msg);
        alert(msg);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 relative overflow-hidden font-nunito">
      <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-brand-green/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-80 h-80 bg-brand-black/5 rounded-full blur-3xl"></div>

      <div className="w-full max-w-sm z-10 flex flex-col items-center">
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
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3 pl-12 pr-4 font-bold text-gray-800 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 transition-all"
                    placeholder="joe@example.com"
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
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3 pl-12 pr-4 font-bold text-gray-800 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 transition-all"
                    placeholder="••••••••"
                  />
              </div>
          </div>

          {isSignUp && (
              <div className="space-y-1 animate-fade-in">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Gemini API Key (選填)</label>
                  <div className="relative">
                      <div className="absolute left-4 top-3.5 text-gray-400">
                          <Key size={18} />
                      </div>
                      <input 
                        type="password" 
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3 pl-12 pr-4 font-bold text-gray-800 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 transition-all"
                        placeholder="AIzaSy..."
                      />
                  </div>
                  <p className="text-[10px] text-gray-400 ml-1">若略過，之後可在「個人檔案」中設定。</p>
              </div>
          )}

          {!isSignUp && (
              <div 
                className="flex items-center gap-2 cursor-pointer ml-1" 
                onClick={() => setRememberMe(!rememberMe)}
              >
                  {rememberMe ? (
                      <CheckSquare size={18} className="text-brand-green bg-brand-black rounded" />
                  ) : (
                      <Square size={18} className="text-gray-300" />
                  )}
                  <span className="text-xs font-bold text-gray-500">記住我 (保持登入)</span>
              </div>
          )}

          {error && (
              <div className="bg-red-50 text-red-500 text-xs font-bold p-3 rounded-xl border border-red-100 text-center">
                  {error}
              </div>
          )}

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full bg-brand-black text-brand-green py-4 rounded-2xl font-black text-lg shadow-lg hover:shadow-brand-green/20 active:scale-95 transition-all flex items-center justify-center gap-2 mt-4"
          >
             {isLoading ? <Loader2 className="animate-spin" /> : (
                 <>
                    {isSignUp ? "註冊帳號" : "登入"}
                    <ArrowRight size={20} />
                 </>
             )}
          </button>
        </form>
        
        <div className="mt-8 text-center">
            <p className="text-xs font-bold text-gray-400 mb-2">
                {isSignUp ? "已經有帳號了嗎？" : "還沒有帳號？"}
            </p>
            <button 
                onClick={() => { setIsSignUp(!isSignUp); setError(''); setApiKey(''); }}
                className="text-sm font-black text-brand-black border-b-2 border-brand-green pb-0.5 hover:opacity-70 transition-opacity"
            >
                {isSignUp ? "直接登入" : "立即註冊"}
            </button>
        </div>

      </div>
    </div>
  );
};
