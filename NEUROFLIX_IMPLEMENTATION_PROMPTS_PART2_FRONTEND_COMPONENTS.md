# NEUROFLIX VIDEO PLAYER - IMPLEMENTATION PROMPTS
## Part 2: Frontend Components
## Complete Technical Prompt Engineering Document

**Part**: 2 of 5
**Focus**: React Components (VideoPlayer, Timeline, Checkpoint, Watermark, Auth, Layout, Pages)
**Prerequisites**: Part 1 must be completed (Types, Utils, Services, Stores, Hooks)
**Target**: Claude Code AI for implementation
**Environment**: Windows Development
**Last Updated**: May 24th, 2026

---

## 📋 TABLE OF CONTENTS - PART 2

1. [Video Player Core Components](#section-21-video-player-core-components)
2. [Timeline Components](#section-22-timeline-components)
3. [Checkpoint Components](#section-23-checkpoint-components)
4. [Watermark Component](#section-24-watermark-component)
5. [Authentication Components](#section-25-authentication-components)
6. [Layout Components](#section-26-layout-components)
7. [Common/Shared Components](#section-27-commonshared-components)
8. [Page Components](#section-28-page-components)
9. [Styles (CSS)](#section-29-styles)
10. [Configuration Files](#section-210-configuration-files)
11. [Main Application Files](#section-211-main-application-files)

**Total Prompts in Part 2**: 42 detailed prompts

---

## SECTION 2.1: VIDEO PLAYER CORE COMPONENTS

### PROMPT 2.1.1: Create VideoElement Component (HLS Integration)

```
Create the core VideoElement component that integrates hls.js for video playback.

File: frontend/src/components/VideoPlayer/VideoElement.tsx

Requirements:

1. Imports:
   - React: { useRef, useEffect, forwardRef, useImperativeHandle }
   - useHLS from '../../hooks/useHLS'
   - usePlayerStore from '../../store/playerStore'

2. Props interface (VideoElementProps):
   - hlsUrl: string (signed URL to master.m3u8)
   - onLoadedMetadata: (duration: number) => void
   - onTimeUpdate: (currentTime: number) => void
   - onProgress: () => void
   - onEnded: () => void
   - onError: (error: string) => void
   - className?: string

3. Ref interface (VideoElementRef):
   - play: () => Promise<void>
   - pause: () => void
   - seek: (time: number) => void
   - getVideoElement: () => HTMLVideoElement | null

4. Component implementation:

   a) Use forwardRef to expose methods via ref

   b) Create videoRef: useRef<HTMLVideoElement>(null)

   c) Get store actions:
      - setIsPlaying, setCurrentTime, setDuration, setBufferedRanges, setIsBuffering

   d) Initialize HLS:
      - const { hls, isSupported, currentLevel, levels } = useHLS(
          videoRef,
          hlsUrl,
          onLoadedMetadata,
          (level) => console.log('Quality changed:', level)
        )

   e) Setup video event listeners (useEffect):
      * 'loadedmetadata':
        - setDuration(videoRef.current.duration)
        - onLoadedMetadata(videoRef.current.duration)

      * 'timeupdate':
        - setCurrentTime(videoRef.current.currentTime)
        - onTimeUpdate(videoRef.current.currentTime)

      * 'progress':
        - setBufferedRanges(videoRef.current.buffered)
        - onProgress()

      * 'ended':
        - setIsPlaying(false)
        - onEnded()

      * 'play':
        - setIsPlaying(true)

      * 'pause':
        - setIsPlaying(false)

      * 'waiting':
        - setIsBuffering(true)

      * 'playing':
        - setIsBuffering(false)

      * 'canplay':
        - setIsBuffering(false)

      * 'error':
        - const error = videoRef.current.error
        - onError(error?.message || 'Video playback error')

   f) Expose methods via useImperativeHandle:
      - play: async () => {
          try {
            await videoRef.current?.play()
          } catch (error) {
            console.error('Play failed:', error)
          }
        }
      - pause: () => videoRef.current?.pause()
      - seek: (time: number) => {
          if (videoRef.current) {
            videoRef.current.currentTime = time
          }
        }
      - getVideoElement: () => videoRef.current

5. Render:
   ```tsx
   return (
     <video
       ref={videoRef}
       className={className || "w-full h-full bg-black"}
       playsInline
       preload="metadata"
       crossOrigin="anonymous"
     />
   )
   ```

6. Export:
   - export type { VideoElementRef, VideoElementProps }
   - export default forwardRef<VideoElementRef, VideoElementProps>(VideoElement)

7. Error handling:
   - Handle play() promise rejection (autoplay policy)
   - Handle HLS loading errors
   - Log all errors to console

Add comprehensive JSDoc explaining the component's role.
Add TypeScript strict types for all props and refs.
Output the complete component file.
```

### PROMPT 2.1.2: Create PlayerControls Component

```
Create the PlayerControls component that contains all playback control buttons.

File: frontend/src/components/VideoPlayer/PlayerControls.tsx

Requirements:

1. Imports:
   - React: { FC }
   - PlayPauseButton from './PlayPauseButton'
   - VolumeControl from './VolumeControl'
   - TimeDisplay from './TimeDisplay'
   - FullscreenButton from './FullscreenButton'
   - usePlayerStore from '../../store/playerStore'

2. Props interface (PlayerControlsProps):
   - show: boolean (visibility controlled by parent)
   - className?: string

3. Component implementation:

   a) Get state from store:
      - isPlaying, currentTime, duration, volume, isMuted, isFullscreen

   b) Get actions (passed as props to child components):
      - Will be passed down to child components

   c) Render layout:
      ```tsx
      return (
        <div
          className={`
            absolute bottom-0 left-0 right-0
            bg-gradient-to-t from-black/80 via-black/50 to-transparent
            px-4 pb-4 pt-8
            transition-opacity duration-300
            ${show ? 'opacity-100' : 'opacity-0 pointer-events-none'}
            ${className || ''}
          `}
        >
          {/* Controls row */}
          <div className="flex items-center gap-4">
            {/* Left side controls */}
            <div className="flex items-center gap-3">
              <PlayPauseButton />
              <VolumeControl />
              <TimeDisplay current={currentTime} total={duration} />
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Right side controls */}
            <div className="flex items-center gap-3">
              <FullscreenButton />
            </div>
          </div>
        </div>
      )
      ```

4. Responsive design:
   - Desktop (>1024px): Show all controls
   - Mobile (<768px):
     * Stack controls vertically if needed
     * Increase button sizes to 44px minimum
     * Adjust padding for touch

5. Animations:
   - Fade in/out: transition-opacity duration-300
   - Smooth gradient background

6. Accessibility:
   - All controls keyboard navigable
   - Proper ARIA labels on all buttons

7. Export as default

Add JSDoc explaining the control layout.
Add comments for responsive breakpoints.
Output the complete component file with Tailwind classes.
```

### PROMPT 2.1.3: Create PlayPauseButton Component

```
Create the PlayPauseButton component for toggling video playback.

File: frontend/src/components/VideoPlayer/PlayPauseButton.tsx

Requirements:

1. Imports:
   - React: { FC }
   - useVideoControls from '../../hooks/useVideoControls'
   - usePlayerStore from '../../store/playerStore'

2. No props (uses hooks for state)

3. Component implementation:

   a) Get state:
      - const { isPlaying } = usePlayerStore()
      - const videoRef = useRef<HTMLVideoElement>(null) // Get from context or parent

   b) Get controls:
      - const { togglePlay } = useVideoControls(videoRef)

   c) SVG icons:
      - Play icon (triangle):
        ```tsx
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z"/>
        </svg>
        ```

      - Pause icon (two bars):
        ```tsx
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
        </svg>
        ```

   d) Render:
      ```tsx
      return (
        <button
          onClick={togglePlay}
          className="
            w-10 h-10 md:w-12 md:h-12
            flex items-center justify-center
            rounded-full
            bg-white/10 hover:bg-white/20
            text-white
            transition-colors duration-200
            focus:outline-none focus:ring-2 focus:ring-white/50
          "
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </button>
      )
      ```

4. Mobile optimization:
   - Minimum size: 44px × 44px (Apple HIG)
   - Larger touch target: padding-4 on mobile

5. Keyboard support:
   - Focus visible with ring
   - Space/Enter to toggle

6. Animation:
   - Icon crossfade when toggling
   - Hover state transition

7. Export as default

Add JSDoc with usage example.
Add ARIA labels for accessibility.
Output the complete component with inline SVG icons.
```

### PROMPT 2.1.4: Create VolumeControl Component

```
Create the VolumeControl component with mute button and volume slider.

File: frontend/src/components/VideoPlayer/VolumeControl.tsx

Requirements:

1. Imports:
   - React: { FC, useState, useRef }
   - useVideoControls from '../../hooks/useVideoControls'
   - usePlayerStore from '../../store/playerStore'

2. No props

3. Component implementation:

   a) State:
      - showSlider: boolean (show/hide volume slider on hover)

   b) Get from store:
      - const { volume, isMuted } = usePlayerStore()

   c) Get controls:
      - const { setVolumeLevel, toggleMute } = useVideoControls(videoRef)

   d) Volume icons (based on level):
      - Muted (volume === 0 or isMuted):
        ```tsx
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
        </svg>
        ```

      - Low volume (0 < volume < 0.5):
        ```tsx
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M7 9v6h4l5 5V4l-5 5H7z"/>
        </svg>
        ```

      - High volume (volume >= 0.5):
        ```tsx
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
        </svg>
        ```

   e) Volume slider:
      ```tsx
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={isMuted ? 0 : volume}
        onChange={(e) => setVolumeLevel(parseFloat(e.target.value))}
        className="
          w-20 h-1
          appearance-none bg-gray-600 rounded-full
          cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-3
          [&::-webkit-slider-thumb]:h-3
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-white
          [&::-webkit-slider-thumb]:cursor-pointer
        "
        aria-label="Volume"
      />
      ```

   f) Render:
      ```tsx
      return (
        <div
          className="flex items-center gap-2"
          onMouseEnter={() => setShowSlider(true)}
          onMouseLeave={() => setShowSlider(false)}
        >
          {/* Mute/Unmute button */}
          <button
            onClick={toggleMute}
            className="
              w-8 h-8
              flex items-center justify-center
              text-white hover:text-gray-300
              transition-colors
              focus:outline-none focus:ring-2 focus:ring-white/50 rounded
            "
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {getVolumeIcon()}
          </button>

          {/* Volume slider - show on hover (desktop only) */}
          <div className={`
            hidden md:block
            transition-all duration-200
            ${showSlider ? 'w-20 opacity-100' : 'w-0 opacity-0'}
            overflow-hidden
          `}>
            {slider}
          </div>
        </div>
      )
      ```

4. Mobile behavior:
   - Hide slider on mobile (< 768px)
   - Only show mute button
   - Use system volume control

5. Keyboard support:
   - Up/Down arrows: Adjust volume by 0.1
   - M key: Toggle mute (handled by useKeyboardShortcuts)

6. Persistence:
   - Volume level saved to localStorage (handled in store)

7. Export as default

Add JSDoc explaining desktop vs mobile behavior.
Output the complete component with all volume states.
```

### PROMPT 2.1.5: Create TimeDisplay Component

```
Create the TimeDisplay component showing current time / total duration.

File: frontend/src/components/VideoPlayer/TimeDisplay.tsx

Requirements:

1. Imports:
   - React: { FC }
   - formatTime from '../../utils/formatTime'

2. Props interface (TimeDisplayProps):
   - current: number (seconds)
   - total: number (seconds)
   - className?: string

3. Component implementation:

   a) Format times:
      - const currentFormatted = formatTime(current)
      - const totalFormatted = formatTime(total)

   b) Render:
      ```tsx
      return (
        <div
          className={`
            flex items-center gap-1
            text-white text-sm font-mono
            select-none
            ${className || ''}
          `}
          aria-label={`${currentFormatted} of ${totalFormatted}`}
        >
          <span className="text-white">{currentFormatted}</span>
          <span className="text-gray-400">/</span>
          <span className="text-gray-400">{totalFormatted}</span>
        </div>
      )
      ```

4. Styling:
   - Monospace font for consistent width (prevents layout shift)
   - White for current time
   - Gray for total time
   - Non-selectable text

5. Accessibility:
   - ARIA label with readable format
   - Semantic time display

6. Edge cases:
   - If total is 0: Show "00:00 / 00:00"
   - If current > total: Clamp to total
   - If NaN: Show "00:00 / 00:00"

7. Export as default

Add JSDoc with example.
Add prop validation comments.
Output the complete component file.
```

### PROMPT 2.1.6: Create FullscreenButton Component

```
Create the FullscreenButton component for toggling fullscreen mode.

File: frontend/src/components/VideoPlayer/FullscreenButton.tsx

Requirements:

1. Imports:
   - React: { FC, useRef }
   - useFullscreen from '../../hooks/useFullscreen'

2. Props interface (FullscreenButtonProps):
   - containerRef: RefObject<HTMLDivElement> (ref to player container)

3. Component implementation:

   a) Use fullscreen hook:
      - const { isFullscreen, toggleFullscreen, isSupported } = useFullscreen(containerRef)

   b) Fullscreen icons:
      - Enter fullscreen:
        ```tsx
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
        </svg>
        ```

      - Exit fullscreen:
        ```tsx
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>
        </svg>
        ```

   c) Render:
      ```tsx
      if (!isSupported) return null; // Don't show if not supported

      return (
        <button
          onClick={toggleFullscreen}
          className="
            w-8 h-8
            flex items-center justify-center
            text-white hover:text-gray-300
            transition-colors
            focus:outline-none focus:ring-2 focus:ring-white/50 rounded
          "
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          {isFullscreen ? <ExitFullscreenIcon /> : <EnterFullscreenIcon />}
        </button>
      )
      ```

4. Browser compatibility:
   - Handled by useFullscreen hook (vendor prefixes)
   - Button hidden if not supported

5. Keyboard support:
   - F key: Toggle fullscreen (handled by useKeyboardShortcuts)
   - Escape: Exit fullscreen (native browser behavior)

6. Mobile considerations:
   - Native fullscreen on mobile devices
   - Landscape mode support

7. Export as default

Add JSDoc explaining browser support.
Add note about keyboard shortcut.
Output the complete component file.
```

### PROMPT 2.1.7: Create VideoPlayer Component (Main Container)

```
Create the main VideoPlayer component that orchestrates all sub-components.

File: frontend/src/components/VideoPlayer/VideoPlayer.tsx

Requirements:

1. Imports:
   - React: { FC, useRef, useState, useEffect }
   - VideoElement, { VideoElementRef } from './VideoElement'
   - PlayerControls from './PlayerControls'
   - Timeline from './Timeline'
   - QuestionOverlay from '../Checkpoint/QuestionOverlay'
   - DynamicWatermark from '../Watermark/DynamicWatermark'
   - useCheckpoints from '../../hooks/useCheckpoints'
   - useAutoHideControls from '../../hooks/useAutoHideControls'
   - useKeyboardShortcuts from '../../hooks/useKeyboardShortcuts'
   - usePlayerStore from '../../store/playerStore'
   - type { VideoMetadata } from '../../types/video'

2. Props interface (VideoPlayerProps):
   - videoData: VideoMetadata
   - onAnswerSubmitted?: (checkpointId: string, isCorrect: boolean) => void
   - className?: string

3. Component implementation:

   a) Refs:
      - videoRef = useRef<VideoElementRef>(null)
      - containerRef = useRef<HTMLDivElement>(null)

   b) State from store:
      - isPlaying, currentTime, duration, bufferedRanges, isBuffering
      - setCurrentTime, setDuration, setBufferedRanges

   c) Destructure videoData:
      - const { hlsUrl, thumbnailVttUrl, checkpoints, watermark } = videoData

   d) Hooks:
      - const { activeCheckpoint, handleAnswer, completedCount } = useCheckpoints(
          checkpoints,
          currentTime,
          videoRef,
          onAnswerSubmitted
        )

      - const { showControls } = useAutoHideControls(isPlaying, 3000)

      - useKeyboardShortcuts(videoRef, !activeCheckpoint) // Disable when question active

   e) Handlers:
      - onLoadedMetadata(duration: number): void
        * setDuration(duration)

      - onTimeUpdate(currentTime: number): void
        * setCurrentTime(currentTime)

      - onProgress(): void
        * if (videoRef.current) {
            const video = videoRef.current.getVideoElement()
            setBufferedRanges(video?.buffered || null)
          }

      - onEnded(): void
        * Show completion message
        * Reset to beginning or show next video

      - onError(error: string): void
        * console.error('Video error:', error)
        * Show error message to user

   f) Click handler for container (toggle play on tap):
      - const handleContainerClick = (e: React.MouseEvent) => {
          if (e.target === containerRef.current || e.target === videoRef.current) {
            videoRef.current?.togglePlay()
          }
        }

   g) Render:
      ```tsx
      return (
        <div
          ref={containerRef}
          className={`
            relative w-full max-w-7xl mx-auto
            aspect-video
            bg-black rounded-lg overflow-hidden
            shadow-2xl
            ${className || ''}
          `}
          onClick={handleContainerClick}
        >
          {/* Video element */}
          <VideoElement
            ref={videoRef}
            hlsUrl={hlsUrl}
            onLoadedMetadata={onLoadedMetadata}
            onTimeUpdate={onTimeUpdate}
            onProgress={onProgress}
            onEnded={onEnded}
            onError={onError}
          />

          {/* Watermark */}
          <DynamicWatermark
            email={watermark.email}
            organization={watermark.organization}
          />

          {/* Buffering spinner */}
          {isBuffering && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
              <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Checkpoint question overlay */}
          {activeCheckpoint && (
            <QuestionOverlay
              checkpoint={activeCheckpoint}
              onAnswer={handleAnswer}
            />
          )}

          {/* Timeline */}
          <Timeline
            currentTime={currentTime}
            duration={duration}
            bufferedRanges={bufferedRanges}
            checkpoints={checkpoints}
            thumbnailVttUrl={thumbnailVttUrl}
            show={showControls && !activeCheckpoint}
          />

          {/* Player controls */}
          <PlayerControls
            show={showControls && !activeCheckpoint}
          />
        </div>
      )
      ```

4. Responsive design:
   - Mobile: Full width, 16:9 aspect ratio
   - Desktop: Max-width 7xl (1280px)
   - Landscape mode: Full viewport height

5. Z-index layers (from bottom to top):
   - Video: z-0
   - Watermark: z-10
   - Buffering spinner: z-20
   - Timeline: z-30
   - Controls: z-30
   - Question overlay: z-40

6. Error handling:
   - Show error message if video fails to load
   - Retry button for network errors
   - Log all errors to console

7. Export as default

Add comprehensive JSDoc explaining the component architecture.
Add comments for each layer explaining z-index.
Output the complete component file.
```

### PROMPT 2.1.8: Create VideoPlayer Index File

```
Create barrel export file for VideoPlayer components.

File: frontend/src/components/VideoPlayer/index.ts

Requirements:
- Export { default as VideoPlayer } from './VideoPlayer'
- Export { default as VideoElement, VideoElementRef } from './VideoElement'
- Export { default as PlayerControls } from './PlayerControls'
- Export { default as PlayPauseButton } from './PlayPauseButton'
- Export { default as VolumeControl } from './VolumeControl'
- Export { default as TimeDisplay } from './TimeDisplay'
- Export { default as FullscreenButton } from './FullscreenButton'

Output the complete index file.
```

---

## SECTION 2.2: TIMELINE COMPONENTS

### PROMPT 2.2.1: Create Timeline Component (Container)

```
Create the Timeline component that contains all timeline sub-components.

File: frontend/src/components/VideoPlayer/Timeline.tsx

Requirements:

1. Imports:
   - React: { FC, useRef, useState, MouseEvent, TouchEvent }
   - ProgressBar from './ProgressBar'
   - BufferBar from './BufferBar'
   - CheckpointMarkers from './CheckpointMarkers'
   - ThumbnailPreview from './ThumbnailPreview'
   - Playhead from './Playhead'
   - useThumbnails from '../../hooks/useThumbnails'
   - formatTime from '../../utils/formatTime'
   - type { Checkpoint } from '../../types/checkpoint'

2. Props interface (TimelineProps):
   - currentTime: number (seconds)
   - duration: number (seconds)
   - bufferedRanges: TimeRanges | null
   - checkpoints: Checkpoint[]
   - thumbnailVttUrl: string
   - show: boolean (controlled by parent)
   - onSeek: (time: number) => void

3. Component implementation:

   a) Refs:
      - timelineRef = useRef<HTMLDivElement>(null)

   b) State:
      - isHovering: boolean (false)
      - isSeeking: boolean (false)
      - hoverTime: number (0)
      - hoverPosition: { x: number, y: number } ({ x: 0, y: 0 })
      - longPressTimer: NodeJS.Timeout | null (null)

   c) Use thumbnails hook:
      - const { getThumbnailForTime } = useThumbnails(thumbnailVttUrl)

   d) Calculate progress percentage:
      - const progressPercent = (currentTime / duration) * 100

   e) Mouse/touch event handlers:

      - handleMouseMove(e: MouseEvent):
        * If !timelineRef.current, return
        * const rect = timelineRef.current.getBoundingClientRect()
        * const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
        * const time = percent * duration
        * setHoverTime(time)
        * setHoverPosition({ x: e.clientX, y: rect.top })

      - handleClick(e: MouseEvent):
        * If !timelineRef.current, return
        * const rect = timelineRef.current.getBoundingClientRect()
        * const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
        * const time = percent * duration
        * onSeek(time)

      - handleMouseEnter():
        * setIsHovering(true)

      - handleMouseLeave():
        * setIsHovering(false)

      - handleTouchStart(e: TouchEvent):
        * const timer = setTimeout(() => {
            setIsHovering(true)
            handleTouchMove(e)
          }, 500) // 500ms for long-press
        * setLongPressTimer(timer)

      - handleTouchMove(e: TouchEvent):
        * If !isHovering, return
        * If !timelineRef.current, return
        * const touch = e.touches[0]
        * const rect = timelineRef.current.getBoundingClientRect()
        * const percent = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width))
        * const time = percent * duration
        * setHoverTime(time)
        * setHoverPosition({ x: touch.clientX, y: rect.top })

      - handleTouchEnd():
        * If (longPressTimer) clearTimeout(longPressTimer)
        * setIsHovering(false)

   f) Get thumbnail for hover:
      - const thumbnail = getThumbnailForTime(hoverTime)

   g) Render:
      ```tsx
      return (
        <div
          className={`
            absolute bottom-14 left-0 right-0
            px-4
            transition-opacity duration-300
            ${show ? 'opacity-100' : 'opacity-0 pointer-events-none'}
          `}
        >
          {/* Timeline container */}
          <div
            ref={timelineRef}
            className="
              relative h-2 md:h-1.5
              bg-gray-700 rounded-full
              cursor-pointer
              hover:h-3
              transition-all duration-200
              group
            "
            onMouseMove={handleMouseMove}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={handleClick}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Buffer bar (gray) */}
            <BufferBar
              bufferedRanges={bufferedRanges}
              duration={duration}
            />

            {/* Checkpoint markers (yellow dots) */}
            <CheckpointMarkers
              checkpoints={checkpoints}
              duration={duration}
            />

            {/* Progress bar (red) */}
            <ProgressBar
              progress={progressPercent}
            />

            {/* Playhead (red circle) */}
            <Playhead
              progress={progressPercent}
              show={isHovering}
            />
          </div>

          {/* Thumbnail preview */}
          {isHovering && thumbnail && (
            <ThumbnailPreview
              thumbnail={thumbnail}
              position={hoverPosition}
              time={formatTime(hoverTime)}
            />
          )}
        </div>
      )
      ```

4. Mobile optimizations:
   - Thicker timeline on mobile (10px vs 6px)
   - Long-press to show thumbnail (500ms)
   - Larger touch target

5. Hover effects:
   - Timeline height increases on hover
   - Playhead appears
   - Thumbnail shows

6. Smooth seeking:
   - Click to seek instantly
   - Drag support (optional enhancement)

7. Export as default

Add JSDoc explaining timeline interaction.
Add comments for touch gesture detection.
Output the complete component file.
```

### PROMPT 2.2.2: Create ProgressBar Component

```
Create the ProgressBar component showing current playback progress.

File: frontend/src/components/VideoPlayer/ProgressBar.tsx

Requirements:

1. Imports:
   - React: { FC }

2. Props interface (ProgressBarProps):
   - progress: number (percentage 0-100)
   - className?: string

3. Component implementation:

   a) Clamp progress:
      - const clampedProgress = Math.max(0, Math.min(100, progress))

   b) Render:
      ```tsx
      return (
        <div
          className={`
            absolute top-0 left-0 h-full
            bg-red-600
            rounded-full
            pointer-events-none
            ${className || ''}
          `}
          style={{ width: `${clampedProgress}%` }}
          role="progressbar"
          aria-valuenow={clampedProgress}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      )
      ```

4. Styling:
   - Red color (#e50914 - Netflix red)
   - Full height of timeline
   - Rounded ends
   - Smooth width transition

5. Accessibility:
   - ARIA progressbar role
   - Value attributes for screen readers

6. Performance:
   - Use CSS transform instead of width (optional optimization)
   - GPU acceleration with will-change

7. Export as default

Add JSDoc.
Output the complete component file.
```

### PROMPT 2.2.3: Create BufferBar Component

```
Create the BufferBar component showing buffered video ranges.

File: frontend/src/components/VideoPlayer/BufferBar.tsx

Requirements:

1. Imports:
   - React: { FC }

2. Props interface (BufferBarProps):
   - bufferedRanges: TimeRanges | null
   - duration: number (seconds)
   - className?: string

3. Component implementation:

   a) Convert TimeRanges to array of percentages:
      ```typescript
      const getBufferedRanges = (): Array<{ start: number; end: number }> => {
        if (!bufferedRanges || duration === 0) return []

        const ranges: Array<{ start: number; end: number }> = []

        for (let i = 0; i < bufferedRanges.length; i++) {
          const start = (bufferedRanges.start(i) / duration) * 100
          const end = (bufferedRanges.end(i) / duration) * 100
          ranges.push({ start, end })
        }

        return ranges
      }

      const ranges = getBufferedRanges()
      ```

   b) Render:
      ```tsx
      return (
        <>
          {ranges.map((range, index) => (
            <div
              key={index}
              className={`
                absolute top-0 h-full
                bg-gray-500/50
                rounded-full
                pointer-events-none
                ${className || ''}
              `}
              style={{
                left: `${range.start}%`,
                width: `${range.end - range.start}%`
              }}
            />
          ))}
        </>
      )
      ```

4. Styling:
   - Gray color with transparency (bg-gray-500/50)
   - Behind progress bar (lower z-index)
   - Full height of timeline

5. Multiple ranges:
   - Support multiple buffered ranges
   - Common with seeking behavior

6. Performance:
   - Memoize range calculation
   - Only re-render when bufferedRanges change

7. Export as default

Add JSDoc explaining TimeRanges API.
Add comments for multiple range support.
Output the complete component file.
```

### PROMPT 2.2.4: Create CheckpointMarkers Component

```
Create the CheckpointMarkers component showing question positions on timeline.

File: frontend/src/components/VideoPlayer/CheckpointMarkers.tsx

Requirements:

1. Imports:
   - React: { FC }
   - type { Checkpoint } from '../../types/checkpoint'

2. Props interface (CheckpointMarkersProps):
   - checkpoints: Checkpoint[]
   - duration: number (seconds)
   - className?: string

3. Component implementation:

   a) Calculate marker positions:
      ```typescript
      const getMarkerPosition = (timestamp: number): number => {
        if (duration === 0) return 0
        return (timestamp / duration) * 100
      }
      ```

   b) Render:
      ```tsx
      return (
        <>
          {checkpoints.map((checkpoint) => {
            const position = getMarkerPosition(checkpoint.timestamp)

            return (
              <div
                key={checkpoint.id}
                className={`
                  absolute top-1/2 -translate-y-1/2
                  w-3 h-3 md:w-2.5 md:h-2.5
                  bg-yellow-400
                  rounded-full
                  pointer-events-none
                  shadow-lg
                  z-10
                  ${className || ''}
                `}
                style={{ left: `${position}%`, marginLeft: '-6px' }}
                title={`Question at ${Math.floor(checkpoint.timestamp / 60)}:${String(checkpoint.timestamp % 60).padStart(2, '0')}`}
              />
            )
          })}
        </>
      )
      ```

4. Styling:
   - Yellow/gold color (bg-yellow-400)
   - Circular markers
   - Centered on timeline vertically
   - Shadow for visibility
   - Slightly larger on mobile

5. Positioning:
   - Absolute positioning based on timestamp
   - Centered horizontally (marginLeft: '-6px' for 12px width)
   - Above buffer/progress bars (z-10)

6. Accessibility:
   - Title attribute with readable time
   - Visible to users but not interactive

7. Export as default

Add JSDoc explaining marker purpose.
Output the complete component file.
```

### PROMPT 2.2.5: Create ThumbnailPreview Component

```
Create the ThumbnailPreview component for hover thumbnail display.

File: frontend/src/components/VideoPlayer/ThumbnailPreview.tsx

Requirements:

1. Imports:
   - React: { FC }
   - type { ThumbnailCue } from '../../types/video'

2. Props interface (ThumbnailPreviewProps):
   - thumbnail: ThumbnailCue
   - position: { x: number; y: number }
   - time: string (formatted time MM:SS)
   - className?: string

3. Component implementation:

   a) Calculate position to keep preview in viewport:
      ```typescript
      const getPreviewStyle = () => {
        const previewWidth = thumbnail.width
        let left = position.x

        // Keep within viewport bounds
        if (left - previewWidth / 2 < 0) {
          left = previewWidth / 2 + 10
        } else if (left + previewWidth / 2 > window.innerWidth) {
          left = window.innerWidth - previewWidth / 2 - 10
        }

        return {
          left: `${left}px`,
          top: `${position.y}px`,
          transform: 'translate(-50%, -100%)',
          marginTop: '-10px' // Gap above timeline
        }
      }
      ```

   b) Render:
      ```tsx
      return (
        <div
          className={`
            absolute z-50 pointer-events-none
            ${className || ''}
          `}
          style={getPreviewStyle()}
        >
          {/* Thumbnail image */}
          <div
            className="
              bg-black border-2 border-white rounded overflow-hidden
              shadow-2xl mb-1
            "
            style={{
              width: `${thumbnail.width}px`,
              height: `${thumbnail.height}px`
            }}
          >
            {/* Sprite sheet with clip */}
            <div
              style={{
                width: `${thumbnail.width * 10}px`, // Assuming 10x10 grid
                height: `${thumbnail.height * 10}px`,
                backgroundImage: `url(${thumbnail.spriteUrl})`,
                backgroundPosition: `-${thumbnail.x}px -${thumbnail.y}px`,
                imageRendering: 'auto'
              }}
            />
          </div>

          {/* Time label */}
          <div className="
            bg-black/90 text-white text-xs px-2 py-1 rounded
            text-center font-mono
          ">
            {time}
          </div>
        </div>
      )
      ```

4. Styling:
   - White border around thumbnail
   - Black background for time label
   - Shadow for depth
   - Centered above cursor

5. Positioning logic:
   - Centered horizontally on cursor
   - Above timeline (margin-top: -10px)
   - Constrained to viewport (no overflow)

6. Performance:
   - Use CSS background-position for sprite (GPU accelerated)
   - Minimal re-renders

7. Mobile optimization:
   - Smaller thumbnail on mobile (120x68 vs 160x90)
   - Handled via responsive thumbnail sizes

8. Export as default

Add JSDoc explaining sprite sheet technique.
Add comments for viewport boundary logic.
Output the complete component file.
```

### PROMPT 2.2.6: Create Playhead Component

```
Create the Playhead component (red circle indicator on timeline).

File: frontend/src/components/VideoPlayer/Playhead.tsx

Requirements:

1. Imports:
   - React: { FC }

2. Props interface (PlayheadProps):
   - progress: number (percentage 0-100)
   - show: boolean (show only on hover/interaction)
   - className?: string

3. Component implementation:

   a) Render:
      ```tsx
      return (
        <div
          className={`
            absolute top-1/2 -translate-y-1/2
            w-4 h-4
            bg-red-600 border-2 border-white
            rounded-full
            shadow-lg
            pointer-events-none
            transition-opacity duration-200
            ${show ? 'opacity-100' : 'opacity-0'}
            ${className || ''}
          `}
          style={{
            left: `${progress}%`,
            marginLeft: '-8px' // Center on position (half of width)
          }}
        />
      )
      ```

4. Styling:
   - Red circle matching progress bar color
   - White border for contrast
   - Shadow for depth
   - Centered on progress position

5. Visibility:
   - Only visible on hover (controlled by parent)
   - Smooth fade in/out (transition-opacity)

6. Positioning:
   - Absolute positioning at progress percentage
   - Centered horizontally (marginLeft: -8px for 16px width)
   - Centered vertically (top: 50%, translateY: -50%)

7. Mobile:
   - Always visible on mobile (or removed entirely)
   - Decision: Remove on mobile for cleaner UI

8. Export as default

Add JSDoc explaining playhead purpose.
Output the complete component file.
```

---

## SECTION 2.3: CHECKPOINT COMPONENTS

### PROMPT 2.3.1: Create QuestionOverlay Component

```
Create the QuestionOverlay component that displays checkpoint questions.

File: frontend/src/components/Checkpoint/QuestionOverlay.tsx

Requirements:

1. Imports:
   - React: { FC, useState, useEffect }
   - Question from './Question'
   - AnswerOptions from './AnswerOptions'
   - type { Checkpoint } from '../../types/checkpoint'

2. Props interface (QuestionOverlayProps):
   - checkpoint: Checkpoint
   - onAnswer: (answerIndex: number) => void
   - className?: string

3. Component implementation:

   a) State:
      - selectedAnswer: number | null (null initially)
      - isSubmitting: boolean (false)

   b) Reset state when checkpoint changes:
      ```typescript
      useEffect(() => {
        setSelectedAnswer(null)
        setIsSubmitting(false)
      }, [checkpoint.id])
      ```

   c) Handle answer selection:
      ```typescript
      const handleSelect = (index: number) => {
        if (isSubmitting) return // Prevent double-click

        setSelectedAnswer(index)
        setIsSubmitting(true)

        // Visual feedback delay (500ms) then submit
        setTimeout(() => {
          onAnswer(index)
        }, 500)
      }
      ```

   d) Render:
      ```tsx
      return (
        <div
          className={`
            absolute inset-0 z-40
            flex items-center justify-center
            bg-black/80 backdrop-blur-sm
            animate-fadeIn
            ${className || ''}
          `}
        >
          {/* Question card */}
          <div className="
            bg-gray-900 border-2 border-gray-700 rounded-xl
            p-6 md:p-8
            max-w-2xl w-full mx-4
            shadow-2xl
          ">
            {/* Question text */}
            <Question text={checkpoint.question} />

            {/* Answer options */}
            <AnswerOptions
              options={checkpoint.options}
              selectedAnswer={selectedAnswer}
              onSelect={handleSelect}
              disabled={isSubmitting}
            />

            {/* Optional: Progress indicator */}
            <div className="mt-4 text-center text-sm text-gray-400">
              Question {/* Add question number if available */}
            </div>
          </div>
        </div>
      )
      ```

4. Styling:
   - Dark overlay (bg-black/80)
   - Backdrop blur for depth
   - Centered modal
   - Smooth fade-in animation

5. Animations:
   - fadeIn animation on mount
   - Selection feedback (handled by AnswerButton)

6. Accessibility:
   - Focus trap (keep focus within overlay)
   - Escape key to close (optional, or disabled to prevent skipping)
   - ARIA modal role

7. Mobile optimization:
   - Full width with padding on mobile
   - Larger touch targets (handled by AnswerButton)

8. Export as default

Add JSDoc explaining overlay behavior.
Add animation keyframes in styles.
Output the complete component file.
```

### PROMPT 2.3.2: Create Question Component

```
Create the Question component displaying the question text.

File: frontend/src/components/Checkpoint/Question.tsx

Requirements:

1. Imports:
   - React: { FC }

2. Props interface (QuestionProps):
   - text: string
   - className?: string

3. Component implementation:

   a) Render:
      ```tsx
      return (
        <h3
          className={`
            text-xl md:text-2xl
            font-semibold text-white
            mb-6
            leading-relaxed
            ${className || ''}
          `}
        >
          {text}
        </h3>
      )
      ```

4. Styling:
   - Large, readable text (text-2xl on desktop)
   - White color for contrast
   - Generous spacing (mb-6)
   - Relaxed line-height for readability

5. Responsive:
   - Smaller on mobile (text-xl)
   - Larger on desktop (text-2xl)

6. Accessibility:
   - Semantic heading (h3)
   - High contrast

7. Export as default

Add JSDoc.
Output the complete component file.
```

### PROMPT 2.3.3: Create AnswerOptions Component

```
Create the AnswerOptions component containing all answer buttons.

File: frontend/src/components/Checkpoint/AnswerOptions.tsx

Requirements:

1. Imports:
   - React: { FC }
   - AnswerButton from './AnswerButton'

2. Props interface (AnswerOptionsProps):
   - options: [string, string, string, string] (exactly 4 options)
   - selectedAnswer: number | null
   - onSelect: (index: number) => void
   - disabled: boolean
   - className?: string

3. Component implementation:

   a) Option labels:
      - const labels = ['A', 'B', 'C', 'D']

   b) Render:
      ```tsx
      return (
        <div
          className={`
            grid grid-cols-1 md:grid-cols-2 gap-4
            ${className || ''}
          `}
        >
          {options.map((option, index) => (
            <AnswerButton
              key={index}
              label={labels[index]}
              text={option}
              index={index}
              isSelected={selectedAnswer === index}
              onSelect={onSelect}
              disabled={disabled}
            />
          ))}
        </div>
      )
      ```

4. Layout:
   - Grid: 2 columns on desktop, 1 on mobile
   - Gap between buttons: 1rem (gap-4)
   - Responsive breakpoint: 768px (md:)

5. Accessibility:
   - Each button individually focusable
   - Keyboard navigation (Tab, Enter)

6. Export as default

Add JSDoc.
Output the complete component file.
```

### PROMPT 2.3.4: Create AnswerButton Component

```
Create the AnswerButton component for individual answer options.

File: frontend/src/components/Checkpoint/AnswerButton.tsx

Requirements:

1. Imports:
   - React: { FC }

2. Props interface (AnswerButtonProps):
   - label: string ('A', 'B', 'C', or 'D')
   - text: string (answer text)
   - index: number (0-3)
   - isSelected: boolean
   - onSelect: (index: number) => void
   - disabled: boolean
   - className?: string

3. Component implementation:

   a) Handle click:
      ```typescript
      const handleClick = () => {
        if (!disabled) {
          onSelect(index)
        }
      }
      ```

   b) Render:
      ```tsx
      return (
        <button
          onClick={handleClick}
          disabled={disabled}
          className={`
            min-h-[50px] md:min-h-[60px]
            px-6 py-4
            rounded-lg text-left
            transition-all duration-200
            font-medium
            focus:outline-none focus:ring-2 focus:ring-blue-500
            ${
              isSelected
                ? 'bg-blue-600 text-white scale-105 shadow-lg'
                : 'bg-gray-800 text-gray-200 hover:bg-gray-700 hover:scale-102'
            }
            ${disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}
            ${className || ''}
          `}
          aria-label={`Answer ${label}: ${text}`}
        >
          <div className="flex items-start gap-3">
            {/* Label (A, B, C, D) */}
            <span className="
              flex-shrink-0
              w-6 h-6
              flex items-center justify-center
              bg-gray-700 text-gray-300
              rounded text-sm font-bold
            ">
              {label}
            </span>

            {/* Answer text */}
            <span className="flex-1">
              {text}
            </span>
          </div>
        </button>
      )
      ```

4. Styling:
   - Minimum height: 50px mobile, 60px desktop (Apple HIG compliance)
   - Left-aligned text for readability
   - Distinct selected state (blue background, scale up)
   - Hover state (darker background, slight scale)
   - Disabled state (reduced opacity, no hover)

5. Animations:
   - Scale up on selection (transform: scale-105)
   - Smooth transitions (duration-200)
   - Hover effects

6. Accessibility:
   - Semantic button element
   - ARIA label with full answer text
   - Focus ring on keyboard navigation
   - Disabled state

7. Touch optimization:
   - Large touch target (min 50px)
   - No accidental double-tap (disabled after selection)

8. Export as default

Add JSDoc explaining button states.
Output the complete component file.
```

### PROMPT 2.3.5: Create Checkpoint Index File

```
Create barrel export for Checkpoint components.

File: frontend/src/components/Checkpoint/index.ts

Requirements:
- Export { default as QuestionOverlay } from './QuestionOverlay'
- Export { default as Question } from './Question'
- Export { default as AnswerOptions } from './AnswerOptions'
- Export { default as AnswerButton } from './AnswerButton'

Output the complete index file.
```

---

## SECTION 2.4: WATERMARK COMPONENT

### PROMPT 2.4.1: Create DynamicWatermark Component

```
Create the DynamicWatermark component with position shifting.

File: frontend/src/components/Watermark/DynamicWatermark.tsx

Requirements:

1. Imports:
   - React: { FC }
   - useWatermark from '../../hooks/useWatermark'

2. Props interface (DynamicWatermarkProps):
   - email: string
   - organization: string
   - className?: string

3. Component implementation:

   a) Use watermark hook:
      - const { position } = useWatermark()

   b) Render:
      ```tsx
      return (
        <div
          className={`
            absolute z-30
            pointer-events-none select-none
            transition-all duration-1000 ease-in-out
            ${className || ''}
          `}
          style={{
            ...position,
            opacity: 0.5,
            fontSize: '14px',
            color: 'white',
            textShadow: '1px 1px 3px rgba(0, 0, 0, 0.8)',
            fontFamily: 'monospace'
          }}
        >
          <div className="bg-black/30 px-2 py-1 rounded">
            <div className="font-medium">{email}</div>
            <div className="text-xs opacity-80">{organization}</div>
          </div>
        </div>
      )
      ```

4. Styling:
   - Semi-transparent (opacity: 0.5)
   - White text with shadow for visibility
   - Monospace font for clear characters
   - Small size (14px)
   - Dark background for contrast

5. Position shifting:
   - Handled by useWatermark hook
   - 6 positions, rotates every 60 seconds
   - Smooth transition (duration-1000)

6. Anti-screenshot measures:
   - Visible in any screen recording
   - Shifts position to prevent crop
   - Contains identifying information

7. Performance:
   - No re-renders except position change
   - GPU-accelerated transitions

8. Export as default

Add JSDoc explaining watermark purpose and behavior.
Add comment about 60-second shift interval.
Output the complete component file.
```

### PROMPT 2.4.2: Create Watermark Index File

```
Create barrel export for Watermark component.

File: frontend/src/components/Watermark/index.ts

Requirements:
- Export { default as DynamicWatermark } from './DynamicWatermark'

Output the complete index file.
```

---

## SECTION 2.5: AUTHENTICATION COMPONENTS

### PROMPT 2.5.1: Create LoginForm Component

```
Create the LoginForm component for user authentication.

File: frontend/src/components/Auth/LoginForm.tsx

Requirements:

1. Imports:
   - React: { FC, useState, FormEvent }
   - useNavigate from 'react-router-dom'
   - useAuth from '../../hooks/useAuth'

2. No props (standalone form)

3. Component implementation:

   a) State:
      - email: string ('')
      - password: string ('')
      - error: string | null (null)
      - isLoading: boolean (false)

   b) Get auth from hook:
      - const { login } = useAuth()
      - const navigate = useNavigate()

   c) Handle submit:
      ```typescript
      const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setError(null)
        setIsLoading(true)

        try {
          await login(email, password)
          navigate('/') // Redirect to home/player
        } catch (err: any) {
          setError(err.message || 'Login failed')
        } finally {
          setIsLoading(false)
        }
      }
      ```

   d) Render:
      ```tsx
      return (
        <div className="w-full max-w-md mx-auto p-6">
          <h2 className="text-3xl font-bold text-white mb-6 text-center">
            Sign In to Neuroflix
          </h2>

          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="
                  w-full px-4 py-3 rounded-lg
                  bg-gray-800 text-white
                  border border-gray-700
                  focus:outline-none focus:ring-2 focus:ring-blue-500
                "
                placeholder="you@example.com"
              />
            </div>

            {/* Password field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="
                  w-full px-4 py-3 rounded-lg
                  bg-gray-800 text-white
                  border border-gray-700
                  focus:outline-none focus:ring-2 focus:ring-blue-500
                "
                placeholder="••••••••"
              />
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading}
              className="
                w-full py-3 rounded-lg
                bg-red-600 hover:bg-red-700
                text-white font-semibold
                transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed
                focus:outline-none focus:ring-2 focus:ring-red-500
              "
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Register link */}
          <p className="mt-4 text-center text-gray-400 text-sm">
            Don't have an account?{' '}
            <a href="/register" className="text-blue-500 hover:underline">
              Sign up
            </a>
          </p>
        </div>
      )
      ```

4. Validation:
   - Email: Required, valid email format (HTML5 validation)
   - Password: Required, minimum 6 characters
   - Client-side validation before submit

5. Error handling:
   - Display error message above form
   - Clear error on new submission
   - User-friendly error messages

6. Loading state:
   - Disable form while loading
   - Change button text to "Signing in..."
   - Prevent double-submission

7. Accessibility:
   - Labels for all inputs
   - ARIA attributes
   - Keyboard navigation
   - Focus management

8. Export as default

Add JSDoc with form behavior.
Output the complete component file.
```

### PROMPT 2.5.2: Create RegisterForm Component

```
Create the RegisterForm component for new user registration.

File: frontend/src/components/Auth/RegisterForm.tsx

Requirements:

1. Imports:
   - React: { FC, useState, FormEvent }
   - useNavigate from 'react-router-dom'
   - useAuth from '../../hooks/useAuth'

2. No props

3. Component implementation:

   a) State:
      - email: string ('')
      - password: string ('')
      - confirmPassword: string ('')
      - organization: string ('')
      - firstName: string ('')
      - lastName: string ('')
      - error: string | null (null)
      - isLoading: boolean (false)

   b) Get auth:
      - const { register } = useAuth()
      - const navigate = useNavigate()

   c) Validation:
      ```typescript
      const validateForm = (): string | null => {
        if (password.length < 6) {
          return 'Password must be at least 6 characters'
        }
        if (password !== confirmPassword) {
          return 'Passwords do not match'
        }
        if (!organization.trim()) {
          return 'Organization is required'
        }
        return null
      }
      ```

   d) Handle submit:
      ```typescript
      const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setError(null)

        const validationError = validateForm()
        if (validationError) {
          setError(validationError)
          return
        }

        setIsLoading(true)

        try {
          await register({
            email,
            password,
            organization,
            firstName: firstName || undefined,
            lastName: lastName || undefined
          })
          navigate('/')
        } catch (err: any) {
          setError(err.message || 'Registration failed')
        } finally {
          setIsLoading(false)
        }
      }
      ```

   e) Render:
      ```tsx
      return (
        <div className="w-full max-w-md mx-auto p-6">
          <h2 className="text-3xl font-bold text-white mb-6 text-center">
            Sign Up for Neuroflix
          </h2>

          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email *
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Password * (min 6 characters)
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                Confirm Password *
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Organization */}
            <div>
              <label htmlFor="organization" className="block text-sm font-medium text-gray-300 mb-2">
                Organization *
              </label>
              <input
                type="text"
                id="organization"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* First Name (optional) */}
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-300 mb-2">
                First Name (optional)
              </label>
              <input
                type="text"
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Last Name (optional) */}
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-300 mb-2">
                Last Name (optional)
              </label>
              <input
                type="text"
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating account...' : 'Sign Up'}
            </button>
          </form>

          {/* Login link */}
          <p className="mt-4 text-center text-gray-400 text-sm">
            Already have an account?{' '}
            <a href="/login" className="text-blue-500 hover:underline">
              Sign in
            </a>
          </p>
        </div>
      )
      ```

4. Validation:
   - Password match check
   - Minimum password length
   - Required fields marked with *
   - Real-time validation feedback

5. Export as default

Add JSDoc.
Output the complete component file.
```

### PROMPT 2.5.3: Create ProtectedRoute Component

```
Create the ProtectedRoute component for route protection.

File: frontend/src/components/Auth/ProtectedRoute.tsx

Requirements:

1. Imports:
   - React: { FC, ReactNode }
   - Navigate from 'react-router-dom'
   - useAuth from '../../hooks/useAuth'

2. Props interface (ProtectedRouteProps):
   - children: ReactNode
   - redirectTo?: string (default: '/login')

3. Component implementation:

   a) Get auth state:
      - const { isAuthenticated, isLoading } = useAuth()

   b) Render logic:
      ```tsx
      // Show loading while checking auth
      if (isLoading) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-gray-900">
            <div className="text-white text-xl">Loading...</div>
          </div>
        )
      }

      // Redirect to login if not authenticated
      if (!isAuthenticated) {
        return <Navigate to={redirectTo || '/login'} replace />
      }

      // Render children if authenticated
      return <>{children}</>
      ```

4. Usage example (in comments):
   ```tsx
   // In App.tsx:
   <Route
     path="/video/:id"
     element={
       <ProtectedRoute>
         <VideoPlayerPage />
       </ProtectedRoute>
     }
   />
   ```

5. Loading state:
   - Show loading indicator while checking authentication
   - Prevents flash of login page

6. Redirect:
   - Use replace to prevent back button issues
   - Configurable redirect path

7. Export as default

Add JSDoc with usage example.
Output the complete component file.
```

### PROMPT 2.5.4: Create Auth Index File

```
Create barrel export for Auth components.

File: frontend/src/components/Auth/index.ts

Requirements:
- Export { default as LoginForm } from './LoginForm'
- Export { default as RegisterForm } from './RegisterForm'
- Export { default as ProtectedRoute } from './ProtectedRoute'

Output the complete index file.
```

---

## (CONTINUE - PART 2 IS TOO LARGE, SPLIT INTO PART 2A AND 2B)

**NOTIFICATION**: Part 2 is comprehensive and contains 42 prompts total. I've completed approximately 60% (25 prompts).

Remaining sections for Part 2:
- Section 2.6: Layout Components (Header, Footer, Container)
- Section 2.7: Common Components (LoadingSpinner, ErrorBoundary)
- Section 2.8: Page Components (HomePage, VideoPlayerPage, LoginPage, NotFoundPage)
- Section 2.9: Styles (player.css, globals.css, animations.css)
- Section 2.10: Configuration Files (checkpoints.json, videos.json)
- Section 2.11: Main Application Files (App.tsx, main.tsx, vite.config.ts, etc.)

**DECISION POINT**: Should I:
A) Continue with remaining Part 2 sections in this file
B) Split Part 2 into Part 2A (current) and Part 2B (remaining)
C) Move to next part and come back to complete Part 2

What would you prefer?
