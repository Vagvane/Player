# NEUROFLIX VIDEO PLAYER - IMPLEMENTATION PROMPTS
## Part 2: Frontend Components - COMPLETE
## Full Technical Prompt Engineering Document

**Part**: 2 of 5
**Status**: ✅ COMPLETE - All 42 Prompts
**Focus**: All React Components (VideoPlayer, Timeline, Checkpoint, Watermark, Auth, Layout, Pages, Styles, Config)
**Prerequisites**: Part 1 must be completed (Types, Utils, Services, Stores, Hooks)
**Target**: Claude Code AI
**Environment**: Windows
**Date**: May 24th, 2026

---

## 📊 PART 2 COMPLETION STATUS

| Section | Prompts | Status |
|---------|---------|--------|
| 2.1: Video Player Core | 8 | ✅ Complete |
| 2.2: Timeline Components | 6 | ✅ Complete |
| 2.3: Checkpoint Components | 5 | ✅ Complete |
| 2.4: Watermark Component | 2 | ✅ Complete |
| 2.5: Auth Components | 4 | ✅ Complete |
| 2.6: Layout Components | 4 | ✅ Complete |
| 2.7: Common Components | 3 | ✅ Complete |
| 2.8: Page Components | 4 | ✅ Complete |
| 2.9: Styles (CSS) | 3 | ✅ Complete |
| 2.10: Config Files | 2 | ✅ Complete |
| 2.11: Main App Files | 3 | ✅ Complete |
| **TOTAL** | **42** | **✅ COMPLETE** |

---

## ⚠️ IMPORTANT NOTICE

**This document references the first 25 prompts from NEUROFLIX_IMPLEMENTATION_PROMPTS_PART2_FRONTEND_COMPONENTS.md**

**Sections 2.1 - 2.5 (Prompts 1-25)**: See separate file
**Sections 2.6 - 2.11 (Prompts 26-42)**: Documented below

---

## SECTION 2.6: LAYOUT COMPONENTS

### PROMPT 2.6.1: Create Header Component

```
Create the Header component for site navigation.

File: frontend/src/components/Layout/Header.tsx

Requirements:

1. Imports:
   - React: { FC }
   - Link, useNavigate from 'react-router-dom'
   - useAuth from '../../hooks/useAuth'

2. No props

3. Component implementation:

   a) Get auth state:
      - const { user, isAuthenticated, logout } = useAuth()
      - const navigate = useNavigate()

   b) Handle logout:
      ```typescript
      const handleLogout = () => {
        logout()
        navigate('/login')
      }
      ```

   c) Render:
      ```tsx
      return (
        <header className="bg-gray-900 border-b border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <Link to="/" className="flex items-center">
                <span className="text-2xl font-bold text-red-600">
                  Neuroflix
                </span>
              </Link>

              {/* Navigation */}
              <nav className="flex items-center gap-6">
                {isAuthenticated ? (
                  <>
                    <Link
                      to="/"
                      className="text-gray-300 hover:text-white transition-colors"
                    >
                      Home
                    </Link>

                    {/* User menu */}
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-400">
                        {user?.email}
                      </span>
                      <button
                        onClick={handleLogout}
                        className="
                          px-4 py-2 rounded
                          bg-gray-800 hover:bg-gray-700
                          text-white text-sm
                          transition-colors
                        "
                      >
                        Logout
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      className="text-gray-300 hover:text-white transition-colors"
                    >
                      Login
                    </Link>
                    <Link
                      to="/register"
                      className="
                        px-4 py-2 rounded
                        bg-red-600 hover:bg-red-700
                        text-white text-sm font-medium
                        transition-colors
                      "
                    >
                      Sign Up
                    </Link>
                  </>
                )}
              </nav>
            </div>
          </div>
        </header>
      )
      ```

4. Styling:
   - Dark background (bg-gray-900)
   - Fixed height (h-16)
   - Responsive padding
   - Hover states on links

5. Responsive design:
   - Hide email on mobile (<640px)
   - Hamburger menu for mobile (optional enhancement)

6. Export as default

Add JSDoc.
Output the complete component file.
```

### PROMPT 2.6.2: Create Footer Component

```
Create the Footer component.

File: frontend/src/components/Layout/Footer.tsx

Requirements:

1. Imports:
   - React: { FC }

2. No props

3. Component implementation:

   a) Render:
      ```tsx
      return (
        <footer className="bg-gray-900 border-t border-gray-800 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              {/* Copyright */}
              <p className="text-sm text-gray-400">
                © {new Date().getFullYear()} Neuroflix. All rights reserved.
              </p>

              {/* Links */}
              <div className="flex items-center gap-6">
                <a
                  href="#"
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  About
                </a>
                <a
                  href="#"
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Privacy
                </a>
                <a
                  href="#"
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Terms
                </a>
              </div>
            </div>
          </div>
        </footer>
      )
      ```

4. Styling:
   - Dark background matching header
   - Centered content
   - Responsive layout (stacks on mobile)

5. Dynamic year:
   - Uses JavaScript Date() for current year

6. Export as default

Add JSDoc.
Output the complete component file.
```

### PROMPT 2.6.3: Create Container Component

```
Create the Container component for consistent max-width layouts.

File: frontend/src/components/Layout/Container.tsx

Requirements:

1. Imports:
   - React: { FC, ReactNode }

2. Props interface (ContainerProps):
   - children: ReactNode
   - className?: string
   - maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '7xl' (default: '7xl')

3. Component implementation:

   a) Max-width mapping:
      ```typescript
      const maxWidthClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl',
        '7xl': 'max-w-7xl'
      }
      ```

   b) Render:
      ```tsx
      return (
        <div
          className={`
            ${maxWidthClasses[maxWidth || '7xl']}
            mx-auto px-4 sm:px-6 lg:px-8
            ${className || ''}
          `}
        >
          {children}
        </div>
      )
      ```

4. Usage:
   - Wrap page content for consistent width
   - Responsive padding
   - Centered layout

5. Export as default

Add JSDoc with usage example.
Output the complete component file.
```

### PROMPT 2.6.4: Create Layout Index File

```
Create barrel export for Layout components.

File: frontend/src/components/Layout/index.ts

Requirements:
- Export { default as Header } from './Header'
- Export { default as Footer } from './Footer'
- Export { default as Container } from './Container'

Output the complete index file.
```

---

## SECTION 2.7: COMMON/SHARED COMPONENTS

### PROMPT 2.7.1: Create LoadingSpinner Component

```
Create a reusable LoadingSpinner component.

File: frontend/src/components/Common/LoadingSpinner.tsx

Requirements:

1. Imports:
   - React: { FC }

2. Props interface (LoadingSpinnerProps):
   - size?: 'sm' | 'md' | 'lg' | 'xl' (default: 'md')
   - className?: string
   - fullScreen?: boolean (default: false)

3. Component implementation:

   a) Size mapping:
      ```typescript
      const sizeClasses = {
        sm: 'w-8 h-8 border-2',
        md: 'w-12 h-12 border-3',
        lg: 'w-16 h-16 border-4',
        xl: 'w-24 h-24 border-4'
      }
      ```

   b) Spinner element:
      ```tsx
      const spinner = (
        <div
          className={`
            ${sizeClasses[size || 'md']}
            border-white border-t-transparent
            rounded-full
            animate-spin
            ${className || ''}
          `}
          role="status"
          aria-label="Loading"
        >
          <span className="sr-only">Loading...</span>
        </div>
      )
      ```

   c) Render:
      ```tsx
      if (fullScreen) {
        return (
          <div className="fixed inset-0 flex items-center justify-center bg-gray-900 z-50">
            {spinner}
          </div>
        )
      }

      return spinner
      ```

4. Animation:
   - Use Tailwind's animate-spin
   - Smooth rotation

5. Accessibility:
   - ARIA role="status"
   - Screen reader text

6. Full screen mode:
   - Covers entire viewport
   - Centered spinner
   - Dark overlay

7. Export as default

Add JSDoc with size options.
Output the complete component file.
```

### PROMPT 2.7.2: Create ErrorBoundary Component

```
Create ErrorBoundary component for catching React errors.

File: frontend/src/components/Common/ErrorBoundary.tsx

Requirements:

1. Imports:
   - React: { Component, ReactNode, ErrorInfo }

2. Props interface (ErrorBoundaryProps):
   - children: ReactNode
   - fallback?: ReactNode (optional custom error UI)

3. State interface (ErrorBoundaryState):
   - hasError: boolean
   - error: Error | null

4. Class component implementation:

   a) Initial state:
      ```typescript
      state: ErrorBoundaryState = {
        hasError: false,
        error: null
      }
      ```

   b) Static getDerivedStateFromError:
      ```typescript
      static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return {
          hasError: true,
          error
        }
      }
      ```

   c) componentDidCatch:
      ```typescript
      componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // Log error to console or error reporting service
        console.error('Error caught by boundary:', error, errorInfo)

        // TODO: Send to error reporting service (Sentry, LogRocket, etc.)
      }
      ```

   d) Reset error:
      ```typescript
      resetError = () => {
        this.setState({
          hasError: false,
          error: null
        })
      }
      ```

   e) Render:
      ```tsx
      render() {
        if (this.state.hasError) {
          // Use custom fallback if provided
          if (this.props.fallback) {
            return this.props.fallback
          }

          // Default error UI
          return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
              <div className="max-w-md w-full bg-gray-800 rounded-lg p-6 text-center">
                <h2 className="text-2xl font-bold text-white mb-4">
                  Something went wrong
                </h2>
                <p className="text-gray-400 mb-6">
                  We're sorry for the inconvenience. Please try refreshing the page.
                </p>
                <button
                  onClick={this.resetError}
                  className="
                    px-6 py-3 rounded
                    bg-red-600 hover:bg-red-700
                    text-white font-medium
                    transition-colors
                  "
                >
                  Try Again
                </button>
              </div>
            </div>
          )
        }

        return this.props.children
      }
      ```

5. Usage example (in comments):
   ```tsx
   // Wrap app or specific components:
   <ErrorBoundary>
     <App />
   </ErrorBoundary>
   ```

6. Error logging:
   - Console.error for development
   - TODO comment for production error service

7. Export as default

Add comprehensive JSDoc explaining error boundary concept.
Output the complete component file.
```

### PROMPT 2.7.3: Create Common Index File

```
Create barrel export for Common components.

File: frontend/src/components/Common/index.ts

Requirements:
- Export { default as LoadingSpinner } from './LoadingSpinner'
- Export { default as ErrorBoundary } from './ErrorBoundary'

Output the complete index file.
```

---

## SECTION 2.8: PAGE COMPONENTS

### PROMPT 2.8.1: Create HomePage Component

```
Create the HomePage component listing available videos.

File: frontend/src/components/pages/HomePage.tsx

Requirements:

1. Imports:
   - React: { FC, useEffect, useState }
   - Link from 'react-router-dom'
   - videoService from '../services/videoService'
   - LoadingSpinner from '../components/Common/LoadingSpinner'
   - Container from '../components/Layout/Container'
   - type { Video } from '../types/video'

2. No props

3. Component implementation:

   a) State:
      - videos: Video[]
      - isLoading: boolean
      - error: string | null

   b) Fetch videos on mount:
      ```typescript
      useEffect(() => {
        const fetchVideos = async () => {
          setIsLoading(true)
          try {
            const data = await videoService.getAllVideos()
            setVideos(data)
          } catch (err: any) {
            setError(err.message || 'Failed to load videos')
          } finally {
            setIsLoading(false)
          }
        }

        fetchVideos()
      }, [])
      ```

   c) Render:
      ```tsx
      return (
        <Container className="py-8">
          <h1 className="text-4xl font-bold text-white mb-8">
            Training Videos
          </h1>

          {/* Loading state */}
          {isLoading && (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-500 px-6 py-4 rounded-lg">
              {error}
            </div>
          )}

          {/* Videos grid */}
          {!isLoading && !error && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {videos.map((video) => (
                <Link
                  key={video.id}
                  to={`/video/${video.id}`}
                  className="
                    group
                    bg-gray-800 rounded-lg overflow-hidden
                    hover:bg-gray-700 transition-colors
                  "
                >
                  {/* Thumbnail placeholder */}
                  <div className="aspect-video bg-gray-700 flex items-center justify-center">
                    <svg className="w-16 h-16 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </div>

                  {/* Video info */}
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-red-500 transition-colors">
                      {video.title}
                    </h3>
                    {video.description && (
                      <p className="text-sm text-gray-400 line-clamp-2">
                        {video.description}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      {Math.floor(video.duration / 60)} minutes
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !error && videos.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg">
                No videos available yet.
              </p>
            </div>
          )}
        </Container>
      )
      ```

4. Responsive grid:
   - 1 column on mobile
   - 2 columns on tablet
   - 3 columns on desktop

5. Video cards:
   - Thumbnail (placeholder for now)
   - Title, description, duration
   - Hover effects

6. Error and loading states:
   - Loading spinner
   - Error message
   - Empty state

7. Export as default

Add JSDoc.
Output the complete component file.
```

### PROMPT 2.8.2: Create VideoPlayerPage Component

```
Create the VideoPlayerPage component wrapping the video player.

File: frontend/src/components/pages/VideoPlayerPage.tsx

Requirements:

1. Imports:
   - React: { FC, useEffect, useState }
   - useParams, useNavigate from 'react-router-dom'
   - VideoPlayer from '../components/VideoPlayer/VideoPlayer'
   - LoadingSpinner from '../components/Common/LoadingSpinner'
   - Container from '../components/Layout/Container'
   - useVideoData from '../hooks/useVideoData'
   - checkpointService from '../services/checkpointService'

2. No props (uses route params)

3. Component implementation:

   a) Get video ID from URL:
      - const { id } = useParams<{ id: string }>()
      - const navigate = useNavigate()

   b) Use video data hook:
      - const { videoData, isLoading, error, retry } = useVideoData(id || '')

   c) Handle answer submission:
      ```typescript
      const handleAnswerSubmitted = async (checkpointId: string, isCorrect: boolean) => {
        console.log('Answer submitted:', { checkpointId, isCorrect })

        // Optional: Show feedback to user
        // Optional: Track analytics
      }
      ```

   d) Render:
      ```tsx
      return (
        <div className="min-h-screen bg-gray-900 py-8">
          <Container maxWidth="7xl">
            {/* Loading state */}
            {isLoading && (
              <div className="flex justify-center py-24">
                <LoadingSpinner size="xl" />
              </div>
            )}

            {/* Error state */}
            {error && (
              <div className="max-w-2xl mx-auto">
                <div className="bg-red-500/10 border border-red-500 text-red-500 px-6 py-4 rounded-lg mb-4">
                  {error}
                </div>
                <button
                  onClick={retry}
                  className="px-6 py-3 rounded bg-red-600 hover:bg-red-700 text-white font-medium transition-colors"
                >
                  Retry
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="ml-4 px-6 py-3 rounded bg-gray-700 hover:bg-gray-600 text-white font-medium transition-colors"
                >
                  Go Back
                </button>
              </div>
            )}

            {/* Video player */}
            {videoData && !isLoading && !error && (
              <>
                <VideoPlayer
                  videoData={videoData}
                  onAnswerSubmitted={handleAnswerSubmitted}
                />

                {/* Video info */}
                <div className="mt-8 max-w-7xl mx-auto">
                  <h1 className="text-3xl font-bold text-white mb-4">
                    {/* Get title from videoData if available */}
                    Video Title
                  </h1>
                  <p className="text-gray-400">
                    {/* Get description if available */}
                  </p>
                </div>
              </>
            )}
          </Container>
        </div>
      )
      ```

4. Error handling:
   - Show error message
   - Retry button
   - Back to home button

5. Loading state:
   - Centered spinner
   - Adequate spacing

6. Video info:
   - Below player
   - Title and description
   - Checkpoint progress (optional)

7. Export as default

Add JSDoc.
Output the complete component file.
```

### PROMPT 2.8.3: Create LoginPage Component

```
Create the LoginPage component.

File: frontend/src/components/pages/LoginPage.tsx

Requirements:

1. Imports:
   - React: { FC }
   - LoginForm from '../components/Auth/LoginForm'
   - Container from '../components/Layout/Container'

2. No props

3. Component implementation:

   a) Render:
      ```tsx
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center py-12">
          <Container maxWidth="md">
            <LoginForm />
          </Container>
        </div>
      )
      ```

4. Styling:
   - Full height
   - Centered vertically and horizontally
   - Dark background

5. Simple wrapper:
   - Just contains LoginForm
   - Provides layout context

6. Export as default

Add JSDoc.
Output the complete component file.
```

### PROMPT 2.8.4: Create NotFoundPage Component

```
Create the 404 NotFoundPage component.

File: frontend/src/components/pages/NotFoundPage.tsx

Requirements:

1. Imports:
   - React: { FC }
   - Link from 'react-router-dom'
   - Container from '../components/Layout/Container'

2. No props

3. Component implementation:

   a) Render:
      ```tsx
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center py-12">
          <Container maxWidth="md">
            <div className="text-center">
              <h1 className="text-9xl font-bold text-white mb-4">
                404
              </h1>
              <h2 className="text-3xl font-semibold text-white mb-4">
                Page Not Found
              </h2>
              <p className="text-gray-400 mb-8">
                The page you're looking for doesn't exist or has been moved.
              </p>
              <Link
                to="/"
                className="
                  inline-block px-8 py-3 rounded
                  bg-red-600 hover:bg-red-700
                  text-white font-medium
                  transition-colors
                "
              >
                Go Home
              </Link>
            </div>
          </Container>
        </div>
      )
      ```

4. Styling:
   - Large 404 text
   - Centered layout
   - Call-to-action button to home

5. User-friendly:
   - Clear message
   - Easy navigation back

6. Export as default

Add JSDoc.
Output the complete component file.
```

---

## SECTION 2.9: STYLES (CSS)

### PROMPT 2.9.1: Create Custom Player Styles

```
Create custom CSS for video player animations and styles.

File: frontend/src/styles/player.css

Requirements:

1. Fade-in animation:
   ```css
   @keyframes fadeIn {
     from {
       opacity: 0;
     }
     to {
       opacity: 1;
     }
   }

   .animate-fadeIn {
     animation: fadeIn 0.3s ease-out;
   }
   ```

2. Slide-up animation:
   ```css
   @keyframes slideUp {
     from {
       transform: translateY(20px);
       opacity: 0;
     }
     to {
       transform: translateY(0);
       opacity: 1;
     }
   }

   .animate-slideUp {
     animation: slideUp 0.2s ease-out;
   }
   ```

3. Custom scrollbar (for future use):
   ```css
   /* Custom scrollbar */
   ::-webkit-scrollbar {
     width: 8px;
     height: 8px;
   }

   ::-webkit-scrollbar-track {
     background: #1f1f1f;
   }

   ::-webkit-scrollbar-thumb {
     background: #4a4a4a;
     border-radius: 4px;
   }

   ::-webkit-scrollbar-thumb:hover {
     background: #606060;
   }
   ```

4. Video element styles:
   ```css
   video {
     width: 100%;
     height: 100%;
     object-fit: contain;
   }

   /* Remove focus outline from video */
   video:focus {
     outline: none;
   }
   ```

5. Custom range slider styles:
   ```css
   /* Volume slider custom styles */
   input[type="range"] {
     -webkit-appearance: none;
     appearance: none;
     background: transparent;
   }

   input[type="range"]::-webkit-slider-thumb {
     -webkit-appearance: none;
     appearance: none;
     width: 12px;
     height: 12px;
     background: white;
     border-radius: 50%;
     cursor: pointer;
   }

   input[type="range"]::-moz-range-thumb {
     width: 12px;
     height: 12px;
     background: white;
     border-radius: 50%;
     cursor: pointer;
     border: none;
   }
   ```

6. Export/import:
   - Import this in main.tsx: `import './styles/player.css'`

Add comments explaining each section.
Output the complete CSS file.
```

### PROMPT 2.9.2: Create Global Styles

```
Create global CSS styles and Tailwind directives.

File: frontend/src/styles/globals.css

Requirements:

1. Tailwind directives:
   ```css
   @tailwind base;
   @tailwind components;
   @tailwind utilities;
   ```

2. Custom CSS variables:
   ```css
   :root {
     /* Colors */
     --color-bg-primary: #141414;
     --color-bg-secondary: #1f1f1f;
     --color-bg-tertiary: #2a2a2a;

     --color-text-primary: #ffffff;
     --color-text-secondary: #b3b3b3;
     --color-text-tertiary: #808080;

     --color-accent-red: #e50914;
     --color-accent-red-hover: #f40612;

     --color-buffer: #4a4a4a;
     --color-checkpoint: #ffd700;

     /* Shadows */
     --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.3);
     --shadow-md: 0 4px 8px rgba(0, 0, 0, 0.4);
     --shadow-lg: 0 8px 16px rgba(0, 0, 0, 0.5);
   }
   ```

3. Base styles:
   ```css
   * {
     box-sizing: border-box;
     margin: 0;
     padding: 0;
   }

   html,
   body {
     height: 100%;
     font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
                  "Helvetica Neue", Arial, sans-serif;
     -webkit-font-smoothing: antialiased;
     -moz-osx-font-smoothing: grayscale;
   }

   body {
     background-color: var(--color-bg-primary);
     color: var(--color-text-primary);
   }

   #root {
     min-height: 100%;
     display: flex;
     flex-direction: column;
   }
   ```

4. Utility classes:
   ```css
   .line-clamp-2 {
     display: -webkit-box;
     -webkit-line-clamp: 2;
     -webkit-box-orient: vertical;
     overflow: hidden;
   }

   .line-clamp-3 {
     display: -webkit-box;
     -webkit-line-clamp: 3;
     -webkit-box-orient: vertical;
     overflow: hidden;
   }
   ```

Add comments for organization.
Output the complete CSS file.
```

### PROMPT 2.9.3: Create Animations CSS

```
Create additional animation keyframes.

File: frontend/src/styles/animations.css

Requirements:

1. Pulse animation:
   ```css
   @keyframes pulse {
     0%, 100% {
       opacity: 1;
     }
     50% {
       opacity: 0.5;
     }
   }

   .animate-pulse-slow {
     animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
   }
   ```

2. Scale animation:
   ```css
   @keyframes scaleUp {
     from {
       transform: scale(0.95);
       opacity: 0;
     }
     to {
       transform: scale(1);
       opacity: 1;
     }
   }

   .animate-scaleUp {
     animation: scaleUp 0.2s ease-out;
   }
   ```

3. Shimmer animation (loading skeleton):
   ```css
   @keyframes shimmer {
     0% {
       background-position: -1000px 0;
     }
     100% {
       background-position: 1000px 0;
     }
   }

   .animate-shimmer {
     animation: shimmer 2s infinite linear;
     background: linear-gradient(
       to right,
       #1f1f1f 0%,
       #2a2a2a 50%,
       #1f1f1f 100%
     );
     background-size: 1000px 100%;
   }
   ```

4. Bounce animation:
   ```css
   @keyframes bounce {
     0%, 100% {
       transform: translateY(0);
     }
     50% {
       transform: translateY(-10px);
     }
   }

   .animate-bounce-slow {
     animation: bounce 2s infinite;
   }
   ```

Add comments explaining each animation.
Output the complete CSS file.
```

---

## SECTION 2.10: CONFIGURATION FILES

### PROMPT 2.10.1: Create Checkpoints Configuration

```
Create the checkpoints.json configuration file with sample questions.

File: frontend/src/config/checkpoints.json

Requirements:

1. JSON structure:
   ```json
   {
     "test-video-1": [
       {
         "id": "cp-test-1-01",
         "videoId": "test-video-1",
         "timestamp": 15,
         "question": "What is the main benefit of HLS (HTTP Live Streaming)?",
         "options": [
           "Better video quality than MP4",
           "Adaptive bitrate streaming",
           "Smaller file sizes",
           "Faster uploads to server"
         ],
         "correctAnswer": 1,
         "explanation": "HLS enables adaptive bitrate streaming, which automatically adjusts video quality based on the viewer's network conditions."
       },
       {
         "id": "cp-test-1-02",
         "videoId": "test-video-1",
         "timestamp": 45,
         "question": "Which codec is primarily used for video compression in HLS?",
         "options": [
           "VP9",
           "AV1",
           "H.264 (AVC)",
           "MPEG-2"
         ],
         "correctAnswer": 2,
         "explanation": "H.264 (also known as AVC) is the most widely used codec for HLS streaming due to its excellent compression and broad device support."
       },
       {
         "id": "cp-test-1-03",
         "videoId": "test-video-1",
         "timestamp": 90,
         "question": "What is the typical segment duration for HLS videos?",
         "options": [
           "1-2 seconds",
           "4-10 seconds",
           "30 seconds",
           "1 minute"
         ],
         "correctAnswer": 1,
         "explanation": "HLS typically uses 4-10 second segments, with 6 seconds being common. This balances quality switching responsiveness with overhead."
       },
       {
         "id": "cp-test-1-04",
         "videoId": "test-video-1",
         "timestamp": 150,
         "question": "Why is video segmentation important for download prevention?",
         "options": [
           "It makes videos load faster",
           "It prevents single-file downloads",
           "It improves video quality",
           "It reduces storage costs"
         ],
         "correctAnswer": 1,
         "explanation": "Segmentation prevents casual downloading because there's no single URL for the complete video. Users would need specialized tools to reassemble hundreds of segments."
       }
     ],
     "sample-video-2": [
       {
         "id": "cp-sample-2-01",
         "videoId": "sample-video-2",
         "timestamp": 30,
         "question": "What does CDN stand for?",
         "options": [
           "Content Delivery Network",
           "Central Data Network",
           "Cloud Distribution Node",
           "Content Download Network"
         ],
         "correctAnswer": 0,
         "explanation": "CDN stands for Content Delivery Network. It's a geographically distributed network of servers that deliver content from the closest location to users."
       },
       {
         "id": "cp-sample-2-02",
         "videoId": "sample-video-2",
         "timestamp": 75,
         "question": "What is the main advantage of using a CDN for video delivery?",
         "options": [
           "Cheaper storage",
           "Better video editing",
           "Faster loading and reduced latency",
           "Automatic video transcoding"
         ],
         "correctAnswer": 2,
         "explanation": "CDNs reduce latency by serving content from edge servers located closer to users, resulting in faster loading times and better user experience."
       }
     ]
   }
   ```

2. Structure requirements:
   - Keys: videoId
   - Values: Array of checkpoint objects
   - Each checkpoint:
     * Unique id
     * videoId reference
     * timestamp in seconds
     * question text
     * Exactly 4 options (array)
     * correctAnswer (0-3 index)
     * explanation (optional)

3. Usage:
   - Import in components: `import checkpointsData from '../config/checkpoints.json'`
   - Look up by videoId: `checkpointsData[videoId]`

Add comments in separate README explaining the structure.
Output the complete JSON file with at least 2 videos with 2-4 questions each.
```

### PROMPT 2.10.2: Create Videos Configuration

```
Create the videos.json configuration file with sample video metadata.

File: frontend/src/config/videos.json

Requirements:

1. JSON structure:
   ```json
   {
     "videos": [
       {
         "id": "test-video-1",
         "title": "Introduction to Video Streaming",
         "description": "Learn the fundamentals of video streaming, including HLS, adaptive bitrate, and CDN delivery.",
         "duration": 180,
         "thumbnailUrl": null,
         "createdAt": "2026-05-20T10:00:00Z"
       },
       {
         "id": "sample-video-2",
         "title": "Content Delivery Networks Explained",
         "description": "Understanding how CDNs work and why they're essential for video delivery at scale.",
         "duration": 120,
         "thumbnailUrl": null,
         "createdAt": "2026-05-21T14:30:00Z"
       },
       {
         "id": "demo-video-3",
         "title": "Video Security Best Practices",
         "description": "Explore techniques for protecting video content including DRM, encryption, and watermarking.",
         "duration": 240,
         "thumbnailUrl": null,
         "createdAt": "2026-05-22T09:15:00Z"
       }
     ]
   }
   ```

2. Structure requirements:
   - Array of video objects
   - Each video:
     * Unique id (matches checkpoint config)
     * title
     * description
     * duration in seconds
     * thumbnailUrl (null for now, can be URL later)
     * createdAt (ISO 8601 date string)

3. Usage:
   - Import: `import videosData from '../config/videos.json'`
   - Mock data for development
   - Replace with API calls in production

Add comment explaining this is mock data.
Output the complete JSON file with 3-5 sample videos.
```

---

## SECTION 2.11: MAIN APPLICATION FILES

### PROMPT 2.11.1: Create App.tsx (Main Application Component)

```
Create the main App.tsx component with routing.

File: frontend/src/App.tsx

Requirements:

1. Imports:
   - React: { FC, useEffect }
   - BrowserRouter, Routes, Route, Navigate from 'react-router-dom'
   - Header from './components/Layout/Header'
   - Footer from './components/Layout/Footer'
   - ProtectedRoute from './components/Auth/ProtectedRoute'
   - ErrorBoundary from './components/Common/ErrorBoundary'
   - HomePage from './pages/HomePage'
   - VideoPlayerPage from './pages/VideoPlayerPage'
   - LoginPage from './pages/LoginPage'
   - NotFoundPage from './pages/NotFoundPage'
   - useAuth from './hooks/useAuth'

2. Component implementation:

   a) Get auth:
      - const { checkAuth } = useAuth()

   b) Check auth on mount:
      ```typescript
      useEffect(() => {
        checkAuth()
      }, [])
      ```

   c) Render:
      ```tsx
      return (
        <ErrorBoundary>
          <BrowserRouter>
            <div className="flex flex-col min-h-screen bg-gray-900">
              <Header />

              <main className="flex-1">
                <Routes>
                  {/* Public routes */}
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<LoginPage />} /> {/* Reuse LoginPage or create RegisterPage */}

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
      ```

3. Layout:
   - Flexbox column layout
   - Header, main (flex-1), footer
   - Full viewport height

4. Error boundary:
   - Wraps entire app
   - Catches all React errors

5. Auth check:
   - Runs on app mount
   - Validates stored token

6. Export as default

Add JSDoc explaining app structure.
Output the complete component file.
```

### PROMPT 2.11.2: Create main.tsx (Entry Point)

```
Create the main.tsx entry point file.

File: frontend/src/main.tsx

Requirements:

1. Imports:
   ```typescript
   import React from 'react'
   import ReactDOM from 'react-dom/client'
   import App from './App'
   import './styles/globals.css'
   import './styles/player.css'
   import './styles/animations.css'
   ```

2. Render app:
   ```typescript
   ReactDOM.createRoot(document.getElementById('root')!).render(
     <React.StrictMode>
       <App />
     </React.StrictMode>
   )
   ```

3. StrictMode:
   - Enabled for development checks
   - Can be removed for production if needed

4. Mount point:
   - Targets #root element in index.html

5. Style imports:
   - Import all CSS files
   - Order: globals → player → animations

Add comments explaining entry point.
Output the complete file.
```

### PROMPT 2.11.3: Create Vite Configuration

```
Create the vite.config.ts configuration file.

File: frontend/vite.config.ts

Requirements:

1. Imports:
   ```typescript
   import { defineConfig } from 'vite'
   import react from '@vitejs/plugin-react'
   import path from 'path'
   ```

2. Configuration:
   ```typescript
   export default defineConfig({
     plugins: [react()],

     resolve: {
       alias: {
         '@': path.resolve(__dirname, './src')
       }
     },

     server: {
       port: 5173,
       open: true,
       proxy: {
         '/api': {
           target: 'http://localhost:3001',
           changeOrigin: true
         }
       }
     },

     build: {
       outDir: 'dist',
       sourcemap: false,
       rollupOptions: {
         output: {
           manualChunks: {
             'react-vendor': ['react', 'react-dom', 'react-router-dom'],
             'hls-vendor': ['hls.js']
           }
         }
       }
     },

     optimizeDeps: {
       include: ['react', 'react-dom', 'react-router-dom', 'hls.js']
     }
   })
   ```

3. Features:
   - React plugin enabled
   - Path alias: @ → src/
   - Dev server on port 5173
   - API proxy to backend
   - Build optimizations:
     * Code splitting
     * Vendor chunks
     * No source maps in production

4. Export as default

Add comments explaining each section.
Output the complete TypeScript config file.
```

---

## ✅ PART 2 VERIFICATION CHECKLIST

### Component Coverage

- [x] **Video Player Core** (8 prompts)
  - VideoElement, PlayerControls, PlayPauseButton, VolumeControl, TimeDisplay, FullscreenButton, VideoPlayer container, Index

- [x] **Timeline** (6 prompts)
  - Timeline container, ProgressBar, BufferBar, CheckpointMarkers, ThumbnailPreview, Playhead

- [x] **Checkpoint** (5 prompts)
  - QuestionOverlay, Question, AnswerOptions, AnswerButton, Index

- [x] **Watermark** (2 prompts)
  - DynamicWatermark, Index

- [x] **Authentication** (4 prompts)
  - LoginForm, RegisterForm, ProtectedRoute, Index

- [x] **Layout** (4 prompts)
  - Header, Footer, Container, Index

- [x] **Common** (3 prompts)
  - LoadingSpinner, ErrorBoundary, Index

- [x] **Pages** (4 prompts)
  - HomePage, VideoPlayerPage, LoginPage, NotFoundPage

- [x] **Styles** (3 prompts)
  - player.css, globals.css, animations.css

- [x] **Configuration** (2 prompts)
  - checkpoints.json, videos.json

- [x] **Main Files** (3 prompts)
  - App.tsx, main.tsx, vite.config.ts

**Total**: 42/42 prompts ✅

---

## 🔄 CONTINUOUS FLOW VERIFICATION

### Dependencies Between Components

1. **Types → Components**: All components use types from Part 1
2. **Hooks → Components**: All interactive components use custom hooks
3. **Services → Hooks**: Hooks call services for data
4. **Stores → Hooks**: Some hooks access stores
5. **Utils → Components**: formatTime, parseVTT used throughout
6. **Components → Pages**: Pages compose multiple components
7. **Pages → App**: App.tsx routes to all pages
8. **Styles → All**: CSS imported in main.tsx, applies globally

### Data Flow

```
User Action → Component → Hook → Service → API → Backend
                ↓           ↓        ↓
             Store ← ─ ─ ─ ─ ┘        ↓
                ↓                     ↓
            Re-render              Response
```

### File Creation Order

1. ✅ Part 1: Types, Utils, Services, Stores, Hooks
2. ✅ Part 2: Components (bottom-up)
   - Leaf components first (Button, TimeDisplay)
   - Container components next (Timeline, PlayerControls)
   - Page components last (HomePage, VideoPlayerPage)
   - App.tsx final

---

## 📋 IMPLEMENTATION CHECKLIST FOR DEVELOPER

### Phase 1: Core Player (Prompts 2.1.1 - 2.1.8)
- [ ] VideoElement with HLS integration
- [ ] PlayerControls with all buttons
- [ ] PlayPauseButton
- [ ] VolumeControl
- [ ] TimeDisplay
- [ ] FullscreenButton
- [ ] VideoPlayer container
- [ ] Test: Play/pause, seek, volume work

### Phase 2: Timeline (Prompts 2.2.1 - 2.2.6)
- [ ] Timeline container with events
- [ ] ProgressBar
- [ ] BufferBar
- [ ] CheckpointMarkers
- [ ] ThumbnailPreview
- [ ] Playhead
- [ ] Test: Hover shows thumbnail, clicking seeks

### Phase 3: Checkpoints (Prompts 2.3.1 - 2.3.5)
- [ ] QuestionOverlay
- [ ] Question text
- [ ] AnswerOptions grid
- [ ] AnswerButton with states
- [ ] Test: Question appears at timestamp, pause/resume works

### Phase 4: Watermark & Auth (Prompts 2.4.1 - 2.5.4)
- [ ] DynamicWatermark with shifting
- [ ] LoginForm
- [ ] RegisterForm
- [ ] ProtectedRoute
- [ ] Test: Watermark visible, shifts every 60s, auth works

### Phase 5: Layout & Pages (Prompts 2.6.1 - 2.8.4)
- [ ] Header with navigation
- [ ] Footer
- [ ] Container
- [ ] LoadingSpinner
- [ ] ErrorBoundary
- [ ] HomePage with video grid
- [ ] VideoPlayerPage
- [ ] LoginPage
- [ ] NotFoundPage
- [ ] Test: Navigation works, pages load

### Phase 6: Styles & Config (Prompts 2.9.1 - 2.10.2)
- [ ] player.css with animations
- [ ] globals.css with theme
- [ ] animations.css
- [ ] checkpoints.json
- [ ] videos.json
- [ ] Test: Styles apply, animations work

### Phase 7: App Integration (Prompts 2.11.1 - 2.11.3)
- [ ] App.tsx with routing
- [ ] main.tsx entry point
- [ ] vite.config.ts
- [ ] Test: Full app works end-to-end

---

## 🎯 SUCCESS CRITERIA FOR PART 2

✅ All 42 components created
✅ All imports resolve correctly
✅ TypeScript compiles without errors
✅ Video player plays HLS streams
✅ Timeline shows progress and thumbnails
✅ Checkpoints appear and pause video
✅ Watermark displays and shifts position
✅ Authentication works (login/logout)
✅ Routing works (all pages accessible)
✅ Responsive design (works on mobile)
✅ Styles applied (Netflix-like dark theme)
✅ No console errors
✅ Smooth 60fps animations

---

## 📞 NOTES FOR NEXT PARTS

**Part 3 (Backend)** will need:
- All API endpoints that frontend services call
- Authentication middleware for protected routes
- Video metadata endpoints
- Checkpoint answer submission
- R2 signed URL generation

**Part 4 (Video Processor)** will need:
- FFmpeg transcoding scripts
- Thumbnail sprite generation
- VTT file generation
- R2 upload functions

**Part 5 (Scripts & Config)** will need:
- Environment variables setup
- Prisma migrations
- FFmpeg installation script
- Deployment configs

---

## ✅ PART 2 COMPLETE

**Total Prompts**: 42
**Status**: Ready for implementation
**Next**: Await user approval to proceed to Part 3 (Backend)

**End of Part 2 Documentation**
