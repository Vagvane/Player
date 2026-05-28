import { FC, useEffect } from 'react'
import useAuth from './hooks/useAuth'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Header from './components/Layout/Header'
import Footer from './components/Layout/Footer'
import ProtectedRoute from './components/Auth/ProtectedRoute'
import ErrorBoundary from './components/Common/ErrorBoundary'
import HomePage from './pages/HomePage'
import VideoPlayerPage from './pages/VideoPlayerPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import UploadPage from './pages/UploadPage'
import NotFoundPage from './pages/NotFoundPage'

/**
 * App
 *
 * Root application component for NeuroFlix.
 *
 * Structure:
 * - ErrorBoundary wraps the entire tree to catch any uncaught React errors.
 * - BrowserRouter enables client-side routing.
 * - Flexbox column layout: Header (top) -> main content (flex-1) -> Footer (bottom),
 *   filling at least the full viewport height with a dark background.
 *
 * Routes:
 * - Public:  /login, /register
 * - Protected (require authentication): /, /video/:id
 * - 404:     /404 and any unmatched path (redirected to /404)
 *
 * Auth:
 * - On mount, calls checkAuth() from the useAuth hook to validate any stored
 *   token and hydrate the auth state before rendering protected content.
 */
const App: FC = () => {
  const { checkAuth } = useAuth()

  useEffect(() => {
    checkAuth()
  }, [])

  return (
    <ErrorBoundary>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <div className="flex flex-col min-h-screen bg-gray-900">
          <Header />

          <main className="flex-1">
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Protected routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <HomePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/video/:id"
                element={
                  <ProtectedRoute>
                    <VideoPlayerPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/upload"
                element={
                  <ProtectedRoute>
                    <UploadPage />
                  </ProtectedRoute>
                }
              />

              {/* 404 */}
              <Route path="/404" element={<NotFoundPage />} />
              <Route path="*" element={<Navigate to="/404" replace />} />
            </Routes>
          </main>

          <Footer />
        </div>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
