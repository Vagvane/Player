# Deployment Guide

Production deployment instructions for Neuroflix Video Player.

## Deployment Architecture

```
Frontend (Vercel) → Backend (Render.com) → PostgreSQL (Supabase)
                                         → Redis (Upstash)
                                         → R2 (Cloudflare)
```

## Prerequisites

### Required Accounts

1. **Vercel** (Frontend hosting)
   - Sign up: https://vercel.com/
   - Free tier: Unlimited deployments

2. **Render.com** (Backend + Worker)
   - Sign up: https://render.com/
   - Free tier: 750 hours/month

3. **Supabase** (PostgreSQL)
   - Sign up: https://supabase.com/
   - Free tier: 500MB database

4. **Upstash** (Redis)
   - Sign up: https://upstash.com/
   - Free tier: 10K commands/day

5. **Cloudflare R2** (Storage)
   - Sign up: https://cloudflare.com/
   - Free tier: 10GB storage + unlimited egress

## Step-by-Step Deployment

### 1. Setup Supabase (Database)

1. Create new Supabase project
2. Wait for provisioning (~2 minutes)
3. Go to Settings → Database
4. Copy connection string (URI mode)
5. Save for later: `DATABASE_URL`

### 2. Setup Upstash (Redis)

1. Create new Redis database
2. Select region close to your backend
3. Copy REST URL
4. Save for later: `REDIS_URL`

### 3. Setup Cloudflare R2

1. Create R2 bucket: `neuroflix-videos`
2. Go to R2 → Manage R2 API Tokens
3. Create API token with read/write permissions
4. Save:
   - `R2_ACCOUNT_ID`
   - `R2_ACCESS_KEY_ID`
   - `R2_SECRET_ACCESS_KEY`
   - `R2_BUCKET_NAME`

### 4. Deploy Backend (Render.com)

#### Option A: Using render.yaml (Recommended)

1. Push code to GitHub
2. Go to Render Dashboard
3. Click "New" → "Blueprint"
4. Connect GitHub repository
5. Select `backend/render.yaml`
6. Configure environment variables:
   ```
   DATABASE_URL=<from Supabase>
   JWT_SECRET=<generate 256-bit key>
   R2_ACCOUNT_ID=<from Cloudflare>
   R2_ACCESS_KEY_ID=<from Cloudflare>
   R2_SECRET_ACCESS_KEY=<from Cloudflare>
   R2_BUCKET_NAME=neuroflix-videos
   REDIS_URL=<from Upstash>
   FRONTEND_URL=<will add after frontend deployment>
   ```
7. Click "Apply"
8. Wait for deployment (~5 minutes)
9. Copy backend URL: `https://neuroflix-api.onrender.com`

#### Option B: Manual Setup

1. Go to Render Dashboard
2. Click "New" → "Web Service"
3. Connect GitHub repository
4. Configure:
   - **Name**: neuroflix-api
   - **Environment**: Node
   - **Region**: Oregon (or nearest)
   - **Branch**: main
   - **Build Command**:
     ```
     npm install && npx prisma generate && npm run build
     ```
   - **Start Command**: `npm start`
   - **Plan**: Free
5. Add environment variables (same as above)
6. Deploy

### 5. Run Database Migrations

After backend is deployed:

1. Go to Render Dashboard → neuroflix-api
2. Click "Shell"
3. Run migrations:
   ```bash
   npx prisma migrate deploy
   ```

### 6. Deploy Video Processor Worker

1. Go to Render Dashboard
2. Click "New" → "Background Worker"
3. Connect same GitHub repository
4. Configure:
   - **Name**: neuroflix-worker
   - **Environment**: Node
   - **Branch**: main
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run worker`
   - **Plan**: Free
5. Add environment variables:
   ```
   REDIS_HOST=<from Upstash>
   REDIS_PORT=6379
   REDIS_PASSWORD=<from Upstash>
   R2_ACCOUNT_ID=<from Cloudflare>
   R2_ACCESS_KEY_ID=<from Cloudflare>
   R2_SECRET_ACCESS_KEY=<from Cloudflare>
   R2_BUCKET_NAME=neuroflix-videos
   BACKEND_API_URL=https://neuroflix-api.onrender.com/api/v1
   VIDEO_PROCESSOR_API_KEY=<generate key>
   ```
6. Deploy

**Note**: FFmpeg won't work on Render's free tier. For video processing, you need:
- Option A: Paid Render plan
- Option B: AWS Lambda with FFmpeg layer
- Option C: Run worker locally on Windows machine

### 7. Deploy Frontend (Vercel)

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Navigate to frontend:
   ```bash
   cd frontend
   ```

3. Deploy:
   ```bash
   vercel --prod
   ```

4. Follow prompts:
   - Link to existing project? No
   - Project name: neuroflix
   - Directory: ./

5. Configure environment variable:
   - Go to Vercel Dashboard → Project Settings → Environment Variables
   - Add:
     ```
     VITE_API_URL=https://neuroflix-api.onrender.com/api/v1
     ```

6. Redeploy:
   ```bash
   vercel --prod
   ```

7. Copy frontend URL: `https://neuroflix.vercel.app`

### 8. Update Backend CORS

1. Go to Render Dashboard → neuroflix-api
2. Environment → Edit
3. Update `FRONTEND_URL`:
   ```
   FRONTEND_URL=https://neuroflix.vercel.app
   ```
4. Save (automatic redeploy)

## Post-Deployment

### 1. Verify Deployment

Visit frontend URL: https://neuroflix.vercel.app

- ✅ Frontend loads
- ✅ Login page accessible
- ✅ Can register new user
- ✅ Can login
- ✅ API connectivity working

### 2. Test Video Upload

1. Login to application
2. Upload test video
3. Check Render logs for processing
4. Verify video appears after processing

### 3. Monitor Services

**Render Dashboard**
- Check backend logs
- Check worker logs
- Monitor memory/CPU usage

**Vercel Dashboard**
- Check deployment status
- Monitor analytics

**Supabase Dashboard**
- Monitor database usage
- Check query performance

**Upstash Dashboard**
- Monitor Redis commands
- Check memory usage

**Cloudflare Dashboard**
- Monitor R2 storage usage
- Check bandwidth

## Environment Variables Reference

### Frontend
```env
VITE_API_URL=https://neuroflix-api.onrender.com/api/v1
```

### Backend
```env
NODE_ENV=production
DATABASE_URL=postgresql://...
JWT_SECRET=<256-bit-key>
R2_ACCOUNT_ID=<cloudflare>
R2_ACCESS_KEY_ID=<cloudflare>
R2_SECRET_ACCESS_KEY=<cloudflare>
R2_BUCKET_NAME=neuroflix-videos
REDIS_URL=redis://...
FRONTEND_URL=https://neuroflix.vercel.app
```

### Video Processor
```env
NODE_ENV=production
REDIS_HOST=<upstash>
REDIS_PORT=6379
REDIS_PASSWORD=<upstash>
R2_ACCOUNT_ID=<cloudflare>
R2_ACCESS_KEY_ID=<cloudflare>
R2_SECRET_ACCESS_KEY=<cloudflare>
R2_BUCKET_NAME=neuroflix-videos
BACKEND_API_URL=https://neuroflix-api.onrender.com/api/v1
VIDEO_PROCESSOR_API_KEY=<generate>
```

## Cost Analysis

**Free Tier Limits**:
- Vercel: Unlimited deployments
- Render: 750 hours/month (one service)
- Supabase: 500MB database
- Upstash: 10K commands/day
- Cloudflare R2: 10GB storage + unlimited egress

**Estimated Monthly Cost**: $0 (within free tiers)

**If Exceeding Free Tiers**:
- Render: $7/month (paid plan)
- Supabase: $25/month (Pro plan)
- Upstash: $10/month (paid plan)
- Total: ~$42/month

## Scaling

### When to Scale

- **Render**: Upgrade when >750 hours/month or need more CPU/RAM
- **Supabase**: Upgrade when >500MB database
- **Upstash**: Upgrade when >10K commands/day
- **R2**: Upgrade when >10GB storage

### Scaling Options

1. **Horizontal Scaling**: Add more Render workers
2. **Vertical Scaling**: Upgrade to paid Render plans
3. **CDN**: Add Cloudflare CDN for frontend
4. **Database**: Upgrade Supabase plan or migrate to dedicated PostgreSQL

## Troubleshooting

### Backend Not Responding

- Check Render logs
- Verify environment variables
- Check database connection
- Restart service

### Worker Not Processing Videos

- Check Render worker logs
- Verify Redis connection
- Check R2 credentials
- Ensure FFmpeg is available (not on free tier)

### Frontend Can't Connect

- Verify VITE_API_URL
- Check CORS settings
- Verify backend is running

### Database Errors

- Check DATABASE_URL format
- Run migrations: `npx prisma migrate deploy`
- Check Supabase dashboard for errors

## Rollback

If deployment fails:

**Vercel**:
```bash
vercel rollback
```

**Render**:
- Dashboard → Deployments → Select previous → Redeploy

## CI/CD (Optional)

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: cd frontend && npm ci
      - run: cd frontend && npm run build
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

---

**Deployment complete! 🎉**
