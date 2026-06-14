import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Compass, Search, Filter, Play, Check, Plus, Share2, 
  Sparkles, Maximize2, Trash2, Heart, Award, User, Monitor
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DISCOVER_VIDEOS } from '../App';

export default function DiscoverView({ videos = [], onVideoSelect, onPreviewImage, onShareVideo, onImportVideo, currentUser }) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedCreator, setSelectedCreator] = useState('all');
  const [sortKey, setSortKey] = useState('date');
  const [toasts, setToasts] = useState([]);

  // Setup list of unique creators from discover videos
  const creators = React.useMemo(() => {
    const list = [{ uid: 'all', username: 'All Creators', avatar: '' }];
    const map = new Map();
    DISCOVER_VIDEOS.forEach(video => {
      if (video.uploader && !map.has(video.uploader.uid)) {
        map.set(video.uploader.uid, true);
        list.push({
          uid: video.uploader.uid,
          username: video.uploader.username,
          avatar: video.uploader.avatar
        });
      }
    });
    // Limit to "All Creators" + top 10 unique creators
    return [list[0], ...list.slice(1, 11)];
  }, []);

  // Filter categories
  const categories = ['All', 'Trending', 'Popular', 'Recent', 'Cinema', 'Lo-Fi', 'Animation', 'Nature', 'Tech', 'Tutorials'];

  // Handle toast notifications
  const triggerToast = (message) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  // Helper to check if a video is already in the user's library
  const isVideoInLibrary = (videoId) => {
    return videos.some(v => String(v.id) === String(videoId));
  };

  // Handle card click (to play)
  const handleCardClick = (video) => {
    onVideoSelect(video);
    navigate(`/player/${video.id}`);
  };

  // Handle importing video to library
  const handleImport = (e, video) => {
    e.stopPropagation();
    onImportVideo(video);
    triggerToast(`"${video.title}" imported to My Library!`);
  };



  // Filtering and sorting discover videos
  let filtered = [...DISCOVER_VIDEOS];

  // Apply search query
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(v => 
      v.title.toLowerCase().includes(query) || 
      (v.description && v.description.toLowerCase().includes(query)) ||
      (v.uploader && v.uploader.username.toLowerCase().includes(query))
    );
  }

  // Apply category filter
  if (selectedCategory !== 'All') {
    if (selectedCategory === 'Trending') {
      filtered = filtered.filter(v => v.trending);
    } else if (selectedCategory === 'Popular') {
      filtered = filtered.filter(v => (v.views && v.views > 30000));
    } else if (selectedCategory === 'Recent') {
      filtered = filtered.filter(v => ['discover_1', 'discover_2', 'discover_3'].includes(v.id));
    } else {
      filtered = filtered.filter(v => v.category === selectedCategory);
    }
  }

  // Apply creator filter
  if (selectedCreator !== 'all') {
    filtered = filtered.filter(v => v.uploader.uid === selectedCreator);
  }

  // Apply sorting
  filtered.sort((a, b) => {
    if (selectedCategory === 'Popular') {
      return (b.views || 0) - (a.views || 0);
    }
    if (selectedCategory === 'Trending') {
      return (b.views || 0) - (a.views || 0);
    }
    if (selectedCategory === 'Recent') {
      return new Date(b.addedDate) - new Date(a.addedDate);
    }

    if (sortKey === 'title') {
      return a.title.localeCompare(b.title);
    } else if (sortKey === 'size') {
      const getVal = (str) => {
        const num = parseFloat(str);
        if (str.includes('GB')) return num * 1024;
        return num || 0;
      };
      return getVal(b.size) - getVal(a.size);
    } else if (sortKey === 'duration') {
      const getVal = (str) => {
        if (str === 'Live') return 99999;
        const parts = str.split(':').map(Number);
        if (parts.length === 2) return parts[0] * 60 + parts[1];
        if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
        return 0;
      };
      return getVal(b.duration) - getVal(a.duration);
    } else {
      // Default: Date Added (Newest First)
      return new Date(b.addedDate) - new Date(a.addedDate);
    }
  });

  const getSortLabel = () => {
    if (sortKey === 'title') return 'Sort: A-Z';
    if (sortKey === 'size') return 'Sort: Size';
    if (sortKey === 'duration') return 'Sort: Length';
    return 'Sort: Newest';
  };

  const cycleSort = () => {
    if (sortKey === 'date') setSortKey('title');
    else if (sortKey === 'title') setSortKey('size');
    else if (sortKey === 'size') setSortKey('duration');
    else setSortKey('date');
  };

  return (
    <div className="animate-fade-in flex-1 flex flex-col relative pb-10">
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-8 select-none">
        <div className="w-10 h-10 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent glow-accent">
          <Compass size={22} className="animate-[pulse_3s_infinite]" />
        </div>
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-fg">Discover</h1>
          <p className="text-xs text-muted mt-0.5">Stream shared vaults or import videos to your private library.</p>
        </div>
      </div>



      {/* Smart Filters Toolbar */}
      <section className="mb-10 flex flex-col gap-6">
        {/* Search and Sort Row */}
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
          <div className="flex-1 bg-surface border border-custom-border px-4 py-1.5 rounded-2xl text-fg text-sm flex items-center gap-3 focus-within:border-accent transition-colors duration-200 shadow-glass">
            <Search size={18} className="text-muted shrink-0" />
            <input 
              type="text" 
              placeholder="Search by title or creator..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-none outline-none text-fg py-2 placeholder-white/30"
              aria-label="Search discover videos"
            />
          </div>
          
          <button 
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-surface border border-custom-border font-semibold text-xs text-fg hover:bg-surface-elevated hover:border-muted transition-all duration-200 select-none cursor-pointer shadow-glass shrink-0"
            onClick={cycleSort} 
            aria-label="Sort discover videos"
          >
            <Filter size={16} className="shrink-0" />
            <span>{getSortLabel()}</span>
          </button>
        </div>

        {/* Creators Carousel Horizontal Row */}
        <div className="flex flex-col gap-2">
          <div className="text-[10px] font-bold text-muted uppercase tracking-wider pl-1">Creators Directory</div>
          <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-none snap-x snap-mandatory select-none">
            {creators.map(creator => {
              const isSelected = selectedCreator === creator.uid;
              const count = creators.indexOf(creator) === 0 ? DISCOVER_VIDEOS.length : DISCOVER_VIDEOS.filter(v => v.uploader.uid === creator.uid).length;
              return (
                <button
                  key={creator.uid}
                  onClick={() => setSelectedCreator(creator.uid)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl border snap-start cursor-pointer transition-all duration-200 whitespace-nowrap text-left shrink-0 ${isSelected ? 'bg-accent/10 border-accent/50 text-accent glow-accent shadow-[0_4px_12px_var(--color-accent-muted)]' : 'bg-surface border-custom-border text-muted hover:border-muted hover:text-fg hover:bg-surface-elevated'}`}
                >
                  {creator.avatar ? (
                    <img src={creator.avatar} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className={`w-6 h-6 rounded-full bg-accent/25 flex items-center justify-center text-[10px] font-bold ${isSelected ? 'text-accent' : 'text-muted hover:text-fg'}`}>
                      All
                    </div>
                  )}
                  <div>
                    <div className="text-xs font-bold leading-tight">{creator.username}</div>
                    <div className="text-[9px] opacity-70 mt-0.5">{count} {count === 1 ? 'video' : 'videos'}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Category Pill Tabs */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none flex-nowrap py-1">
          {categories.map(cat => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-1.5 rounded-xl font-semibold text-xs transition-all duration-200 cursor-pointer shrink-0 whitespace-nowrap select-none border border-transparent ${isSelected ? 'bg-accent text-bg shadow-[0_4px_12px_var(--color-accent-muted)] font-bold' : 'bg-surface-elevated text-muted hover:text-fg hover:bg-surface-elevated/85 border-custom-border/50'}`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </section>

      {/* Discover Video Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          <AnimatePresence mode="popLayout" initial={false}>
            {filtered.map(video => {
              const inLibrary = isVideoInLibrary(video.id);
              return (
                <motion.div 
                  layout="position"
                  key={video.id} 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25, ease: 'easeOut', layout: { type: 'tween', duration: 0.3, ease: [0.4, 0, 0.2, 1] } }}
                  className="glass-card group cursor-pointer overflow-hidden rounded-2xl flex flex-col border border-custom-border relative"
                  onClick={() => handleCardClick(video)}
                >
                  {/* Card Thumbnail Display */}
                  <div className="aspect-video bg-surface-elevated relative overflow-hidden shrink-0 flex items-center justify-center">
                    <img src={video.thumbnail} alt="" className="absolute inset-0 w-full h-full object-cover blur-md opacity-35 scale-110 pointer-events-none select-none" />
                    <img src={video.thumbnail} alt={video.title} loading="lazy" className="relative z-10 max-w-full max-h-full object-contain opacity-90 transition-transform duration-500 ease-out group-hover:scale-105 group-hover:opacity-100" />
                    
                    {/* Share Button overlay */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onShareVideo(video);
                      }}
                      className="absolute top-2.5 left-2.5 z-20 w-8 h-8 rounded-lg bg-black/60 hover:bg-accent hover:text-bg border border-white/10 hover:border-accent hover:scale-105 active:scale-95 flex items-center justify-center transition-all cursor-pointer opacity-100 md:opacity-0 md:group-hover:opacity-100 duration-200 text-muted hover:text-white"
                      title="Share Video"
                    >
                      <Share2 size={14} />
                    </button>

                    {/* Import to Library Button overlay */}
                    <button
                      type="button"
                      disabled={inLibrary}
                      onClick={(e) => handleImport(e, video)}
                      className={`absolute top-2.5 left-12 z-20 w-8 h-8 rounded-lg border flex items-center justify-center transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 duration-200 cursor-pointer ${inLibrary ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 cursor-default scale-105' : 'bg-black/60 hover:bg-accent hover:text-bg border-white/10 hover:border-accent hover:scale-105 active:scale-95 text-muted hover:text-white'}`}
                      title={inLibrary ? "In Library" : "Import to Library"}
                    >
                      {inLibrary ? <Check size={14} /> : <Plus size={14} />}
                    </button>

                    {/* Fullscreen Preview button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPreviewImage({ url: video.thumbnail, title: video.title });
                      }}
                      className="absolute top-2.5 right-2.5 z-20 w-8 h-8 rounded-lg bg-black/60 hover:bg-black/90 text-white/80 hover:text-white border border-white/10 hover:border-white/20 hover:scale-105 active:scale-95 flex items-center justify-center transition-all cursor-pointer opacity-100 md:opacity-0 md:group-hover:opacity-100 duration-200"
                      title="Enlarge Thumbnail"
                    >
                      <Maximize2 size={14} />
                    </button>

                    {/* Metadata tags */}
                    <div className="absolute bottom-3 right-3 bg-black/75 backdrop-blur-sm px-2 py-1 rounded-md text-[10px] font-mono font-bold border border-white/10 text-fg z-20">{video.duration}</div>
                    
                    {/* Resolution badge */}
                    <div className="absolute bottom-3 left-3 bg-black/75 backdrop-blur-sm px-2 py-1 rounded-md text-[9px] font-mono border border-white/10 text-accent font-semibold z-20">{video.resolution}</div>

                    {/* Central Play overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="w-12 h-12 bg-accent rounded-full grid place-items-center text-bg scale-90 group-hover:scale-100 transition-transform duration-300 shadow-[0_4px_12px_var(--color-accent-muted)]">
                        <Play fill="currentColor" size={20} className="ml-0.5" />
                      </div>
                    </div>
                  </div>

                  {/* Card Description Panel */}
                  <div className="p-4 flex-1 flex flex-col gap-3.5 bg-surface/30">
                    <h3 className="font-semibold text-sm leading-snug line-clamp-2 text-fg group-hover:text-accent transition-colors duration-200">{video.title}</h3>
                    
                    {/* Uploader profile & file details */}
                    <div className="flex justify-between items-center text-[10px] mt-auto border-t border-custom-border/40 pt-3">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <img 
                          src={video.uploader.avatar} 
                          alt="" 
                          className="w-4 h-4 rounded-full object-cover border border-white/10" 
                        />
                        <span className="text-muted truncate font-medium max-w-[80px]">{video.uploader.username}</span>
                        <span className="px-1.5 py-0.5 rounded bg-accent/10 border border-accent/25 text-[8px] font-bold text-accent uppercase tracking-wider scale-90 origin-left shrink-0">{video.category || 'General'}</span>
                      </div>
                      
                      <div className="flex items-center gap-1 text-muted font-mono font-medium shrink-0">
                        {video.views > 0 && <span>{video.views >= 1000 ? `${(video.views/1000).toFixed(0)}K` : video.views} views •</span>}
                        <span>{video.size}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center py-20 border border-dashed border-custom-border rounded-3xl bg-surface/50 text-center gap-4 animate-fade-in select-none">
          <div className="w-16 h-16 rounded-full bg-accent/10 border border-accent/20 grid place-items-center text-accent">
            <Compass size={24} className="animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-bold text-fg mb-1">No matching videos</h3>
            <p className="text-xs text-muted max-w-xs leading-relaxed">
              We couldn't find any shared videos matching your search filters. Try selecting a different category or creator.
            </p>
          </div>
        </div>
      )}

      {/* Premium Toast System */}
      <div className="fixed bottom-24 right-6 md:bottom-8 md:right-8 z-[9999] flex flex-col gap-2.5 pointer-events-none max-w-sm w-full">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9, transition: { duration: 0.15 } }}
              className="glass p-4 rounded-2xl flex items-center gap-3 border border-emerald-500/20 text-emerald-400 shadow-glass pointer-events-auto w-full select-none"
            >
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 grid place-items-center shrink-0">
                <Check size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-fg leading-none">Import Successful</p>
                <p className="text-[10px] text-muted truncate mt-1 leading-snug">{toast.message}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
