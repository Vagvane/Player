# Setup Guide

Complete setup instructions for Neuroflix Video Player on Windows.

## Prerequisites

### Required Software

1. **Node.js 18+**
   - Download: https://nodejs.org/
   - Verify: `node --version`

2. **npm 9+**
   - Included with Node.js
   - Verify: `npm --version`

3. **Git**
   - Download: https://git-scm.com/
   - Verify: `git --version`

4. **PostgreSQL** (or Supabase account)
   - Option A: Local PostgreSQL 15+
   - Option B: Supabase (recommended, free tier)
     - Sign up: https://supabase.com/

5. **Redis** (or Upstash account)
   - Option A: Local Redis
   - Option B: Upstash (recommended, free tier)
     - Sign up: https://upstash.com/

6. **Cloudflare R2 Account**
   - Sign up: https://cloudflare.com/
   - Create R2 bucket
   - Generate API keys

## Automated Setup (Recommended)

### Step 1: Clone Repository

```bash
git clone https://github.com/your-org/neuroflix.git
cd neuroflix
```

### Step 2: Run Setup Script

```powershell
powershell -ExecutionPolicy Bypass -File scripts/setup-windows.ps1
```

This script will:
- ✅ Check Node.js version
- ✅ Install all dependencies (frontend, backend, video-processor)
- ✅ Generate Prisma Client
- ✅ Download FFmpeg (Windows binary)
- ✅ Create .env files from templates

### Step 3: Configure Environment Variables

#### Frontend (.env)
```env
VITE_API_URL=http://localhost:3001/api/v1
```

#### Backend (.env)
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/neuroflix

# JWT
JWT_SECRET=your-super-secret-key-min-32-characters
JWT_EXPIRES_IN=24h

# Cloudflare R2
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=neuroflix-videos

# Redis
REDIS_URL=redis://localhost:6379

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

#### Video Processor (.env)
```env
# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# R2 (same as backend)
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=neuroflix-videos

# Backend API
BACKEND_API_URL=http://localhost:3001/api/v1
VIDEO_PROCESSOR_API_KEY=your-internal-api-key
```

### Step 4: Setup Database

```bash
cd backend

# Run migrations
npm run db:migrate

# Seed database (optional)
npm run db:seed
```

### Step 5: Verify Setup

```bash
cd ..
npm run test:setup
```

You should see all checks pass.

## Manual Setup

If you prefer manual setup:

### 1. Install Dependencies

```bash
# Frontend
cd frontend
npm install

# Backend
cd ../backend
npm install
npx prisma generate

# Video Processor
cd ../video-processor
npm install

cd ..
```

### 2. Download FFmpeg

```bash
node scripts/download-ffmpeg.js
```

### 3. Create .env files

Copy `.env.example` to `.env` in each directory and configure.

### 4. Setup Database

```bash
cd backend
npm run db:migrate
npm run db:seed
```

## Service-Specific Setup

### Supabase (PostgreSQL)

1. Create account at https://supabase.com/
2. Create new project
3. Copy connection string from Settings → Database
4. Add to `backend/.env`:
   ```env
   DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
   ```

### Upstash (Redis)

1. Create account at https://upstash.com/
2. Create new Redis database
3. Copy connection details
4. Add to `.env` files:
   ```env
   REDIS_URL=redis://default:[PASSWORD]@[HOST]:6379
   ```

### Cloudflare R2

1. Create Cloudflare account
2. Go to R2 Object Storage
3. Create bucket: `neuroflix-videos`
4. Generate R2 API tokens
5. Add to `.env` files

## Running the Application

### Development Mode

Open 3 terminals:

**Terminal 1: Frontend**
```bash
cd frontend
npm run dev
```
Opens at http://localhost:5173

**Terminal 2: Backend**
```bash
cd backend
npm run dev
```
Runs at http://localhost:3001

**Terminal 3: Video Processor**
```bash
cd video-processor
npm run worker
```
Processes video jobs from queue

### Production Mode

```bash
# Build all
npm run build:all

# Start backend
cd backend
npm start

# Start frontend (use Vercel for production)
cd frontend
npm run preview
```

## Troubleshooting

### FFmpeg Not Found

```bash
# Re-download FFmpeg
node scripts/download-ffmpeg.js

# Verify installation
cd video-processor/ffmpeg/bin
./ffmpeg.exe -version
```

### Database Connection Failed

- Check DATABASE_URL format
- Verify PostgreSQL is running
- Check firewall settings
- Test connection: `npx prisma db push`

### Redis Connection Failed

- Check Redis is running: `redis-cli ping`
- Verify REDIS_URL format
- Check port 6379 is not blocked

### Port Already in Use

```bash
# Find process using port
netstat -ano | findstr :3001

# Kill process
taskkill /PID <PID> /F
```

### Prisma Generate Failed

```bash
cd backend
rm -rf node_modules
npm install
npx prisma generate
```

## Next Steps

- [API Documentation](./API.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Architecture Overview](./ARCHITECTURE.md)
