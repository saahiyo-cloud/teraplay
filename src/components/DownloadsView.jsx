import React from 'react';
import { 
  Trash2, Zap, Activity, Pause, Play, X, CheckCircle, 
  AlertCircle, Folder, RefreshCw, DownloadCloud, Database, TrendingUp, Clock 
} from 'lucide-react';

export default function DownloadsView({ 
  downloads, 
  onPauseDownload, 
  onResumeDownload, 
  onCancelDownload, 
  onClearHistory, 
  onRetryDownload,
  onPlayVideo 
}) {
  const activeTasks = downloads.filter(d => d.status === 'downloading' || d.status === 'paused');
  const completedTasks = downloads.filter(d => d.status === 'completed' || d.status === 'failed');

  const formatSize = (bytes) => {
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  };

  return (
    <div className="animate-fade-in">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-10">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-fg">Downloads</h1>
          <p className="text-muted text-sm mt-2">Manage your offline videos and active tasks.</p>
        </div>
        {completedTasks.length > 0 && (
          <button 
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-muted hover:text-fg hover:bg-surface-elevated text-sm transition-all duration-200 cursor-pointer"
            onClick={onClearHistory} 
            aria-label="Clear all download history"
          >
            <Trash2 size={16} />
            <span>Clear History</span>
          </button>
        )}
      </header>

      {/* Active Tasks Section */}
      <section className="mb-12">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">Active Tasks</h2>
          <span className="text-accent text-xs font-mono font-bold">{activeTasks.length} TASKS</span>
        </div>
        
        {activeTasks.length > 0 ? (
          <div className="flex flex-col gap-4">
            {activeTasks.map(task => (
              <div 
                key={task.id} 
                className={`glass-card p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-4 border border-custom-border rounded-2xl animate-fade-in ${task.status === 'downloading' ? 'border-accent/40' : ''}`}
              >
                {/* Icon & Title Row */}
                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                  <div className={`w-10 h-10 md:w-14 md:h-14 rounded-xl bg-surface-elevated border border-custom-border grid place-items-center text-accent shrink-0 ${task.status === 'downloading' ? 'glow-accent border-accent/20' : ''}`}>
                    {task.status === 'downloading' ? (
                      <Zap size={18} className="md:w-6 md:h-6" fill="currentColor" />
                    ) : (
                      <Activity size={18} className="md:w-6 md:h-6" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                    <div className="font-semibold text-sm md:text-base truncate text-fg leading-none">{task.title}</div>
                    <div className="flex flex-wrap gap-2 text-[10px] md:text-xs text-muted">
                      <span className="bg-surface-elevated border border-custom-border px-1.5 py-0.5 rounded font-mono">
                        {formatSize(task.loadedBytes)} / {formatSize(task.totalBytes)}
                      </span>
                      {task.status === 'downloading' && (
                        <>
                          <span className="bg-surface-elevated border border-custom-border px-1.5 py-0.5 rounded font-mono text-accent glow-text-accent">
                            {task.speed}
                          </span>
                          <span className="bg-surface-elevated border border-custom-border px-1.5 py-0.5 rounded">
                            {task.timeLeft}
                          </span>
                        </>
                      )}
                      {task.status === 'paused' && (
                        <span className="bg-surface-elevated border border-custom-border px-1.5 py-0.5 rounded text-muted">Paused</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="flex items-center gap-3 md:w-64 lg:w-80 shrink-0">
                  <div className="flex-1">
                    <div className="h-1.5 bg-custom-border rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-accent to-accent-muted rounded-full transition-all duration-500 ease-out" 
                        style={{ width: `${task.progress}%` }}
                      ></div>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-muted w-8 text-right shrink-0">{task.progress}%</span>
                </div>

                {/* Controls */}
                <div className="flex gap-2 justify-end shrink-0 border-t md:border-t-0 border-custom-border/50 pt-3 md:pt-0">
                  {task.status === 'downloading' ? (
                    <button 
                      onClick={() => onPauseDownload(task.id)} 
                      className="btn-icon w-9 h-9 rounded-xl bg-surface-elevated border border-custom-border hover:border-accent hover:text-accent grid place-items-center cursor-pointer transition-all shrink-0" 
                      aria-label="Pause download"
                    >
                      <Pause size={15} />
                    </button>
                  ) : (
                    <button 
                      onClick={() => onResumeDownload(task.id)} 
                      className="btn-icon w-9 h-9 rounded-xl bg-surface-elevated border border-custom-border hover:border-accent hover:text-accent grid place-items-center cursor-pointer transition-all shrink-0" 
                      aria-label="Resume download"
                    >
                      <Play size={15} fill="currentColor" className="ml-0.5" />
                    </button>
                  )}
                  <button 
                    onClick={() => onCancelDownload(task.id)} 
                    className="btn-icon w-9 h-9 rounded-xl bg-surface-elevated border border-custom-border hover:border-accent hover:text-accent grid place-items-center cursor-pointer transition-all shrink-0" 
                    aria-label="Cancel download"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-6 border border-dashed border-custom-border rounded-3xl bg-white/[0.01] text-center text-muted gap-4">
            <div className="w-12 h-12 bg-surface-elevated border border-custom-border rounded-full grid place-items-center">
              <DownloadCloud size={24} />
            </div>
            <p className="text-sm">No active downloads running</p>
          </div>
        )}
      </section>

      {/* Completed / History Section */}
      {completedTasks.length > 0 && (
        <section className="mb-12">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">Completed & History</h2>
            <span className="text-muted text-xs font-mono font-bold">{completedTasks.length} ITEMS</span>
          </div>
          <div className="flex flex-col gap-4">
            {completedTasks.map(task => (
              <div 
                key={task.id} 
                className="glass-card p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-4 border border-custom-border rounded-2xl animate-fade-in"
              >
                {/* Icon & Title Row */}
                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                  <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl bg-surface-elevated border border-custom-border grid place-items-center shrink-0">
                    {task.status === 'completed' ? (
                      <CheckCircle size={20} className="text-emerald-400 md:w-6 md:h-6" />
                    ) : (
                      <AlertCircle size={20} className="text-rose-400 md:w-6 md:h-6" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                    <div className="font-semibold text-sm md:text-base truncate text-fg leading-none">{task.title}</div>
                    <div className="flex items-center flex-wrap gap-3 text-[10px] md:text-xs text-muted">
                      <span className="font-mono">{formatSize(task.totalBytes)}</span>
                      {task.status === 'completed' ? (
                        <span className="text-emerald-400 font-bold glow-text-accent">Completed</span>
                      ) : (
                        <span className="text-rose-400 font-bold">Network Error</span>
                      )}
                      <span>{new Date(task.addedDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Control Buttons */}
                <div className="flex gap-2 justify-end shrink-0 border-t md:border-t-0 border-custom-border/50 pt-3 md:pt-0">
                  {task.status === 'completed' ? (
                    <>
                      <button 
                        onClick={() => onPlayVideo(task.title)} 
                        className="btn-icon w-9 h-9 rounded-xl bg-surface-elevated border border-custom-border hover:border-accent hover:text-accent grid place-items-center cursor-pointer transition-all shrink-0" 
                        aria-label="Play video"
                      >
                        <Play size={15} fill="currentColor" className="ml-0.5" />
                      </button>
                      <button className="btn-icon w-9 h-9 rounded-xl bg-surface-elevated border border-custom-border hover:border-accent hover:text-accent grid place-items-center cursor-pointer transition-all shrink-0" aria-label="Show in folder">
                        <Folder size={15} />
                      </button>
                    </>
                  ) : (
                    <button 
                      onClick={() => onRetryDownload(task.id)} 
                      className="btn-icon w-9 h-9 rounded-xl bg-surface-elevated border border-custom-border hover:border-accent hover:text-accent grid place-items-center cursor-pointer transition-all shrink-0" 
                      aria-label="Retry download"
                    >
                      <RefreshCw size={15} />
                    </button>
                  )}
                  <button 
                    onClick={() => onCancelDownload(task.id)} 
                    className="btn-icon w-9 h-9 rounded-xl bg-surface-elevated border border-custom-border hover:border-accent hover:text-accent grid place-items-center cursor-pointer transition-all shrink-0" 
                    aria-label="Delete log entry"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Loading Skeleton */}
      <section className="mt-12 opacity-45">
        <div className="text-sm font-semibold text-muted uppercase tracking-wider mb-5">Task Template View</div>
        <div className="flex flex-col gap-4">
          <div className="card p-5 grid grid-cols-[auto_1fr_auto] gap-5 items-center border border-custom-border border-dashed rounded-2xl">
            <div className="w-14 h-14 skeleton rounded-xl shrink-0"></div>
            <div className="flex flex-col gap-2.5">
              <div className="skeleton w-3/5 h-4"></div>
              <div className="skeleton w-2/5 h-3"></div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
