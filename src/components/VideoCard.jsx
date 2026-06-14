import React, { useState } from 'react';
import { Play, Check, Plus, Share2, Maximize2, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function VideoCard({ 
  video, 
  variant = 'library', 
  inLibrary = false, 
  onSelect, 
  onDelete, 
  onShare, 
  onPreview, 
  onImport 
}) {
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleCardClick = () => {
    if (onSelect) onSelect(video);
  };

  const handleImportClick = (e) => {
    e.stopPropagation();
    if (onImport) onImport(e, video);
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    if (onDelete) onDelete(video.id);
  };

  const handleShareClick = (e) => {
    e.stopPropagation();
    if (onShare) onShare(video);
  };

  const handlePreviewClick = (e) => {
    e.stopPropagation();
    if (onPreview) onPreview({ url: video.thumbnail, title: video.title });
  };

  return (
    <motion.div 
      layout="position"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -6, scale: 1.018 }}
      transition={{ 
        duration: 0.25, 
        ease: 'easeOut', 
        layout: { type: 'tween', duration: 0.3, ease: [0.4, 0, 0.2, 1] },
        y: { type: 'spring', stiffness: 350, damping: 25 },
        scale: { type: 'spring', stiffness: 350, damping: 25 }
      }}
      className="glass-card group cursor-pointer overflow-hidden rounded-2xl flex flex-col border border-custom-border relative transition-[border-color,box-shadow] duration-300 hover:border-accent/45 hover:shadow-[0_12px_24px_rgba(0,0,0,0.55),0_0_20px_var(--color-accent-muted)]"
      onClick={handleCardClick}
    >
      {/* Card Thumbnail Display */}
      <div className="aspect-video bg-surface-elevated relative overflow-hidden shrink-0 flex items-center justify-center">
        {/* Shimmer Placeholder */}
        {!imageLoaded && (
          <div className="absolute inset-0 bg-white/5 animate-pulse flex items-center justify-center z-10">
            <div className="w-8 h-8 border-2 border-accent/25 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        <img 
          src={video.thumbnail} 
          alt="" 
          className="absolute inset-0 w-full h-full object-cover blur-md opacity-35 scale-110 pointer-events-none select-none" 
        />
        <img 
          src={video.thumbnail} 
          alt={video.title} 
          loading="lazy"
          onLoad={() => setImageLoaded(true)}
          className={`relative z-10 max-w-full max-h-full object-contain transition-all duration-500 ease-out group-hover:scale-105 ${imageLoaded ? 'opacity-90 group-hover:opacity-100' : 'opacity-0'}`} 
        />
        
        {/* Actions Overlay */}
        {variant === 'discover' ? (
          <>
            {/* Share Button overlay */}
            <button
              type="button"
              onClick={handleShareClick}
              className="absolute top-2.5 left-2.5 z-20 w-8 h-8 rounded-lg bg-black/60 hover:bg-accent hover:text-bg border border-white/10 hover:border-accent hover:scale-105 active:scale-95 flex items-center justify-center transition-all cursor-pointer opacity-100 md:opacity-0 md:group-hover:opacity-100 duration-200 text-muted hover:text-white"
              title="Share Video"
            >
              <Share2 size={14} />
            </button>

            {/* Import to Library Button overlay */}
            <button
              type="button"
              disabled={inLibrary}
              onClick={handleImportClick}
              className={`absolute top-2.5 left-12 z-20 w-8 h-8 rounded-lg border flex items-center justify-center transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 duration-200 cursor-pointer ${inLibrary ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 cursor-default scale-105' : 'bg-black/60 hover:bg-accent hover:text-bg border-white/10 hover:border-accent hover:scale-105 active:scale-95 text-muted hover:text-white'}`}
              title={inLibrary ? "In Library" : "Import to Library"}
            >
              {inLibrary ? <Check size={14} /> : <Plus size={14} />}
            </button>
          </>
        ) : (
          <>
            {/* Delete button */}
            <button
              type="button"
              onClick={handleDeleteClick}
              className="absolute top-2.5 left-2.5 z-20 w-8 h-8 rounded-lg bg-black/60 hover:bg-rose-500 hover:text-white border border-white/10 hover:border-rose-500 hover:scale-105 active:scale-95 flex items-center justify-center transition-all cursor-pointer opacity-100 md:opacity-0 md:group-hover:opacity-100 duration-200 text-muted hover:text-white"
              title="Delete Video"
            >
              <Trash2 size={14} />
            </button>

            {/* Share button */}
            <button
              type="button"
              onClick={handleShareClick}
              className="absolute top-2.5 left-12 z-20 w-8 h-8 rounded-lg bg-black/60 hover:bg-accent hover:text-bg border border-white/10 hover:border-accent hover:scale-105 active:scale-95 flex items-center justify-center transition-all cursor-pointer opacity-100 md:opacity-0 md:group-hover:opacity-100 duration-200 text-muted hover:text-white"
              title="Share Video"
            >
              <Share2 size={14} />
            </button>
          </>
        )}

        {/* Fullscreen Preview button */}
        <button
          type="button"
          onClick={handlePreviewClick}
          className="absolute top-2.5 right-2.5 z-20 w-8 h-8 rounded-lg bg-black/60 hover:bg-black/90 text-white/80 hover:text-white border border-white/10 hover:border-white/20 hover:scale-105 active:scale-95 flex items-center justify-center transition-all cursor-pointer opacity-100 md:opacity-0 md:group-hover:opacity-100 duration-200"
          title="Enlarge Thumbnail"
        >
          <Maximize2 size={14} />
        </button>

        {/* Metadata badges */}
        <div className="absolute bottom-3 right-3 bg-black/75 backdrop-blur-sm px-2 py-1 rounded-md text-[10px] font-mono font-bold border border-white/10 text-fg z-20">
          {video.duration}
        </div>
        
        {variant === 'discover' && video.resolution && (
          <div className="absolute bottom-3 left-3 bg-black/75 backdrop-blur-sm px-2 py-1 rounded-md text-[9px] font-mono border border-white/10 text-accent font-semibold z-20">
            {video.resolution}
          </div>
        )}

        {/* Central Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="w-12 h-12 bg-accent rounded-full grid place-items-center text-bg scale-90 group-hover:scale-105 transition-all duration-300 shadow-[0_4px_12px_var(--color-accent-muted)] group-hover:shadow-[0_0_25px_var(--color-accent)]">
            <Play fill="currentColor" size={20} className="ml-0.5 transition-transform group-hover:scale-110" />
          </div>
        </div>

        {/* Playback progress bar (Library and Home variants) */}
        {variant !== 'discover' && video.progress > 0 && (
          <div className="absolute bottom-0 left-0 w-full h-1 bg-white/10 z-20">
            <div className="h-full bg-accent shadow-[0_0_8px_var(--color-accent)]" style={{ width: `${video.progress}%` }}></div>
          </div>
        )}
      </div>

      {/* Card Description Panel */}
      <div className="p-3 md:p-5 flex-1 flex flex-col gap-2 md:gap-3.5 bg-surface/30 transition-transform duration-300 group-hover:translate-x-0.5">
        <h3 className="font-semibold text-xs md:text-sm leading-snug line-clamp-2 text-fg group-hover:text-accent transition-colors duration-200">
          {video.title}
        </h3>
        
        {variant === 'discover' ? (
          /* Discover Details Panel */
          <div className="flex justify-between items-center flex-wrap gap-y-1.5 text-[9px] md:text-[10px] mt-auto border-t border-custom-border/40 pt-2.5 md:pt-3">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              {video.uploader && (
                <>
                  <img 
                    src={video.uploader.avatar} 
                    alt="" 
                    className="w-4 h-4 rounded-full object-cover border border-white/10" 
                  />
                  <span className="text-muted truncate font-medium max-w-[80px]">{video.uploader.username}</span>
                </>
              )}
              <span className="px-1.5 py-0.5 rounded bg-accent/10 border border-accent/25 text-[8px] font-bold text-accent uppercase tracking-wider scale-90 origin-left shrink-0">
                {video.category || 'General'}
              </span>
            </div>
            
            <div className="flex items-center gap-1 text-muted font-mono font-medium shrink-0">
              {video.views > 0 && (
                <span>
                  {video.views >= 1000 ? `${(video.views/1000).toFixed(0)}K` : video.views} views •
                </span>
              )}
              <span>{video.size}</span>
            </div>
          </div>
        ) : variant === 'home' ? (
          /* Home View Panel (Continue Watching / Recently Added) */
          <div className="flex justify-between text-xs text-muted mt-auto font-medium">
            <span className="font-mono">{video.size}</span>
            <span>{video.timeLeft || video.relativeTime || 'In progress'}</span>
          </div>
        ) : (
          /* Library View Panel */
          <div className="flex justify-between items-center flex-wrap gap-y-1 text-xs text-muted mt-auto font-medium">
            <span className="font-mono">{video.size}</span>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="px-1.5 py-0.5 rounded bg-accent/10 border border-accent/25 text-[8px] font-bold text-accent uppercase tracking-wider">
                {video.category || 'General'}
              </span>
              <span>•</span>
              <span>{video.relativeTime || 'Library'}</span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function VideoCardSkeleton() {
  return (
    <div className="glass-card animate-pulse border border-custom-border rounded-2xl flex flex-col overflow-hidden">
      <div className="aspect-video bg-surface-elevated relative overflow-hidden shrink-0 flex items-center justify-center">
        <div className="absolute inset-0 bg-white/5"></div>
      </div>
      <div className="p-3 md:p-5 flex-1 flex flex-col gap-2 md:gap-3 bg-surface/30">
        <div className="h-4 bg-white/10 rounded w-5/6"></div>
        <div className="h-3 bg-white/5 rounded w-2/3 mt-2"></div>
        <div className="flex justify-between items-center mt-auto border-t border-custom-border/40 pt-3">
          <div className="h-3 bg-white/5 rounded w-1/4"></div>
          <div className="h-3 bg-white/5 rounded w-1/4"></div>
        </div>
      </div>
    </div>
  );
}
