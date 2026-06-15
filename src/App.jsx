import React, { useState, useEffect } from 'react';
import { createHashRouter, RouterProvider, Routes, Route, useNavigate, Link, useLocation } from 'react-router-dom';
import { Play, History, User, Settings, Loader2, AlertCircle, X } from 'lucide-react';
import Sidebar from './components/Sidebar';
import HomeView from './components/HomeView';
import DiscoverView from './components/DiscoverView';
import LibraryView from './components/LibraryView';
import ProfileView from './components/ProfileView';
import SettingsView from './components/SettingsView';
import HistoryView from './components/HistoryView';
import ErrorBoundary from './components/ErrorBoundary';
import LandingPage from './components/LandingPage';
import AuthScreen from './components/AuthScreen';
import ConfirmDialog from './components/ConfirmDialog';
import ShareModal from './components/ShareModal';
import NotFoundView from './components/NotFoundView';
import PlayerRouteWrapper from './components/PlayerRouteWrapper';
import FilesView from './components/FilesView';
import { db } from './firebase';
import { ref, set } from 'firebase/database';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useDocumentMeta } from './hooks/useDocumentMeta';
import { useProfile } from './hooks/useProfile';
import { useSettings } from './hooks/useSettings';
import { useDiscover } from './hooks/useDiscover';
import { useHistory } from './hooks/useHistory';
import { useVideos } from './hooks/useVideos';
import { useFetch } from './hooks/useFetch';

// Synchronously apply theme and migrate/clear mock data from localStorage
(() => {
  // Apply theme mode to prevent FOUC (Flash of Unstyled Content)
  const savedTheme = localStorage.getItem('teraplay_theme_mode') || 'dark';
  const root = document.documentElement;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (savedTheme === 'light') {
    root.classList.add('light');
    root.classList.remove('dark');
    if (meta) meta.setAttribute('content', '#f7f8fa');
  } else if (savedTheme === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
    if (meta) meta.setAttribute('content', '#0a0a0f');
  } else if (savedTheme === 'system') {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', isDark);
    root.classList.toggle('light', !isDark);
    if (meta) meta.setAttribute('content', isDark ? '#0a0a0f' : '#f7f8fa');
  }

  const saved = localStorage.getItem('teraplay_accent');
  if (saved) {
    try {
      const color = JSON.parse(saved);
      document.documentElement.style.setProperty('--color-accent', color.value);
      document.documentElement.style.setProperty('--color-accent-muted', color.muted);
      document.documentElement.style.setProperty('--accent', color.value);
      document.documentElement.style.setProperty('--accent-muted', color.muted);
    } catch (e) {
      console.error('Failed to parse theme color on boot: ', e);
    }
  }

  if (!localStorage.getItem('teraplay_mock_cleaned_v2')) {
    localStorage.removeItem('teraplay_videos');
    localStorage.removeItem('teraplay_downloads');
    localStorage.removeItem('teraplay_history');
    localStorage.setItem('teraplay_mock_cleaned_v2', 'true');
  }

  const params = new URLSearchParams(window.location.search);
  const sharedVideoId = params.get('id');
  if (sharedVideoId) {
    window.history.replaceState(null, '', window.location.pathname);
    window.location.hash = `/player/${sharedVideoId}`;
  }
})();

export const DISCOVER_VIDEOS = [];

function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, authLoading } = useAuth();

  // Sidebar (local UI state)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('teraplay_sidebar_collapsed') === 'true';
  });
  const handleToggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('teraplay_sidebar_collapsed', next.toString());
      return next;
    });
  };

  // Data hooks
  const { userProfile } = useProfile(currentUser);
  const { settings, handleUpdateSettings, handleResetData } = useSettings(currentUser);
  


  const { discoverVideos, discoverVideosRef, dbCategories, topCreators } = useDiscover(currentUser);
  const { history, historyRef, setHistoryInDb, handleRemoveHistoryItem, clearAllHistory } = useHistory(currentUser);
  const {
    videos, videosRef, deletingVideoIdRef, setVideosInDb,
    handleImportVideo, handleToggleFavorite, handleUpdateVideo, handleIncrementVideoViewsAndPlays
  } = useVideos(currentUser);
  const { isFetching, fetchError, fetchStep, handleFetch, setFetchError } = useFetch(
    currentUser, navigate, { videosRef, historyRef, userProfile, setVideosInDb, setHistoryInDb }
  );

  useDocumentMeta(location, videos, discoverVideos);

  // UI modal state
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
  const [previewImage, setPreviewImage] = useState(null);
  const [shareVideo, setShareVideo] = useState(null);

  // Sync public metadata updates into the current user's private library
  useEffect(() => {
    if (!currentUser || !videos || videos.length === 0 || !discoverVideos || discoverVideos.length === 0) {
      return;
    }

    let mutated = false;
    const synced = videos.map(v => {
      const publicVid = discoverVideos.find(pv => String(pv.id) === String(v.id));
      if (publicVid) {
        const updates = {};
        if (publicVid.duration && publicVid.duration !== '02:00' && publicVid.duration !== v.duration) {
          updates.duration = publicVid.duration;
        }
        if (publicVid.resolution && publicVid.resolution !== 'Auto' && publicVid.resolution !== v.resolution) {
          updates.resolution = publicVid.resolution;
        }
        if (publicVid.category && publicVid.category !== v.category) {
          updates.category = publicVid.category;
        }
        if (typeof publicVid.views === 'number' && publicVid.views !== v.views) {
          updates.views = publicVid.views;
        }
        if (typeof publicVid.plays === 'number' && publicVid.plays !== v.plays) {
          updates.plays = publicVid.plays;
        }

        if (Object.keys(updates).length > 0) {
          mutated = true;
          return { ...v, ...updates };
        }
      }
      return v;
    });

    if (mutated) {
      console.log('[App] Syncing public video metadata changes to private library');
      set(ref(db, `users/${currentUser.uid}/videos`), synced);
    }
  }, [currentUser, videos, discoverVideos]);

  // --- Orchestration handlers ---

  const handleVideoSelect = (video) => {
    const currentVideos = videosRef.current;
    const currentHistory = historyRef.current;
    const vidIdStr = String(video.id);

    const updatedVideos = currentVideos.map(v => {
      const isSelected = String(v.id) === vidIdStr;
      const currentProgress = typeof v.progress === 'number' && !isNaN(v.progress) ? v.progress : 0;
      return {
        ...v,
        progress: isSelected
          ? (currentProgress === 0 ? 1 : currentProgress)
          : currentProgress,
        relativeTime: isSelected ? 'Just now' : (v.relativeTime || 'Just now'),
        addedDate: isSelected ? new Date().toISOString() : (v.addedDate || new Date().toISOString())
      };
    });

    const filteredHistory = currentHistory.filter(h => String(h.videoId) !== vidIdStr);
    const videoProgress = typeof video.progress === 'number' && !isNaN(video.progress) ? video.progress : 0;
    const newRecord = {
      id: `h_${Date.now()}`,
      videoId: video.id,
      title: video.title,
      size: video.size,
      duration: video.duration,
      thumbnail: video.thumbnail,
      progress: videoProgress === 0 ? 1 : videoProgress,
      watchedAt: new Date().toISOString()
    };
    const updatedHistory = [newRecord, ...filteredHistory].slice(0, 50);

    setVideosInDb(updatedVideos);
    setHistoryInDb(updatedHistory);
  };

  const handleDeleteVideo = (videoId) => {
    const vidIdStr = String(videoId);
    deletingVideoIdRef.current = vidIdStr;
    const matched = videosRef.current.find(v => String(v.id) === vidIdStr);
    const title = matched ? matched.title : 'this video';
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Video',
      message: `Are you sure you want to delete "${title}" from your library?`,
      onConfirm: () => {
        setConfirmDialog(d => ({ ...d, isOpen: false }));

        const currentVideos = videosRef.current;
        const currentHistory = historyRef.current;
        const updatedVideos = currentVideos.filter(v => String(v.id) !== vidIdStr);
        const updatedHistory = currentHistory.filter(h => String(h.videoId) !== vidIdStr);

        if (window.location.hash.includes(vidIdStr)) {
          navigate('/', { replace: true });
        }

        if (currentUser) {
          set(ref(db, `users/${currentUser.uid}/videos`), updatedVideos.length > 0 ? updatedVideos : null)
            .catch(err => console.error('Failed to delete video from database:', err));
          set(ref(db, `users/${currentUser.uid}/history`), updatedHistory.length > 0 ? updatedHistory : null)
            .catch(err => console.error('Failed to delete history from database:', err));
          set(ref(db, `users/${currentUser.uid}/progress/${videoId}`), null)
            .catch(err => console.error('Failed to delete progress from database:', err));
        } else {
          setVideosInDb(updatedVideos);
          setHistoryInDb(updatedHistory);
        }

        setTimeout(() => {
          if (deletingVideoIdRef.current === vidIdStr) {
            deletingVideoIdRef.current = null;
          }
        }, 100);
      },
      onCancel: () => {
        setConfirmDialog(d => ({ ...d, isOpen: false }));
        deletingVideoIdRef.current = null;
      }
    });
  };

  const handleClearAllHistory = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Clear Watch History',
      message: 'Are you sure you want to clear your complete watch history? This cannot be undone.',
      onConfirm: () => {
        clearAllHistory();
        setConfirmDialog(d => ({ ...d, isOpen: false }));
      },
    });
  };

  const handlePlayFromHistory = (videoId) => {
    const matched = videos.find(v => String(v.id) === String(videoId));
    if (matched) {
      handleVideoSelect(matched);
      navigate(`/player/${videoId}`);
    } else {
      navigate('/');
    }
  };

  const onToggleFavorite = (videoId) => handleToggleFavorite(videoId, discoverVideosRef);

  const onResetData = () => {
    handleResetData(() => {
      if (currentUser) {
        set(ref(db, `users/${currentUser.uid}/videos`), null);
        set(ref(db, `users/${currentUser.uid}/history`), null);
      } else {
        localStorage.removeItem('teraplay_videos');
        localStorage.removeItem('teraplay_history');
        setVideosInDb([]);
        setHistoryInDb([]);
      }
    });
  };

  // --- Auth guards ---

  if (authLoading) {
    return (
      <div className="fixed inset-0 bg-bg z-[9999] flex items-center justify-center font-body">
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 size={40} className="text-accent animate-spin" />
          <p className="text-sm text-muted animate-pulse font-medium">Initializing Secure Connection...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    if (location.pathname === '/auth') {
      const initialIsSignUp = location.state?.isSignUp || false;
      return <AuthScreen onClose={() => navigate('/')} initialIsSignUp={initialIsSignUp} />;
    }
    return <LandingPage onNavigateToAuth={(isSignUp) => navigate('/auth', { state: { isSignUp } })} />;
  }

  return (
    <div className="flex min-h-screen bg-bg relative text-fg overflow-x-hidden">
      {/* Background container wrapper for authenticated routes */}
      {settings.showBackground !== false && (
        <div className="absolute top-0 left-0 right-0 h-[750px] pointer-events-none z-0 overflow-hidden opacity-65">
          <div className="premium-wave-bg"></div>
          <div className="premium-wave-tint"></div>
          <div className="premium-wave-fade"></div>
        </div>
      )}

      <Sidebar 
        isCollapsed={sidebarCollapsed} 
        onToggleCollapse={handleToggleSidebar} 
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
      />

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

      <main className={`flex-1 ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'} transition-all duration-300 p-4 pt-24 md:p-10 w-full min-h-screen pb-28 md:pb-10 box-border flex flex-col`}>
        <div className="max-w-[1400px] w-full mx-auto flex-1 flex flex-col">
          <Routes>
            <Route path="/" element={
              <HomeView
                videos={videos}
                userProfile={userProfile}
                onVideoSelect={handleVideoSelect}
                onFetch={handleFetch}
                onPreviewImage={setPreviewImage}
                onDeleteVideo={handleDeleteVideo}
                onShareVideo={setShareVideo}
                currentUser={currentUser}
                settings={settings}
                onUpdateSettings={handleUpdateSettings}
              />
            } />
            <Route path="/player/:id?" element={
              <PlayerRouteWrapper
                videos={videos}
                discoverVideos={discoverVideos}
                handleToggleFavorite={onToggleFavorite}
                handleVideoSelect={handleVideoSelect}
                handleUpdateVideo={handleUpdateVideo}
                handleIncrementVideoViewsAndPlays={handleIncrementVideoViewsAndPlays}
                currentUser={currentUser}
                onDeleteVideo={handleDeleteVideo}
                onShareVideo={setShareVideo}
                settings={settings}
              />
            } />
            <Route path="/discover" element={
              <DiscoverView
                videos={videos}
                discoverVideos={discoverVideos}
                onVideoSelect={handleVideoSelect}
                onPreviewImage={setPreviewImage}
                onShareVideo={setShareVideo}
                onImportVideo={handleImportVideo}
                currentUser={currentUser}
                dbCategories={dbCategories}
                topCreators={topCreators}
              />
            } />
            <Route path="/files" element={
              <FilesView onPreviewImage={setPreviewImage} />
            } />
            <Route path="/library" element={
              <LibraryView
                videos={videos}
                onVideoSelect={handleVideoSelect}
                onPreviewImage={setPreviewImage}
                onDeleteVideo={handleDeleteVideo}
                onShareVideo={setShareVideo}
              />
            } />
            <Route path="/profile" element={
              <ProfileView videos={videos} history={history} currentUser={currentUser} userProfile={userProfile} onVideoSelect={handleVideoSelect} />
            } />
            <Route path="/settings" element={
              <SettingsView settings={settings} onUpdateSettings={handleUpdateSettings} onResetData={onResetData} currentUser={currentUser} />
            } />
            <Route path="/history" element={
              <HistoryView
                history={history}
                onClearHistory={handleClearAllHistory}
                onRemoveItem={handleRemoveHistoryItem}
                onPlayVideo={handlePlayFromHistory}
              />
            } />
            <Route path="*" element={<NotFoundView />} />
          </Routes>
        </div>
      </main>

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

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel="Yes, proceed"
        danger={true}
        onConfirm={confirmDialog.onConfirm}
        onCancel={confirmDialog.onCancel || (() => setConfirmDialog(d => ({ ...d, isOpen: false })))}
      />

      <ShareModal
        isOpen={!!shareVideo}
        onClose={() => setShareVideo(null)}
        video={shareVideo}
      />

      {previewImage && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-[9999] flex flex-col items-center justify-center animate-fade-in p-4 cursor-zoom-out select-none"
          onClick={() => setPreviewImage(null)}
        >
          <button
            type="button"
            onClick={() => setPreviewImage(null)}
            className="absolute top-6 right-6 text-white/70 hover:text-white hover:bg-white/10 rounded-full p-2.5 transition-all cursor-pointer"
            aria-label="Close preview"
          >
            <X size={24} />
          </button>
          <div
            className="max-w-4xl max-h-[85vh] flex flex-col items-center gap-4 animate-in fade-in zoom-in-95 duration-200 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={previewImage.url}
              alt={previewImage.title}
              className="max-w-full max-h-[75vh] object-contain rounded-2xl border border-white/10 shadow-2xl"
            />
            <p className="text-white/90 text-sm font-semibold text-center px-4 line-clamp-2 select-text max-w-2xl">{previewImage.title}</p>
          </div>
        </div>
      )}
    </div>
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
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ErrorBoundary>
  );
}
