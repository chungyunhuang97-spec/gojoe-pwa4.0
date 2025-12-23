
import React, { useState } from 'react';
import { useUser } from '../context/UserContext';
import { Loader2 } from 'lucide-react';

export const Login: React.FC = () => {
  const { loginWithGoogle, loginAsGuest } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [isGuestLoading, setIsGuestLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleSignIn = async () => {
    setError('');
    setIsLoading(true);

    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error(err);
      let msg = "發生錯誤，請稍後再試";
      if (err.code === 'auth/popup-closed-by-user') {
        msg = "登入已取消";
      } else if (err.code === 'auth/popup-blocked') {
        msg = "彈出視窗被阻擋，請允許彈出視窗後重試";
      } else if (err.code === 'auth/account-exists-with-different-credential') {
        msg = "此帳號已使用其他方式註冊";
      } else {
        msg = err.message || msg;
      }
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestSignIn = async () => {
    setError('');
    setIsGuestLoading(true);

    try {
      await loginAsGuest();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "訪客登入失敗，請稍後再試");
    } finally {
      setIsGuestLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 relative overflow-hidden font-nunito">
      <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-brand-green/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-80 h-80 bg-brand-black/5 rounded-full blur-3xl"></div>

      <div className="w-full max-w-sm z-10 flex flex-col items-center">
        <div className="mb-10 text-center">
          <div className="w-24 h-24 bg-brand-black rounded-[2rem] flex items-center justify-center shadow-2xl shadow-brand-green/20 mb-6 mx-auto transform rotate-3 overflow-hidden">
             <img src="/logo.png" alt="Go Joe Logo" className="w-20 h-20 object-contain" />
          </div>
          <h1 className="text-4xl font-black italic tracking-tighter text-brand-black mb-2">
            GO JOE<span className="text-brand-green">!</span>
          </h1>
          <p className="text-gray-400 font-bold text-sm tracking-widest uppercase">
              歡迎使用
          </p>
        </div>

        <div className="w-full space-y-4 animate-fade-in-up">
          {error && (
            <div className="bg-red-50 text-red-500 text-xs font-bold p-3 rounded-xl border border-red-100 text-center">
              {error}
            </div>
          )}

          {/* Google Sign-In Button */}
          <button 
            onClick={handleGoogleSignIn}
            disabled={isLoading || isGuestLoading}
            className="w-full bg-white border-2 border-gray-300 text-gray-700 py-4 rounded-2xl font-black text-lg shadow-lg hover:shadow-xl hover:border-gray-400 active:scale-95 transition-all flex items-center justify-center gap-3 mt-4"
          >
             {isLoading ? (
                 <Loader2 className="animate-spin" size={20} />
             ) : (
                 <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <span>使用 Google 帳號登入</span>
                 </>
             )}
          </button>

          {/* Guest Sign-In Button (Developer Mode) */}
          <button 
            onClick={handleGuestSignIn}
            disabled={isLoading || isGuestLoading}
            className="w-full bg-brand-black text-brand-green py-4 rounded-2xl font-black text-lg shadow-lg hover:shadow-xl hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-3 border-2 border-brand-green"
          >
             {isGuestLoading ? (
                 <Loader2 className="animate-spin" size={20} />
             ) : (
                 <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>訪客登入</span>
                 </>
             )}
          </button>
        </div>

      </div>
    </div>
  );
};
