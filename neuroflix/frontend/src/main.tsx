/**
 * main.tsx — Application entry point.
 *
 * Responsibilities:
 * - Mount the React application into the #root element defined in index.html.
 * - Wrap the app in React.StrictMode for additional development-time checks
 *   (highlights unsafe lifecycles, deprecated APIs, accidental side effects).
 *   StrictMode has no effect in production builds; it can be removed if its
 *   double-invocation behavior is undesirable during development.
 * - Import global stylesheets in dependency order so later rules can override
 *   earlier ones: base/global tokens first, feature-specific player styles
 *   next, then animation utilities last.
 */
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/globals.css'
import './styles/player.css'
import './styles/animations.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
