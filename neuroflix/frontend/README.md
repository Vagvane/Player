# Frontend

React SPA for Neuroflix. Handles authentication, video browsing, adaptive HLS playback, progress tracking, and checkpoint questions.

## Stack

- React 18 + TypeScript + Vite
- Tailwind CSS (dark theme, `#141414` background)
- hls.js — adaptive bitrate HLS streaming
- Zustand — player state management
- React Router v6 — client-side routing
- axios — API communication

## Development

```bash
# Install
npm install

# Start dev server (hot reload)
npm run dev
# → http://localhost:5173
```

## Key Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | TypeScript compile + Vite production build |
| `npm run preview` | Preview production build locally |
| `npm run lint` | ESLint check |

## Environment Variables

```env
# frontend/.env
VITE_API_URL=http://localhost:3001/api/v1
```

In production, set `VITE_API_URL` to the deployed backend URL (e.g. `https://neuroflix-api.onrender.com/api/v1`).

## Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `LandingPage` | Marketing / login redirect |
| `/login` | `LoginPage` | JWT login form |
| `/register` | `RegisterPage` | Account creation |
| `/dashboard` | `DashboardPage` | Video grid |
| `/upload` | `UploadPage` | MP4 upload form |
| `/video/:id` | `VideoPlayerPage` | Full-screen HLS player |

## Key Components

- **`VideoPlayer/`** — hls.js player with quality selector, progress bar, checkpoint markers, and overlay
- **`Checkpoint/`** — Quiz overlay that pauses playback and requires a correct answer to continue
- **`Common/ErrorBoundary`** — Catches React render errors gracefully
- **`Watermark/`** — Subtle user watermark rendered over the video

## State Management

Zustand stores live in `src/store/`:

- `playerStore` — current time, duration, buffered, quality level, fullscreen state
- `authStore` — JWT token, current user

## API Integration

All API calls go through `src/services/`:

- `authService` — register / login / logout
- `videoService` — list videos, fetch stream with resume time, save progress (Math.round for integer validation), invalidate stream cache on unmount

## Progress & Resume

- Progress is saved to the backend every 5 seconds during playback
- On page load, `videoService` reads `progress.currentTime` from the API and sets `resumeTime` on the video metadata
- On `loadedmetadata`, the player seeks to `resumeTime` if > 0
- On unmount, the stream cache entry is invalidated so the next visit fetches fresh progress from the backend
