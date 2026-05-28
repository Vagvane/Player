import { useState, useRef, type FC, type DragEvent, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import Container from '../components/Layout/Container';

type UploadStatus = 'idle' | 'uploading' | 'polling' | 'ready' | 'failed';

interface VideoRecord {
  id: string;
  title: string;
  status: string;
}

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'text-yellow-400',
  PROCESSING: 'text-blue-400',
  READY: 'text-green-400',
  FAILED: 'text-red-400',
};

const UploadPage: FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [video, setVideo] = useState<VideoRecord | null>(null);
  const [processingStatus, setProcessingStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<number | null>(null);

  const selectFile = (f: File) => {
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^/.]+$/, ''));
  };

  const handleDragOver = (e: DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f?.type.startsWith('video/')) selectFile(f);
  };
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) selectFile(f);
  };

  const startPolling = (videoId: string) => {
    setUploadStatus('polling');
    setProcessingStatus('PENDING');
    pollRef.current = window.setInterval(async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`http://localhost:3001/api/v1/upload/status/${videoId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const json = await res.json();
        const status = json?.data?.status;
        if (status) setProcessingStatus(status);
        if (status === 'READY') {
          clearInterval(pollRef.current!);
          setUploadStatus('ready');
        } else if (status === 'FAILED') {
          clearInterval(pollRef.current!);
          setUploadStatus('failed');
          setError('Video processing failed.');
        }
      } catch { /* keep polling on transient errors */ }
    }, 3000);
  };

  const handleSubmit = async () => {
    if (!file || !title.trim()) { setError('Please select a file and enter a title.'); return; }
    setError(null);
    setUploadStatus('uploading');

    const formData = new FormData();
    formData.append('video', file);
    formData.append('title', title.trim());
    if (description.trim()) formData.append('description', description.trim());

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:3001/api/v1/upload', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Upload failed');
      }
      const json = await res.json();
      const videoRecord = json?.data?.video;
      setVideo(videoRecord);
      startPolling(videoRecord.id);
    } catch (err: any) {
      setUploadStatus('failed');
      setError(err.message || 'Upload failed');
    }
  };

  const reset = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setFile(null); setTitle(''); setDescription('');
    setUploadStatus('idle'); setVideo(null);
    setProcessingStatus(''); setError(null);
  };

  return (
    <Container className="py-8 max-w-2xl">
      <h1 className="text-4xl font-bold text-white mb-8">Upload Video</h1>

      {error && (
        <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {(uploadStatus === 'idle' || uploadStatus === 'failed') && (
        <div className="space-y-6">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
              isDragging ? 'border-red-500 bg-red-500/10' : 'border-gray-600 hover:border-gray-400'
            }`}
          >
            <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={handleFileChange} />
            {file ? (
              <div>
                <p className="text-white font-medium">{file.name}</p>
                <p className="text-gray-400 text-sm mt-1">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
              </div>
            ) : (
              <div>
                <p className="text-gray-300 text-lg">Drag & drop a video here</p>
                <p className="text-gray-500 text-sm mt-2">or click to browse</p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Title *</label>
            <input
              type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter video title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Description (optional)</label>
            <textarea
              value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
              className="w-full px-4 py-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Enter video description"
            />
          </div>

          <button
            onClick={handleSubmit} disabled={!file || !title.trim()}
            className="w-full py-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Upload Video
          </button>
        </div>
      )}

      {uploadStatus === 'uploading' && (
        <div className="text-center py-12">
          <p className="text-white text-lg mb-4">Uploading to server...</p>
          <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      )}

      {(uploadStatus === 'polling' || uploadStatus === 'ready') && video && (
        <div className="bg-gray-800 rounded-lg p-6 space-y-4">
          <div>
            <p className="text-gray-400 text-sm">Video ID</p>
            <p className="text-white font-mono text-sm break-all">{video.id}</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Title</p>
            <p className="text-white">{video.title}</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Processing Status</p>
            <p className={`font-semibold ${STATUS_COLOR[processingStatus] ?? 'text-gray-300'}`}>
              {processingStatus || 'Checking...'}
              {uploadStatus === 'polling' && (
                <span className="ml-2 text-gray-500 text-sm font-normal animate-pulse">polling every 3s...</span>
              )}
            </p>
          </div>

          {uploadStatus === 'ready' && (
            <Link
              to={`/video/${video.id}`}
              className="block w-full text-center py-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors"
            >
              Watch Video
            </Link>
          )}

          <button onClick={reset} className="w-full py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm transition-colors">
            Upload Another Video
          </button>
        </div>
      )}
    </Container>
  );
};

export default UploadPage;