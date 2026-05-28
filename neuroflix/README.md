# 🎬 Neuroflix Video Player

A corporate training video player with Netflix-like experience, featuring HLS streaming, checkpoint questions, and video download protection.

![Neuroflix](https://img.shields.io/badge/status-production-green)
![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)
![TypeScript](https://img.shields.io/badge/typescript-5.0-blue)
![License](https://img.shields.io/badge/license-MIT-blue)

## ✨ Features

### 🎥 Netflix-Like Video Experience
- **Custom Video Player**: Built with hls.js, not native controls
- **Thumbnail Previews**: Hover on timeline to see video thumbnails
- **Buffer Visualization**: See what's loaded vs what's playing
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Touch Gestures**: Optimized for mobile with 44px minimum touch targets

### 🔒 Video Download Protection
- **HLS Segmented Streaming**: No single MP4 download URL
- **Signed URLs**: 1-hour expiry on all video segments
- **Authentication**: JWT-based access control
- **Dynamic Watermark**: User email + organization visible, shifts every 60 seconds

### 📚 Interactive Learning
- **Checkpoint Questions**: Quiz questions at specific timestamps
- **Pause on Questions**: Video pauses when question appears
- **Answer Tracking**: Records answers and correctness
- **Progress Saving**: Resume where you left off

### 🚀 Technical Highlights
- **Adaptive Bitrate**: 4 quality levels (1080p/720p/480p/360p)
- **Fast Buffering**: CDN delivery with zero egress cost
- **Self-Hosted Transcoding**: FFmpeg on Windows
- **Job Queue**: BullMQ for reliable video processing
- **Zero Cost**: Within free tiers (Cloudflare R2, Vercel, Render, Supabase)

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Vercel)                        │
│  React 18 + TypeScript + hls.js + Tailwind CSS            │
│  - Video Player  - Checkpoints  - Watermark  - Auth       │
└────────────────────────┬────────────────────────────────────┘
                         │ REST API
┌────────────────────────▼────────────────────────────────────┐
│                  Backend API (Render.com)                   │
│  Node.js + Express + Prisma + PostgreSQL + JWT             │
│  - Auth  - Video Metadata  - Signed URLs  - Progress       │
└────────────────────┬───────────────┬────────────────────────┘
                     │               │
         ┌───────────▼─┐         ┌──▼──────────┐
         │  PostgreSQL │         │   BullMQ    │
         │  (Supabase) │         │   (Redis)   │
         └─────────────┘         └──┬──────────┘
                                    │
         ┌──────────────────────────▼──────────────────────────┐
         │         Video Processor (Render Worker)             │
         │  FFmpeg + HLS Transcoding + Thumbnail Generation   │
         └──────────────┬──────────────────────────────────────┘
                        │
         ┌──────────────▼──────────────────────────────────────┐
         │          Cloudflare R2 Storage (CDN)                │
         │  HLS Segments + Thumbnails + Master Playlists       │
         └─────────────────────────────────────────────────────┘
```

## 📦 Tech Stack

**Frontend**
- React 18.2 + TypeScript 5.0
- Vite 4.4 (build tool)
- hls.js 1.4 (HLS playback)
- Zustand 4.3 (state management)
- Tailwind CSS 3.3 (styling)
- Axios 1.4 (HTTP client)

**Backend**
- Node.js 18 LTS + Express 4.18
- TypeScript 5.0
- Prisma 5.1 (ORM)
- PostgreSQL 15 (Supabase)
- JWT (jsonwebtoken 9.0)
- bcrypt 5.1 (password hashing)

**Video Processing**
- FFmpeg 6.0 (Windows binary)
- BullMQ 4.0 (job queue)
- Redis 7 (Upstash)
- AWS S3 SDK (R2 compatible)

**Infrastructure**
- Cloudflare R2 (storage, 10GB free)
- Vercel (frontend, free)
- Render.com (backend, 750h/month free)
- Supabase (PostgreSQL, 500MB free)
- Upstash (Redis, 10K commands/day free)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm 9+
- Windows (for FFmpeg transcoding)
- PostgreSQL (or Supabase account)
- Redis (or Upstash account)
- Cloudflare R2 account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/neuroflix.git
   cd neuroflix
   ```

2. **Run Windows setup script**
   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts/setup-windows.ps1
   ```

   This will:
   - Install all npm dependencies
   - Download FFmpeg
   - Generate Prisma client
   - Create .env files

3. **Configure environment variables**

   Edit `.env` files in each directory:
   - `frontend/.env` - Backend API URL
   - `backend/.env` - Database, JWT, R2, Redis
   - `video-processor/.env` - Redis, R2, Backend API

4. **Setup database**
   ```bash
   cd backend
   npm run db:migrate
   npm run db:seed
   ```

5. **Start development servers**

   Open 3 terminals:

   ```bash
   # Terminal 1: Frontend
   cd frontend
   npm run dev
   # → http://localhost:5173

   # Terminal 2: Backend
   cd backend
   npm run dev
   # → http://localhost:3001

   # Terminal 3: Video Processor
   cd video-processor
   npm run worker
   ```

6. **Open browser**

   Navigate to `http://localhost:5173`

## 📖 Documentation

- [Setup Guide](./docs/SETUP.md) - Detailed setup instructions
- [Deployment Guide](./docs/DEPLOYMENT.md) - Production deployment
- [API Documentation](./docs/API.md) - Backend API reference
- [Architecture](./docs/ARCHITECTURE.md) - System architecture details

## 🧪 Testing

```bash
# Verify setup
npm run test:setup

# Test FFmpeg installation
cd video-processor
npm run test:ffmpeg

# Test backend API
cd backend
npm run test

# Test frontend
cd frontend
npm run test
```

## 📦 Deployment

### Frontend (Vercel)
```bash
cd frontend
vercel --prod
```

### Backend (Render.com)
- Push to GitHub
- Connect repository to Render
- Deploy using `render.yaml`

### Video Processor (Render Worker)
- Automatically deployed with backend
- Configured in `render.yaml`

See [Deployment Guide](./docs/DEPLOYMENT.md) for details.

## 🔧 Development

### Project Structure
```
neuroflix/
├── frontend/              # React application
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── hooks/        # Custom hooks
│   │   ├── services/     # API services
│   │   ├── stores/       # Zustand stores
│   │   └── types/        # TypeScript types
├── backend/              # Express API
│   ├── src/
│   │   ├── config/       # Configuration
│   │   ├── controllers/  # Route controllers
│   │   ├── middleware/   # Express middleware
│   │   ├── routes/       # API routes
│   │   ├── services/     # Business logic
│   │   └── types/        # TypeScript types
│   └── prisma/           # Database schema
├── video-processor/      # FFmpeg transcoding
│   ├── src/
│   │   ├── transcoder/   # HLS transcoding
│   │   ├── thumbnails/   # Sprite generation
│   │   ├── queue/        # BullMQ setup
│   │   └── utils/        # Utilities
│   └── ffmpeg/           # FFmpeg binaries
└── scripts/              # Setup scripts
```

### Available Scripts

**Root**
- `npm run setup:windows` - Windows setup
- `npm run dev:all` - Start all services
- `npm run build:all` - Build all projects

**Frontend**
- `npm run dev` - Development server
- `npm run build` - Production build
- `npm run preview` - Preview production build

**Backend**
- `npm run dev` - Development server
- `npm run build` - Build TypeScript
- `npm run db:migrate` - Run migrations
- `npm run db:studio` - Open Prisma Studio

**Video Processor**
- `npm run worker` - Start BullMQ worker
- `npm run test:ffmpeg` - Test FFmpeg

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

## 📄 License

This project is licensed under the MIT License - see [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgments

- [hls.js](https://github.com/video-dev/hls.js/) - HLS video playback
- [FFmpeg](https://ffmpeg.org/) - Video transcoding
- [Prisma](https://www.prisma.io/) - Database ORM
- [BullMQ](https://docs.bullmq.io/) - Job queue

## 📧 Support

For issues and questions:
- GitHub Issues: [github.com/your-org/neuroflix/issues](https://github.com/your-org/neuroflix/issues)
- Email: support@neuroflix.com

---

**Built with ❤️ for corporate training**
