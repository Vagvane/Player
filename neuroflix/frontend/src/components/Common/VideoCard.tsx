import { useRef, useState, type FC } from 'react';
import { Link } from 'react-router-dom';
import VideoCardPreview from './VideoCardPreview';
import useLazyBackground from '../../hooks/useLazyBackground';
import { VideoStatus, type Video } from '../../types/video';

interface VideoCardProps {
  video: Video;
  apiUrl: string;
}

/**
 * Single catalog card for the home page grid.
 *
 * Responsibilities:
 *  - Lazy-loads the sprite thumbnail via {@link useLazyBackground} so
 *    off-screen cards don't fire simultaneous R2 proxy requests on mount.
 *  - Shows a 350 ms hover-delay HLS preview on desktop (muted, looping).
 *  - Renders a status badge for videos that are still uploading/processing.
 */
const VideoCard: FC<VideoCardProps> = ({ video, apiUrl }) => {
  const [hoveredVideoId, setHoveredVideoId] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // In CDN mode the backend supplies `video.spriteUrl` directly (Cloudflare edge URL).
  // In proxy mode it's omitted and we fall back to the Express proxy path.
  const spriteUrl = video.status === VideoStatus.READY
    ? (video.spriteUrl ?? `${apiUrl}/videos/${video.id}/hls/sprite.jpg`)
    : '';

  const { ref: spriteRef, bgUrl } = useLazyBackground(spriteUrl);

  const handleMouseEnter = () => {
    hoverTimerRef.current = setTimeout(() => {
      setPreviewReady(false);
      setHoveredVideoId(true);
    }, 350);
  };

  const handleMouseLeave = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setHoveredVideoId(false);
    setPreviewReady(false);
  };

  const durationLabel = video.status !== VideoStatus.READY
    ? video.status === VideoStatus.PROCESSING
      ? 'Processing…'
      : video.status === VideoStatus.UPLOADING
      ? 'Uploading…'
      : 'Failed'
    : video.duration < 60
    ? `${video.duration}s`
    : `${Math.floor(video.duration / 60)}m${video.duration % 60 > 0 ? ` ${video.duration % 60}s` : ''}`;

  return (
    <Link
      to={`/video/${video.id}`}
      className="group bg-gray-800 rounded-lg overflow-hidden hover:bg-gray-700 transition-colors"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="aspect-video bg-gray-700 relative overflow-hidden">
        {/* Sprite thumbnail — lazy-loaded via IntersectionObserver */}
        <div
          ref={spriteRef}
          className={`absolute inset-0 transition-opacity duration-300 ${
            hoveredVideoId && previewReady ? 'opacity-0' : 'opacity-100'
          }`}
          style={
            bgUrl
              ? {
                  backgroundImage: `url(${bgUrl})`,
                  backgroundSize: '1000% 1000%',
                  backgroundPosition: '0% 0%',
                  backgroundRepeat: 'no-repeat',
                }
              : undefined
          }
        />

        {/* HLS video preview — shown after 350 ms hover delay */}
        {hoveredVideoId && video.status === VideoStatus.READY && (
          <VideoCardPreview
            hlsUrl={video.hlsUrl ?? `${apiUrl}/videos/${video.id}/hls/master.m3u8`}
            onReady={() => setPreviewReady(true)}
          />
        )}

        {/* Play icon overlay */}
        <div
          className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
            hoveredVideoId && previewReady ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center group-hover:bg-red-600/80 transition-colors">
            <svg
              className="w-6 h-6 text-white ml-0.5"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>

        {/* Processing / uploading badge */}
        {video.status !== VideoStatus.READY && (
          <div className="absolute top-2 left-2 bg-black/70 text-xs text-gray-300 px-2 py-0.5 rounded">
            {video.status === VideoStatus.PROCESSING
              ? 'Processing…'
              : video.status === VideoStatus.UPLOADING
              ? 'Uploading…'
              : 'Failed'}
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-red-500 transition-colors">
          {video.title}
        </h3>
        {video.description && (
          <p className="text-sm text-gray-400 line-clamp-2">{video.description}</p>
        )}
        <p className="text-xs text-gray-500 mt-2">{durationLabel}</p>
      </div>
    </Link>
  );
};

export default VideoCard;
