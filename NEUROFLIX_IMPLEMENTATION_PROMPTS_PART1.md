# NEUROFLIX VIDEO PLAYER - IMPLEMENTATION PROMPTS
## Complete Technical Prompt Engineering Document

**Purpose**: This document contains detailed, technically accurate prompts for building every component of the Neuroflix video player system.
**Target**: Claude Code AI for implementation
**Environment**: Windows Development
**Last Updated**: May 24th, 2026

---

## 📋 TABLE OF CONTENTS

1. [Project Initialization](#1-project-initialization)
2. [Frontend Implementation](#2-frontend-implementation)
3. [Backend Implementation](#3-backend-implementation)
4. [Video Processor Implementation](#4-video-processor-implementation)
5. [Scripts & Utilities](#5-scripts--utilities)
6. [Configuration Files](#6-configuration-files)
7. [Testing & Validation](#7-testing--validation)

---

## 1. PROJECT INITIALIZATION

### PROMPT 1.1: Create Project Structure

```
Create the complete project folder structure for the Neuroflix video player application in Windows. The structure should be:

C:\Users\SrisaiVagvaneTallapa\Downloads\Player\neuroflix\
├── frontend\
│   ├── public\
│   │   └── test-videos\
│   ├── src\
│   │   ├── components\
│   │   │   ├── VideoPlayer\
│   │   │   ├── Checkpoint\
│   │   │   ├── Watermark\
│   │   │   ├── Auth\
│   │   │   ├── Layout\
│   │   │   └── Common\
│   │   ├── hooks\
│   │   ├── services\
│   │   ├── store\
│   │   ├── types\
│   │   ├── utils\
│   │   ├── config\
│   │   ├── styles\
│   │   └── pages\
├── backend\
│   ├── src\
│   │   ├── controllers\
│   │   ├── middleware\
│   │   ├── services\
│   │   ├── routes\
│   │   ├── config\
│   │   ├── types\
│   │   └── utils\
│   └── prisma\
├── video-processor\
│   ├── src\
│   │   └── utils\
│   ├── ffmpeg\
│   │   └── bin\
│   └── temp\
├── scripts\
└── docs\

Requirements:
- Use Windows-compatible path separators
- Create all directories recursively
- Add .gitkeep files to empty directories
- Create README.md placeholders in each major directory
```

### PROMPT 1.2: Initialize Frontend Project

```
Initialize a React + TypeScript + Vite project in the frontend directory with the following specifications:

Location: C:\Users\SrisaiVagvaneTallapa\Downloads\Player\neuroflix\frontend

Commands to run:
1. npm create vite@latest . -- --template react-ts
2. Install dependencies:
   - Production: react@^18.2.0, react-dom@^18.2.0, react-router-dom@^6.11.0, hls.js@^1.4.0, zustand@^4.3.0, axios@^1.4.0
   - Development: @types/react@^18.2.0, @types/react-dom@^18.2.0, @vitejs/plugin-react@^4.0.0, typescript@^5.0.0, vite@^4.3.0, tailwindcss@^3.3.0, postcss@^8.4.0, autoprefixer@^10.4.0

3. Initialize Tailwind CSS:
   - Run: npx tailwindcss init -p
   - Configure tailwind.config.js with content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}']
   - Add Tailwind directives to src/index.css

4. Configure TypeScript:
   - Set compilerOptions.baseUrl to "."
   - Add paths: {"@/*": ["src/*"]}
   - Enable strict mode
   - Set target to "ES2020"
   - Include DOM libraries

5. Update package.json scripts:
   - "dev": "vite"
   - "build": "tsc && vite build"
   - "preview": "vite preview"

Output the complete package.json file with all dependencies and versions.
```

### PROMPT 1.3: Initialize Backend Project

```
Initialize a Node.js + Express + TypeScript backend project in the backend directory:

Location: C:\Users\SrisaiVagvaneTallapa\Downloads\Player\neuroflix\backend

Steps:
1. Initialize npm: npm init -y

2. Install dependencies:
   Production:
   - express@^4.18.0
   - cors@^2.8.5
   - dotenv@^16.0.0
   - @prisma/client@^4.14.0
   - jsonwebtoken@^9.0.0
   - bcrypt@^5.1.0
   - @aws-sdk/client-s3@^3.300.0
   - @aws-sdk/s3-request-presigner@^3.300.0
   - bullmq@^3.15.0
   - ioredis@^5.3.0

   Development:
   - @types/node@^18.0.0
   - @types/express@^4.17.0
   - @types/cors@^2.8.0
   - @types/bcrypt@^5.0.0
   - @types/jsonwebtoken@^9.0.0
   - typescript@^5.0.0
   - ts-node@^10.9.0
   - nodemon@^2.0.0
   - prisma@^4.14.0

3. Initialize TypeScript:
   - Create tsconfig.json with:
     * target: "ES2020"
     * module: "commonjs"
     * outDir: "./dist"
     * rootDir: "./src"
     * strict: true
     * esModuleInterop: true
     * skipLibCheck: true
     * forceConsistentCasingInFileNames: true

4. Initialize Prisma:
   - Run: npx prisma init
   - Set DATABASE_URL in .env

5. Update package.json scripts:
   - "dev": "nodemon src/server.ts"
   - "build": "tsc"
   - "start": "node dist/server.js"
   - "prisma:generate": "prisma generate"
   - "prisma:migrate": "prisma migrate dev"

Output the complete package.json file.
```

### PROMPT 1.4: Initialize Video Processor Project

```
Initialize a Node.js + TypeScript video processor service:

Location: C:\Users\SrisaiVagvaneTallapa\Downloads\Player\neuroflix\video-processor

Steps:
1. Initialize npm: npm init -y

2. Install dependencies:
   Production:
   - bullmq@^3.15.0
   - ioredis@^5.3.0
   - @aws-sdk/client-s3@^3.300.0
   - dotenv@^16.0.0

   Development:
   - @types/node@^18.0.0
   - typescript@^5.0.0
   - ts-node@^10.9.0

3. Create tsconfig.json:
   - target: "ES2020"
   - module: "commonjs"
   - outDir: "./dist"
   - rootDir: "./src"
   - strict: true

4. Update package.json scripts:
   - "dev": "ts-node src/worker.ts"
   - "build": "tsc"
   - "start": "node dist/worker.js"

Output the complete package.json file.
```

---

## 2. FRONTEND IMPLEMENTATION

### SECTION 2.1: TYPE DEFINITIONS

#### PROMPT 2.1.1: Create Video Types

```
Create TypeScript type definitions for video-related entities.

File: frontend/src/types/video.ts

Requirements:
1. Define VideoStatus enum with values: UPLOADING, PROCESSING, READY, FAILED
2. Define Video interface with:
   - id: string (UUID)
   - title: string
   - description: string | null
   - duration: number (seconds)
   - status: VideoStatus
   - hlsPath: string | null (R2 path to master.m3u8)
   - thumbnailVttPath: string | null
   - spritePath: string | null
   - createdAt: Date
   - updatedAt: Date

3. Define VideoMetadata interface with:
   - id: string
   - title: string
   - duration: number
   - hlsUrl: string (signed URL)
   - thumbnailVttUrl: string (signed URL)
   - checkpoints: Checkpoint[]
   - watermark: { email: string; organization: string }

4. Define ThumbnailCue interface with:
   - startTime: number (seconds)
   - endTime: number (seconds)
   - spriteUrl: string
   - x: number (sprite X coordinate)
   - y: number (sprite Y coordinate)
   - width: number (thumbnail width in pixels)
   - height: number (thumbnail height in pixels)

5. Export all types

Output the complete TypeScript file with proper JSDoc comments.
```

#### PROMPT 2.1.2: Create Checkpoint Types

```
Create TypeScript type definitions for checkpoint-related entities.

File: frontend/src/types/checkpoint.ts

Requirements:
1. Define Checkpoint interface with:
   - id: string
   - videoId: string
   - timestamp: number (seconds when question appears)
   - question: string
   - options: [string, string, string, string] (exactly 4 options)
   - correctAnswer: number (index 0-3)
   - explanation?: string (optional explanation)

2. Define CheckpointAnswer interface with:
   - id: string
   - userId: string
   - videoId: string
   - checkpointId: string
   - answer: number (0-3)
   - isCorrect: boolean
   - timeSpent?: number (seconds taken to answer)
   - answeredAt: Date

3. Export all types

Output the complete TypeScript file with JSDoc comments explaining the purpose of each type.
```

#### PROMPT 2.1.3: Create User Types

```
Create TypeScript type definitions for user and authentication.

File: frontend/src/types/user.ts

Requirements:
1. Define User interface with:
   - id: string
   - email: string
   - organization: string
   - firstName?: string
   - lastName?: string
   - createdAt: Date

2. Define AuthState interface with:
   - user: User | null
   - token: string | null
   - isAuthenticated: boolean
   - isLoading: boolean

3. Define LoginCredentials interface with:
   - email: string
   - password: string

4. Define RegisterData interface with:
   - email: string
   - password: string
   - organization: string
   - firstName?: string
   - lastName?: string

5. Define AuthResponse interface with:
   - token: string
   - user: User

6. Export all types

Output the complete TypeScript file with JSDoc comments.
```

#### PROMPT 2.1.4: Create Index Types File

```
Create a barrel export file for all types.

File: frontend/src/types/index.ts

Requirements:
- Export all types from video.ts
- Export all types from checkpoint.ts
- Export all types from user.ts

Use named exports only (no default exports).

Output the complete file.
```

### SECTION 2.2: UTILITY FUNCTIONS

#### PROMPT 2.2.1: Create Time Formatting Utility

```
Create a utility function to format video time from seconds to MM:SS format.

File: frontend/src/utils/formatTime.ts

Requirements:
1. Create formatTime function that:
   - Takes seconds (number) as input
   - Returns formatted string in "MM:SS" format
   - Handles edge cases:
     * Negative numbers → return "00:00"
     * NaN or undefined → return "00:00"
     * Hours (>3600 seconds) → return "HH:MM:SS"
   - Pads minutes and seconds with leading zeros

2. Examples:
   - formatTime(0) → "00:00"
   - formatTime(65) → "01:05"
   - formatTime(3661) → "01:01:01"
   - formatTime(-5) → "00:00"
   - formatTime(NaN) → "00:00"

3. Export as named export

Add comprehensive JSDoc comments with examples.
Output the complete TypeScript file with unit test examples in comments.
```

#### PROMPT 2.2.2: Create VTT Parser Utility

```
Create a utility to parse WebVTT thumbnail sprite files.

File: frontend/src/utils/parseVTT.ts

Requirements:
1. Import ThumbnailCue type from '../types/video'

2. Create parseVTT function that:
   - Takes vttContent (string) as input
   - Returns ThumbnailCue[] array
   - Parses VTT format:
     ```
     WEBVTT

     00:00:00.000 --> 00:00:02.000
     sprite.jpg#xywh=0,0,160,90

     00:00:02.000 --> 00:00:04.000
     sprite.jpg#xywh=160,0,160,90
     ```
   - Extracts:
     * Start/end timestamps (convert to seconds)
     * Sprite image path
     * X, Y coordinates
     * Width, height

3. Create parseVTTTimestamp helper function:
   - Parse "HH:MM:SS.mmm" format
   - Return total seconds as number
   - Handle edge cases (missing hours, invalid format)

4. Add error handling:
   - Invalid VTT format → return empty array
   - Missing xywh coordinates → skip that cue
   - Log warnings for malformed cues

5. Export both functions

Add comprehensive JSDoc with WebVTT format explanation.
Output the complete TypeScript file with validation logic.
```

#### PROMPT 2.2.3: Create Mobile Detection Utility

```
Create a utility to detect mobile devices and touch support.

File: frontend/src/utils/isMobile.ts

Requirements:
1. Create isMobile function that:
   - Returns boolean
   - Checks navigator.userAgent for mobile patterns
   - Patterns: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
   - Returns true if matches

2. Create isTouchDevice function that:
   - Returns boolean
   - Checks ('ontouchstart' in window) || (navigator.maxTouchPoints > 0)
   - Returns true if touch is supported

3. Create isIOS function that:
   - Returns boolean
   - Checks for /iPad|iPhone|iPod/.test(navigator.userAgent)

4. Create isAndroid function that:
   - Returns boolean
   - Checks for /Android/.test(navigator.userAgent)

5. Create getDeviceType function that:
   - Returns 'mobile' | 'tablet' | 'desktop'
   - Logic:
     * If mobile and screen width < 768px → 'mobile'
     * If mobile and screen width >= 768px → 'tablet'
     * Otherwise → 'desktop'

6. Export all functions

Add JSDoc comments explaining detection logic.
Output the complete TypeScript file.
```

#### PROMPT 2.2.4: Create Constants File

```
Create application constants.

File: frontend/src/utils/constants.ts

Requirements:
Define and export these constants:

1. BREAKPOINTS object:
   - mobile: 320 (pixels)
   - tablet: 768
   - desktop: 1024
   - wide: 1440
   - ultrawide: 1920

2. PLAYER_CONFIG object:
   - maxBufferLength: 30 (seconds)
   - maxMaxBufferLength: 60
   - autoHideControlsDelay: 3000 (milliseconds)
   - seekDebounceDelay: 100
   - checkpointThreshold: 0.5 (seconds for timestamp matching)
   - watermarkShiftInterval: 60000 (60 seconds)

3. HLS_CONFIG object:
   - startLevel: -1 (auto-select quality)
   - enableWorker: true
   - lowLatencyMode: false
   - backBufferLength: 10

4. QUALITY_LEVELS array:
   - { name: '1080p', height: 1080, bandwidth: 5000000 }
   - { name: '720p', height: 720, bandwidth: 2500000 }
   - { name: '480p', height: 480, bandwidth: 1000000 }
   - { name: '360p', height: 360, bandwidth: 500000 }

5. TOUCH_TARGETS object:
   - minimum: 44 (pixels, Apple HIG)
   - preferred: 48

6. API_ENDPOINTS object:
   - auth: { login: '/auth/login', register: '/auth/register', logout: '/auth/logout' }
   - videos: { getVideo: '/videos/:id', getStream: '/videos/:id/stream' }
   - checkpoints: { submitAnswer: '/checkpoints/:id/answer' }

Add JSDoc comments explaining each constant's purpose.
Output the complete TypeScript file with readonly types.
```

### SECTION 2.3: SERVICES (API INTEGRATION)

#### PROMPT 2.3.1: Create Axios API Client

```
Create configured Axios instance for API calls.

File: frontend/src/services/api.ts

Requirements:
1. Import axios from 'axios'

2. Create apiClient instance with:
   - baseURL: process.env.VITE_API_URL || 'http://localhost:3001'
   - timeout: 30000 (30 seconds)
   - headers: { 'Content-Type': 'application/json' }

3. Add request interceptor that:
   - Gets token from localStorage.getItem('token')
   - If token exists, adds Authorization header: `Bearer ${token}`
   - Returns config

4. Add response interceptor that:
   - Success (200-299): Returns response.data
   - Error (4xx, 5xx):
     * If 401 Unauthorized:
       - Remove token from localStorage
       - Redirect to /login
       - Show error message
     * If network error: Show "Network error" message
     * Otherwise: Return Promise.reject(error.response?.data || error.message)

5. Export apiClient as default

Add comprehensive error handling with try-catch.
Add JSDoc explaining interceptor logic.
Output the complete TypeScript file.
```

#### PROMPT 2.3.2: Create Auth Service

```
Create authentication service for login, register, logout.

File: frontend/src/services/authService.ts

Requirements:
1. Import apiClient from './api'
2. Import types: { LoginCredentials, RegisterData, AuthResponse, User } from '../types/user'

3. Create authService object with these methods:

   a) login(credentials: LoginCredentials): Promise<AuthResponse>
      - POST /auth/login
      - Body: { email, password }
      - On success:
        * Store token in localStorage
        * Return { token, user }
      - On error: Throw error with message

   b) register(data: RegisterData): Promise<AuthResponse>
      - POST /auth/register
      - Body: { email, password, organization, firstName?, lastName? }
      - On success:
        * Store token in localStorage
        * Return { token, user }
      - On error: Throw error with message

   c) logout(): void
      - Remove token from localStorage
      - Redirect to /login

   d) getCurrentUser(): Promise<User>
      - GET /auth/me
      - Returns current user data
      - Throws error if not authenticated

   e) isAuthenticated(): boolean
      - Check if token exists in localStorage
      - Return true/false

4. Export authService as default

Add proper error handling and TypeScript types.
Add JSDoc comments for each method.
Output the complete TypeScript file.
```

#### PROMPT 2.3.3: Create Video Service

```
Create video service for fetching video data and stream URLs.

File: frontend/src/services/videoService.ts

Requirements:
1. Import apiClient from './api'
2. Import types: { Video, VideoMetadata } from '../types/video'

3. Create videoService object with these methods:

   a) getVideo(videoId: string): Promise<Video>
      - GET /videos/:id
      - Returns video metadata
      - Replace :id with videoId in URL
      - Throw error if not found

   b) getVideoStream(videoId: string): Promise<VideoMetadata>
      - GET /videos/:id/stream
      - Returns:
        * hlsUrl (signed URL to master.m3u8)
        * thumbnailVttUrl (signed URL to thumbnails.vtt)
        * checkpoints array
        * watermark object { email, organization }
      - Cache response for 50 minutes (URLs expire in 60min)
      - Throw error if unauthorized

   c) getAllVideos(): Promise<Video[]>
      - GET /videos
      - Returns array of all videos
      - Filter out videos with status !== 'READY'

   d) updateProgress(videoId: string, currentTime: number): Promise<void>
      - POST /videos/:id/progress
      - Body: { currentTime }
      - Fire and forget (don't wait for response)
      - Debounce calls (max once per 5 seconds)

4. Implement caching for getVideoStream:
   - Store in memory with videoId as key
   - Expire after 50 minutes
   - Clear cache on logout

5. Export videoService as default

Add error handling and retry logic for failed requests.
Add JSDoc comments with usage examples.
Output the complete TypeScript file with caching implementation.
```

#### PROMPT 2.3.4: Create Checkpoint Service

```
Create checkpoint service for submitting answers.

File: frontend/src/services/checkpointService.ts

Requirements:
1. Import apiClient from './api'
2. Import type: { CheckpointAnswer } from '../types/checkpoint'

3. Create checkpointService object with these methods:

   a) submitAnswer(checkpointId: string, answer: number, timeSpent?: number): Promise<CheckpointAnswer>
      - POST /checkpoints/:id/answer
      - Body: { answer, timeSpent }
      - Returns CheckpointAnswer with isCorrect field
      - Throw error if invalid answer (not 0-3)

   b) getCheckpointAnswers(videoId: string): Promise<CheckpointAnswer[]>
      - GET /checkpoints/video/:videoId/answers
      - Returns all user's answers for this video
      - Used to show which checkpoints were already answered

   c) clearCache(videoId: string): void
      - Clear cached answers for video
      - Called when user restarts video

4. Implement answer caching:
   - Store submitted answers in memory
   - Key: checkpointId
   - Prevent duplicate submissions
   - Clear on logout

5. Export checkpointService as default

Add validation for answer index (0-3).
Add JSDoc comments.
Output the complete TypeScript file with caching.
```

### SECTION 2.4: STATE MANAGEMENT (ZUSTAND STORES)

#### PROMPT 2.4.1: Create Auth Store

```
Create Zustand store for authentication state.

File: frontend/src/store/authStore.ts

Requirements:
1. Import create from 'zustand'
2. Import authService from '../services/authService'
3. Import types: { User, AuthState } from '../types/user'

4. Define AuthStore interface extending AuthState with actions:
   - login(email: string, password: string): Promise<void>
   - register(data: RegisterData): Promise<void>
   - logout(): void
   - checkAuth(): void
   - setUser(user: User | null): void
   - setToken(token: string | null): void

5. Create store with initial state:
   - user: null
   - token: localStorage.getItem('token')
   - isAuthenticated: false
   - isLoading: true

6. Implement actions:

   a) login:
      - Call authService.login()
      - On success: Set token, user, isAuthenticated: true
      - On error: Throw error

   b) register:
      - Call authService.register()
      - On success: Set token, user, isAuthenticated: true
      - On error: Throw error

   c) logout:
      - Clear token, user
      - Set isAuthenticated: false
      - Call authService.logout()

   d) checkAuth:
      - Set isLoading: true
      - If token exists:
        * Call authService.getCurrentUser()
        * On success: Set user, isAuthenticated: true
        * On error: Call logout()
      - Set isLoading: false

7. Initialize store:
   - Call checkAuth() on store creation

8. Export useAuthStore hook

Add proper error handling.
Add JSDoc comments.
Output the complete TypeScript file.
```

#### PROMPT 2.4.2: Create Player Store

```
Create Zustand store for video player state.

File: frontend/src/store/playerStore.ts

Requirements:
1. Import create from 'zustand'

2. Define PlayerState interface with:
   - isPlaying: boolean
   - currentTime: number (seconds)
   - duration: number (seconds)
   - volume: number (0-1)
   - isMuted: boolean
   - isFullscreen: boolean
   - playbackRate: number (0.5, 1, 1.5, 2)
   - bufferedRanges: TimeRanges | null
   - isBuffering: boolean
   - showControls: boolean
   - currentQuality: string | null ('1080p', '720p', '480p', '360p')

3. Define PlayerStore interface with actions:
   - setIsPlaying(playing: boolean): void
   - setCurrentTime(time: number): void
   - setDuration(duration: number): void
   - setVolume(volume: number): void
   - toggleMute(): void
   - setIsFullscreen(fullscreen: boolean): void
   - setPlaybackRate(rate: number): void
   - setBufferedRanges(ranges: TimeRanges | null): void
   - setIsBuffering(buffering: boolean): void
   - setShowControls(show: boolean): void
   - setCurrentQuality(quality: string): void
   - reset(): void

4. Create store with initial state:
   - isPlaying: false
   - currentTime: 0
   - duration: 0
   - volume: 1
   - isMuted: false
   - isFullscreen: false
   - playbackRate: 1
   - bufferedRanges: null
   - isBuffering: false
   - showControls: true
   - currentQuality: null

5. Implement actions:
   - All setters update their respective state
   - toggleMute: Flips isMuted boolean
   - setVolume: Clamp between 0 and 1, save to localStorage
   - reset: Reset all values to initial state

6. Persist volume to localStorage:
   - On setVolume: localStorage.setItem('playerVolume', volume.toString())
   - On init: const savedVolume = localStorage.getItem('playerVolume')

7. Export usePlayerStore hook

Add JSDoc comments for each action.
Output the complete TypeScript file.
```

#### PROMPT 2.4.3: Create Store Index File

```
Create barrel export for all stores.

File: frontend/src/store/index.ts

Requirements:
- Export useAuthStore from './authStore'
- Export usePlayerStore from './playerStore'

Use named exports.
Output the complete file.
```

### SECTION 2.5: CUSTOM HOOKS

#### PROMPT 2.5.1: Create useHLS Hook

```
Create custom hook for initializing and managing HLS.js player.

File: frontend/src/hooks/useHLS.ts

Requirements:
1. Import { useEffect, useRef, useState } from 'react'
2. Import Hls from 'hls.js'
3. Import { HLS_CONFIG } from '../utils/constants'

4. Create useHLS hook with parameters:
   - videoRef: RefObject<HTMLVideoElement>
   - hlsUrl: string
   - onLoadedMetadata: (duration: number) => void
   - onQualityChange: (level: number) => void

5. Return object with:
   - hls: Hls | null
   - isSupported: boolean
   - currentLevel: number
   - levels: Array<{ height: number; bitrate: number }>

6. Hook logic:

   a) Check HLS support:
      - If Hls.isSupported() → use hls.js
      - Else if video.canPlayType('application/vnd.apple.mpegurl') → native HLS (Safari)
      - Else → return isSupported: false

   b) Initialize hls.js:
      - Create new Hls(HLS_CONFIG)
      - hls.loadSource(hlsUrl)
      - hls.attachMedia(videoRef.current)

   c) Listen to HLS events:
      - MANIFEST_PARSED: Get levels, call onLoadedMetadata
      - LEVEL_SWITCHED: Update currentLevel, call onQualityChange
      - ERROR: Log error, attempt recovery
        * NETWORK_ERROR → hls.startLoad()
        * MEDIA_ERROR → hls.recoverMediaError()
        * Fatal error → destroy and show error message

   d) Cleanup:
      - On unmount: hls.destroy()
      - On hlsUrl change: Destroy old, create new

7. Add error handling for:
   - Failed to load manifest
   - Network errors
   - Corrupted segments

8. Export useHLS as default

Add comprehensive JSDoc with usage example.
Output the complete TypeScript file with proper cleanup logic.
```

#### PROMPT 2.5.2: Create useVideoControls Hook

```
Create custom hook for video playback controls.

File: frontend/src/hooks/useVideoControls.ts

Requirements:
1. Import { useState, useCallback, RefObject } from 'react'
2. Import { usePlayerStore } from '../store/playerStore'

3. Create useVideoControls hook with parameter:
   - videoRef: RefObject<HTMLVideoElement>

4. Get from store:
   - isPlaying, volume, isFullscreen
   - setIsPlaying, setVolume, setIsFullscreen

5. Define methods:

   a) play: () => void
      - videoRef.current?.play()
      - setIsPlaying(true)
      - Catch promise rejection (if play() fails)

   b) pause: () => void
      - videoRef.current?.pause()
      - setIsPlaying(false)

   c) togglePlay: () => void
      - If isPlaying → pause()
      - Else → play()

   d) seek: (time: number) => void
      - Clamp time between 0 and duration
      - videoRef.current.currentTime = time
      - Update store currentTime

   e) setVolumeLevel: (level: number) => void
      - Clamp between 0 and 1
      - videoRef.current.volume = level
      - setVolume(level)
      - If level > 0 and was muted → unmute

   f) toggleMute: () => void
      - videoRef.current.muted = !videoRef.current.muted
      - Update store isMuted

   g) toggleFullscreen: () => void
      - If not fullscreen:
        * videoRef.current.requestFullscreen() (or webkitRequestFullscreen for Safari)
        * setIsFullscreen(true)
      - If fullscreen:
        * document.exitFullscreen()
        * setIsFullscreen(false)

   h) setPlaybackRate: (rate: number) => void
      - Valid rates: 0.5, 1, 1.5, 2
      - videoRef.current.playbackRate = rate
      - Update store playbackRate

6. Return object with all methods

7. Add keyboard shortcuts support (optional):
   - Space: togglePlay
   - Left arrow: seek(-5)
   - Right arrow: seek(+5)
   - Up arrow: setVolumeLevel(volume + 0.1)
   - Down arrow: setVolumeLevel(volume - 0.1)
   - F: toggleFullscreen
   - M: toggleMute

8. Export useVideoControls as default

Add proper error handling for each method.
Add JSDoc comments.
Output the complete TypeScript file.
```

#### PROMPT 2.5.3: Create useThumbnails Hook

```
Create custom hook for loading and displaying video thumbnails.

File: frontend/src/hooks/useThumbnails.ts

Requirements:
1. Import { useState, useEffect, useCallback } from 'react'
2. Import { parseVTT } from '../utils/parseVTT'
3. Import type { ThumbnailCue } from '../types/video'

4. Create useThumbnails hook with parameter:
   - vttUrl: string (signed URL to thumbnails.vtt)

5. State:
   - thumbnails: ThumbnailCue[]
   - isLoading: boolean
   - error: string | null

6. Logic:

   a) useEffect(() => {...}, [vttUrl]):
      - If !vttUrl, return
      - setIsLoading(true)
      - Fetch vttUrl
      - If successful:
        * const vttText = await response.text()
        * const cues = parseVTT(vttText)
        * setThumbnails(cues)
        * setError(null)
      - If error:
        * setError('Failed to load thumbnails')
        * console.error(error)
      - setIsLoading(false)

   b) getThumbnailForTime(time: number): ThumbnailCue | null
      - Find cue where time >= startTime && time < endTime
      - Return cue or null
      - Use useCallback for performance

7. Return object:
   - thumbnails: ThumbnailCue[]
   - isLoading: boolean
   - error: string | null
   - getThumbnailForTime: (time: number) => ThumbnailCue | null

8. Add caching:
   - Cache parsed thumbnails in memory
   - Key: vttUrl
   - Don't re-fetch if already cached

9. Export useThumbnails as default

Add error handling and retry logic.
Add JSDoc comments with usage example.
Output the complete TypeScript file.
```

#### PROMPT 2.5.4: Create useCheckpoints Hook

```
Create custom hook for handling checkpoint questions during playback.

File: frontend/src/hooks/useCheckpoints.ts

Requirements:
1. Import { useState, useEffect, useCallback, RefObject } from 'react'
2. Import checkpointService from '../services/checkpointService'
3. Import type { Checkpoint } from '../types/checkpoint'

4. Create useCheckpoints hook with parameters:
   - checkpoints: Checkpoint[]
   - currentTime: number
   - videoRef: RefObject<HTMLVideoElement>
   - onAnswerSubmitted?: (checkpointId: string, isCorrect: boolean) => void

5. State:
   - activeCheckpoint: Checkpoint | null
   - completedCheckpointIds: Set<string>
   - answerStartTime: number | null (when question appeared)

6. Logic:

   a) useEffect(() => {...}, [currentTime, checkpoints]):
      - For each checkpoint:
        * Check if Math.abs(checkpoint.timestamp - currentTime) < 0.5
        * Check if !completedCheckpointIds.has(checkpoint.id)
        * If both true:
          - setActiveCheckpoint(checkpoint)
          - videoRef.current?.pause()
          - setAnswerStartTime(Date.now())
          - Break loop

   b) handleAnswer(answerIndex: number): void
      - Validate: answerIndex >= 0 && answerIndex <= 3
      - Calculate timeSpent: Date.now() - answerStartTime (in seconds)
      - const isCorrect = answerIndex === activeCheckpoint.correctAnswer
      - Submit answer:
        * await checkpointService.submitAnswer(activeCheckpoint.id, answerIndex, timeSpent)
      - Update state:
        * Add checkpoint.id to completedCheckpointIds
        * setActiveCheckpoint(null)
        * setAnswerStartTime(null)
      - Resume video:
        * videoRef.current?.play()
      - Call onAnswerSubmitted callback if provided

   c) resetCheckpoints(): void
      - Clear completedCheckpointIds
      - setActiveCheckpoint(null)

7. Return object:
   - activeCheckpoint: Checkpoint | null
   - handleAnswer: (answerIndex: number) => void
   - resetCheckpoints: () => void
   - completedCount: number (completedCheckpointIds.size)

8. Add error handling:
   - If submit fails, allow retry
   - Log errors to console

9. Export useCheckpoints as default

Add JSDoc comments with detailed explanation.
Output the complete TypeScript file with proper types.
```

#### PROMPT 2.5.5: Create useWatermark Hook

```
Create custom hook for dynamic watermark position shifting.

File: frontend/src/hooks/useWatermark.ts

Requirements:
1. Import { useState, useEffect } from 'react'
2. Import { PLAYER_CONFIG } from '../utils/constants'

3. Define WatermarkPosition type:
   - top?: number | string
   - bottom?: number | string
   - left?: number | string
   - right?: number | string

4. Create useWatermark hook (no parameters)

5. Define POSITIONS constant (readonly array):
   ```typescript
   const POSITIONS: WatermarkPosition[] = [
     { top: 20, left: 20 },
     { top: 20, right: 20 },
     { bottom: 80, left: 20 },
     { bottom: 80, right: 20 },
     { top: '50%', left: 20 },
     { top: '50%', right: 20 },
   ]
   ```

6. State:
   - position: WatermarkPosition (initial: POSITIONS[0])
   - currentIndex: number (initial: 0)

7. Logic:

   a) useEffect(() => {...}, []):
      - Set interval to shift position every PLAYER_CONFIG.watermarkShiftInterval (60 seconds)
      - On interval:
        * nextIndex = (currentIndex + 1) % POSITIONS.length
        * setPosition(POSITIONS[nextIndex])
        * setCurrentIndex(nextIndex)
      - Return cleanup: clearInterval

8. Return object:
   - position: WatermarkPosition

9. Export useWatermark as default

Add JSDoc explaining the 60-second shift pattern.
Output the complete TypeScript file.
```

#### PROMPT 2.5.6: Create useFullscreen Hook

```
Create custom hook for fullscreen API with cross-browser support.

File: frontend/src/hooks/useFullscreen.ts

Requirements:
1. Import { useState, useEffect, useCallback, RefObject } from 'react'

2. Create useFullscreen hook with parameter:
   - elementRef: RefObject<HTMLElement>

3. State:
   - isFullscreen: boolean (initial: false)

4. Methods:

   a) enterFullscreen():
      - const element = elementRef.current
      - If !element, return
      - Try methods in order (cross-browser):
        * element.requestFullscreen()
        * element.webkitRequestFullscreen() // Safari
        * element.mozRequestFullScreen() // Firefox
        * element.msRequestFullscreen() // IE11
      - Catch errors and log

   b) exitFullscreen():
      - Try methods in order:
        * document.exitFullscreen()
        * document.webkitExitFullscreen()
        * document.mozCancelFullScreen()
        * document.msExitFullscreen()
      - Catch errors and log

   c) toggleFullscreen():
      - If isFullscreen → exitFullscreen()
      - Else → enterFullscreen()

5. Listen to fullscreen change events:
   - useEffect(() => {...}, [])
   - Add listeners for:
     * 'fullscreenchange'
     * 'webkitfullscreenchange'
     * 'mozfullscreenchange'
     * 'MSFullscreenChange'
   - On event:
     * Check if document.fullscreenElement exists
     * Update isFullscreen state
   - Return cleanup: Remove all listeners

6. Return object:
   - isFullscreen: boolean
   - enterFullscreen: () => void
   - exitFullscreen: () => void
   - toggleFullscreen: () => void
   - isSupported: boolean (check if requestFullscreen exists)

7. Export useFullscreen as default

Add JSDoc with browser compatibility notes.
Output the complete TypeScript file with all vendor prefixes.
```

#### PROMPT 2.5.7: Create useKeyboardShortcuts Hook

```
Create custom hook for keyboard shortcuts in video player.

File: frontend/src/hooks/useKeyboardShortcuts.ts

Requirements:
1. Import { useEffect, RefObject } from 'react'
2. Import { useVideoControls } from './useVideoControls'

3. Create useKeyboardShortcuts hook with parameters:
   - videoRef: RefObject<HTMLVideoElement>
   - enabled: boolean (default: true)

4. Get controls from useVideoControls(videoRef)

5. Define keyboard shortcuts:
   - Space / K: togglePlay()
   - Left arrow: seek(currentTime - 5)
   - Right arrow: seek(currentTime + 5)
   - Up arrow: setVolumeLevel(volume + 0.1)
   - Down arrow: setVolumeLevel(volume - 0.1)
   - M: toggleMute()
   - F: toggleFullscreen()
   - 0-9: Seek to percentage (0 = 0%, 9 = 90%)
   - J: Rewind 10 seconds
   - L: Forward 10 seconds
   - < (Shift + ,): Decrease playback speed
   - > (Shift + .): Increase playback speed

6. Implementation:

   a) useEffect(() => {...}, [enabled]):
      - If !enabled, return
      - Define handleKeyPress(event: KeyboardEvent):
        * Check if event.target is an input/textarea (ignore if true)
        * event.preventDefault() for player keys
        * Switch on event.key:
          - Case ' ': togglePlay()
          - Case 'ArrowLeft': seek(currentTime - 5)
          - Case 'ArrowRight': seek(currentTime + 5)
          - Case 'ArrowUp': setVolumeLevel(volume + 0.1)
          - Case 'ArrowDown': setVolumeLevel(volume - 0.1)
          - Case 'm': toggleMute()
          - Case 'f': toggleFullscreen()
          - Case '0'-'9': seek(duration * (parseInt(event.key) / 10))
          - Case 'j': seek(currentTime - 10)
          - Case 'l': seek(currentTime + 10)
          - Default: Do nothing

      - document.addEventListener('keydown', handleKeyPress)
      - Return cleanup: document.removeEventListener('keydown', handleKeyPress)

7. No return value (side effects only)

8. Export useKeyboardShortcuts as default

Add JSDoc listing all keyboard shortcuts.
Add comments explaining why we check for input/textarea (to not interfere with forms).
Output the complete TypeScript file.
```

#### PROMPT 2.5.8: Create useAutoHideControls Hook

```
Create custom hook for auto-hiding player controls after inactivity.

File: frontend/src/hooks/useAutoHideControls.ts

Requirements:
1. Import { useState, useEffect, useCallback, useRef } from 'react'
2. Import { PLAYER_CONFIG } from '../utils/constants'

3. Create useAutoHideControls hook with parameters:
   - isPlaying: boolean (controls only auto-hide during playback)
   - delay?: number (default: PLAYER_CONFIG.autoHideControlsDelay = 3000ms)

4. State:
   - showControls: boolean (initial: true)

5. Use ref for timeout:
   - timeoutRef: useRef<NodeJS.Timeout | null>(null)

6. Methods:

   a) resetTimeout():
      - Clear existing timeout: clearTimeout(timeoutRef.current)
      - Show controls: setShowControls(true)
      - If isPlaying:
        * Set new timeout to hide controls after delay
        * timeoutRef.current = setTimeout(() => setShowControls(false), delay)

   b) handleUserActivity():
      - Call resetTimeout()
      - Throttle: Don't call more than once per 100ms

7. Setup event listeners:
   - useEffect(() => {...}, [isPlaying, delay]):
     * Add listeners: 'mousemove', 'mousedown', 'touchstart', 'touchmove', 'keydown'
     * All listeners call handleUserActivity
     * If isPlaying changes to false: setShowControls(true)
     * Return cleanup: Remove all listeners, clear timeout

8. Return object:
   - showControls: boolean
   - resetTimeout: () => void (for manual control)

9. Export useAutoHideControls as default

Add JSDoc explaining the auto-hide behavior.
Add note about throttling to prevent performance issues.
Output the complete TypeScript file with event listener cleanup.
```

#### PROMPT 2.5.9: Create useAuth Hook

```
Create custom hook for authentication state and actions.

File: frontend/src/hooks/useAuth.ts

Requirements:
1. Import { useAuthStore } from '../store/authStore'

2. Create useAuth hook (no parameters)

3. Get all auth state and actions from store:
   - user, token, isAuthenticated, isLoading
   - login, register, logout, checkAuth

4. Return object with all values

5. Export useAuth as default

This is a simple convenience hook that provides easy access to auth store.

Add JSDoc with usage example:
```typescript
/**
 * Hook to access authentication state and actions
 *
 * @example
 * const { user, isAuthenticated, login, logout } = useAuth();
 *
 * // Login
 * await login('user@example.com', 'password');
 *
 * // Check if authenticated
 * if (isAuthenticated) {
 *   console.log('User:', user);
 * }
 */
```

Output the complete TypeScript file.
```

#### PROMPT 2.5.10: Create useVideoData Hook

```
Create custom hook for fetching video metadata and stream URLs.

File: frontend/src/hooks/useVideoData.ts

Requirements:
1. Import { useState, useEffect } from 'react'
2. Import videoService from '../services/videoService'
3. Import type { VideoMetadata } from '../types/video'

4. Create useVideoData hook with parameter:
   - videoId: string

5. State:
   - videoData: VideoMetadata | null
   - isLoading: boolean
   - error: string | null

6. Logic:

   a) useEffect(() => {...}, [videoId]):
      - If !videoId, return
      - setIsLoading(true)
      - setError(null)

      - Try:
        * const data = await videoService.getVideoStream(videoId)
        * setVideoData(data)
      - Catch error:
        * setError(error.message || 'Failed to load video')
        * console.error(error)
      - Finally:
        * setIsLoading(false)

   b) Implement retry logic:
      - If fetch fails, retry up to 3 times with exponential backoff
      - Delays: 1s, 2s, 4s

7. Return object:
   - videoData: VideoMetadata | null
   - isLoading: boolean
   - error: string | null
   - retry: () => void (manual retry function)

8. Export useVideoData as default

Add error handling for:
- Network errors
- 404 Not Found
- 403 Unauthorized
- Expired signed URLs

Add JSDoc with usage example.
Output the complete TypeScript file with retry logic.
```

---

## (CONTINUE IN NEXT MESSAGE DUE TO LENGTH)

This is Part 1 of the prompts document. Would you like me to continue with:
- Part 2: Frontend Components (VideoPlayer, Checkpoint, Watermark, etc.)
- Part 3: Backend Implementation
- Part 4: Video Processor Implementation
- Part 5: Scripts and Configuration

Each part contains 20-30 detailed prompts with exact implementation specifications.

Shall I continue?
```

