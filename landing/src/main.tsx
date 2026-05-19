import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { initPostHog } from './lib/analytics'
import './index.css'
import App from './App.tsx'

// Initialize PostHog before React render so pageview fires correctly
initPostHog()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
