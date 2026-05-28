# Setup Guide

Complete setup instructions for Neuroflix on Windows.

---

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Windows | 10 / 11 | Video processor uses a Windows FFmpeg binary |
| Node.js | 18+ | https://nodejs.org/ — includes npm |
| Docker Desktop | latest | https://docker.com — runs PostgreSQL + Redis locally |
| Cloudflare account | — | https://cloudflare.com — free R2 storage (10 GB) |

> **Why Docker?**
> PostgreSQL and Redis are provided via `docker-compose.yml`. You do not need to install either separately — Docker handles them.

---

## Step 1 — Clone the Repository

```bash
git clone https://github.com/your-org/neuroflix.git
cd neuroflix
```

---

## Step 2 — Run the Setup Script

```powershell
powershell -ExecutionPolicy Bypass -File scripts/setup-windows.ps1
```

The script will:
- Check Node.js version (18+ required)
- Install npm dependencies for all three packages (frontend, backend, video-processor)
- Generate the Prisma client
- Download the FFmpeg Windows binary to `video-processor/ffmpeg/bin/`
- Copy each `.env.example` to `.env` (if `.env` does not already exist)

---

## Step 3 — Set Up Cloudflare R2

R2 is the only external cloud service required. Everything else (database, Redis) runs locally via Docker.

1. Log in to https://dash.cloudflare.com/
2. Go to **R2 Object Storage** in the left sidebar
3. Click **Create bucket** — give it any name (e.g. `neuroflix-videos`)
4. Go to **R2 → Manage R2 API Tokens**
5. Click **Create API Token**
   - Permissions: **Object Read & Write**
   - Scope: the bucket you just created
6. Copy and save:
   - **Account ID** (shown on the R2 overview page)
   - **Access Key ID**
   - **Secret Access Key**
   - **Bucket name**

> **Public access**: you do NOT need to enable public bucket access. The backend proxies all HLS requests — the browser never talks to R2 directly.

---

## Step 4 — Configure Environment Variables

### Backend (`backend/.env`)

```env
NODE_ENV=development
PORT=3001

# PostgreSQL — matches docker-compose.yml defaults
DATABASE_URL=postgresql://neuroflix:neuroflix_dev@localhost:5432/neuroflix

# JWT — change this to any long random string in production
JWT_SECRET=change-this-to-a-long-random-string-min-32-chars
JWT_EXPIRES_IN=24h

# Cloudflare R2 — from Step 3
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_BUCKET_NAME=neuroflix-videos

# Redis — matches docker-compose.yml
REDIS_URL=redis://localhost:6379

# Frontend origin for CORS
FRONTEND_URL=http://localhost:5173
```

### Video Processor (`video-processor/.env`)

```env
NODE_ENV=development

# Redis — matches docker-compose.yml
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Cloudflare R2 — same credentials as backend
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_BUCKET_NAME=neuroflix-videos

# Internal communication with backend
BACKEND_API_URL=http://localhost:3001/api/v1
VIDEO_PROCESSOR_API_KEY=any-random-secret-string
```

### Frontend (`frontend/.env.local`)

Vite loads `.env.local` for local-only overrides that are not committed to git.

```env
VITE_API_URL=http://localhost:3001/api/v1
```

---

## Step 5 — Start Docker (PostgreSQL + Redis)

```bash
docker compose up -d
```

This starts two containers in the background:
- `neuroflix-postgres` — PostgreSQL 15 on port 5432
- `neuroflix-redis` — Redis 7 on port 6379

Verify they are healthy:

```bash
docker compose ps
```

Both services should show `healthy` in the Status column.

---

## Step 6 — Run Database Migrations

```bash
cd backend
npm run db:migrate
```

This creates all database tables (User, Video, VideoProgress, CheckpointAnswer) in the local PostgreSQL container.

To view the database in a browser UI:

```bash
npm run db:studio
# Opens at http://localhost:5555
```

---

## Step 7 — Start the Services

Open **three** separate terminals from the project root:

**Terminal 1 — Frontend**
```bash
cd frontend
npm run dev
# Vite dev server → http://localhost:5173
```

**Terminal 2 — Backend API**
```bash
cd backend
npm run dev
# Express API → http://localhost:3001
# Health check → http://localhost:3001/api/v1/health
```

**Terminal 3 — Video Processor**
```bash
cd video-processor
npm run worker
# BullMQ worker — listens for transcoding jobs on Redis
```

---

## Step 8 — Verify Setup

```bash
# From the project root:
npm run test:setup
```

You should see all checks pass. Then open http://localhost:5173, register an account, and try uploading a video.

---

## Adding Checkpoint Questions

Checkpoint questions are stored in `backend/src/config/checkpoints.json`. This file maps video IDs to arrays of questions with timestamps.

```json
[
  {
    "videoId": "your-video-uuid-from-the-database",
    "checkpoints": [
      {
        "id": "cp-001",
        "timestamp": 30,
        "question": "What did the speaker just describe?",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correctAnswer": 0,
        "explanation": "The speaker described Option A because..."
      }
    ]
  }
]
```

After editing the file, restart the backend for changes to take effect.

---

## Troubleshooting

### Docker containers not starting

```bash
# Check Docker Desktop is running, then:
docker compose down
docker compose up -d
docker compose logs postgres
docker compose logs redis
```

### FFmpeg not found

```bash
# Re-run the FFmpeg downloader:
node scripts/download-ffmpeg.js

# Verify:
video-processor\ffmpeg\bin\ffmpeg.exe -version
```

### Database connection failed

- Confirm Docker is running: `docker compose ps`
- The `DATABASE_URL` in `backend/.env` must match the docker-compose credentials:
  `postgresql://neuroflix:neuroflix_dev@localhost:5432/neuroflix`
- Try: `cd backend && npx prisma db push`

### Redis connection failed

- Confirm the Redis container is healthy: `docker compose ps`
- Confirm `REDIS_HOST=localhost` and `REDIS_PORT=6379` in `video-processor/.env`
- Test: `docker exec neuroflix-redis redis-cli ping` — should return `PONG`

### Port already in use

```powershell
# Find what's using the port (e.g. 3001):
netstat -ano | findstr :3001

# Kill it:
taskkill /PID <PID> /F
```

### Prisma client out of date

```bash
cd backend
npm run db:generate
```

---

## Stopping the Stack

```bash
# Stop Node.js processes: Ctrl+C in each terminal

# Stop Docker containers (keeps data):
docker compose stop

# Stop and remove containers + volumes (clean slate):
docker compose down -v
```
