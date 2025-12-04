
import React, { useState, useEffect } from 'react';
import { Key, Globe, Check, Copy, ExternalLink, Shield, LogOut, Zap, LayoutGrid, Terminal } from 'lucide-react';

interface ApiKeySetupProps {
  onComplete: () => void;
  allowSkip?: boolean;
}

export const ApiKeySetup: React.FC<ApiKeySetupProps> = ({ onComplete, allowSkip = false }) => {
  const [activeTab, setActiveTab] = useState<'manual' | 'oauth'>('manual');
  const [inputValue, setInputValue] = useState('');
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [isAuthorizing, setIsAuthorizing] = useState(false);

  useEffect(() => {
    const key = localStorage.getItem('gemini_api_key');
    if (key) setSavedKey(key);
  }, []);

  const handleManualSave = () => {
    if (!inputValue.trim().startsWith('AIza')) {
      setError('無效的 API Key 格式。通常以 "AIza" 開頭。');
      return;
    }
    localStorage.setItem('gemini_api_key', inputValue.trim());
    setSavedKey(inputValue.trim());
    setError('');
    setTimeout(() => onComplete(), 500);
  };

  const handleOAuth = async () => {
    setIsAuthorizing(true);
    try {
      if ((window as any).aistudio) {
        await (window as any).aistudio.openSelectKey();
        // Assume success if no error thrown
        onComplete();
      } else {
        // Fallback for standard web environment mimicking OAuth flow visually
        window.open('https://aistudio.google.com/app/apikey', '_blank');
        setActiveTab('manual'); // Switch to manual so they can paste it
        setError('請在彈出的視窗中建立 Key，並切換至「手動輸入」分頁貼上。');
      }
    } catch (e) {
      console.error(e);
      setError('授權失敗，請嘗試手動輸入。');
    } finally {
      setIsAuthorizing(false);
    }
  };

  const clearKey = () => {
    localStorage.removeItem('gemini_api_key');
    setSavedKey(null);
    setInputValue('');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6 font-nunito">
      <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl animate-fade-in-up border border-gray-100 relative overflow-hidden">
        
        {/* Header */}
        <div className="text-center mb-8 relative z-10">
          <div className="w-16 h-16 bg-brand-black text-brand-green rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-brand-green/20 transform -rotate-3">
             <Key size={32} strokeWidth={2.5} />
          </div>
          <h2 className="text-2xl font-black text-brand-black italic">啟動 AI 教練</h2>
          <p className="text-gray-400 font-bold text-xs mt-2">請設定您的 Google Gemini API Key</p>
        </div>

        {/* Saved State */}
        {savedKey ? (
          <div className="bg-green-50 border border-green-100 rounded-2xl p-6 text-center animate-fade-in">
             <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <Check size={24} strokeWidth={3} />
             </div>
             <h3 className="font-black text-gray-800 text-lg mb-1">已授權</h3>
             <p className="text-xs text-gray-500 font-bold mb-6">您已成功連結 Gemini API</p>
             
             <button 
               onClick={onComplete}
               className="w-full bg-brand-black text-brand-green py-3 rounded-xl font-bold mb-3 shadow-lg hover:shadow-brand-green/20 active:scale-95 transition-all"
             >
               進入 App
             </button>
             
             <button 
               onClick={clearKey}
               className="text-xs font-bold text-gray-400 hover:text-red-500 flex items-center justify-center gap-1 mx-auto py-2"
             >
               <LogOut size={12} /> 清除 Key 並重新設定
             </button>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex bg-gray-50 p-1 rounded-xl mb-6 relative z-10">
              <button
                onClick={() => setActiveTab('manual')}
                className={`flex-1 py-2.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'manual' 
                    ? 'bg-white text-brand-black shadow-md' 
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Terminal size={14} /> 手動輸入
              </button>
              <button
                onClick={() => setActiveTab('oauth')}
                className={`flex-1 py-2.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'oauth' 
                    ? 'bg-white text-brand-black shadow-md' 
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Zap size={14} /> 快速授權
              </button>
            </div>

            {/* Manual Tab */}
            {activeTab === 'manual' && (
              <div className="animate-fade-in space-y-4">
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                   <h4 className="font-black text-gray-800 text-sm mb-3 flex items-center gap-2">
                     <LayoutGrid size={14} className="text-brand-green bg-brand-black rounded p-0.5" /> 
                     獲取步驟
                   </h4>
                   <ol className="space-y-2.5">
                      {[
                        "前往 Google AI Studio",
                        "點擊 'Get API Key'",
                        "選擇 'Create API key'",
                        "複製以 'AIza' 開頭的字串",
                        "貼上至下方欄位"
                      ].map((step, i) => (
                        <li key={i} className="flex items-center gap-3 text-xs font-bold text-gray-500">
                           <span className="w-5 h-5 bg-white rounded-full flex items-center justify-center text-[10px] text-brand-black border border-gray-200 shadow-sm shrink-0">{i+1}</span>
                           {step}
                        </li>
                      ))}
                   </ol>
                   <a 
                     href="https://aistudio.google.com/app/apikey" 
                     target="_blank" 
                     rel="noreferrer"
                     className="mt-4 flex items-center justify-center gap-2 w-full bg-white border border-gray-200 py-2 rounded-lg text-xs font-bold text-brand-black hover:border-brand-green transition-colors"
                   >
                     <ExternalLink size={12} /> 前往 AI Studio 獲取 Key
                   </a>
                </div>

                <div>
                   <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">貼上 API Key</label>
                   <div className="relative">
                      <input 
                        type="password"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="AIzaSy..."
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm font-bold focus:outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 transition-all"
                      />
                      <Shield className="absolute right-3 top-3 text-gray-300" size={16} />
                   </div>
                   {error && <p className="text-red-500 text-[10px] font-bold mt-2 flex items-center gap-1"><Zap size={10} /> {error}</p>}
                </div>

                <button 
                  onClick={handleManualSave}
                  disabled={!inputValue}
                  className="w-full bg-brand-black text-brand-green py-3.5 rounded-xl font-black shadow-lg hover:shadow-brand-green/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  確認並儲存
                </button>
              </div>
            )}

            {/* OAuth Tab */}
            {activeTab === 'oauth' && (
              <div className="animate-fade-in text-center py-4">
                 <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                    <Globe size={32} />
                 </div>
                 <h3 className="font-black text-gray-800 mb-2">Google 帳戶授權</h3>
                 <p className="text-xs text-gray-500 font-bold mb-8 leading-relaxed px-4">
                    使用您的 Google 帳戶快速連結 Gemini API。<br/>
                    <span className="text-[10px] text-gray-400">(如果環境不支援，將引導至手動頁面)</span>
                 </p>
                 
                 <button 
                   onClick={handleOAuth}
                   disabled={isAuthorizing}
                   className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-black shadow-lg shadow-blue-200 active:scale-95 transition-all flex items-center justify-center gap-2"
                 >
                   {isAuthorizing ? '處理中...' : '連結 Google 帳戶'}
                 </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
