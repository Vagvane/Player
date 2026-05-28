# Scripts

| Script | How to run | What it does |
|--------|-----------|-------------|
| `setup-windows.ps1` | `powershell -ExecutionPolicy Bypass -File scripts/setup-windows.ps1` | Installs all npm dependencies, downloads FFmpeg, generates Prisma client, copies `.env.example` → `.env` for each service |
| `download-ffmpeg.js` | `node scripts/download-ffmpeg.js` | Downloads the FFmpeg Windows binary to `video-processor/ffmpeg/bin/`. Run this if FFmpeg is missing or corrupt. |
| `test-setup.js` | `npm run test:setup` (from root) | Verifies that Node.js, npm, Docker, and each service's dependencies are installed correctly. Run after setup to confirm everything is ready. |
