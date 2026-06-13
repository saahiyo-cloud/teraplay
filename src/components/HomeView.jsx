import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link as LinkIcon, Clipboard, Zap, Info, Play, X, Maximize2 } from 'lucide-react';

export default function HomeView({ videos, onVideoSelect, onFetch }) {
  const [url, setUrl] = useState('');
  const [pasteFeedback, setPasteFeedback] = useState(false);
  const [autoFetch, setAutoFetch] = useState(() => localStorage.getItem('teraplay_autofetch') !== 'false');
  const [previewImage, setPreviewImage] = useState(null);
  const navigate = useNavigate();

  const isValidLink = (value) => {
    if (!value) return null;
    const val = value.trim().toLowerCase();
    if (!val.startsWith('http://') && !val.startsWith('https://')) {
      return false;
    }
    const teraboxDomains = [
      'terabox', 'dubox', '1024tera', 'teraboxapp', 'terashare', 
      'neotbx', 'freeterabox', 'tibianbox', 'momotbox', 'sharestb', 'mixtb'
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
    .slice(0, 3);
  const recentlyAdded = [...videos].sort((a, b) => new Date(b.addedDate) - new Date(a.addedDate));

  return (
    <div className="animate-fade-in">
      <header className="rounded-3xl p-6 md:p-10 mb-12 border border-custom-border bg-[radial-gradient(circle_at_100%_0%,var(--color-accent-muted),transparent_40%)] bg-surface shadow-glass relative overflow-hidden flex flex-col justify-center">
        <p className="text-muted mb-6 text-sm font-medium">
          Paste your TeraBox, Dubox, or Teraboxapp link below to stream instantly.
        </p>
        
        <form onSubmit={handleFetchSubmit} className="w-full">
          <div className="w-full max-w-2xl bg-white/5 border border-white/10 rounded-2xl md:rounded-full flex flex-col md:flex-row items-stretch md:items-center p-2.5 md:p-2 md:pl-5 md:pr-2 gap-3 shadow-glass transition-all duration-300 focus-within:border-accent/50 focus-within:bg-white/10">
            <div className="flex items-center gap-2 flex-1 min-w-0 bg-white/5 border border-white/10 md:bg-transparent md:border-none rounded-xl md:rounded-none px-3 py-1.5 md:p-0">
              <LinkIcon size={18} className="text-muted shrink-0" />
              <input 
                type="text" 
                placeholder="Paste your TeraBox link here..." 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="flex-1 min-w-0 bg-transparent border-none outline-none text-fg py-1.5 px-1 text-sm placeholder-white/30"
                aria-label="TeraBox video link"
              />
              {url && (
                <button
                  type="button"
                  onClick={() => setUrl('')}
                  className="p-1.5 text-muted hover:text-fg hover:bg-white/10 rounded-full transition-all cursor-pointer shrink-0 mr-1"
                  title="Clear input"
                >
                  <X size={15} />
                </button>
              )}
              <button 
                type="button"
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 hover:bg-white/10 rounded-lg transition-all text-xs font-semibold text-fg cursor-pointer shrink-0 select-none"
                onClick={handlePaste}
                style={{
                  background: pasteFeedback ? 'oklch(65% 0.18 250 / 0.2)' : '',
                  borderColor: pasteFeedback ? 'var(--color-accent)' : ''
                }}
              >
                <Clipboard size={14} />
                <span>{pasteFeedback ? 'Copied!' : 'Paste'}</span>
              </button>
            </div>
            
            <button 
              type="submit" 
              className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 md:py-2.5 bg-accent text-bg rounded-xl md:rounded-full font-bold text-sm shadow-[0_4px_12px_var(--color-accent-muted)] hover:-translate-y-0.5 hover:shadow-[0_8px_20px_var(--color-accent-muted)] transition-all cursor-pointer shrink-0"
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
                  Please enter a valid TeraBox, Dubox, or Teraboxapp link (should start with http/https).
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
                  setAutoFetch(e.target.checked);
                  localStorage.setItem('teraplay_autofetch', e.target.checked.toString());
                }}
                className="rounded border-white/20 bg-white/5 text-accent focus:ring-accent/50 w-3.5 h-3.5 cursor-pointer accent-accent"
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
        <section className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-fg">Continue Watching</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {continueWatching.map(video => (
              <div 
                key={video.id} 
                className="glass-card group cursor-pointer overflow-hidden rounded-2xl flex flex-col border border-custom-border" 
                onClick={() => handleCardClick(video)}
              >
                <div className="aspect-video bg-surface-elevated relative overflow-hidden shrink-0 flex items-center justify-center">
                  <img src={video.thumbnail} alt="" className="absolute inset-0 w-full h-full object-cover blur-md opacity-35 scale-110 pointer-events-none select-none" />
                  <img src={video.thumbnail} alt={video.title} loading="lazy" className="relative z-10 max-w-full max-h-full object-contain opacity-90 transition-transform duration-500 ease-out group-hover:scale-105 group-hover:opacity-100" />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewImage({ url: video.thumbnail, title: video.title });
                    }}
                    className="absolute top-2.5 right-2.5 z-20 w-8 h-8 rounded-lg bg-black/60 hover:bg-black/90 text-white/80 hover:text-white border border-white/10 hover:border-white/20 hover:scale-105 active:scale-95 flex items-center justify-center transition-all cursor-pointer opacity-0 group-hover:opacity-100 duration-200"
                    title="Enlarge Thumbnail"
                  >
                    <Maximize2 size={14} />
                  </button>
                  <div className="absolute bottom-3 right-3 bg-black/75 backdrop-blur-sm px-2 py-1 rounded-md text-[11px] font-mono font-semibold border border-white/10 text-fg">{video.duration}</div>
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="w-12 h-12 bg-accent rounded-full grid place-items-center text-bg scale-90 group-hover:scale-100 transition-transform duration-300 shadow-[0_4px_12px_var(--color-accent-muted)]">
                      <Play fill="currentColor" size={20} className="ml-0.5" />
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-white/10">
                    <div className="h-full bg-accent shadow-[0_0_8px_var(--color-accent)]" style={{ width: `${video.progress}%` }}></div>
                  </div>
                </div>
                <div className="p-5 flex-1 flex flex-col gap-3">
                  <h3 className="font-semibold text-base leading-snug line-clamp-2 text-fg group-hover:text-accent transition-colors duration-200">{video.title}</h3>
                  <div className="flex justify-between text-xs text-muted mt-auto font-medium">
                    <span className="font-mono">{video.size}</span>
                    <span className="text-accent">{video.timeLeft || 'In progress'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mb-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-fg">Recently Added</h2>
        </div>

        {recentlyAdded.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 border border-dashed border-custom-border rounded-3xl bg-surface/50 text-center gap-4 animate-fade-in select-none">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {recentlyAdded.map(video => (
              <div 
                key={video.id} 
                className="glass-card group cursor-pointer overflow-hidden rounded-2xl flex flex-col border border-custom-border" 
                onClick={() => handleCardClick(video)}
              >
                <div className="aspect-video bg-surface-elevated relative overflow-hidden shrink-0 flex items-center justify-center">
                  <img src={video.thumbnail} alt="" className="absolute inset-0 w-full h-full object-cover blur-md opacity-35 scale-110 pointer-events-none select-none" />
                  <img src={video.thumbnail} alt={video.title} loading="lazy" className="relative z-10 max-w-full max-h-full object-contain opacity-90 transition-transform duration-500 ease-out group-hover:scale-105 group-hover:opacity-100" />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewImage({ url: video.thumbnail, title: video.title });
                    }}
                    className="absolute top-2.5 right-2.5 z-20 w-8 h-8 rounded-lg bg-black/60 hover:bg-black/90 text-white/80 hover:text-white border border-white/10 hover:border-white/20 hover:scale-105 active:scale-95 flex items-center justify-center transition-all cursor-pointer opacity-0 group-hover:opacity-100 duration-200"
                    title="Enlarge Thumbnail"
                  >
                    <Maximize2 size={14} />
                  </button>
                  <div className="absolute bottom-3 right-3 bg-black/75 backdrop-blur-sm px-2 py-1 rounded-md text-[11px] font-mono font-semibold border border-white/10 text-fg">{video.duration}</div>
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="w-12 h-12 bg-accent rounded-full grid place-items-center text-bg scale-90 group-hover:scale-100 transition-transform duration-300 shadow-[0_4px_12px_var(--color-accent-muted)]">
                      <Play fill="currentColor" size={20} className="ml-0.5" />
                    </div>
                  </div>
                  {video.progress > 0 && (
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-white/10">
                      <div className="h-full bg-accent shadow-[0_0_8px_var(--color-accent)]" style={{ width: `${video.progress}%` }}></div>
                    </div>
                  )}
                </div>
                <div className="p-5 flex-1 flex flex-col gap-3">
                  <h3 className="font-semibold text-base leading-snug line-clamp-2 text-fg group-hover:text-accent transition-colors duration-200">{video.title}</h3>
                  <div className="flex justify-between text-xs text-muted mt-auto font-medium">
                    <span className="font-mono">{video.size}</span>
                    <span>{video.relativeTime}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Fullscreen Thumbnail Preview Modal */}
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
