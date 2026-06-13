import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Filter, Layers, Play } from 'lucide-react';

export default function LibraryView({ videos, onVideoSelect }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState('date');
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

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

  return (
    <div className="animate-fade-in">
      <header className="mb-10">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-fg mb-6 flex items-baseline gap-3 select-none">
          <span>My Library</span>
          <span className="text-xs md:text-sm font-medium text-muted font-mono">({allCount} {allCount === 1 ? 'video' : 'videos'})</span>
        </h1>
        
        <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 flex-wrap">
          {/* Tabs */}
          <div className="flex gap-1 bg-surface p-1 rounded-2xl border border-custom-border shrink-0 overflow-x-auto scrollbar-none flex-nowrap max-w-full">
            <button 
              className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all duration-200 cursor-pointer shrink-0 whitespace-nowrap flex items-center gap-2 ${activeTab === 'all' ? 'bg-accent text-bg shadow-[0_4px_12px_var(--color-accent-muted)]' : 'text-muted hover:text-fg'}`}
              onClick={() => setActiveTab('all')}
            >
              <span>All Videos</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold font-mono transition-colors ${activeTab === 'all' ? 'bg-black/10 text-bg' : 'bg-surface-elevated text-muted'}`}>
                {allCount}
              </span>
            </button>
            <button 
              className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all duration-200 cursor-pointer shrink-0 whitespace-nowrap flex items-center gap-2 ${activeTab === 'favorites' ? 'bg-accent text-bg shadow-[0_4px_12px_var(--color-accent-muted)]' : 'text-muted hover:text-fg'}`}
              onClick={() => setActiveTab('favorites')}
            >
              <span>Favorites</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold font-mono transition-colors ${activeTab === 'favorites' ? 'bg-black/10 text-bg' : 'bg-surface-elevated text-muted'}`}>
                {favoritesCount}
              </span>
            </button>
            <button 
              className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all duration-200 cursor-pointer shrink-0 whitespace-nowrap flex items-center gap-2 ${activeTab === 'recent' ? 'bg-accent text-bg shadow-[0_4px_12px_var(--color-accent-muted)]' : 'text-muted hover:text-fg'}`}
              onClick={() => setActiveTab('recent')}
            >
              <span>Recent</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold font-mono transition-colors ${activeTab === 'recent' ? 'bg-black/10 text-bg' : 'bg-surface-elevated text-muted'}`}>
                {recentCount}
              </span>
            </button>
          </div>

          {/* Search and Sort */}
          <div className="flex flex-col sm:flex-row gap-3 flex-1 lg:max-w-2xl">
            <div className="flex-1 bg-surface border border-custom-border px-4 py-1.5 rounded-2xl text-fg text-sm flex items-center gap-3 focus-within:border-accent transition-colors duration-200">
              <Search size={18} className="text-muted shrink-0" />
              <input 
                type="text" 
                placeholder="Search your library..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-none outline-none text-fg py-2 placeholder-white/30"
                aria-label="Search library"
              />
            </div>
            <button 
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-surface border border-custom-border font-semibold text-sm text-fg hover:bg-surface-elevated hover:border-muted transition-all duration-200 select-none cursor-pointer"
              onClick={cycleSort} 
              aria-label="Sort library"
            >
              <Filter size={18} className="shrink-0" />
              <span>{getSortLabel()}</span>
            </button>
          </div>
        </div>
      </header>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-8">
          {filtered.map(video => (
            <div 
              key={video.id} 
              className="glass-card group cursor-pointer overflow-hidden rounded-2xl flex flex-col border border-custom-border" 
              onClick={() => handleCardClick(video)}
            >
              <div className="aspect-video bg-surface-elevated relative overflow-hidden shrink-0">
                <img src={video.thumbnail} alt={video.title} loading="lazy" className="w-full h-full object-cover opacity-85 transition-transform duration-500 ease-out group-hover:scale-105 group-hover:opacity-100" />
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
                  <span>{video.relativeTime || 'Library'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 px-6 text-center border border-dashed border-custom-border rounded-3xl bg-white/[0.01]">
          <div className="w-16 h-16 bg-surface-elevated border border-custom-border rounded-full grid place-items-center mb-6 text-muted">
            <Layers size={28} />
          </div>
          <h2 className="font-bold text-xl mb-2 text-fg">No videos found</h2>
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
