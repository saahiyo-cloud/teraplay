import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Filter, Layers } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import VideoCard from './VideoCard';

export default function LibraryView({ videos, onVideoSelect, onPreviewImage, onDeleteVideo, onShareVideo }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState('date');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const categories = ['All', 'General', 'Cinema', 'Lo-Fi', 'Animation', 'Nature', 'Tech', 'Tutorials'];

  const activeTab = searchParams.get('tab') || 'all';
  const setActiveTab = (tab) => {
    setSearchParams({ tab });
  };

  let filtered = [...videos];
  if (activeTab === 'favorites') {
    filtered = filtered.filter(v => v.favorite);
  } else if (activeTab === 'recent') {
    filtered = filtered.filter(v => v.progress > 0);
  }

  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(v => 
      v.title.toLowerCase().includes(query) || 
      (v.description && v.description.toLowerCase().includes(query))
    );
  }

  const filteredBeforeCategory = [...filtered];

  if (selectedCategory !== 'All') {
    filtered = filtered.filter(v => (v.category || 'General') === selectedCategory);
  }

  filtered.sort((a, b) => {
    if (sortKey === 'title') {
      return a.title.localeCompare(b.title);
    } else if (sortKey === 'size') {
      const getVal = (str) => {
        const num = parseFloat(str);
        if (str.includes('GB')) return num * 1024;
        return num;
      };
      return getVal(b.size) - getVal(a.size);
    } else {
      return new Date(b.addedDate) - new Date(a.addedDate);
    }
  });

  const cycleSort = () => {
    if (sortKey === 'date') setSortKey('title');
    else if (sortKey === 'title') setSortKey('size');
    else setSortKey('date');
  };

  const getSortLabel = () => {
    if (sortKey === 'title') return 'Sort: A-Z';
    if (sortKey === 'size') return 'Sort: Size';
    return 'Sort: Date Added';
  };

  const handleCardClick = (video) => {
    onVideoSelect(video);
    navigate(`/player/${video.id}`);
  };

  const allCount = videos.length;
  const favoritesCount = videos.filter(v => v.favorite).length;
  const recentCount = videos.filter(v => v.progress > 0).length;

  const isVideoFile = (fileName) => {
    if (!fileName) return false;
    const ext = fileName.split('.').pop().toLowerCase();
    return ['mp4', 'mkv', 'webm', 'avi', 'mov', 'flv', '3gp', 'm4v', 'ts', 'm3u8'].includes(ext);
  };

  const libraryVideos = filtered.filter(v => isVideoFile(v.title || v.name));
  const libraryOtherFiles = filtered.filter(v => !isVideoFile(v.title || v.name));

  return (
    <div className="animate-fade-in flex-1 flex flex-col">
      <header className="mb-6 md:mb-10 flex flex-col gap-4 md:gap-6">
        <h1 className="text-2xl md:text-4xl font-bold tracking-tight text-fg mb-0.5 flex items-baseline gap-2 select-none">
          <span>My Library</span>
          <span className="text-xs md:text-sm font-medium text-muted font-mono">({allCount} {allCount === 1 ? 'file' : 'files'})</span>
        </h1>
        
        <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3 md:gap-4 flex-wrap">
          {/* Tabs */}
          <div className="flex gap-1 bg-surface p-1 rounded-xl md:rounded-2xl border border-custom-border shrink-0 overflow-x-auto scrollbar-none flex-nowrap max-w-full">
            <button 
              className={`px-3.5 py-1.5 md:px-4 md:py-2 rounded-lg md:rounded-xl font-semibold text-xs md:text-sm transition-all duration-200 cursor-pointer shrink-0 whitespace-nowrap flex items-center gap-2 ${activeTab === 'all' ? 'bg-accent text-bg shadow-[0_4px_12px_var(--color-accent-muted)]' : 'text-muted hover:text-fg'}`}
              onClick={() => setActiveTab('all')}
            >
              <span>All Videos</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold font-mono transition-colors ${activeTab === 'all' ? 'bg-black/10 text-bg' : 'bg-surface-elevated text-muted'}`}>
                {allCount}
              </span>
            </button>
            <button 
              className={`px-3.5 py-1.5 md:px-4 md:py-2 rounded-lg md:rounded-xl font-semibold text-xs md:text-sm transition-all duration-200 cursor-pointer shrink-0 whitespace-nowrap flex items-center gap-2 ${activeTab === 'favorites' ? 'bg-accent text-bg shadow-[0_4px_12px_var(--color-accent-muted)]' : 'text-muted hover:text-fg'}`}
              onClick={() => setActiveTab('favorites')}
            >
              <span>Favorites</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold font-mono transition-colors ${activeTab === 'favorites' ? 'bg-black/10 text-bg' : 'bg-surface-elevated text-muted'}`}>
                {favoritesCount}
              </span>
            </button>
            <button 
              className={`px-3.5 py-1.5 md:px-4 md:py-2 rounded-lg md:rounded-xl font-semibold text-xs md:text-sm transition-all duration-200 cursor-pointer shrink-0 whitespace-nowrap flex items-center gap-2 ${activeTab === 'recent' ? 'bg-accent text-bg shadow-[0_4px_12px_var(--color-accent-muted)]' : 'text-muted hover:text-fg'}`}
              onClick={() => setActiveTab('recent')}
            >
              <span>Recent</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold font-mono transition-colors ${activeTab === 'recent' ? 'bg-black/10 text-bg' : 'bg-surface-elevated text-muted'}`}>
                {recentCount}
              </span>
            </button>
          </div>

          {/* Search and Sort */}
          <div className="flex gap-2 md:gap-3 flex-1 lg:max-w-2xl mt-2 md:mt-0">
            <div className="flex-1 bg-surface border border-custom-border px-3 md:px-4 py-1 md:py-1.5 rounded-xl md:rounded-2xl text-fg text-sm flex items-center gap-2 md:gap-3 focus-within:border-accent transition-colors duration-200">
              <Search className="text-muted shrink-0 w-[16px] h-[16px] md:w-[18px] md:h-[18px]" />
              <input 
                type="text" 
                placeholder="Search your library..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-none outline-none text-fg py-1.5 md:py-2 placeholder-muted/50 text-xs md:text-sm"
                aria-label="Search library"
              />
            </div>
            <button 
              className="flex items-center justify-center gap-1.5 px-3 py-2 md:px-5 md:py-2.5 rounded-xl md:rounded-2xl bg-surface border border-custom-border font-semibold text-xs md:text-sm text-fg hover:bg-surface-elevated hover:border-muted transition-all duration-200 select-none cursor-pointer shrink-0"
              onClick={cycleSort} 
              aria-label="Sort library"
            >
              <Filter className="shrink-0 w-[14px] h-[14px] md:w-[18px] md:h-[18px]" />
              <span className="hidden sm:inline">{getSortLabel()}</span>
              <span className="inline sm:hidden">{getSortLabel().replace('Sort: ', '')}</span>
            </button>
          </div>
        </div>

        {/* Category Pill Tabs */}
        <div className="flex gap-1 md:gap-1.5 overflow-x-auto scrollbar-none flex-nowrap py-1 border-t border-custom-border/30 pt-3 md:pt-4">
          {categories.map(cat => {
            const isSelected = selectedCategory === cat;
            const count = cat === 'All' ? filteredBeforeCategory.length : filteredBeforeCategory.filter(v => (v.category || 'General') === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 md:px-4 md:py-1.5 rounded-lg md:rounded-xl font-semibold text-[11px] md:text-xs transition-all duration-200 cursor-pointer shrink-0 whitespace-nowrap select-none border border-transparent flex items-center gap-1.5 ${isSelected ? 'bg-accent text-bg shadow-[0_4px_12px_var(--color-accent-muted)] font-bold' : 'bg-surface border-custom-border text-muted hover:text-fg hover:bg-surface-elevated'}`}
              >
                <span>{cat}</span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold font-mono transition-colors ${isSelected ? 'bg-black/10 text-bg' : 'bg-surface-elevated text-muted'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </header>

      {libraryVideos.length > 0 || libraryOtherFiles.length > 0 ? (
        <div className="flex flex-col gap-10">
          {libraryVideos.length > 0 && (
            <section>
              <h2 className="text-sm md:text-base font-bold tracking-tight text-fg mb-4 flex items-center gap-2 select-none uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></span>
                <span>Videos</span>
                <span className="text-xs font-normal text-muted font-mono">({libraryVideos.length})</span>
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-8">
                <AnimatePresence initial={false}>
                  {libraryVideos.map(video => (
                    <VideoCard
                      key={video.id}
                      video={video}
                      variant="library"
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

          {libraryOtherFiles.length > 0 && (
            <section className={libraryVideos.length > 0 ? "border-t border-custom-border/40 pt-8" : ""}>
              <h2 className="text-sm md:text-base font-bold tracking-tight text-fg mb-4 flex items-center gap-2 select-none uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-muted"></span>
                <span>Images & Other Files</span>
                <span className="text-xs font-normal text-muted font-mono">({libraryOtherFiles.length})</span>
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-8">
                <AnimatePresence initial={false}>
                  {libraryOtherFiles.map(video => (
                    <VideoCard
                      key={video.id}
                      video={video}
                      variant="library"
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
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center py-24 px-6 text-center border border-dashed border-custom-border rounded-3xl bg-white/[0.01]">
          <div className="w-16 h-16 bg-surface-elevated border border-custom-border rounded-full grid place-items-center mb-6 text-muted">
            <Layers size={28} />
          </div>
          <h2 className="font-bold text-xl mb-2 text-fg">No items found</h2>
          <p className="text-muted text-sm max-w-xs leading-relaxed">
            {searchQuery 
              ? 'No matching files match your search query. Try another keyword.' 
              : activeTab === 'favorites' 
                ? 'Mark videos as favorites to see them here!' 
                : 'No playback history recorded yet.'
            }
          </p>
        </div>
      )}

    </div>
  );
}
