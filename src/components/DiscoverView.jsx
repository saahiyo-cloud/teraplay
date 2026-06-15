import React, { useState, useEffect } from 'react';
import VideoCard from './VideoCard';
import { useNavigate } from 'react-router-dom';
import { 
  Compass, Search, Filter, Play, Check, Plus, Share2, 
  Sparkles, Maximize2, Trash2, Heart, Award, User, Monitor
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
export default function DiscoverView({ videos = [], discoverVideos = [], onVideoSelect, onPreviewImage, onShareVideo, onImportVideo, currentUser, dbCategories = [], topCreators = [] }) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedCreator, setSelectedCreator] = useState('all');
  const [sortKey, setSortKey] = useState('date');
  const [toasts, setToasts] = useState([]);

  const isVideoFile = (fileName) => {
    if (!fileName) return false;
    const ext = fileName.split('.').pop().toLowerCase();
    return ['mp4', 'mkv', 'webm', 'avi', 'mov', 'flv', '3gp', 'm4v', 'ts', 'm3u8'].includes(ext);
  };

  const activeDiscoverVideos = (discoverVideos || []).filter(v => isVideoFile(v.title || v.name));

  // Setup list of unique creators from discover videos
  const creators = React.useMemo(() => {
    const list = [{ uid: 'all', username: 'All Creators', avatar: '' }];
    topCreators.forEach(creator => {
      if (creator && creator.uid) {
        list.push({
          uid: creator.uid,
          username: creator.username,
          avatar: creator.avatar
        });
      }
    });
    return list;
  }, [topCreators]);

  // Filter categories: static dynamic filters + DB categories
  const categories = React.useMemo(() => {
    const base = ['All', 'Trending', 'Popular', 'Recent'];
    return [...base, ...dbCategories];
  }, [dbCategories]);

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
  let filtered = [...activeDiscoverVideos];

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
  if (selectedCategory !== 'All' && selectedCategory !== 'Trending' && selectedCategory !== 'Popular' && selectedCategory !== 'Recent') {
    filtered = filtered.filter(v => v.category === selectedCategory);
  }

  // Apply creator filter
  if (selectedCreator !== 'all') {
    filtered = filtered.filter(v => v && v.uploader && v.uploader.uid === selectedCreator);
  }

  // Apply sorting
  filtered.sort((a, b) => {
    if (selectedCategory === 'Popular') {
      return (b.views || 0) - (a.views || 0);
    }
    if (selectedCategory === 'Trending') {
      const playsB = typeof b.plays === 'number' ? b.plays : 0;
      const playsA = typeof a.plays === 'number' ? a.plays : 0;
      if (playsB !== playsA) return playsB - playsA;
      return (b.views || 0) - (a.views || 0);
    }
    if (selectedCategory === 'Recent') {
      return new Date(b.addedDate || 0) - new Date(a.addedDate || 0);
    }

    if (sortKey === 'title') {
      return (a.title || '').localeCompare(b.title || '');
    } else if (sortKey === 'size') {
      const getVal = (str) => {
        if (typeof str !== 'string') return 0;
        const num = parseFloat(str);
        if (str.includes('GB')) return num * 1024;
        return num || 0;
      };
      return getVal(b.size) - getVal(a.size);
    } else if (sortKey === 'duration') {
      const getVal = (str) => {
        if (typeof str !== 'string') return 0;
        if (str === 'Live') return 99999;
        const parts = str.split(':').map(Number);
        if (parts.length === 2) return parts[0] * 60 + parts[1];
        if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
        return 0;
      };
      return getVal(b.duration) - getVal(a.duration);
    } else {
      // Default: Date Added (Newest First)
      return new Date(b.addedDate || 0) - new Date(a.addedDate || 0);
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
      <div className="flex items-center gap-2 md:gap-3 mb-5 md:mb-8 select-none">
        <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl md:rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent glow-accent">
          <Compass className="animate-[pulse_3s_infinite] w-[18px] h-[18px] md:w-[22px] md:h-[22px]" />
        </div>
        <div>
          <h1 className="text-2xl md:text-4xl font-bold tracking-tight text-fg">Discover</h1>
          <p className="text-[10px] md:text-xs text-muted mt-0.5">Stream shared vaults or import videos to your private library.</p>
        </div>
      </div>



      {/* Smart Filters Toolbar */}
      <section className="mb-6 md:mb-10 flex flex-col gap-4 md:gap-6">
        {/* Search and Sort Row */}
        <div className="flex items-center gap-2 md:gap-4">
          <div className="flex-1 bg-surface border border-custom-border px-3 md:px-4 py-1 md:py-1.5 rounded-xl md:rounded-2xl text-fg text-sm flex items-center gap-2 md:gap-3 focus-within:border-accent transition-colors duration-200 shadow-glass">
            <Search className="text-muted shrink-0 w-[16px] h-[16px] md:w-[18px] md:h-[18px]" />
            <input 
              type="text" 
              placeholder="Search by title or creator..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-none outline-none text-fg py-1.5 md:py-2 placeholder:text-muted-foreground/60 text-xs md:text-sm"
              aria-label="Search discover videos"
            />
          </div>
          
          <button 
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 md:px-5 md:py-3 rounded-xl md:rounded-2xl bg-surface border border-custom-border font-semibold text-xs text-fg hover:bg-surface-elevated hover:border-muted transition-all duration-200 select-none cursor-pointer shadow-glass shrink-0"
            onClick={cycleSort} 
            aria-label="Sort discover videos"
          >
            <Filter className="shrink-0 w-[14px] h-[14px] md:w-[16px] md:h-[16px]" />
            <span className="hidden sm:inline">{getSortLabel()}</span>
            <span className="inline sm:hidden">{getSortLabel().replace('Sort: ', '')}</span>
          </button>
        </div>

        {/* Creators Carousel Horizontal Row */}
        <div className="flex flex-col gap-1.5 md:gap-2 mt-2.5 md:mt-4">
          <div className="text-[9px] md:text-[10px] font-bold text-muted uppercase tracking-wider pl-1">Creators Directory</div>
          <div className="flex gap-2 md:gap-3 overflow-x-auto pb-2 md:pb-3 scrollbar-none snap-x snap-mandatory select-none">
            {creators.map(creator => {
              const isSelected = selectedCreator === creator.uid;
              const count = creators.indexOf(creator) === 0 ? activeDiscoverVideos.length : activeDiscoverVideos.filter(v => v.uploader.uid === creator.uid).length;
              return (
                <button
                  key={creator.uid}
                  onClick={() => setSelectedCreator(creator.uid)}
                  className={`flex items-center gap-2 md:gap-3 px-3 py-2 md:px-4 md:py-2.5 rounded-xl md:rounded-2xl border snap-start cursor-pointer transition-all duration-200 whitespace-nowrap text-left shrink-0 ${isSelected ? 'bg-accent/10 border-accent/50 text-accent glow-accent shadow-[0_4px_12px_var(--color-accent-muted)]' : 'bg-surface border-custom-border text-muted hover:border-muted hover:text-fg hover:bg-surface-elevated'}`}
                >
                  {creator.avatar ? (
                    <img src={creator.avatar} alt="" className="w-5 h-5 md:w-6 md:h-6 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className={`w-5 h-5 md:w-6 md:h-6 rounded-full bg-accent/25 flex items-center justify-center text-[9px] md:text-[10px] font-bold ${isSelected ? 'text-accent' : 'text-muted hover:text-fg'}`}>
                      All
                    </div>
                  )}
                  <div>
                    <div className="text-[11px] md:text-xs font-bold leading-tight">{creator.username}</div>
                    <div className="text-[8px] md:text-[9px] opacity-70 mt-0.5">{count} {count === 1 ? 'video' : 'videos'}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Category Pill Tabs */}
        <div className="flex gap-1 md:gap-1.5 overflow-x-auto scrollbar-none flex-nowrap py-1">
          {categories.map(cat => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 md:px-4 md:py-1.5 rounded-lg md:rounded-xl font-semibold text-[11px] md:text-xs transition-all duration-200 cursor-pointer shrink-0 whitespace-nowrap select-none border border-transparent ${isSelected ? 'bg-accent text-bg shadow-[0_4px_12px_var(--color-accent-muted)] font-bold' : 'bg-surface-elevated text-muted hover:text-fg hover:bg-surface-elevated/85 border-custom-border/50'}`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </section>

      {/* Discover Video Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-8">
          <AnimatePresence mode="popLayout" initial={false}>
            {filtered.map(video => (
              <VideoCard
                key={video.id}
                video={video}
                variant="discover"
                inLibrary={isVideoInLibrary(video.id)}
                onSelect={handleCardClick}
                onShare={onShareVideo}
                onPreview={onPreviewImage}
                onImport={handleImport}
              />
            ))}
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
