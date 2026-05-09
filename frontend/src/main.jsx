import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

// Helps debugging blank/white screens by surfacing uncaught runtime errors.
const showError = (title, err) => {
  let errorContainer = document.getElementById('error-container');
  if (!errorContainer) {
    errorContainer = document.createElement('div');
    errorContainer.id = 'error-container';
    document.body.prepend(errorContainer);
  }
  errorContainer.innerHTML = `
    <div style="padding: 20px; background: #FEF2F2; color: #991B1B; font-family: sans-serif; border: 2px solid #FECACA; border-radius: 8px; margin: 20px; position: relative; z-index: 9999;">
      <h2 style="margin-top: 0">${title}</h2>
      <pre style="white-space: pre-wrap; font-size: 14px;">${err?.stack || err?.message || err}</pre>
      <p style="font-size: 13px; opacity: 0.8; margin-bottom: 0">Check the browser console for more details.</p>
    </div>
  `;
};

window.addEventListener('error', (event) => {
  const err = event.error;
  console.error('Uncaught error:', err);
  showError('Critical Runtime Error', err);
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  console.error('Unhandled rejection:', reason);
  showError('Unhandled Promise Rejection', reason);
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
