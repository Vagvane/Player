import { useEffect, useRef, useState, type FC } from 'react';
import { Link } from 'react-router-dom';

import LoadingSpinner from '../components/Common/LoadingSpinner';
import VideoCardPreview from '../components/Common/VideoCardPreview';
import Container from '../components/Layout/Container';
import videoService from '../services/videoService';
import { VideoStatus } from '../types/video';
import type { Video } from '../types/video';

/**
 * HomePage — catalog landing page.
 *
 * Fetches the list of playback-ready videos via {@link videoService.getAllVideos}
 * on mount and renders them as a responsive grid of card links into the
 * player route (`/video/:id`). Handles three terminal UI states alongside
 * the populated grid:
 *
 *  - **Loading** — centered spinner while the request is in flight.
 *  - **Error**   — inline error banner with the message surfaced from the
 *                  service layer.
 *  - **Empty**   — friendly placeholder when the catalog is empty.
 *
 * The grid is 1 / 2 / 3 columns at mobile / tablet (`md`) / desktop (`lg`).
 */
const HomePage: FC = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hoveredVideoId, setHoveredVideoId] = useState<string | null>(null);
  const [previewReady, setPreviewReady] = useState(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const API_URL = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3001/api/v1';

  const handleMouseEnter = (id: string) => {
    hoverTimerRef.current = setTimeout(() => {
      setPreviewReady(false);
      setHoveredVideoId(id);
    }, 350);
  };

  const handleMouseLeave = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setHoveredVideoId(null);
    setPreviewReady(false);
  };

  useEffect(() => {
    const fetchVideos = async () => {
      setIsLoading(true);
      try {
        const data = await videoService.getAllVideos();
        setVideos(data);
      } catch (err: any) {
        setError(err?.message || 'Failed to load videos');
      } finally {
        setIsLoading(false);
      }
    };

    fetchVideos();
  }, []);

  return (
    <Container className="py-8">
      <h1 className="text-4xl font-bold text-white mb-8">Training Videos</h1>

      {isLoading && (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500 text-red-500 px-6 py-4 rounded-lg">
          {error}
        </div>
      )}

      {!isLoading && !error && videos.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video) => (
            <Link
              key={video.id}
              to={`/video/${video.id}`}
              className="group bg-gray-800 rounded-lg overflow-hidden hover:bg-gray-700 transition-colors"
              onMouseEnter={() => handleMouseEnter(video.id)}
              onMouseLeave={handleMouseLeave}
            >
                <div className="aspect-video bg-gray-700 relative overflow-hidden">
                {/* Static sprite thumbnail — fades out when video preview takes over */}
                {video.status === VideoStatus.READY && (
                  <div
                    className={`absolute inset-0 transition-opacity duration-300 ${
                      hoveredVideoId === video.id && previewReady ? 'opacity-0' : 'opacity-100'
                    }`}
                    style={{
                      backgroundImage: `url(${API_URL}/videos/${video.id}/hls/sprite.jpg)`,
                      backgroundSize: '1000% 1000%',
                      backgroundPosition: '0% 0%',
                      backgroundRepeat: 'no-repeat',
                    }}
                  />
                )}
                {/* HLS video preview — shown after 350 ms hover delay */}
                {hoveredVideoId === video.id && video.status === VideoStatus.READY && (
                  <VideoCardPreview
                    hlsUrl={`${API_URL}/videos/${video.id}/hls/master.m3u8`}
                    onReady={() => setPreviewReady(true)}
                  />
                )}
                {/* Play icon overlay — hidden while preview is playing */}
                <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
                  hoveredVideoId === video.id && previewReady ? 'opacity-0' : 'opacity-100'
                }`}>
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
                {/* Processing badge */}
                {video.status !== VideoStatus.READY && (
                  <div className="absolute top-2 left-2 bg-black/70 text-xs text-gray-300 px-2 py-0.5 rounded">
                    {video.status === VideoStatus.PROCESSING ? 'Processing…' :
                     video.status === VideoStatus.UPLOADING ? 'Uploading…' : 'Failed'}
                  </div>
                )}
              </div>

              <div className="p-4">
                <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-red-500 transition-colors">
                  {video.title}
                </h3>
                {video.description && (
                  <p className="text-sm text-gray-400 line-clamp-2">
                    {video.description}
                  </p>
                )}
                                <p className="text-xs text-gray-500 mt-2">
                  {video.status !== VideoStatus.READY
                    ? video.status === VideoStatus.PROCESSING
                      ? 'Processing…'
                      : video.status === VideoStatus.UPLOADING
                        ? 'Uploading…'
                        : 'Failed'
                    : video.duration < 60
                      ? `${video.duration}s`
                      : `${Math.floor(video.duration / 60)}m ${video.duration % 60 > 0 ? `${video.duration % 60}s` : ''}`}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {!isLoading && !error && videos.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400 text-lg">No videos available yet.</p>
        </div>
      )}
    </Container>
  );
};

export default HomePage;
