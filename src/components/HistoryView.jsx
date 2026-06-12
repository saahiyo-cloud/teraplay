import React from 'react';
import { Trash2, Play, Calendar, Clock, Database, EyeOff } from 'lucide-react';

export default function HistoryView({ history, onClearHistory, onRemoveItem, onPlayVideo }) {
  
  const groupHistory = (items) => {
    const today = [];
    const yesterday = [];
    const earlier = [];

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);

    items.forEach(item => {
      const date = new Date(item.watchedAt);
      if (date >= startOfToday) {
        today.push(item);
      } else if (date >= startOfYesterday) {
        yesterday.push(item);
      } else {
        earlier.push(item);
      }
    });

    return { today, yesterday, earlier };
  };

  const formatWatchTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatWatchDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const { today, yesterday, earlier } = groupHistory(history);

  const renderHistoryList = (list, sectionTitle) => {
    if (list.length === 0) return null;
    return (
      <div className="mb-8 animate-fade-in">
        <h3 className="flex items-center gap-2 text-xs font-bold text-muted uppercase tracking-wider mb-4 select-none">
          <Calendar size={14} className="text-accent" />
          <span>{sectionTitle}</span>
        </h3>
        <div className="flex flex-col gap-3">
          {list.map(item => (
            <div 
              key={item.id} 
              className="glass-card p-3 md:p-4 rounded-xl border border-custom-border flex items-center gap-3.5 group"
            >
              {/* Thumbnail */}
              <div 
                className="w-20 md:w-28 aspect-video bg-surface-elevated rounded-lg overflow-hidden shrink-0 relative cursor-pointer select-none"
                onClick={() => onPlayVideo(item.videoId)}
              >
                <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-accent text-bg grid place-items-center shadow-soft">
                    <Play size={14} fill="currentColor" className="ml-0.5" />
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-white/10">
                  <div className="h-full bg-accent" style={{ width: `${item.progress}%` }}></div>
                </div>
              </div>

              {/* Meta details */}
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <h4 
                  onClick={() => onPlayVideo(item.videoId)}
                  className="font-semibold text-xs md:text-sm text-fg leading-snug line-clamp-2 hover:text-accent cursor-pointer transition-colors duration-100"
                >
                  {item.title}
                </h4>
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] md:text-xs text-muted font-medium">
                  <span className="flex items-center gap-1"><Clock size={11} /> {formatWatchTime(item.watchedAt)}</span>
                  {sectionTitle === 'Earlier' && <span className="opacity-60">• {formatWatchDate(item.watchedAt)}</span>}
                  <span className="opacity-60">• {item.size}</span>
                  <span className="font-mono text-accent">({item.progress}% watched)</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button 
                  onClick={() => onRemoveItem(item.id)} 
                  className="btn-icon text-muted hover:text-rose-400 cursor-pointer"
                  aria-label="Delete history log"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="animate-fade-in max-w-4xl">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-10">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-fg">Watch History</h1>
          <p className="text-muted text-sm mt-2">Monitor streaming logs and manage your chronological watch log.</p>
        </div>
        {history.length > 0 && (
          <button 
            onClick={onClearHistory}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-muted hover:text-fg hover:bg-surface-elevated text-sm transition-all duration-200 cursor-pointer"
          >
            <Trash2 size={16} />
            <span>Clear History</span>
          </button>
        )}
      </header>

      {history.length > 0 ? (
        <div className="flex flex-col">
          {renderHistoryList(today, 'Today')}
          {renderHistoryList(yesterday, 'Yesterday')}
          {renderHistoryList(earlier, 'Earlier')}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 px-6 text-center border border-dashed border-custom-border rounded-3xl bg-white/[0.01]">
          <div className="w-16 h-16 bg-surface-elevated border border-custom-border rounded-full grid place-items-center mb-6 text-muted">
            <EyeOff size={28} />
          </div>
          <h2 className="font-bold text-xl mb-2 text-fg">Your history is clean</h2>
          <p className="text-muted text-sm max-w-xs leading-relaxed mb-6">
            Videos played from your dashboard will automatically appear on this timeline.
          </p>
        </div>
      )}
    </div>
  );
}
