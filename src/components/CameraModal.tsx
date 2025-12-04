import React, { useEffect, useRef, useState } from 'react';
import { X, Zap, Image as ImageIcon } from 'lucide-react';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture?: (base64: string) => void;
  label?: string;
}

export const CameraModal: React.FC<CameraModalProps> = ({ isOpen, onClose, onCapture, label }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      if (!isOpen) return;

      try {
        // Fix: Don't enforce ideal width/height on mobile, let browser decide to avoid black screen
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment' // Prioritize back camera
          },
          audio: false
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Fix: Ensure video plays
          videoRef.current.onloadedmetadata = () => {
             videoRef.current?.play().catch(e => console.error("Play error:", e));
          };
          setHasPermission(true);
        }
      } catch (err) {
        console.error("Camera Error:", err);
        setHasPermission(false);
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isOpen]);

  const handleCaptureClick = () => {
      if (videoRef.current && onCapture) {
          const canvas = document.createElement('canvas');
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
              ctx.drawImage(videoRef.current, 0, 0);
              const base64 = canvas.toDataURL('image/jpeg');
              onCapture(base64);
          }
      }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && onCapture) {
          const reader = new FileReader();
          reader.onloadend = () => {
              onCapture(reader.result as string);
          };
          reader.readAsDataURL(file);
      }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-fade-in h-full w-full">
      {/* Top Bar */}
      <div className="absolute top-0 w-full p-6 flex justify-between items-center z-20">
        <button onClick={onClose} className="p-2 bg-black/50 backdrop-blur text-white rounded-full">
          <X />
        </button>
        <span className="text-white font-bold tracking-widest text-sm">
          {label || 'SCANNER'}
        </span>
        <div className="w-10"></div> 
      </div>

      {/* Camera Viewfinder */}
      <div className="flex-1 bg-black relative flex flex-col justify-center overflow-hidden">
        {hasPermission === false ? (
           <div className="flex flex-col items-center justify-center text-white p-8 text-center">
             <p className="font-bold text-xl mb-2">相機啟動失敗</p>
             <p className="text-gray-400 text-sm mb-4">請確認瀏覽器權限或使用上傳圖片功能。</p>
             <button onClick={() => fileInputRef.current?.click()} className="bg-white text-black px-6 py-2 rounded-full font-bold">
                 選擇圖片
             </button>
           </div>
        ) : (
          // Fix: Ensure video takes full space but maintains aspect ratio
          <video 
            ref={videoRef}
            playsInline 
            muted 
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        
        <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleFileChange} />

        {/* Overlay Guides */}
        {hasPermission && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="w-64 h-64 border-2 border-white/30 rounded-3xl relative">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-brand-green -mt-1 -ml-1 rounded-tl-lg"></div>
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-brand-green -mt-1 -mr-1 rounded-tr-lg"></div>
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-brand-green -mb-1 -ml-1 rounded-bl-lg"></div>
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-brand-green -mb-1 -mr-1 rounded-br-lg"></div>
            </div>
            </div>
        )}
      </div>

      {/* Controls */}
      <div className="h-40 bg-black/80 backdrop-blur-sm flex justify-center items-center gap-12 pb-6 pt-4 shrink-0 z-20">
         <button onClick={() => fileInputRef.current?.click()} className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center active:scale-95 transition-transform">
            <ImageIcon className="text-white" size={20} />
         </button>
         
         <button 
          onClick={handleCaptureClick}
          className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center active:scale-90 transition-transform bg-transparent"
         >
           <div className="w-16 h-16 bg-white rounded-full" />
         </button>

         <button className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center active:scale-95 transition-transform">
             <Zap className="text-white" size={20} />
         </button>
      </div>
    </div>
  );
};