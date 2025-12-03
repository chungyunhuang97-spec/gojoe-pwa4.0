import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './firebaseConfig';

// FORCE UNREGISTER SERVICE WORKER (Fix caching issues)
// This is critical to stop the browser from serving old bundles with the "@" alias error
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister().then(() => {
        console.log('Service Worker Unregistered to force cache clear.');
      });
    }
  });
}

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