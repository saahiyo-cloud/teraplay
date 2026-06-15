import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link as LinkIcon, Clipboard, Zap, Play, X, User } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import VideoCard from './VideoCard';

export default function HomeView({ videos, userProfile, onVideoSelect, onFetch, onPreviewImage, onDeleteVideo, onShareVideo, currentUser, settings = { autoFetch: true }, onUpdateSettings }) {
  const [url, setUrl] = useState('');
  const [pasteFeedback, setPasteFeedback] = useState(false);
  const autoFetch = settings.autoFetch;
  const navigate = useNavigate();

  const isValidLink = (value) => {
    if (!value) return null;
    const val = value.trim().toLowerCase();
    if (!val.startsWith('http://') && !val.startsWith('https://')) {
      return false;
    }
    const teraboxDomains = [
      'terabox', 'dubox', '1024tera', 'teraboxapp', 'terashare', 
      'neotbx', 'freeterabox', 'tibianbox', 'momotbox', 'sharestb', 'mixtb',
      'teraboxshare'
    ];
    return teraboxDomains.some(domain => val.includes(domain));
  };

  useEffect(() => {
    if (autoFetch && url) {
      const valid = isValidLink(url);
      if (valid) {
        const timer = setTimeout(() => {
          onFetch(url.trim());
        }, 600); // 600ms debounce
        return () => clearTimeout(timer);
      }
    }
  }, [url, autoFetch, onFetch]);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text);
      setPasteFeedback(true);
      setTimeout(() => setPasteFeedback(false), 800);
    } catch (err) {
      console.error('Failed to read clipboard: ', err);
    }
  };

  const handleFetchSubmit = (e) => {
    e.preventDefault();
    if (url.trim()) {
      onFetch(url.trim());
    }
  };

  const handleCardClick = (video) => {
    onVideoSelect(video);
    navigate(`/player/${video.id}`);
  };

  const continueWatching = videos
    .filter(v => v.progress > 0 && v.progress < 100)
    .sort((a, b) => new Date(b.addedDate) - new Date(a.addedDate))
    .slice(0, 4);
  const recentlyAdded = [...videos].sort((a, b) => new Date(b.addedDate) - new Date(a.addedDate));

  return (
    <div className="animate-fade-in flex-1 flex flex-col">
      <header className="rounded-2xl md:rounded-3xl p-5 md:p-10 mb-8 md:mb-12 border border-custom-border bg-[radial-gradient(circle_at_100%_0%,var(--color-accent-muted),transparent_40%)] bg-surface shadow-glass relative overflow-hidden flex flex-col justify-center">
        <div className="flex items-center gap-3 md:gap-4 mb-1 md:mb-2">
          <div className="w-9 h-9 md:w-13 md:h-13 rounded-full overflow-hidden shrink-0 bg-surface-elevated hover:scale-105 transition-transform duration-200">
            {(userProfile?.avatar || currentUser?.photoURL) ? (
              <img src={userProfile?.avatar || currentUser?.photoURL} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted">
                <User size={22} />
              </div>
            )}
          </div>
          <h1 className="text-xl md:text-3xl font-extrabold text-fg tracking-tight">
            Welcome back, {userProfile?.username || currentUser?.displayName || 'Streamer'}! 👋
          </h1>
        </div>
        <p className="text-muted mb-3 md:mb-4 mt-4 md:mt-5 text-xs md:text-sm font-medium">
          Paste your TeraBox, Dubox, or Teraboxapp link below to stream instantly.
        </p>
        
        <form onSubmit={handleFetchSubmit} className="w-full">
          <div className="w-full max-w-2xl bg-surface-elevated/40 border border-custom-border/60 rounded-xl md:rounded-full flex flex-col md:flex-row items-stretch md:items-center p-2 md:p-2 md:pl-5 md:pr-2 gap-2 md:gap-3 shadow-glass transition-all duration-300 focus-within:border-accent/50 focus-within:bg-surface-elevated/70">
            <div className="flex items-center gap-1.5 md:gap-2 flex-1 min-w-0 bg-surface border border-custom-border md:bg-transparent md:border-none rounded-lg md:rounded-none px-2.5 py-1.5 md:p-0">
              <LinkIcon size={18} className="text-muted shrink-0" />
              <input 
                type="text" 
                placeholder="Paste your TeraBox link here..." 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="flex-1 min-w-0 bg-transparent border-none outline-none text-fg py-1.5 px-1 text-sm placeholder:text-muted-foreground/60"
                aria-label="TeraBox video link"
              />
              {url && (
                <button
                  type="button"
                  onClick={() => setUrl('')}
                  className="p-1.5 text-muted hover:text-fg hover:bg-surface-elevated rounded-full transition-all cursor-pointer shrink-0 mr-1"
                  title="Clear input"
                >
                  <X size={15} />
                </button>
              )}
              <button 
                type="button"
                className="flex items-center justify-center gap-1 px-2.5 py-1 bg-surface border border-custom-border hover:bg-surface-elevated rounded-md md:rounded-lg transition-all text-[11px] md:text-xs font-semibold text-fg cursor-pointer shrink-0 select-none"
                onClick={handlePaste}
                style={{
                  background: pasteFeedback ? 'var(--color-accent-muted)' : '',
                  borderColor: pasteFeedback ? 'var(--color-accent)' : ''
                }}
              >
                <Clipboard size={14} />
                <span>{pasteFeedback ? 'Copied!' : 'Paste'}</span>
              </button>
            </div>
            
            <button 
              type="submit" 
              className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-2.5 md:py-2.5 bg-accent text-bg rounded-lg md:rounded-full font-bold text-xs md:text-sm shadow-[0_4px_12px_var(--color-accent-muted)] hover:-translate-y-0.5 hover:shadow-[0_8px_20px_var(--color-accent-muted)] transition-all cursor-pointer shrink-0"
            >
              <Zap size={16} fill="currentColor" />
              <span>Fetch Video</span>
            </button>
          </div>

          {/* Validation Status Message */}
          {url && (
            <div className="flex items-center gap-2 mt-3 text-xs pl-3 animate-fade-in">
              {isValidLink(url) ? (
                <span className="text-emerald-400 flex items-center gap-1.5 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Valid TeraBox link detected {autoFetch && "— Fetching automatically..."}
                </span>
              ) : (
                <span className="text-amber-400/90 flex items-center gap-1.5 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  Please enter a valid TeraBox link.
                </span>
              )}
            </div>
          )}

          {/* Settings Toggle / Analyzing indicator */}
          <div className="flex flex-wrap items-center justify-between gap-4 mt-4 px-3 text-xs text-muted">
            <label className="flex items-center gap-2 cursor-pointer group select-none">
              <input 
                type="checkbox" 
                checked={autoFetch} 
                onChange={(e) => {
                  if (onUpdateSettings) {
                    onUpdateSettings({ autoFetch: e.target.checked });
                  }
                }}
                className="rounded border-custom-border bg-surface text-accent focus:ring-accent/50 w-3.5 h-3.5 cursor-pointer accent-accent"
              />
              <span className="group-hover:text-fg transition-colors">Auto-fetch valid links on paste</span>
            </label>
            
            {autoFetch && url && isValidLink(url) && (
              <div className="flex items-center gap-2 text-accent/80 font-medium">
                <span className="w-2 h-2 rounded-full bg-accent animate-ping"></span>
                <span>Analyzing URL...</span>
              </div>
            )}
          </div>
        </form>
      </header>

      {continueWatching.length > 0 && (
        <section className="mb-8 md:mb-12">
          <div className="flex justify-between items-center mb-5 md:mb-6">
            <h2 className="text-lg md:text-2xl font-bold tracking-tight text-fg">Continue Watching</h2>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-8">
            <AnimatePresence initial={false}>
              {continueWatching.map(video => (
                <VideoCard
                  key={video.id}
                  video={video}
                  variant="home"
                  onSelect={handleCardClick}
                  onDelete={onDeleteVideo}
                  onShare={onShareVideo}
                  onPreview={onPreviewImage}
                />
              ))}
            </AnimatePresence>
          </div>
        </section>
      )}

      <section className="mb-12 flex-1 flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-fg">Recently Added</h2>
        </div>

        {recentlyAdded.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 border border-dashed border-custom-border rounded-3xl bg-surface/50 text-center gap-4 animate-fade-in select-none">
            <div className="w-16 h-16 rounded-full bg-accent/10 border border-accent/20 grid place-items-center text-accent">
              <Play size={24} className="ml-0.5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-fg">No Videos Imported Yet</h3>
              <p className="text-xs text-muted max-w-sm mt-1">
                Paste a valid TeraBox share link above to fetch, transcode, and stream your media instantly.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-8">
            <AnimatePresence initial={false}>
              {recentlyAdded.map(video => (
                <VideoCard
                  key={video.id}
                  video={video}
                  variant="home"
                  onSelect={handleCardClick}
                  onDelete={onDeleteVideo}
                  onShare={onShareVideo}
                  onPreview={onPreviewImage}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </section>
    </div>
  );
}
