import React, { useState, useEffect } from 'react';
import { createHashRouter, RouterProvider, Routes, Route, useNavigate, useParams, Link } from 'react-router-dom';
import { Play, History, User, Settings } from 'lucide-react';
import Sidebar from './components/Sidebar';
import HomeView from './components/HomeView';
import PlayerView from './components/PlayerView';
import LibraryView from './components/LibraryView';
import DownloadsView from './components/DownloadsView';
import ProfileView from './components/ProfileView';
import SettingsView from './components/SettingsView';
import HistoryView from './components/HistoryView';

// Synchronously apply theme from localStorage to avoid styling flashes on reload
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
})();

const INITIAL_VIDEOS = [
  {
    id: '1',
    title: 'The Future of Design Systems: Architecture & Scaling',
    description: 'In this comprehensive session, we explore the evolving landscape of design systems. We\'ll cover atomic components, tokens, and how to scale for global products while maintaining visual consistency and developer efficiency.',
    size: '2.4 GB',
    duration: '12:45',
    progress: 65,
    favorite: false,
    timeLeft: '45 mins left',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=600',
    relativeTime: '2 days ago',
    addedDate: '2026-06-10T12:00:00.000Z',
    resolution: '4K Ultra HD'
  },
  {
    id: '2',
    title: 'Interstellar Cinematic Journey 4K (Official Version)',
    description: 'A visual journey through deep space, traversing black holes and alien solar systems in stunning high fidelity. Audio engineered with binaural ambient waves.',
    size: '12.8 GB',
    duration: '15:00',
    progress: 15,
    favorite: false,
    timeLeft: '1h 55m left',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&q=80&w=600',
    relativeTime: '5 days ago',
    addedDate: '2026-06-07T14:30:00.000Z',
    resolution: '4K Ultra HD'
  },
  {
    id: '3',
    title: 'Node.js Performance Optimization Workshop',
    description: 'Learn how to benchmark Node.js backends, identify memory leaks, tune garbage collection, and write highly optimized asynchronous pipelines.',
    size: '850 MB',
    duration: '45:20',
    progress: 0,
    favorite: false,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&q=80&w=600',
    relativeTime: '1 week ago',
    addedDate: '2026-06-05T09:00:00.000Z',
    resolution: '1080P Full HD'
  },
  {
    id: '4',
    title: 'Nature\'s Serenity — 8K Drone Footage',
    description: 'Immersive scenic views of cascading waterfalls, dense forest canopies, and rugged coastal cliffs. Best paired with headphones.',
    size: '4.2 GB',
    duration: '18:10',
    progress: 0,
    favorite: false,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&q=80&w=600',
    relativeTime: '2 weeks ago',
    addedDate: '2026-05-29T17:00:00.000Z',
    resolution: '8K Ultra HD'
  },
  {
    id: '5',
    title: 'Retro Computing Documentary Part 1: The Silicon Valley Boom',
    description: 'A nostalgic look at the early days of personal computers, highlighting the garage builds, retro interfaces, and legendary microprocessor battles.',
    size: '1.1 GB',
    duration: '08:45',
    progress: 0,
    favorite: false,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=600',
    relativeTime: '3 weeks ago',
    addedDate: '2026-05-22T08:15:00.000Z',
    resolution: '1080P'
  },
  {
    id: '6',
    title: 'Tech Evolution: Silicon Valley & The Web',
    description: 'An analysis of how micro-chip manufacturing hubs evolved into the digital software companies that run our modern web pipelines.',
    size: '1.5 GB',
    duration: '24:30',
    progress: 0,
    favorite: false,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=600',
    relativeTime: '1 month ago',
    addedDate: '2026-05-12T11:45:00.000Z',
    resolution: '1080P'
  }
];

const INITIAL_DOWNLOADS = [
  {
    id: 'd1',
    title: 'Interstellar Cinematic Journey 4K.mp4',
    totalBytes: 13743895347, // 12.8 GB
    loadedBytes: 4509715456, // 4.2 GB
    speed: '4.5 MB/s',
    speedBytes: 4718592, // 4.5 MB
    timeLeft: '12 mins remaining',
    progress: 35,
    status: 'downloading',
    addedDate: '2026-06-12T14:00:00.000Z',
    videoId: '2'
  },
  {
    id: 'd2',
    title: 'Node.js Performance Optimization Workshop.mp4',
    totalBytes: 891289600, // 850 MB
    loadedBytes: 713031680, // 680 MB
    speed: '2.1 MB/s',
    speedBytes: 2202009, // 2.1 MB
    timeLeft: '1 min remaining',
    progress: 80,
    status: 'downloading',
    addedDate: '2026-06-12T14:10:00.000Z',
    videoId: '3'
  },
  {
    id: 'd3',
    title: 'The Future of Design Systems 2026.mp4',
    totalBytes: 2576980377, // 2.4 GB
    loadedBytes: 2576980377,
    speed: '0 MB/s',
    speedBytes: 0,
    timeLeft: 'Completed',
    progress: 100,
    status: 'completed',
    addedDate: '2026-06-12T11:00:00.000Z',
    videoId: '1'
  },
  {
    id: 'd4',
    title: 'Nature\'s Serenity — 8K Drone Footage.mp4',
    totalBytes: 4509715456, // 4.2 GB
    loadedBytes: 1073741824, // 1 GB
    speed: '0 MB/s',
    speedBytes: 0,
    timeLeft: 'Failed',
    progress: 23,
    status: 'failed',
    addedDate: '2026-06-11T16:30:00.000Z',
    videoId: '4'
  }
];

function AppShell() {
  const navigate = useNavigate();
  const [videos, setVideos] = useState(() => {
    const saved = localStorage.getItem('teraplay_videos');
    return saved ? JSON.parse(saved) : INITIAL_VIDEOS;
  });
  const [downloads, setDownloads] = useState(() => {
    const saved = localStorage.getItem('teraplay_downloads');
    return saved ? JSON.parse(saved) : INITIAL_DOWNLOADS;
  });
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('teraplay_history');
    return saved ? JSON.parse(saved) : [];
  });

  // Persist states to local storage
  useEffect(() => {
    localStorage.setItem('teraplay_videos', JSON.stringify(videos));
  }, [videos]);

  useEffect(() => {
    localStorage.setItem('teraplay_downloads', JSON.stringify(downloads));
  }, [downloads]);

  useEffect(() => {
    localStorage.setItem('teraplay_history', JSON.stringify(history));
  }, [history]);

  // Tick active downloads progress bar every second
  useEffect(() => {
    const interval = setInterval(() => {
      setDownloads(prevDownloads => {
        const updated = prevDownloads.map(task => {
          if (task.status !== 'downloading') return task;

          const nextLoaded = task.loadedBytes + task.speedBytes;
          if (nextLoaded >= task.totalBytes) {
            return {
              ...task,
              loadedBytes: task.totalBytes,
              progress: 100,
              status: 'completed',
              speed: '0 MB/s',
              timeLeft: 'Completed'
            };
          }

          const remainingBytes = task.totalBytes - nextLoaded;
          const secs = Math.ceil(remainingBytes / task.speedBytes);
          let timeLeftStr = `${secs}s remaining`;
          if (secs > 60) {
            const mins = Math.floor(secs / 60);
            timeLeftStr = `${mins} min${mins > 1 ? 's' : ''} remaining`;
          }

          const variation = 0.9 + Math.random() * 0.2;
          const newSpeedBytes = Math.round(task.speedBytes * variation);
          const newSpeedStr = `${(newSpeedBytes / (1024 * 1024)).toFixed(1)} MB/s`;

          return {
            ...task,
            loadedBytes: nextLoaded,
            progress: Math.floor((nextLoaded / task.totalBytes) * 100),
            speedBytes: newSpeedBytes,
            speed: newSpeedStr,
            timeLeft: timeLeftStr
          };
        });
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

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

  const handleFetch = (url) => {
    const id = Date.now().toString();
    const title = url.split('/').pop().substring(0, 40) || `TeraBox Video #${id.substring(8)}`;
    const freshVideo = {
      id,
      title: title.includes('.') ? title : `${title}.mp4`,
      description: `This cinematic media link was dynamically imported from the TeraBox URL: ${url}. Available with high definition buffer rendering.`,
      size: '1.8 GB',
      duration: '09:56',
      progress: 0,
      favorite: false,
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
      thumbnail: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=600',
      relativeTime: 'Just now',
      addedDate: new Date().toISOString(),
      resolution: '1080P Full HD'
    };

    setVideos(prev => [freshVideo, ...prev]);
    
    // Add to history right away as a blank record
    setHistory(prev => [
      {
        id: `h_${Date.now()}`,
        videoId: id,
        title: freshVideo.title,
        size: freshVideo.size,
        duration: freshVideo.duration,
        thumbnail: freshVideo.thumbnail,
        progress: 0,
        watchedAt: new Date().toISOString()
      },
      ...prev
    ]);

    navigate(`/player/${id}`);
  };

  const handleStartDownload = (video) => {
    const exists = downloads.find(d => d.videoId === video.id && d.status !== 'failed');
    if (exists) {
      navigate('/downloads');
      return;
    }

    const newTask = {
      id: `d_${Date.now()}`,
      title: `${video.title}.mp4`,
      totalBytes: 1932735283,
      loadedBytes: 0,
      speed: '5.2 MB/s',
      speedBytes: 5452595,
      timeLeft: '6 mins remaining',
      progress: 0,
      status: 'downloading',
      addedDate: new Date().toISOString(),
      videoId: video.id
    };

    setDownloads(prev => [newTask, ...prev]);
    navigate('/downloads');
  };

  const handlePauseDownload = (id) => {
    setDownloads(prev => prev.map(d => {
      if (d.id === id) {
        return { ...d, status: 'paused', speed: '0 MB/s', speedBytes: 0 };
      }
      return d;
    }));
  };

  const handleResumeDownload = (id) => {
    setDownloads(prev => prev.map(d => {
      if (d.id === id) {
        return { 
          ...d, 
          status: 'downloading', 
          speed: '3.8 MB/s', 
          speedBytes: 3984588 
        };
      }
      return d;
    }));
  };

  const handleCancelDownload = (id) => {
    setDownloads(prev => prev.filter(d => d.id !== id));
  };

  const handleClearHistory = () => {
    setDownloads(prev => prev.filter(d => d.status === 'downloading' || d.status === 'paused'));
  };

  const handleRetryDownload = (id) => {
    setDownloads(prev => prev.map(d => {
      if (d.id === id) {
        return { 
          ...d, 
          status: 'downloading', 
          progress: 0, 
          loadedBytes: 0,
          speed: '4.8 MB/s', 
          speedBytes: 5033164 
        };
      }
      return d;
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
            <ProfileView />
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
    </div>
  );
}

function PlayerRouteWrapper({ videos, handleToggleFavorite, handleStartDownload, handleVideoSelect }) {
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
  return <RouterProvider router={router} />;
}
