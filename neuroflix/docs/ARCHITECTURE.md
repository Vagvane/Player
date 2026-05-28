# Architecture

## System Overview

Neuroflix is a **self-hosted, single-tenant** video training platform. Each organisation that deploys it gets an isolated instance with its own database, storage bucket, and user accounts.

---

## Services

### Frontend
- **React 18 + TypeScript + Vite** — SPA served as static files
- **hls.js** — HLS video playback with adaptive bitrate
- **Zustand** — lightweight client state (player position, auth)
- **Axios** — HTTP client with JWT interceptor and response unwrapping
- Talks only to the Backend API — never directly to R2 or the database

### Backend API
- **Node.js 18 + Express 4 + TypeScript** — REST API
- **Prisma 5** — type-safe ORM for PostgreSQL
- **JWT** — stateless authentication (24h access tokens)
- **bcrypt** — password hashing (10 rounds)
- **Helmet + express-rate-limit** — security headers, 100 req/15 min global limit
- **BullMQ** — publishes transcoding jobs to Redis queue
- In proxy mode (default): streams all HLS files from R2 to the browser — R2 is never exposed directly
- In CDN mode (`R2_PUBLIC_URL` set): returns direct CDN URLs — hls.js fetches segments from Cloudflare's edge

### Video Processor
- **Node.js 18 + TypeScript** — background worker process
- **BullMQ** — subscribes to the Redis job queue (concurrency: 1 — FFmpeg is CPU-bound)
- **FFmpeg 6** — Windows binary at `video-processor/ffmpeg/bin/ffmpeg.exe`
- Downloads raw video from R2, transcodes, uploads HLS assets back to R2
- Notifies the backend when processing is complete via internal API key

### PostgreSQL (Docker)
- Stores users, video metadata, playback progress, checkpoint answers
- Development: Docker container (`neuroflix-postgres`, port 5432)
- Production: Supabase or any managed PostgreSQL

### Redis (Docker)
- Used exclusively as BullMQ's job queue broker
- Development: Docker container (`neuroflix-redis`, port 6379)
- Production: any managed Redis (Upstash, Redis Cloud, self-hosted)

### Cloudflare R2
- Object storage for all video assets
- Zero egress fees — cost is only storage (10 GB free)
- Accessed via AWS S3-compatible SDK

---

## Data Flow

### Upload Flow

```
Browser
  │  POST /api/v1/upload  (multipart, JWT auth)
  ▼
Backend
  ├── Creates Video record (status: UPLOADING)
  ├── Uploads raw MP4 to R2 at: uploads/{videoId}/original.mp4
  ├── Updates Video record (status: PROCESSING)
  └── Pushes job to BullMQ queue
         │
         ▼
  Video Processor (BullMQ worker)
  ├── Downloads original.mp4 from R2
  ├── FFmpeg → 4 HLS quality levels (1080p, 720p, 480p, 360p)
  │     Each level: master.m3u8 + 4-second .ts segments
  ├── FFmpeg → sprite sheet (320×180 tiles, 10×10 grid)
  ├── Generates WebVTT index (1 cue per 2 seconds)
  ├── Uploads all assets to R2 at: videos/{videoId}/...
  └── PATCH /api/v1/videos/{id}/status → status: READY
```

### Playback Flow

**Proxy mode** (default — `R2_PUBLIC_URL` not set):

```
Browser
  │  GET /api/v1/videos/{id}  (JWT auth)
  ▼
Backend
  ├── Returns video metadata + user progress (resumeTime)
  └── Returns HLS URL: /api/v1/videos/{id}/hls/master.m3u8

Browser (hls.js)
  │  GET /api/v1/videos/{id}/hls/{file}
  ▼
Backend (HLS proxy)
  ├── Fetches file from R2 using S3 SDK
  └── Streams bytes to browser with appropriate Content-Type
```

**CDN mode** (`R2_PUBLIC_URL=https://pub-xxx.r2.dev`):

```
Browser
  │  GET /api/v1/videos/{id}  (JWT auth)
  ▼
Backend
  └── Returns HLS URL: https://pub-xxx.r2.dev/videos/{id}/master.m3u8

Browser (hls.js)
  │  GET https://pub-xxx.r2.dev/videos/{id}/...
  ▼
Cloudflare CDN edge
  └── Serves segments with zero egress cost, globally cached
```

In proxy mode R2 is never exposed directly to the browser. CDN mode is recommended for production — it offloads bandwidth from the backend and reduces latency.

---

## Database Schema

```
User
├── id (uuid)
├── email (unique)
├── password (bcrypt hash)
├── organization
├── firstName, lastName (optional)
└── createdAt, updatedAt

Video
├── id (uuid)
├── title, description
├── status (UPLOADING | PROCESSING | READY | FAILED)
├── duration (seconds, int)
├── hlsPath, thumbnailVttPath, spritePath (R2 keys)
├── uploadPath (original file R2 key)
├── fileSize (BigInt, supports >2 GB)
└── createdAt, updatedAt

VideoProgress
├── id
├── userId → User (cascade delete)
├── videoId → Video (cascade delete)
├── currentTime (seconds, int)
├── completed (bool)
└── lastWatched (datetime)
  unique: (userId, videoId)

CheckpointAnswer
├── id
├── userId → User
├── videoId (denormalized for query performance)
├── checkpointId (references checkpoints.json, not a DB FK)
├── answer (0–3, option index)
├── isCorrect (bool)
└── timeSpent (seconds, optional)
```

---

## HLS Video Assets

For a video with ID `abc123`, R2 stores:

```
uploads/abc123/original.mp4          ← raw upload

videos/abc123/1080p.m3u8             ← playlist (VOD mode)
videos/abc123/1080p_000.ts           ← 4-second segment
videos/abc123/1080p_001.ts
...

videos/abc123/720p.m3u8
videos/abc123/720p_000.ts
...

videos/abc123/480p.m3u8
videos/abc123/360p.m3u8

videos/abc123/master.m3u8            ← master playlist (references all quality levels)

videos/abc123/thumbnails.vtt         ← WebVTT cue index
videos/abc123/sprite.jpg             ← sprite sheet (320×180 tiles, 10×10 grid)
```

The master playlist (`master.m3u8`) is generated by the video processor and uploaded to R2 at `videos/{videoId}/master.m3u8` alongside all other HLS assets.

---

## Security

| Concern | Mechanism |
|---------|-----------|
| Authentication | JWT Bearer tokens, 24h expiry, bcrypt-hashed passwords |
| R2 exposure | Proxy mode: backend-proxied HLS, browser has no R2 credentials. CDN mode: public bucket with no credentials required — protected by HLS-only access (no MP4 URL). |
| Download protection | No MP4 URL ever returned to browser; HLS segments only |
| Watermark | Dynamic overlay (user email + org) shifts every 60 s |
| Rate limiting | 100 req / 15 min per IP (global) |
| CORS | Allowlist of known frontend origins |
| Security headers | Helmet (HSTS, X-Frame-Options, etc.) |
| Internal API | Video processor uses a shared secret key (`VIDEO_PROCESSOR_API_KEY`) |

---

## Checkpoint Questions

Checkpoint questions are stored in `backend/src/config/checkpoints.json` as a flat JSON file keyed by video ID. When a video loads, the backend returns the matching checkpoints to the frontend.

The `CheckpointAnswer` database table records each user's answer history. The `checkpointId` field references the JSON config, not a database foreign key — so deleting or renaming a checkpoint in the JSON file orphans existing answers.

**Future improvement**: migrate checkpoints to a `Checkpoint` database table with a full CRUD API for content management without code changes.

---

## Monorepo Structure

All three packages live in a single npm workspace monorepo:

```json
// package.json (root)
{
  "workspaces": ["frontend", "backend", "video-processor"]
}
```

Packages share nothing at runtime — each has its own `node_modules` and deploys independently. The workspace is for convenience only (single `npm install` from root).
