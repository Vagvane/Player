# Backend

Express REST API for Neuroflix. Handles authentication, video metadata, HLS proxying, progress tracking, and checkpoint questions.

## Stack

- Node.js 18 + Express 4 + TypeScript
- Prisma 5 ORM → PostgreSQL 15
- BullMQ → Redis (job queue publisher)
- Cloudflare R2 via AWS S3 SDK
- JWT auth + bcrypt

## Development

```bash
# Install
npm install

# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Start with hot reload
npm run dev
# → http://localhost:3001
# → http://localhost:3001/api/v1/health
```

## Key Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | ts-node-dev with hot reload |
| `npm run build` | Compile TypeScript to dist/ |
| `npm start` | Run compiled output (production) |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run db:studio` | Open Prisma Studio at :5555 |
| `npm run db:seed` | Seed database with sample data |

## Environment Variables

See `.env.example` for all required variables. Key ones:

```env
DATABASE_URL=postgresql://...
JWT_SECRET=...
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=...
REDIS_URL=redis://localhost:6379
FRONTEND_URL=http://localhost:5173
VIDEO_PROCESSOR_API_KEY=...
```

## API Routes

- `POST /api/v1/auth/register` — create account
- `POST /api/v1/auth/login` — get JWT
- `GET  /api/v1/videos` — list videos
- `GET  /api/v1/videos/:id` — video + user progress
- `GET  /api/v1/videos/:id/hls/*` — HLS proxy from R2
- `POST /api/v1/videos/:id/progress` — save playback position
- `POST /api/v1/upload` — upload MP4 for transcoding
- `GET  /api/v1/checkpoints/video/:id` — get checkpoint questions
- `POST /api/v1/checkpoints/answer` — submit answer

See [API Reference](../docs/API.md) for full documentation.
