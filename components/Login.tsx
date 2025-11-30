
import React from 'react';
import { useUser } from '../context/UserContext';

export const Login: React.FC = () => {
  const { login } = useUser();

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 relative overflow-hidden font-nunito">
      {/* Background Decor */}
      <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-brand-green/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-80 h-80 bg-brand-black/5 rounded-full blur-3xl"></div>

      <div className="w-full max-w-sm z-10 flex flex-col items-center">
        {/* Logo Area */}
        <div className="mb-12 text-center">
          <div className="w-24 h-24 bg-brand-black rounded-[2rem] flex items-center justify-center shadow-2xl shadow-brand-green/20 mb-6 mx-auto transform rotate-3">
             <span className="text-4xl">💪</span>
          </div>
          <h1 className="text-4xl font-black italic tracking-tighter text-brand-black mb-2">
            GO JOE<span className="text-brand-green">!</span>
          </h1>
          <p className="text-gray-400 font-bold text-sm tracking-widest uppercase">你的 AI 飲食教練</p>
        </div>

        {/* Login Card */}
        <div className="w-full space-y-4 animate-fade-in-up">
          <button 
            onClick={login}
            className="w-full bg-white border-2 border-gray-100 p-4 rounded-2xl flex items-center justify-center gap-3 hover:border-brand-green hover:shadow-lg hover:shadow-brand-green/10 transition-all active:scale-95 group"
          >
             <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-6 h-6" alt="Google" />
             <span className="font-extrabold text-gray-700 group-hover:text-black">使用 Google 登入</span>
          </button>
          
          <p className="text-center text-xs font-bold text-gray-300 mt-6 leading-relaxed">
            登入即代表您同意使用條款<br/>
            我們不會在未經許可下發佈任何內容
          </p>
        </div>
      </div>
    </div>
  );
};
    