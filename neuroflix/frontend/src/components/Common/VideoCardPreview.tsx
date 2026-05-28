import { useEffect, useRef, useState, type FC } from 'react';
import Hls from 'hls.js';

interface VideoCardPreviewProps {
  hlsUrl: string;
  /** Called once the video has its first frame rendered — parent uses this to crossfade the sprite thumbnail out. */
  onReady?: () => void;
}

/**
 * Muted looping HLS video preview shown when hovering a catalog card.
 *
 * Stays opacity-0 until the `playing` event fires (first real frame decoded),
 * then fades in. This prevents the black-flash that occurs between the
 * component mounting and hls.js finishing its first segment fetch.
 */
const VideoCardPreview: FC<VideoCardPreviewProps> = ({ hlsUrl, onReady }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlaying = () => {
      setIsVisible(true);
      onReady?.();
    };

    video.addEventListener('playing', handlePlaying);

    let hls: Hls | null = null;

    if (Hls.isSupported()) {
      hls = new Hls({
        startLevel: 0,
        maxBufferLength: 8,
        maxMaxBufferLength: 16,
      });
      hls.loadSource(hlsUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        hls!.currentLevel = 0;
        video.play().catch(() => {});
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = hlsUrl;
      void video.play();
    }

    return () => {
      video.removeEventListener('playing', handlePlaying);
      hls?.destroy();
      video.pause();
      video.removeAttribute('src');
      video.load();
    };
  }, [hlsUrl, onReady]);

  return (
    <video
      ref={videoRef}
      className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      muted
      loop
      playsInline
    />
  );
};

export default VideoCardPreview;
