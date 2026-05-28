# Neuroflix — Corporate Training Video Platform

A self-hosted video training platform with a Netflix-style player, HLS adaptive streaming, interactive checkpoint questions, and video download protection.

![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)
![TypeScript](https://img.shields.io/badge/typescript-5.0-blue)
![License](https://img.shields.io/badge/license-MIT-blue)

---

## Features

### Video Player
- Custom HLS player built with hls.js (no native browser controls)
- Adaptive bitrate — automatically switches between 1080p / 720p / 480p / 360p
- Hover thumbnail previews on the timeline (sprite sheet + WebVTT)
- Buffer visualization, playback speed control, keyboard shortcuts
- Progress saving — resumes from where you left off
- Responsive: desktop, tablet, and mobile

### Security
- HLS segmented streaming — no downloadable MP4 URL is ever returned
- Proxy mode (default): all video requests flow through the backend — R2 is never exposed to the browser
- CDN mode (production): segments served from Cloudflare edge; R2 bucket is public, but only accessible as HLS fragments — no full-video URL exists
- JWT authentication on every API route
- Dynamic forensic watermark (user email + organization, shifts every 60 s)

### Interactive Learning
- Checkpoint questions at specific timestamps — video pauses automatically
- Must answer correctly to continue (retry on wrong answer)
- Correct-answer explanation shown before video resumes
- Answer history tracked per user in the database

### Infrastructure
- Self-hosted — each deployment has its own isolated database and storage
- Cloudflare R2 for video storage (10 GB free, zero egress fees)
- Docker for local PostgreSQL and Redis (no cloud account required during development)
- FFmpeg on Windows for transcoding (4-second HLS segments, 4 quality levels)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  Frontend (React + Vite)                    │
│  hls.js player · Checkpoint UI · Watermark · Auth          │
└────────────────────────┬────────────────────────────────────┘
                         │ REST API  (JWT Bearer)
┌────────────────────────▼────────────────────────────────────┐
│              Backend API (Node.js + Express)                 │
│  Auth · Video metadata · HLS proxy · Progress · Checkpoints│
└────────────────┬────────────────────┬───────────────────────┘
                 │                    │
     ┌───────────▼──────┐   ┌────────▼────────┐
     │  PostgreSQL 15   │   │    Redis 7       │
     │  (Docker / Sub.) │   │  (Docker / any) │
     └──────────────────┘   └────────┬────────┘
                                     │  BullMQ job queue
     ┌───────────────────────────────▼─────────────────────┐
     │           Video Processor  (Windows)                │
     │  FFmpeg · HLS transcoding · Sprite/VTT generation   │
     └───────────────────────────┬─────────────────────────┘
                                 │
     ┌─────────────────────────── ▼──────────────────────────┐
     │              Cloudflare R2  (Storage / CDN)            │
     │  HLS playlists · .ts segments · Sprite sheets · VTTs  │
     └────────────────────────────────────────────────────────┘
```

### Video Processing Pipeline

```
Upload MP4
  → Backend saves raw file to R2 (uploads/{id}/original.mp4)
  → Pushes job to BullMQ queue
  → Video Processor picks up job
  → FFmpeg transcodes to 4 HLS quality levels
  → Generates sprite sheet (320×180 tiles, 10×10 grid) + WebVTT index
  → Uploads all assets to R2 (videos/{id}/...)
  → Notifies backend via internal API → status set to READY
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript 5, Vite 4, hls.js, Zustand, Tailwind CSS, Axios |
| Backend | Node.js 18, Express 4, TypeScript 5, Prisma 5, JWT, bcrypt |
| Database | PostgreSQL 15 |
| Job Queue | BullMQ + Redis 7 |
| Video | FFmpeg 6 (Windows), HLS, AWS S3 SDK (R2-compatible) |
| Storage | Cloudflare R2 |
| Dev infra | Docker (PostgreSQL + Redis) |

---

## Quick Start

### Prerequisites

- **Windows** (video processor uses a Windows FFmpeg binary)
- **Node.js 18+** — https://nodejs.org/
- **Docker Desktop** — https://www.docker.com/products/docker-desktop/ (for PostgreSQL + Redis)
- **Cloudflare account** — https://cloudflare.com/ (free tier, for R2 storage)

### 1 — Clone and install

```bash
git clone https://github.com/your-org/neuroflix.git
cd neuroflix
```

Run the automated Windows setup script:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/setup-windows.ps1
```

This installs all npm dependencies, downloads FFmpeg, generates the Prisma client, and copies `.env.example` files.

### 2 — Start Docker services

```bash
docker compose up -d
```

This starts PostgreSQL (port 5432) and Redis (port 6379) in the background.

### 3 — Configure environment variables

Edit `backend/.env` with your Cloudflare R2 credentials:

```env
DATABASE_URL=postgresql://neuroflix:neuroflix_dev@localhost:5432/neuroflix
JWT_SECRET=change-this-to-a-random-64-char-string
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_BUCKET_NAME=your-bucket-name
REDIS_URL=redis://localhost:6379
FRONTEND_URL=http://localhost:5173
```

Edit `video-processor/.env`:

```env
REDIS_HOST=localhost
REDIS_PORT=6379
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_BUCKET_NAME=your-bucket-name
BACKEND_API_URL=http://localhost:3001/api/v1
VIDEO_PROCESSOR_API_KEY=any-random-secret-string
```

### 4 — Run database migrations

```bash
cd backend
npm run db:migrate
```

### 5 — Start all three services

Open three terminals:

```bash
# Terminal 1 — Frontend
cd frontend && npm run dev
# → http://localhost:5173

# Terminal 2 — Backend API
cd backend && npm run dev
# → http://localhost:3001

# Terminal 3 — Video Processor worker
cd video-processor && npm run worker
```

### 6 — Open the app

Navigate to **http://localhost:5173**, register an account, and upload a video.

---

## Project Structure

```
neuroflix/
├── frontend/              # React + Vite SPA
│   └── src/
│       ├── components/    # VideoPlayer, Checkpoint, Auth, Common, Layout
│       ├── hooks/         # useHLS, useCheckpoints, useVideoControls, ...
│       ├── pages/         # HomePage, VideoPlayerPage, LoginPage, UploadPage
│       ├── services/      # api.ts, videoService.ts, authService.ts
│       ├── store/         # Zustand: playerStore, authStore
│       └── types/         # TypeScript interfaces
│
├── backend/               # Express REST API
│   ├── src/
│   │   ├── controllers/   # auth, video, checkpoint, upload
│   │   ├── routes/        # REST route definitions
│   │   ├── services/      # Business logic (user, video, checkpoint, r2)
│   │   ├── middleware/     # Auth, validation, rate limiting, error handling
│   │   └── config/        # Database, JWT, R2, CORS, app settings
│   └── prisma/
│       └── schema.prisma  # Database schema
│
├── video-processor/       # BullMQ worker — FFmpeg transcoding
│   └── src/
│       ├── transcoder/    # HLS transcoding (4 quality levels)
│       ├── thumbnails/    # Sprite sheet + WebVTT generation
│       ├── queue/         # BullMQ worker (concurrency: 1)
│       ├── uploader/      # R2 upload
│       └── downloader/    # R2 download
│
├── scripts/               # Windows setup automation
├── docs/                  # Documentation
├── docker-compose.yml     # PostgreSQL 15 + Redis 7
└── .env.example           # Environment variable template
```

---

## Available Scripts

| Location | Command | Description |
|----------|---------|-------------|
| root | `npm run dev:all` | Start frontend + backend concurrently |
| root | `npm run build:all` | Build all three packages |
| frontend | `npm run dev` | Vite dev server (hot reload) |
| frontend | `npm run build` | Production build |
| backend | `npm run dev` | ts-node-dev (hot reload) |
| backend | `npm run build` | Compile TypeScript |
| backend | `npm run db:migrate` | Run Prisma migrations |
| backend | `npm run db:studio` | Open Prisma Studio (DB browser) |
| backend | `npm run db:seed` | Seed database with sample data |
| video-processor | `npm run worker` | Start BullMQ worker |

---

## Documentation

- [Setup Guide](./docs/SETUP.md) — full installation walkthrough
- [Deployment Guide](./docs/DEPLOYMENT.md) — production deployment
- [Architecture](./docs/ARCHITECTURE.md) — system design details
- [API Reference](./docs/API.md) — REST API endpoints

---

## License

MIT — see [LICENSE](./LICENSE)
