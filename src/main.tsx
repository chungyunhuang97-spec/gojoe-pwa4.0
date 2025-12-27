import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './firebaseConfig'; // Firebase init is synchronous and fast

// FORCE UNREGISTER SERVICE WORKER (Fix caching issues)
// This is critical to stop the browser from serving old bundles with the "@" alias error
// Run asynchronously to avoid blocking initial render
if ('serviceWorker' in navigator) {
  // Use setTimeout to defer this work and not block initial render
  setTimeout(() => {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister().then(() => {
          console.log('Service Worker Unregistered to force cache clear.');
        }).catch(err => {
          console.warn('Service Worker unregister error:', err);
        });
      }
    }).catch(err => {
      console.warn('Service Worker registration check error:', err);
    });
  }, 0);
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
// #region agent log
fetch('http://127.0.0.1:7244/ingest/f343e492-48dd-40e8-b51e-7315ed002144',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.tsx:32',message:'ReactDOM.render called',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
// #endregion
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);