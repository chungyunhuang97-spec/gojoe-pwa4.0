
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Skip Service Worker in Google AI Studio / Preview Environments
    // to avoid "Origin Mismatch" errors (iframe origin vs script origin).
    const hostname = window.location.hostname;
    
    // Check for common preview domains
    if (
      hostname.includes('scf.usercontent.goog') || 
      hostname.includes('ai.studio') || 
      hostname.includes('googleusercontent.com')
    ) {
      console.log('NOTICE: Service Worker registration skipped in Preview Environment.');
      return;
    }

    // Use root-relative path to let browser resolve origin automatically
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.warn('SW registration failed:', registrationError);
      });
  });
}
