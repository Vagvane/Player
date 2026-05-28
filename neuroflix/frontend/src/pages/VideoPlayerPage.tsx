import { useEffect, useRef, type FC } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import LoadingSpinner from '../components/Common/LoadingSpinner';
import Container from '../components/Layout/Container';
import VideoPlayer from '../components/VideoPlayer/VideoPlayer';
import useVideoData from '../hooks/useVideoData';
import { usePlayerStore } from '../store/playerStore';
import videoService from '../services/videoService';

/**
 * VideoPlayerPage — route-level wrapper for the player.
 *
 * Reads `:id` from the URL, drives load state through {@link useVideoData},
 * and renders one of three terminal states:
 *
 *  - **Loading** — centered XL spinner while metadata is in flight.
 *  - **Error**   — banner with Retry (re-fetch, bypassing the service
 *                  cache) and Go Back (navigate to `/`) actions.
 *  - **Ready**   — the {@link VideoPlayer} bound to `videoData`, with the
 *                  video title rendered below the player.
 *
 * Note: the player's signed URLs expire (~50 min in the service cache).
 * The Retry button is the recovery affordance when an expired-URL error
 * surfaces mid-session — it forces a refresh against the backend.
 */
const VideoPlayerPage: FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { videoData, isLoading, error, retry } = useVideoData(id || '');

  // Mirror currentTime into a ref so the interval callback always reads the
  // latest value without needing to be torn down and re-created every second.
  const currentTime = usePlayerStore((s) => s.currentTime);
  const currentTimeRef = useRef(currentTime);
  useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);

  // Save playback position every 15 s while video is loaded, and once more on
  // unmount (handles tab-close / back-navigation mid-video).
  // videoService.updateProgress is fire-and-forget with a built-in 5 s throttle.
  useEffect(() => {
    if (!videoData || !id) return;

    const interval = setInterval(() => {
      const time = currentTimeRef.current;
      if (time > 0) videoService.updateProgress(id, time);
    }, 15_000);

    return () => {
      clearInterval(interval);
      const time = currentTimeRef.current;
      if (time > 0) videoService.updateProgress(id, time);
      // Bust the stream cache so the next visit loads fresh resumeTime
      // from the backend instead of the stale cached value.
      videoService.invalidateVideoCache(id);
    };
  }, [videoData, id]);

  const handleAnswerSubmitted = async (
    _checkpointId: string,
    _isCorrect: boolean,
  ) => {
    // Reserved for future analytics/progress tracking per checkpoint answer.
  };

  return (
    <div className="min-h-screen bg-[#141414] py-8">
      <Container maxWidth="7xl">
        {isLoading && (
          <div className="flex justify-center py-24">
            <LoadingSpinner size="xl" />
          </div>
        )}

        {error && !isLoading && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-red-500/10 border border-red-500 text-red-500 px-6 py-4 rounded-lg mb-4">
              {error}
            </div>
            <button
              type="button"
              onClick={retry}
              className="px-6 py-3 rounded bg-red-600 hover:bg-red-700 text-white font-medium transition-colors"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="ml-4 px-6 py-3 rounded bg-gray-700 hover:bg-gray-600 text-white font-medium transition-colors"
            >
              Go Back
            </button>
          </div>
        )}

        {videoData && !isLoading && !error && (
          <VideoPlayer
            videoData={videoData}
            onAnswerSubmitted={handleAnswerSubmitted}
            onBack={() => navigate('/')}
          />
        )}
      </Container>
    </div>
  );
};

export default VideoPlayerPage;
