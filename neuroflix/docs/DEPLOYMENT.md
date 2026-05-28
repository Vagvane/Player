# Deployment Guide

How to deploy Neuroflix to production.

---

## Architecture Overview

```
Frontend  →  Vercel (static hosting, free)
Backend   →  Any Node.js host (Render, Railway, Fly.io, VPS)
Database  →  Supabase PostgreSQL (free 500 MB) or any PostgreSQL
Redis     →  Any managed Redis (Upstash free, Redis Cloud, or self-hosted)
Storage   →  Cloudflare R2 (free 10 GB + zero egress)
Worker    →  Same host as backend, or a separate background worker
```

> **Important — Video Processor**: The video processor uses FFmpeg to transcode uploaded videos. FFmpeg must be available on the machine running the worker. Render's free tier does not include FFmpeg. The recommended production approach is to run the worker on a **paid Render plan**, a **VPS with FFmpeg installed**, or keep the worker running on a **Windows machine** pointing at the production Redis and R2.

---

## Step 1 — Cloudflare R2 (Storage)

If not already done:

1. Log in to https://dash.cloudflare.com/
2. Go to **R2 Object Storage** → **Create bucket**
3. Name it (e.g. `neuroflix-videos-prod`)
4. Go to **R2 → Manage R2 API Tokens** → **Create API Token**
   - Permissions: Object Read & Write
   - Scope: your bucket
5. Save: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`

---

## Step 1b — Enable Cloudflare CDN for HLS (Recommended for Production)

By default the backend proxies every HLS request through Express. In production you can offload all video bandwidth to Cloudflare's global edge network at zero egress cost.

1. In the Cloudflare dashboard → **R2 → your bucket → Settings → Public Access**
2. Enable the **r2.dev subdomain** (or connect a custom domain)
3. Copy the public URL — it looks like `https://pub-abc123.r2.dev`
4. Add to the backend's production environment variables:
   ```env
   R2_PUBLIC_URL=https://pub-abc123.r2.dev
   ```
5. Restart the backend — `hlsUrl` in API responses will now point directly to Cloudflare's CDN.

> Without `R2_PUBLIC_URL` set, the backend falls back to proxy mode automatically.

---

## Step 2 — PostgreSQL Database (Supabase)

1. Create a project at https://supabase.com/
2. Wait for provisioning (~2 minutes)
3. Go to **Project Settings → Database → Connection string** — select **URI** mode
4. Copy the connection string — it looks like:
   ```
   postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
   ```
5. Save as `DATABASE_URL`

---

## Step 3 — Redis

Choose any managed Redis service:

| Service | Free tier | Notes |
|---------|-----------|-------|
| **Upstash** | 10 K commands/day | https://upstash.com/ — good for low-traffic |
| **Redis Cloud** | 30 MB | https://redis.io/cloud/ |
| **Self-hosted** | — | Docker on a VPS |

For Upstash:
1. Create a Redis database at https://upstash.com/
2. Copy the **Endpoint**, **Port**, and **Password**
3. Set in env:
   ```env
   REDIS_HOST=your-host.upstash.io
   REDIS_PORT=6379
   REDIS_PASSWORD=your-password
   ```

---

## Step 4 — Deploy Backend (Render.com)

### Option A — Using render.yaml (Recommended)

A `render.yaml` Blueprint file already exists at `backend/render.yaml`. It defines both the web service and the background worker in one file.

1. Push code to GitHub
2. Go to https://dashboard.render.com/ → **New → Blueprint**
3. Connect your GitHub repository
4. Render will detect `backend/render.yaml` automatically
5. Set the environment variables when prompted (marked `sync: false` in the yaml)
6. Deploy

### Option B — Manual setup

1. Push code to GitHub
2. Go to https://dashboard.render.com/ → **New → Web Service**
3. Connect your GitHub repository
4. Configure:
   - **Name**: `neuroflix-api`
   - **Region**: Oregon (or nearest to your users)
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Build Command**:
     ```
     npm install && npx prisma generate && npm run build
     ```
   - **Start Command**: `npm start`
   - **Plan**: Starter ($7/month) — free tier spins down after 15 min inactivity
5. Add environment variables:

   ```env
   NODE_ENV=production
   PORT=3001
   DATABASE_URL=<from Supabase>
   JWT_SECRET=<generate: openssl rand -hex 32>
   R2_ACCOUNT_ID=<from Cloudflare>
   R2_ACCESS_KEY_ID=<from Cloudflare>
   R2_SECRET_ACCESS_KEY=<from Cloudflare>
   R2_BUCKET_NAME=<your bucket>
   REDIS_URL=redis://:<password>@<host>:6379
   FRONTEND_URL=<leave blank for now, update after Step 6>
   ```

6. Click **Deploy**
7. Copy the service URL: `https://neuroflix-api.onrender.com`

### Run database migrations

After deployment:

1. Open Render Dashboard → `neuroflix-api` → **Shell**
2. Run:
   ```bash
   npx prisma migrate deploy
   ```

---

## Step 5 — Deploy Video Processor Worker

### Option A — Run locally (simplest, good for low upload volume)

Keep the video processor running on a Windows machine with FFmpeg installed. Point it at the production Redis and R2:

```env
# video-processor/.env (production values)
NODE_ENV=production
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
R2_ACCOUNT_ID=your-r2-account-id
R2_ACCESS_KEY_ID=your-r2-key
R2_SECRET_ACCESS_KEY=your-r2-secret
R2_BUCKET_NAME=neuroflix-videos-prod
BACKEND_API_URL=https://neuroflix-api.onrender.com/api/v1
VIDEO_PROCESSOR_API_KEY=your-internal-key
```

Then run: `npm run worker`

### Option B — Render Background Worker (requires paid plan)

1. Go to Render Dashboard → **New → Background Worker**
2. Connect your GitHub repository
3. Configure:
   - **Root Directory**: `video-processor`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run worker`
   - **Plan**: Starter ($7/month minimum — FFmpeg needs CPU)
4. Add environment variables (same as Option A above)
5. **Important**: FFmpeg must be available. Add a build command that downloads it, or use a Docker image that includes FFmpeg.

### Option C — VPS with FFmpeg (best performance)

Rent a VPS (DigitalOcean, Hetzner, etc.), install Node.js + FFmpeg, clone the repo, and run the worker as a systemd service.

```bash
# On the VPS:
sudo apt install ffmpeg
cd video-processor
npm install && npm run build
npm run worker
```

---

## Step 6 — Deploy Frontend (Vercel)

1. Install Vercel CLI: `npm i -g vercel`
2. Navigate to the frontend directory: `cd frontend`
3. Run: `vercel --prod`
4. Follow the prompts (link to new project, name it `neuroflix`)
5. In Vercel Dashboard → Project → **Settings → Environment Variables**, add:
   ```
   VITE_API_URL = https://neuroflix-api.onrender.com/api/v1
   ```
6. Redeploy: `vercel --prod`
7. Copy your frontend URL: `https://neuroflix.vercel.app`

---

## Step 7 — Update Backend CORS

1. Go to Render Dashboard → `neuroflix-api` → **Environment**
2. Update `FRONTEND_URL` to your Vercel URL:
   ```
   FRONTEND_URL=https://neuroflix.vercel.app
   ```
3. Save — Render will automatically redeploy

---

## Environment Variable Reference

### Backend (production)

```env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
JWT_SECRET=<64-char random hex>
JWT_EXPIRES_IN=24h
R2_ACCOUNT_ID=<cloudflare>
R2_ACCESS_KEY_ID=<cloudflare>
R2_SECRET_ACCESS_KEY=<cloudflare>
R2_BUCKET_NAME=neuroflix-videos-prod
REDIS_URL=redis://:<password>@<host>:6379
FRONTEND_URL=https://neuroflix.vercel.app
VIDEO_PROCESSOR_API_KEY=<shared secret with worker>
# Optional — enable CDN mode (see Step 1b). Leave unset to use proxy mode.
# R2_PUBLIC_URL=https://pub-abc123.r2.dev
```

### Video Processor (production)

```env
NODE_ENV=production
REDIS_HOST=<your-redis-host>
REDIS_PORT=6379
REDIS_PASSWORD=<your-redis-password>
R2_ACCOUNT_ID=<cloudflare>
R2_ACCESS_KEY_ID=<cloudflare>
R2_SECRET_ACCESS_KEY=<cloudflare>
R2_BUCKET_NAME=neuroflix-videos-prod
BACKEND_API_URL=https://neuroflix-api.onrender.com/api/v1
VIDEO_PROCESSOR_API_KEY=<same as backend>
```

### Frontend (production)

```env
VITE_API_URL=https://neuroflix-api.onrender.com/api/v1
```

---

## Post-Deployment Checklist

- [ ] Frontend loads at Vercel URL
- [ ] Can register a new account
- [ ] Can log in
- [ ] Upload a video — confirm it appears as "Processing" then "Ready"
- [ ] Play the video — confirm HLS loads and quality switches work
- [ ] Progress saves and resumes correctly
- [ ] Checkpoint questions pause the video and require a correct answer

---

## Estimated Monthly Cost

| Service | Free tier | Paid |
|---------|-----------|------|
| Vercel (frontend) | Unlimited | $0 |
| Render (backend) | 750 h/month (spins down) | $7/month (always-on) |
| Supabase (DB) | 500 MB | $25/month (Pro) |
| Upstash (Redis) | 10 K commands/day | $10/month |
| Cloudflare R2 | 10 GB storage + 0 egress | $0.015/GB over 10 GB |
| **Total** | **$0** (low traffic) | **~$42/month** (production) |

---

## Troubleshooting

### Backend not responding
- Check Render logs for startup errors
- Verify all environment variables are set
- Confirm the database migration ran: `npx prisma migrate deploy`

### Videos stuck in "Processing"
- Check that the video processor worker is running and connected to the same Redis instance as the backend
- Check worker logs for FFmpeg errors
- Verify R2 credentials are correct in both backend and worker env files

### Frontend can't connect to API
- Verify `VITE_API_URL` points to the correct backend URL (no trailing slash)
- Check `FRONTEND_URL` in the backend env matches the Vercel domain exactly (CORS)
- Check browser Network tab for the actual error response

### Database migration failed
- Ensure `DATABASE_URL` is the full connection string with password
- Run from the Render shell: `npx prisma migrate deploy`
- Check Supabase dashboard for any connection limit issues
