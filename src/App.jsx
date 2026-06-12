import React, { useState, useEffect, useRef } from 'react';
import { createHashRouter, RouterProvider, Routes, Route, useNavigate, useParams, Link } from 'react-router-dom';
import { Play, History, User, Settings, Loader2, AlertCircle, X } from 'lucide-react';
import Sidebar from './components/Sidebar';
import HomeView from './components/HomeView';
import PlayerView from './components/PlayerView';
import LibraryView from './components/LibraryView';
import DownloadsView from './components/DownloadsView';
import ProfileView from './components/ProfileView';
import SettingsView from './components/SettingsView';
import HistoryView from './components/HistoryView';
import ErrorBoundary from './components/ErrorBoundary';
import { API_BASE, API_KEY } from './config';

// Synchronously apply theme and migrate/clear mock data from localStorage
(() => {
  const saved = localStorage.getItem('teraplay_accent');
  if (saved) {
    try {
      const color = JSON.parse(saved);
      document.documentElement.style.setProperty('--color-accent', color.value);
      document.documentElement.style.setProperty('--color-accent-muted', color.muted);
    } catch (e) {
      console.error('Failed to parse theme color on boot: ', e);
    }
  }

  // Clean up old mock template data from local storage once
  if (!localStorage.getItem('teraplay_mock_cleaned_v2')) {
    localStorage.removeItem('teraplay_videos');
    localStorage.removeItem('teraplay_downloads');
    localStorage.removeItem('teraplay_history');
    localStorage.setItem('teraplay_mock_cleaned_v2', 'true');
  }
})();

const INITIAL_VIDEOS = [];

const INITIAL_DOWNLOADS = [];

function AppShell() {
  const navigate = useNavigate();
  const [videos, setVideos] = useState(() => {
    if (!localStorage.getItem('teraplay_mock_cleaned_v3')) return [];
    const saved = localStorage.getItem('teraplay_videos');
    return saved ? JSON.parse(saved) : INITIAL_VIDEOS;
  });
  const [downloads, setDownloads] = useState(() => {
    if (!localStorage.getItem('teraplay_mock_cleaned_v3')) return [];
    const saved = localStorage.getItem('teraplay_downloads');
    return saved ? JSON.parse(saved) : INITIAL_DOWNLOADS;
  });
  const [history, setHistory] = useState(() => {
    if (!localStorage.getItem('teraplay_mock_cleaned_v3')) return [];
    const saved = localStorage.getItem('teraplay_history');
    return saved ? JSON.parse(saved) : [];
  });

  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [fetchStep, setFetchStep] = useState('');

  // AbortController refs — cancels in-flight requests when superseded.
  const resolveAbortRef = useRef(null);          // for the /api/resolve call
  const downloadControllersRef = useRef(new Map()); // taskId -> AbortController

  // Clean up old mock template data from memory and local storage once
  useEffect(() => {
    if (!localStorage.getItem('teraplay_mock_cleaned_v3')) {
      localStorage.removeItem('teraplay_videos');
      localStorage.removeItem('teraplay_downloads');
      localStorage.removeItem('teraplay_history');
      localStorage.setItem('teraplay_mock_cleaned_v3', 'true');
      setVideos([]);
      setDownloads([]);
      setHistory([]);
    }
  }, []);

  // Persist states to local storage
  useEffect(() => {
    localStorage.setItem('teraplay_videos', JSON.stringify(videos));
  }, [videos]);

  useEffect(() => {
    // Strip _video (non-serializable ref) before persisting
    const serializable = downloads.map(({ _video, ...rest }) => rest);
    localStorage.setItem('teraplay_downloads', JSON.stringify(serializable));
  }, [downloads]);

  useEffect(() => {
    localStorage.setItem('teraplay_history', JSON.stringify(history));
  }, [history]);

  // Download progress is now driven by real fetch streaming — no fake timer needed.

  const handleVideoSelect = (video) => {
    setVideos(prev => prev.map(v => {
      if (v.id === video.id) {
        return {
          ...v,
          progress: v.progress === 0 ? 1 : v.progress,
          relativeTime: 'Just now',
          addedDate: new Date().toISOString()
        };
      }
      return v;
    }));

    // Update watch history logs
    setHistory(prev => {
      const filtered = prev.filter(h => h.videoId !== video.id);
      const newRecord = {
        id: `h_${Date.now()}`,
        videoId: video.id,
        title: video.title,
        size: video.size,
        duration: video.duration,
        thumbnail: video.thumbnail,
        progress: video.progress === 0 ? 1 : video.progress,
        watchedAt: new Date().toISOString()
      };
      return [newRecord, ...filtered];
    });
  };

  const handleToggleFavorite = (videoId) => {
    setVideos(prev => prev.map(v => {
      if (v.id === videoId) {
        return { ...v, favorite: !v.favorite };
      }
      return v;
    }));
  };

  const handleFetch = async (url) => {
    // Abort any in-flight resolve request
    if (resolveAbortRef.current) {
      resolveAbortRef.current.abort();
    }
    const controller = new AbortController();
    resolveAbortRef.current = controller;

    setIsFetching(true);
    setFetchError(null);
    setFetchStep('Connecting to TeraBridge...');
    
    try {
      const response = await fetch(`${API_BASE}/api/resolve?url=${encodeURIComponent(url)}&key=${API_KEY}&mode=stream`, {
        signal: controller.signal,
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }
      
      setFetchStep('Parsing file details...');
      const data = await response.json();
      
      const videoFiles = (data.files || []).filter(file => !file.is_directory);
      if (videoFiles.length === 0) {
        throw new Error('No playable video files found in this share link.');
      }
      
      const newVideos = videoFiles.map((file, idx) => {
        const fileId = file.fs_id || `${Date.now()}_${idx}`;
        let sizeStr = 'Unknown Size';
        if (file.size_mb) {
          sizeStr = `${file.size_mb.toFixed(1)} MB`;
        } else if (file.size_bytes) {
          sizeStr = `${(file.size_bytes / (1024 * 1024)).toFixed(1)} MB`;
        }
        
        const thumbUrl = file.thumbnails?.url2 || file.thumbnails?.url1 || file.thumbnails?.icon || 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=600';
        
        // Fallback to direct stream link if HLS manifest is not transcoded/ready yet on Terabox side
        const isHlsReady = file.stream_ready === true;
        const streamUrl = isHlsReady
          ? `${API_BASE}/api/stream/manifest?url=${encodeURIComponent(url)}&index=${idx}&key=${API_KEY}`
          : file.dlink;
        
        let detectedRes = '';
        if (file.streams && Object.keys(file.streams).length > 0) {
          if (file.streams['M3U8_AUTO_1080']) detectedRes = '1080P Full HD';
          else if (file.streams['M3U8_AUTO_720']) detectedRes = '720P HD';
          else if (file.streams['M3U8_AUTO_480']) detectedRes = '480P';
          else if (file.streams['M3U8_AUTO_360']) detectedRes = '360P';
        }
        if (!detectedRes) {
          const nameLower = (file.filename || '').toLowerCase();
          if (nameLower.includes('4k') || nameLower.includes('2160p')) {
            detectedRes = '4K Ultra HD';
          } else if (nameLower.includes('1080p') || nameLower.includes('fhd')) {
            detectedRes = '1080P Full HD';
          } else if (nameLower.includes('720p') || nameLower.includes('hdtc') || nameLower.includes('hdrip') || nameLower.includes('720')) {
            detectedRes = '720P HD';
          } else if (nameLower.includes('480p') || nameLower.includes('480')) {
            detectedRes = '480P';
          } else if (nameLower.includes('360p') || nameLower.includes('360')) {
            detectedRes = '360P';
          } else {
            detectedRes = 'Auto';
          }
        }

        return {
          id: fileId,
          title: file.filename || `TeraBox Video #${fileId.substring(0, 6)}`,
          description: isHlsReady
            ? `Imported from TeraBox URL. High-speed HLS stream proxied via TeraBridge. Original Path: ${file.path || '/'}`
            : `Imported from TeraBox URL. Direct stream link. Original Path: ${file.path || '/'}`,
          size: sizeStr,
          duration: file.duration || '02:00',
          progress: 0,
          favorite: false,
          videoUrl: streamUrl,
          downloadUrl: file.dlink,
          thumbnail: thumbUrl,
          relativeTime: 'Just now',
          addedDate: new Date().toISOString(),
          resolution: detectedRes,
          streamReady: isHlsReady,
          originalUrl: url,
          fileIndex: idx
        };
      });
      
      setVideos(prev => {
        const existingIds = new Set(prev.map(v => v.id));
        const filteredNew = newVideos.filter(nv => !existingIds.has(nv.id));
        return [...filteredNew, ...prev];
      });
      
      setHistory(prev => {
        const historyRecords = newVideos.map(nv => ({
          id: `h_${Date.now()}_${nv.id}`,
          videoId: nv.id,
          title: nv.title,
          size: nv.size,
          duration: nv.duration,
          thumbnail: nv.thumbnail,
          progress: 0,
          watchedAt: new Date().toISOString()
        }));
        return [...historyRecords, ...prev];
      });
      
      const firstFileId = newVideos[0].id;
      navigate(`/player/${firstFileId}`);
      
    } catch (err) {
      if (err.name === 'AbortError') return; // User typed a new link — silently ignore
      console.error('API Resolve Error:', err);
      setFetchError(err.message || 'An unexpected error occurred while resolving your link. Please try again.');
    } finally {
      setIsFetching(false);
    }
  };

  // ─── Real download with streaming progress ─────────────────────────
  const _startRealDownload = (video, taskId) => {
    const downloadUrl = video.downloadUrl;
    if (!downloadUrl) {
      setDownloads(prev => prev.map(d =>
        d.id === taskId ? { ...d, status: 'failed', error: 'No download URL available.', speed: '—' } : d
      ));
      return;
    }

    const controller = new AbortController();
    downloadControllersRef.current.set(taskId, controller);

    (async () => {
      try {
        const response = await fetch(downloadUrl, { signal: controller.signal });

        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}`);
        }

        const contentLength = parseInt(response.headers.get('Content-Length') || '0', 10);
        if (contentLength > 0) {
          setDownloads(prev => prev.map(d =>
            d.id === taskId ? { ...d, totalBytes: contentLength } : d
          ));
        }

        const reader = response.body.getReader();
        const chunks = [];
        let loaded = 0;
        let lastTime = Date.now();
        let lastLoaded = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          chunks.push(value);
          loaded += value.byteLength;

          // Throttle UI updates to ~4/sec
          const now = Date.now();
          if (now - lastTime >= 250) {
            const elapsed = (now - lastTime) / 1000;
            const speedBytes = (loaded - lastLoaded) / elapsed;
            const total = contentLength || 0;
            const remaining = total > 0 ? total - loaded : 0;
            const secs = speedBytes > 0 ? Math.ceil(remaining / speedBytes) : 0;

            let timeLeftStr = total > 0 ? (secs > 60
              ? `${Math.floor(secs / 60)} min remaining`
              : `${secs}s remaining`
            ) : 'Downloading...';

            setDownloads(prev => prev.map(d => {
              if (d.id !== taskId) return d;
              return {
                ...d,
                loadedBytes: loaded,
                totalBytes: total || d.totalBytes,
                speed: `${(speedBytes / (1024 * 1024)).toFixed(1)} MB/s`,
                timeLeft: timeLeftStr,
                progress: total > 0 ? Math.floor((loaded / total) * 100) : 0,
              };
            }));

            lastTime = now;
            lastLoaded = loaded;
          }
        }

        // Save file to disk
        const blob = new Blob(chunks);
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `${video.title}.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);

        setDownloads(prev => prev.map(d =>
          d.id === taskId ? {
            ...d,
            status: 'completed',
            loadedBytes: loaded,
            progress: 100,
            speed: '0 MB/s',
            timeLeft: 'Completed',
          } : d
        ));
      } catch (err) {
        if (err.name === 'AbortError') {
          // Paused or cancelled — don't mark as failed
          return;
        }
        setDownloads(prev => prev.map(d =>
          d.id === taskId ? {
            ...d,
            status: 'failed',
            error: err.message,
            speed: '0 MB/s',
            timeLeft: 'Failed',
          } : d
        ));
      } finally {
        downloadControllersRef.current.delete(taskId);
        _processDownloadQueue();
      }
    })();
  };

  // ── Process download queue: start queued tasks when slots open ──
  const _processDownloadQueue = () => {
    const limit = parseInt(localStorage.getItem('settings_concurrent') || '2', 10);
    setDownloads(prev => {
      const active = prev.filter(d => d.status === 'downloading').length;
      if (active >= limit) return prev;
      const next = prev.find(d => d.status === 'queued');
      if (!next) return prev;
      // Start the download outside the state updater
      const video = next._video;
      const taskId = next.id;
      setTimeout(() => _startRealDownload(video, taskId), 0);
      return prev.map(d => d.id === taskId ? { ...d, status: 'downloading', speed: 'Connecting...', timeLeft: 'Starting...' } : d);
    });
  };

  const handleStartDownload = (video) => {
    const exists = downloads.find(d => d.videoId === video.id && d.status !== 'failed');
    if (exists) {
      navigate('/downloads');
      return;
    }

    const limit = parseInt(localStorage.getItem('settings_concurrent') || '2', 10);
    const active = downloads.filter(d => d.status === 'downloading').length;
    const startNow = active < limit;

    const taskId = `d_${Date.now()}`;
    const newTask = {
      id: taskId,
      title: `${video.title}.mp4`,
      totalBytes: 0,
      loadedBytes: 0,
      speed: startNow ? 'Connecting...' : 'Queued',
      timeLeft: startNow ? 'Starting...' : 'Waiting for slot...',
      progress: 0,
      status: startNow ? 'downloading' : 'queued',
      addedDate: new Date().toISOString(),
      videoId: video.id,
      _video: video,
    };

    setDownloads(prev => [newTask, ...prev]);
    navigate('/downloads');
    if (startNow) _startRealDownload(video, taskId);
  };

  const handlePauseDownload = (id) => {
    const ctrl = downloadControllersRef.current.get(id);
    if (ctrl) ctrl.abort();
    setDownloads(prev => prev.map(d =>
      d.id === id ? { ...d, status: 'paused', speed: 'Paused', timeLeft: 'Paused' } : d
    ));
  };

  const handleResumeDownload = (id) => {
    setDownloads(prev => prev.map(d => {
      if (d.id !== id) return d;
      const video = d._video;
      // Reset progress and restart from scratch
      const resumed = {
        ...d,
        status: 'downloading',
        loadedBytes: 0,
        totalBytes: 0,
        progress: 0,
        speed: 'Connecting...',
        timeLeft: 'Starting...',
      };
      // Kick off the real download outside the state updater
      setTimeout(() => _startRealDownload(video, id), 0);
      return resumed;
    }));
  };

  const handleCancelDownload = (id) => {
    const ctrl = downloadControllersRef.current.get(id);
    if (ctrl) ctrl.abort();
    downloadControllersRef.current.delete(id);
    setDownloads(prev => prev.filter(d => d.id !== id));
    _processDownloadQueue();
  };

  const handleClearHistory = () => {
    setDownloads(prev => prev.filter(d => d.status === 'downloading' || d.status === 'paused'));
  };

  const handleRetryDownload = (id) => {
    const ctrl = downloadControllersRef.current.get(id);
    if (ctrl) ctrl.abort();
    setDownloads(prev => prev.map(d => {
      if (d.id !== id) return d;
      const video = d._video;
      const retried = {
        ...d,
        status: 'downloading',
        loadedBytes: 0,
        totalBytes: 0,
        progress: 0,
        speed: 'Connecting...',
        timeLeft: 'Starting...',
        error: undefined,
      };
      setTimeout(() => _startRealDownload(video, id), 0);
      return retried;
    }));
  };

  const handlePlayDownloadedVideo = (filename) => {
    const titleClean = filename.replace('.mp4', '');
    const matched = videos.find(v => v.title.includes(titleClean));
    if (matched) {
      handleVideoSelect(matched);
      navigate(`/player/${matched.id}`);
    } else {
      navigate('/');
    }
  };

  const handleClearAllHistory = () => {
    if (window.confirm("Are you sure you want to clear your complete watch history?")) {
      setHistory([]);
    }
  };

  const handleRemoveHistoryItem = (id) => {
    setHistory(prev => prev.filter(h => h.id !== id));
  };

  const handlePlayFromHistory = (videoId) => {
    const matched = videos.find(v => v.id === videoId);
    if (matched) {
      // Re-trigger progress recording
      handleVideoSelect(matched);
      navigate(`/player/${videoId}`);
    } else {
      navigate('/');
    }
  };

  const handleUpdateVideo = (updatedVideo) => {
    setVideos(prev => prev.map(v => v.id === updatedVideo.id ? { ...v, ...updatedVideo } : v));
  };

  const handleResetData = () => {
    localStorage.removeItem('teraplay_videos');
    localStorage.removeItem('teraplay_downloads');
    localStorage.removeItem('teraplay_history');
    setVideos(INITIAL_VIDEOS);
    setDownloads(INITIAL_DOWNLOADS);
    setHistory([]);
  };

  return (
    <div className="flex min-h-screen bg-bg relative text-fg">
      <Sidebar />

      {/* Mobile Top Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-glass backdrop-blur-3xl border-b border-custom-border z-[90] flex items-center justify-between px-4 md:hidden select-none">
        <Link to="/" className="flex items-center gap-2 font-bold text-base text-fg cursor-pointer">
          <div className="w-7 h-7 bg-accent rounded-lg grid place-items-center text-bg">
            <Play fill="currentColor" size={12} className="ml-0.5" />
          </div>
          <span>TeraBox Player</span>
        </Link>
        <div className="flex items-center gap-1">
          <Link to="/history" className="p-2 text-muted hover:text-accent hover:bg-surface-elevated rounded-xl transition-all" aria-label="Watch history">
            <History size={20} />
          </Link>
          <Link to="/profile" className="p-2 text-muted hover:text-accent hover:bg-surface-elevated rounded-xl transition-all" aria-label="Profile">
            <User size={20} />
          </Link>
          <Link to="/settings" className="p-2 text-muted hover:text-accent hover:bg-surface-elevated rounded-xl transition-all" aria-label="Settings">
            <Settings size={20} />
          </Link>
        </div>
      </header>

      <main className="flex-1 md:ml-64 p-4 pt-20 md:p-10 max-w-[1400px] w-full min-h-screen pb-28 md:pb-10 box-border">
        <Routes>
          <Route path="/" element={
            <HomeView 
              videos={videos} 
              onVideoSelect={handleVideoSelect}
              onFetch={handleFetch}
            />
          } />
          <Route path="/player/:id?" element={
            <PlayerRouteWrapper 
              videos={videos} 
              handleToggleFavorite={handleToggleFavorite}
              handleStartDownload={handleStartDownload}
              handleVideoSelect={handleVideoSelect}
              handleUpdateVideo={handleUpdateVideo}
            />
          } />
          <Route path="/library" element={
            <LibraryView 
              videos={videos} 
              onVideoSelect={handleVideoSelect}
            />
          } />
          <Route path="/downloads" element={
            <DownloadsView 
              downloads={downloads}
              onPauseDownload={handlePauseDownload}
              onResumeDownload={handleResumeDownload}
              onCancelDownload={handleCancelDownload}
              onClearHistory={handleClearHistory}
              onRetryDownload={handleRetryDownload}
              onPlayVideo={handlePlayDownloadedVideo}
            />
          } />
          <Route path="/profile" element={
            <ProfileView videos={videos} history={history} downloads={downloads} />
          } />
          <Route path="/settings" element={
            <SettingsView onResetData={handleResetData} />
          } />
          <Route path="/history" element={
            <HistoryView 
              history={history}
              onClearHistory={handleClearAllHistory}
              onRemoveItem={handleRemoveHistoryItem}
              onPlayVideo={handlePlayFromHistory}
            />
          } />
        </Routes>
      </main>

      {/* Loading Overlay */}
      {isFetching && (
        <div className="fixed inset-0 bg-bg/85 backdrop-blur-md z-[9999] flex items-center justify-center animate-fade-in p-4">
          <div className="glass-card p-8 rounded-2xl border border-custom-border max-w-sm w-full text-center flex flex-col items-center gap-6 shadow-glass animate-in fade-in zoom-in-95 duration-200">
            <div className="relative flex items-center justify-center w-16 h-16">
              <Loader2 size={40} className="text-accent animate-spin" />
              <div className="absolute inset-0 w-16 h-16 rounded-full border border-accent/20 animate-pulse"></div>
            </div>
            <div>
              <h3 className="text-lg font-bold text-fg mb-1">Resolving TeraBox URL</h3>
              <p className="text-xs text-accent font-medium animate-pulse">{fetchStep}</p>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              We are connecting to the high-speed cache resolver to construct your direct media stream.
            </p>
          </div>
        </div>
      )}

      {/* Error Overlay Modal */}
      {fetchError && (
        <div className="fixed inset-0 bg-bg/85 backdrop-blur-md z-[9999] flex items-center justify-center animate-fade-in p-4">
          <div className="glass-card p-6 rounded-2xl border border-rose-500/20 max-w-md w-full shadow-glass relative flex flex-col items-center text-center gap-5 animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setFetchError(null)} 
              className="absolute top-4 right-4 text-muted hover:text-fg rounded-full p-1 hover:bg-white/5 transition-all cursor-pointer"
              aria-label="Dismiss error"
            >
              <X size={18} />
            </button>
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 grid place-items-center text-rose-400">
              <AlertCircle size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-fg mb-2">Resolution Failed</h3>
              <p className="text-sm text-muted leading-relaxed break-words">{fetchError}</p>
            </div>
            <button 
              onClick={() => setFetchError(null)}
              className="w-full py-2.5 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-400 font-semibold rounded-xl text-xs transition-all cursor-pointer animate-out duration-200"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PlayerRouteWrapper({ videos, handleToggleFavorite, handleStartDownload, handleVideoSelect, handleUpdateVideo }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const activeVideoId = id || (videos.length > 0 ? videos[0].id : null);
  const activeVideo = videos.find(v => v.id === activeVideoId);

  if (!activeVideo) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center text-muted gap-4">
        <p>No video selected.</p>
        <button 
          className="px-5 py-2 bg-accent text-bg rounded-xl font-semibold hover:opacity-90 cursor-pointer"
          onClick={() => navigate('/')}
        >
          Go back Home
        </button>
      </div>
    );
  }

  return (
    <PlayerView 
      video={activeVideo} 
      relatedVideos={videos}
      onVideoSelect={handleVideoSelect}
      onBack={() => navigate(-1)}
      onToggleFavorite={handleToggleFavorite}
      onStartDownload={handleStartDownload}
      onUpdateVideo={handleUpdateVideo}
    />
  );
}

const router = createHashRouter([
  {
    path: '*',
    element: <AppShell />
  }
]);

export default function App() {
  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  );
}
