import React, { createContext, useContext, useState, ReactNode } from 'react';

interface CameraContextType {
  isCameraOpen: boolean;
  setIsCameraOpen: (open: boolean) => void;
}

const CameraContext = createContext<CameraContextType | undefined>(undefined);

export const CameraProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/f343e492-48dd-40e8-b51e-7315ed002144',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CameraContext.tsx:10',message:'CameraProvider rendering',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  return (
    <CameraContext.Provider value={{ isCameraOpen, setIsCameraOpen }}>
      {children}
    </CameraContext.Provider>
  );
};

export const useCamera = () => {
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/f343e492-48dd-40e8-b51e-7315ed002144',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CameraContext.tsx:20',message:'useCamera called',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  const context = useContext(CameraContext);
  if (context === undefined) {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/f343e492-48dd-40e8-b51e-7315ed002144',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CameraContext.tsx:23',message:'useCamera ERROR: context undefined',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    throw new Error('useCamera must be used within a CameraProvider');
  }
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/f343e492-48dd-40e8-b51e-7315ed002144',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CameraContext.tsx:26',message:'useCamera success',data:{isCameraOpen:context.isCameraOpen},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  return context;
};


