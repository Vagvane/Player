const https = require('https')
const http = require('http')
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const FFMPEG_VERSION = '6.0'
const DOWNLOAD_URL = 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip'

const SCRIPT_DIR = __dirname
const DOWNLOAD_PATH = path.join(SCRIPT_DIR, '..', 'video-processor', 'ffmpeg.zip')
const EXTRACT_PATH = path.join(SCRIPT_DIR, '..', 'video-processor', 'ffmpeg')

console.log('================================================')
console.log('  Neuroflix FFmpeg Downloader for Windows')
console.log('================================================\n')
console.log(`📥 Downloading FFmpeg ${FFMPEG_VERSION}...`)
console.log(`Source: ${DOWNLOAD_URL}\n`)

const vpDir = path.join(SCRIPT_DIR, '..', 'video-processor')
if (!fs.existsSync(vpDir)) fs.mkdirSync(vpDir, { recursive: true })

function extractAndInstall() {
  console.log('📂 Extracting FFmpeg...')
  try {
    const extractCmd = `powershell -command "Expand-Archive -Path '${DOWNLOAD_PATH}' -DestinationPath '${EXTRACT_PATH}' -Force"`
    execSync(extractCmd, { stdio: 'inherit' })
    console.log('✅ Extraction complete!')

    const extractedContents = fs.readdirSync(EXTRACT_PATH)
    const ffmpegFolder = extractedContents.find(f => f.startsWith('ffmpeg-'))

    if (ffmpegFolder) {
      const sourceBinPath = path.join(EXTRACT_PATH, ffmpegFolder, 'bin')
      const targetBinPath = path.join(EXTRACT_PATH, 'bin')

      if (fs.existsSync(sourceBinPath)) {
        if (!fs.existsSync(targetBinPath)) fs.mkdirSync(targetBinPath, { recursive: true })

        fs.readdirSync(sourceBinPath).forEach(f => {
          fs.copyFileSync(path.join(sourceBinPath, f), path.join(targetBinPath, f))
        })
        console.log('✅ FFmpeg binaries organized!')
      }
    }

    fs.unlinkSync(DOWNLOAD_PATH)
    console.log('🗑️  Cleaned up zip file\n')

    console.log('🔍 Verifying FFmpeg installation...')
    const ffmpegPath = path.join(EXTRACT_PATH, 'bin', 'ffmpeg.exe')

    if (fs.existsSync(ffmpegPath)) {
      const version = execSync(`"${ffmpegPath}" -version`, { encoding: 'utf8' })
      console.log('✅ FFmpeg installed successfully!\n')
      console.log(version.split('\n')[0])
      console.log('\n================================================')
      console.log('  Installation Complete! 🎉')
      console.log('================================================')
    } else {
      console.error('❌ FFmpeg executable not found!')
      process.exit(1)
    }
  } catch (error) {
    console.error('❌ Extraction failed:', error.message)
    process.exit(1)
  }
}

// KEY FIX: single robust download function that follows redirects
// properly by creating a fresh WriteStream only at the final destination URL
function download(url, destPath, maxRedirects = 10) {
  if (maxRedirects === 0) {
    console.error('❌ Too many redirects')
    process.exit(1)
  }

  const protocol = url.startsWith('https') ? https : http

  protocol.get(url, {
    headers: {
      // Some servers reject requests without a User-Agent
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Node.js downloader'
    }
  }, (response) => {
    // Follow redirects — do NOT open a file stream yet
    if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
      const location = response.headers.location
      console.log(`🔄 Redirecting to: ${location}`)
      // Consume and discard the redirect response body
      response.resume()
      download(location, destPath, maxRedirects - 1)
      return
    }

    if (response.statusCode !== 200) {
      console.error(`❌ HTTP error: ${response.statusCode}`)
      process.exit(1)
    }

    const totalSize = parseInt(response.headers['content-length'], 10)
    let downloadedSize = 0

    // Only open the file stream once we have the real 200 response
    const file = fs.createWriteStream(destPath)

    response.on('data', (chunk) => {
      downloadedSize += chunk.length
      if (!isNaN(totalSize) && totalSize > 0) {
        const percent = ((downloadedSize / totalSize) * 100).toFixed(1)
        process.stdout.write(
          `\r📦 Downloading: ${percent}% (${(downloadedSize / 1024 / 1024).toFixed(1)} MB / ${(totalSize / 1024 / 1024).toFixed(1)} MB)`
        )
      } else {
        process.stdout.write(
          `\r📦 Downloading: ${(downloadedSize / 1024 / 1024).toFixed(1)} MB downloaded...`
        )
      }
    })

    response.pipe(file)

    file.on('finish', () => {
      file.close((err) => {
        if (err) {
          console.error('\n❌ Failed to close file:', err.message)
          process.exit(1)
        }

        // Sanity check — make sure we actually got a real file
        const stats = fs.statSync(destPath)
        if (stats.size < 1024 * 1024) { // less than 1MB = something went wrong
          console.error(`\n❌ Downloaded file is too small (${stats.size} bytes) — likely corrupt`)
          fs.unlinkSync(destPath)
          process.exit(1)
        }

        console.log(`\n✅ Download complete! (${(stats.size / 1024 / 1024).toFixed(1)} MB)`)
        console.log('')
        extractAndInstall()
      })
    })

    file.on('error', (err) => {
      file.destroy()
      if (fs.existsSync(destPath)) fs.unlinkSync(destPath)
      console.error('\n❌ File write error:', err.message)
      process.exit(1)
    })

    response.on('error', (err) => {
      file.destroy()
      if (fs.existsSync(destPath)) fs.unlinkSync(destPath)
      console.error('\n❌ Download stream error:', err.message)
      process.exit(1)
    })
  }).on('error', (err) => {
    if (fs.existsSync(destPath)) fs.unlinkSync(destPath)
    console.error('\n❌ Request failed:', err.message)
    process.exit(1)
  })
}

download(DOWNLOAD_URL, DOWNLOAD_PATH)