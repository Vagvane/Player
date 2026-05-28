const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

console.log('================================================')
console.log('  Neuroflix Setup Verification')
console.log('================================================')
console.log('')

const checks = []

// Check 1: Node.js version
console.log('🔍 Checking Node.js version...')
try {
  const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim()
  const majorVersion = parseInt(nodeVersion.replace('v', '').split('.')[0])

  if (majorVersion >= 18) {
    console.log(`✅ Node.js ${nodeVersion} (OK)`)
    checks.push({ name: 'Node.js', status: 'PASS' })
  } else {
    console.log(`❌ Node.js ${nodeVersion} (Requires 18+)`)
    checks.push({ name: 'Node.js', status: 'FAIL' })
  }
} catch (error) {
  console.log('❌ Node.js not found')
  checks.push({ name: 'Node.js', status: 'FAIL' })
}
console.log('')

// Check 2: Frontend dependencies
console.log('🔍 Checking frontend dependencies...')
const frontendNodeModules = path.join(__dirname, '..', 'frontend', 'node_modules')
if (fs.existsSync(frontendNodeModules)) {
  console.log('✅ Frontend dependencies installed')
  checks.push({ name: 'Frontend deps', status: 'PASS' })
} else {
  console.log('❌ Frontend dependencies not installed')
  checks.push({ name: 'Frontend deps', status: 'FAIL' })
}
console.log('')

// Check 3: Backend dependencies
console.log('🔍 Checking backend dependencies...')
const backendNodeModules = path.join(__dirname, '..', 'backend', 'node_modules')
if (fs.existsSync(backendNodeModules)) {
  console.log('✅ Backend dependencies installed')
  checks.push({ name: 'Backend deps', status: 'PASS' })
} else {
  console.log('❌ Backend dependencies not installed')
  checks.push({ name: 'Backend deps', status: 'FAIL' })
}
console.log('')

// Check 4: Video processor dependencies
console.log('🔍 Checking video processor dependencies...')
const vpNodeModules = path.join(__dirname, '..', 'video-processor', 'node_modules')
if (fs.existsSync(vpNodeModules)) {
  console.log('✅ Video processor dependencies installed')
  checks.push({ name: 'Video processor deps', status: 'PASS' })
} else {
  console.log('❌ Video processor dependencies not installed')
  checks.push({ name: 'Video processor deps', status: 'FAIL' })
}
console.log('')

// Check 5: FFmpeg installation
console.log('🔍 Checking FFmpeg installation...')
const ffmpegPath = path.join(__dirname, '..', 'video-processor', 'ffmpeg', 'bin', 'ffmpeg.exe')
if (fs.existsSync(ffmpegPath)) {
  try {
    const version = execSync(`"${ffmpegPath}" -version`, { encoding: 'utf8' })
    console.log('✅ FFmpeg installed:', version.split('\n')[0])
    checks.push({ name: 'FFmpeg', status: 'PASS' })
  } catch (error) {
    console.log('❌ FFmpeg found but not executable')
    checks.push({ name: 'FFmpeg', status: 'FAIL' })
  }
} else {
  console.log('❌ FFmpeg not found')
  checks.push({ name: 'FFmpeg', status: 'FAIL' })
}
console.log('')

// Check 6: Environment files
console.log('🔍 Checking environment files...')
const envFiles = [
  { path: path.join(__dirname, '..', 'frontend', '.env'), name: 'frontend/.env' },
  { path: path.join(__dirname, '..', 'backend', '.env'), name: 'backend/.env' },
  { path: path.join(__dirname, '..', 'video-processor', '.env'), name: 'video-processor/.env' }
]

envFiles.forEach(({ path: envPath, name }) => {
  if (fs.existsSync(envPath)) {
    console.log(`✅ ${name} exists`)
    checks.push({ name, status: 'PASS' })
  } else {
    console.log(`❌ ${name} missing`)
    checks.push({ name, status: 'FAIL' })
  }
})
console.log('')

// Check 7: Prisma Client
console.log('🔍 Checking Prisma Client...')
const prismaClient = path.join(__dirname, '..', 'backend', 'node_modules', '@prisma', 'client')
if (fs.existsSync(prismaClient)) {
  console.log('✅ Prisma Client generated')
  checks.push({ name: 'Prisma Client', status: 'PASS' })
} else {
  console.log('❌ Prisma Client not generated')
  checks.push({ name: 'Prisma Client', status: 'FAIL' })
}
console.log('')

// Summary
console.log('================================================')
console.log('  Summary')
console.log('================================================')
console.log('')

const passed = checks.filter(c => c.status === 'PASS').length
const failed = checks.filter(c => c.status === 'FAIL').length

console.log(`✅ Passed: ${passed}`)
console.log(`❌ Failed: ${failed}`)
console.log('')

if (failed === 0) {
  console.log('🎉 All checks passed! Setup is complete.')
  console.log('')
  process.exit(0)
} else {
  console.log('⚠️  Some checks failed. Please run setup script:')
  console.log('   powershell -ExecutionPolicy Bypass -File scripts/setup-windows.ps1')
  console.log('')
  process.exit(1)
}
