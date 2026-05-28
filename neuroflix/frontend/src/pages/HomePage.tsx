import { useEffect, useState, type FC } from 'react';

import LoadingSpinner from '../components/Common/LoadingSpinner';
import VideoCard from '../components/Common/VideoCard';
import Container from '../components/Layout/Container';
import videoService from '../services/videoService';
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
  const API_URL = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3001/api/v1';

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
            <VideoCard key={video.id} video={video} apiUrl={API_URL} />
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
