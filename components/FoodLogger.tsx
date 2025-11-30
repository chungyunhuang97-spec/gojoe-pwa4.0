import React from 'react';
import { Camera } from 'lucide-react';

interface FoodLoggerProps {
  onCameraClick: () => void;
}

export const FoodLogger: React.FC<FoodLoggerProps> = ({ onCameraClick }) => {
  return (
    // Fixed container constrained to the max-width of the phone view
    // centering logic: left-1/2 -translate-x-1/2 ensures it stays in the middle of the screen
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full sm:max-w-[420px] z-20 pointer-events-none">
      
      {/* Gradient Fade - Safe area aware */}
      <div className="absolute bottom-0 w-full h-40 bg-gradient-to-t from-brand-gray via-brand-gray/95 to-transparent" />
      
      {/* Content Container - Safe area padding included (pb-6 for iOS home bar) */}
      <div className="relative w-full pb-8 pt-4 flex justify-center items-end pointer-events-auto">
        
        {/* Main Action Button */}
        <button 
          onClick={onCameraClick}
          className="group relative flex items-center justify-center w-20 h-20 bg-brand-black rounded-full shadow-[0_10px_40px_-10px_rgba(204,255,0,0.6)] active:scale-90 transition-all duration-200 hover:shadow-brand-green/40"
          aria-label="Log Food"
        >
            {/* Pulsing effect ring */}
            <div className="absolute inset-0 rounded-full border border-brand-green/30 w-full h-full animate-ping opacity-20"></div>

            <Camera className="w-8 h-8 text-brand-green group-hover:scale-110 transition-transform duration-200" strokeWidth={2.5} />
            
            {/* Notification Badge */}
            <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 rounded-full border-2 border-brand-black text-[10px] text-white font-bold flex items-center justify-center">1</span>
        </button>
      </div>
    </div>
  );
};
