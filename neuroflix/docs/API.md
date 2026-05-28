# API Reference

Base URL: `http://localhost:3001/api/v1` (development)

All protected endpoints require:
```
Authorization: Bearer <jwt_token>
```

---

## Health

### GET /health
Returns server status.

**Response 200**
```json
{ "status": "ok" }
```

---

## Authentication

### POST /auth/register
Create a new user account.

**Body**
```json
{
  "email": "user@example.com",
  "password": "min6chars",
  "organization": "Acme Corp",
  "firstName": "Jane",      // optional
  "lastName": "Doe"         // optional
}
```

**Response 201**
```json
{
  "success": true,
  "data": {
    "user": { "id": "uuid", "email": "...", "organization": "..." },
    "token": "eyJhbGci..."
  }
}
```

---

### POST /auth/login
Authenticate and receive a JWT.

**Body**
```json
{
  "email": "user@example.com",
  "password": "yourpassword"
}
```

**Response 200**
```json
{
  "success": true,
  "data": {
    "user": { "id": "uuid", "email": "...", "organization": "..." },
    "token": "eyJhbGci..."
  }
}
```

---

### GET /auth/me
Get current user profile. **Protected.**

**Response 200**
```json
{
  "success": true,
  "data": { "user": { "id": "uuid", "email": "...", "organization": "..." } }
}
```

---

## Videos

### GET /videos
List all videos with status `READY`.

**Query params** (optional)
- `page` — page number (default: 1)
- `limit` — per page (default: 20, max: 100)
- `status` — filter by status

**Response 200**
```json
{
  "success": true,
  "data": { "videos": [...], "total": 5, "pages": 1 },
  "meta": { "page": 1, "limit": 20, "totalPages": 1, "totalItems": 5 }
}
```

---

### GET /videos/:id
Get a single video with signed HLS URL and user progress. **Optionally authenticated** (progress only returned when authenticated).

**Response 200**
```json
{
  "success": true,
  "data": {
    "video": {
      "id": "uuid",
      "title": "Intro to Streaming",
      "duration": 180,
      "hlsUrl": "http://localhost:3001/api/v1/videos/uuid/hls/master.m3u8",
      "thumbnailVttUrl": "http://localhost:3001/api/v1/videos/uuid/hls/thumbnails.vtt",
      "status": "READY"
    },
    "progress": {
      "currentTime": 45,
      "completed": false,
      "lastWatched": "2026-05-28T10:00:00Z"
    }
  }
}
```

`hlsUrl` is a backend proxy URL in development. When `R2_PUBLIC_URL` is configured (production CDN mode), it becomes a direct Cloudflare CDN URL (`https://pub-xxx.r2.dev/videos/...`).

`progress` is `null` if the user has not watched the video yet.

---

### GET /videos/:id/hls/*
Proxy HLS files from Cloudflare R2. Handles master playlists, quality playlists, `.ts` segments, WebVTT thumbnails, and sprite JPEGs.

**Examples**
```
GET /videos/uuid/hls/master.m3u8
GET /videos/uuid/hls/1080p.m3u8
GET /videos/uuid/hls/1080p_000.ts
GET /videos/uuid/hls/thumbnails.vtt
GET /videos/uuid/hls/sprite.jpg
```

---

### POST /videos/:id/progress
Save playback position. **Protected.**

**Body**
```json
{
  "currentTime": 45,       // seconds (integer, required)
  "completed": false       // optional, default false
}
```

**Response 200**
```json
{
  "success": true,
  "message": "Progress saved successfully",
  "data": { "progress": { "currentTime": 45, "completed": false } }
}
```

---

### GET /videos/:id/progress
Get saved playback position. **Protected.**

**Response 200**
```json
{
  "success": true,
  "data": {
    "progress": { "currentTime": 45, "completed": false, "lastWatched": "..." }
  }
}
```

`progress` is `null` if never watched.

---

### PATCH /videos/:id
Update video metadata (title, description). **Protected.**

**Body** (all optional)
```json
{
  "title": "New Title",
  "description": "Updated description"
}
```

---

### POST /videos/:id/reprocess
Re-queue a video for transcoding without re-uploading. **Protected.**

Useful after changing FFmpeg settings (e.g. sprite resolution).

---

## Upload

### POST /upload
Upload a video file for transcoding. **Protected.**

**Content-Type**: `multipart/form-data`

**Fields**
- `video` — the MP4 file (required)
- `title` — video title (required)
- `description` — optional

**Response 201**
```json
{
  "success": true,
  "message": "Video uploaded successfully. Processing will begin shortly.",
  "data": { "video": { "id": "uuid", "status": "UPLOADING", "title": "..." } }
}
```

---

## Checkpoints

### GET /checkpoints/video/:videoId
Get all checkpoint questions for a video. **Protected.**

**Response 200**
```json
{
  "success": true,
  "data": {
    "checkpoints": [
      {
        "id": "cp-001",
        "videoId": "uuid",
        "timestamp": 30,
        "question": "What is HLS?",
        "options": ["HTTP Live Streaming", "High Level Streaming", "..."]
      }
    ]
  }
}
```

`correctAnswer` is intentionally omitted from this response — it is only revealed after a submission via `POST /checkpoints/answer`.

---

### POST /checkpoints/answer
Submit an answer to a checkpoint question. **Protected.**

**Body**
```json
{
  "videoId": "uuid",
  "checkpointId": "cp-001",
  "answer": 0,             // index 0–3
  "timeSpent": 12          // seconds, optional
}
```

**Response 200**
```json
{
  "success": true,
  "message": "Correct answer!",
  "data": {
    "isCorrect": true,
    "correctAnswer": 0,
    "userAnswer": 0,
    "savedAnswer": { "id": "uuid", "isCorrect": true, "answer": 0, ... }
  }
}
```

`message` is `"Incorrect answer"` and `isCorrect` is `false` when the answer is wrong — the frontend keeps the overlay open for retry.

---

## Error Responses

All errors follow this shape:

```json
{
  "success": false,
  "message": "Human-readable error description",
  "errors": [                        // only on 400 validation errors
    { "field": "email", "message": "Invalid email format" }
  ]
}
```

| Status | Meaning |
|--------|---------|
| 400 | Validation error — check `errors` array |
| 401 | Not authenticated — missing or expired JWT |
| 403 | Forbidden — valid JWT but insufficient permissions |
| 404 | Resource not found |
| 409 | Conflict — e.g. video not yet processed |
| 429 | Rate limited — 100 requests per 15 minutes per IP |
| 500 | Internal server error |
