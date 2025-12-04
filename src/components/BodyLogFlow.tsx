
import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, Save, RotateCcw, Check, Image as ImageIcon } from 'lucide-react';
import { useUser } from '../context/UserContext';

interface BodyLogFlowProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BodyLogFlow: React.FC<BodyLogFlowProps> = ({ isOpen, onClose }) => {
  const { addBodyLog, profile } = useUser();
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [weight, setWeight] = useState<number>(profile.weight);
  const [step, setStep] = useState<'CAMERA' | 'REVIEW'>('CAMERA');
  const [hasPerm, setHasPerm] = useState<boolean | null>(null);

  // --- Camera Logic ---
  useEffect(() => {
    if (isOpen && step === 'CAMERA') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen, step]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setHasPerm(true);
      }
    } catch (err) {
      console.error(err);
      setHasPerm(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
  };

  const handleCapture = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
      setImagePreview(canvas.toDataURL('image/jpeg'));
      setStep('REVIEW');
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setStep('REVIEW');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (imagePreview) {
      addBodyLog({
        imageUrl: imagePreview,
        weight: weight
      });
      onClose();
      setStep('CAMERA');
      setImagePreview(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col animate-fade-in">
       
       {/* Header */}
       <div className="absolute top-0 left-0 right-0 p-6 z-20 flex justify-between items-center">
          <button onClick={onClose} className="p-2 bg-black/50 backdrop-blur text-white rounded-full">
            <X />
          </button>
          <span className="text-white font-bold tracking-widest text-sm">BODY CHECK</span>
          <div className="w-10" />
       </div>

       {step === 'CAMERA' ? (
         <div className="flex-1 relative bg-gray-900">
            <input 
                type="file" 
                ref={fileInputRef} 
                hidden 
                accept="image/*" 
                onChange={handleFileImport} 
            />

            {hasPerm === false ? (
               <div className="flex items-center justify-center h-full text-white">No Camera Access</div>
            ) : (
               <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            )}
            
            {/* Capture Buttons */}
            <div className="absolute bottom-10 left-0 right-0 flex justify-center gap-12 items-center">
               {/* Capture */}
               <button 
                 onClick={handleCapture}
                 className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center bg-transparent active:scale-95 transition-transform"
               >
                  <div className="w-16 h-16 bg-white rounded-full" />
               </button>

               {/* Import */}
               <button 
                 onClick={() => fileInputRef.current?.click()}
                 className="p-4 bg-white/20 rounded-full text-white backdrop-blur-md active:scale-95 transition-transform"
               >
                  <ImageIcon size={24} />
               </button>
            </div>
         </div>
       ) : (
         <div className="flex-1 relative bg-black flex flex-col">
            <div className="flex-1 relative">
                <img src={imagePreview!} alt="Body Check" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
            </div>

            {/* Review Controls */}
            <div className="bg-white rounded-t-[2.5rem] p-8 -mt-10 relative z-10 animate-fade-in-up">
                <h3 className="text-2xl font-black text-brand-black mb-6">Log Today's Stats</h3>
                
                <label className="block mb-8">
                   <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Current Weight (kg)</span>
                   <div className="flex items-center border-b-2 border-gray-100 focus-within:border-brand-green transition-colors">
                      <input 
                        type="number" 
                        value={weight}
                        onChange={(e) => setWeight(Number(e.target.value))}
                        className="flex-1 text-4xl font-black text-brand-black py-2 outline-none bg-transparent"
                      />
                      <span className="text-gray-400 font-bold">KG</span>
                   </div>
                </label>

                <div className="flex gap-4">
                    <button 
                       onClick={() => { setStep('CAMERA'); setImagePreview(null); }}
                       className="p-4 bg-gray-100 rounded-full text-gray-500"
                    >
                       <RotateCcw size={24} />
                    </button>
                    <button 
                       onClick={handleSave}
                       className="flex-1 bg-brand-green text-brand-black font-bold text-lg rounded-full flex items-center justify-center gap-2 shadow-lg shadow-brand-green/20 active:scale-95 transition-transform"
                    >
                       <Save size={20} />
                       <span>Save Record</span>
                    </button>
                </div>
            </div>
         </div>
       )}
    </div>
  );
};
