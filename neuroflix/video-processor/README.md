# Video Processor

BullMQ worker that transcodes uploaded MP4 videos into adaptive-bitrate HLS streams and generates scrubber thumbnails. Runs as a standalone background process alongside the backend.

## Stack

- Node.js 18 + TypeScript
- FFmpeg 6 (Windows binary — `ffmpeg/bin/ffmpeg.exe`)
- BullMQ → Redis (job consumer)
- Cloudflare R2 via AWS S3 SDK (download source, upload artefacts)
- axios (report status back to backend API)

## How It Works

```
Backend enqueues job
        ↓
  [Redis queue: video-processing]
        ↓
  Worker picks up job
        ↓
  1. Download original MP4 from R2  →  temp/<videoId>_original.mp4
  2. Transcode to HLS               →  output/<videoId>/master.m3u8 + segments
  3. Generate thumbnail sprite      →  output/<videoId>/sprite.jpg
  4. Generate WebVTT index          →  output/<videoId>/thumbnails.vtt
  5. Upload all artefacts to R2
  6. PATCH backend API → status: READY
        ↓
  Cleanup temp + output directories
```

On any failure, the backend is notified with `status: FAILED` and BullMQ retries the job with exponential back-off.

## HLS Output

Four quality tiers are produced per video:

| Quality | Resolution  | Video Bitrate | Audio Bitrate |
|---------|-------------|--------------|---------------|
| 1080p   | 1920×1080   | 5000 kbps    | 192 kbps      |
| 720p    | 1280×720    | 2500 kbps    | 128 kbps      |
| 480p    | 854×480     | 1000 kbps    | 128 kbps      |
| 360p    | 640×360     | 500 kbps     | 96 kbps       |

- Segment duration: **4 seconds** (VOD best-practice)
- Playlist type: `VOD` (all segments in playlist — required for full seeking)
- Thumbnail sprite: 1 frame per 2 s, 320×180 px per cell, 10×10 grid

## Development

### 1. Install dependencies

```bash
cd video-processor
npm install
```

### 2. Download FFmpeg

```bash
npm run download:ffmpeg
```

This runs `scripts/download-ffmpeg.js` which downloads the FFmpeg Windows essentials build and places the binaries at `ffmpeg/bin/ffmpeg.exe` and `ffmpeg/bin/ffprobe.exe`.

If FFmpeg is already downloaded, skip this step — the setup script checks automatically.

You can verify the installation with:

```bash
npm run test:ffmpeg
```

### 3. Configure environment

Copy the video-processor section from the root `.env.example`:

```env
NODE_ENV=development

# Redis — Docker default (matches docker-compose.yml)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Cloudflare R2 — same credentials as backend
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_BUCKET_NAME=neuroflix-videos

# Backend API — used to report processing status
BACKEND_API_URL=http://localhost:3001/api/v1
VIDEO_PROCESSOR_API_KEY=change-this-to-any-random-string
```

> `VIDEO_PROCESSOR_API_KEY` must match the value set in `backend/.env`.

### 4. Start Docker (Redis)

```bash
# From the neuroflix/ root:
docker compose up -d
```

### 5. Run the worker

```bash
npm run worker
```

The worker connects to Redis, registers on the `video-processing` queue, and starts polling for jobs. Upload a video through the frontend to trigger a job.

## Key Scripts

| Script | Description |
|--------|-------------|
| `npm run worker` | Start the BullMQ worker (production-style, hot-reload off) |
| `npm run dev` | Start with tsx watch (hot reload — for development) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled output |
| `npm run test:ffmpeg` | Verify FFmpeg binary works and print version |
| `npm run download:ffmpeg` | Download FFmpeg Windows binary |

## Concurrency

The worker is configured with `concurrency: 1`. FFmpeg transcoding is CPU and memory intensive — running multiple jobs in parallel on a typical machine causes severe slowdowns and potential OOM kills. Process one video at a time.

## File Layout

```
video-processor/
├── ffmpeg/
│   └── bin/
│       ├── ffmpeg.exe          ← FFmpeg binary (downloaded, not committed)
│       └── ffprobe.exe         ← FFprobe binary (downloaded, not committed)
├── scripts/
│   └── download-ffmpeg.js      ← Downloads FFmpeg from GitHub releases
├── src/
│   ├── config/
│   │   └── ffmpeg.config.ts    ← Quality presets, HLS settings, paths
│   ├── downloader/
│   │   └── r2.downloader.ts    ← Downloads original MP4 from R2
│   ├── transcoder/
│   │   ├── hls.transcoder.ts   ← FFmpeg HLS encoding
│   │   ├── quality.validator.ts
│   │   └── index.ts
│   ├── thumbnails/
│   │   ├── sprite.generator.ts ← FFmpeg thumbnail sprite extraction
│   │   └── vtt.generator.ts    ← WebVTT index generation
│   ├── uploader/
│   │   └── r2.uploader.ts      ← Uploads HLS + thumbnails to R2
│   ├── services/
│   │   └── video.service.ts    ← PATCH backend API with processing status
│   ├── processor/
│   │   └── video.processor.ts  ← Main pipeline orchestrator
│   ├── queue/
│   │   ├── queue.config.ts     ← BullMQ queue + Redis connection config
│   │   ├── worker.ts           ← BullMQ worker entry point
│   │   └── index.ts
│   ├── utils/
│   │   ├── ffmpeg.utils.ts     ← Temp file cleanup helpers
│   │   └── logger.ts
│   └── index.ts                ← Health check / startup entry point
├── temp/                       ← Downloaded originals (auto-created, gitignored)
├── output/                     ← Transcoded artefacts (auto-created, gitignored)
└── package.json
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `REDIS_HOST` | Yes | Redis hostname (e.g. `localhost`) |
| `REDIS_PORT` | Yes | Redis port (default `6379`) |
| `REDIS_PASSWORD` | No | Redis password (empty for Docker local) |
| `R2_ACCOUNT_ID` | Yes | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | Yes | R2 API token key ID |
| `R2_SECRET_ACCESS_KEY` | Yes | R2 API token secret |
| `R2_BUCKET_NAME` | Yes | R2 bucket name (must match backend) |
| `BACKEND_API_URL` | Yes | Backend API base URL (e.g. `http://localhost:3001/api/v1`) |
| `VIDEO_PROCESSOR_API_KEY` | Yes | Shared secret for backend auth (must match backend) |
| `NODE_ENV` | No | `development` or `production` |

## Troubleshooting

### Worker not picking up jobs
- Confirm Redis is running: `docker compose ps`
- Confirm `REDIS_HOST` / `REDIS_PORT` match the backend's `REDIS_URL`
- Check that a video was actually uploaded (the backend enqueues the job on upload)

### FFmpeg not found
Run `npm run test:ffmpeg` to diagnose. If it fails, re-run `npm run download:ffmpeg` or manually place `ffmpeg.exe` and `ffprobe.exe` at `video-processor/ffmpeg/bin/`.

### Videos stuck at "Processing"
- Check the worker terminal for FFmpeg error output
- Verify R2 credentials are identical to the backend's `.env`
- Check `temp/` and `output/` for leftover files from a previous failed run

### Out of disk space
Transcoding creates temporary files (downloaded MP4 + HLS segments) before uploading. A 1 GB source video can produce ~2–3 GB of temp/output files during processing. Ensure sufficient disk space. Files are cleaned up automatically after a successful upload.
