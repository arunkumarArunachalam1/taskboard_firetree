import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AppProvider } from './context/AppContext.tsx'

// Embedded mount first, fall back to dev mount
const container = 
  document.getElementById('react-root') || 
  document.getElementById('root');

if (container) {
  createRoot(container).render(
    <StrictMode>
      <AppProvider>
        <App />
      </AppProvider>
    </StrictMode>,
  )
} else {
  console.error('No mount point found');
}
