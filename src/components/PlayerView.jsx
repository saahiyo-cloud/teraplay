import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Hls from 'hls.js';
import { 
  ChevronLeft, Play, Pause, RotateCcw, Volume2, VolumeX, Maximize2, 
  Settings, Download, Heart, Share2, Copy, SkipBack, SkipForward,
  HelpCircle, Check 
} from 'lucide-react';

export default function PlayerView({ video, relatedVideos, onVideoSelect, onBack, onToggleFavorite, onStartDownload }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const navigate = useNavigate();
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [copiedFeedback, setCopiedFeedback] = useState(false);
  const [sharedFeedback, setSharedFeedback] = useState(false);
  
  // New features state
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [bufferingResolution, setBufferingResolution] = useState('');
  const [currentResolution, setCurrentResolution] = useState(video.resolution || '1080P Full HD');
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  
  const controlsTimeoutRef = useRef(null);

  // Sync resolution when active video changes
  useEffect(() => {
    setCurrentResolution(video.resolution || '1080P Full HD');
    setShowQualityMenu(false);
    setIsBuffering(false);
  }, [video.id]);

  // Keyboard Shortcuts Hook Listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore keys inside inputs
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
        return;
      }

      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault();
          handlePlayPause();
          break;
        case 'arrowright':
          e.preventDefault();
          skip(10);
          break;
        case 'arrowleft':
          e.preventDefault();
          skip(-10);
          break;
        case 'arrowup':
          e.preventDefault();
          const newVolUp = Math.min(1, volume + 0.1);
          setVolume(newVolUp);
          setIsMuted(false);
          if (videoRef.current) {
            videoRef.current.volume = newVolUp;
            videoRef.current.muted = false;
          }
          break;
        case 'arrowdown':
          e.preventDefault();
          const newVolDown = Math.max(0, volume - 0.1);
          setVolume(newVolDown);
          setIsMuted(newVolDown === 0);
          if (videoRef.current) {
            videoRef.current.volume = newVolDown;
            videoRef.current.muted = newVolDown === 0;
          }
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case '?':
        case '/':
          e.preventDefault();
          setShowShortcuts(prev => !prev);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, volume, isMuted, isFullscreen, currentResolution]);

  // Handle HLS stream loading or standard playback
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    let hls = null;
    setIsPlaying(false);

    if (video.videoUrl && (video.videoUrl.includes('.m3u8') || video.videoUrl.includes('/api/stream/manifest'))) {
      if (Hls.isSupported()) {
        hls = new Hls({
          maxMaxBufferLength: 30, // Keep buffer efficient for high speeds
          enableWorker: true,
          lowLatencyMode: false
        });
        hls.loadSource(video.videoUrl);
        hls.attachMedia(videoElement);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          videoElement.play()
            .then(() => setIsPlaying(true))
            .catch(err => console.log("Auto-play blocked: ", err));
        });
        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.warn("HLS fatal network error, trying to recover...", data);
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.warn("HLS fatal media error, recovering...", data);
                hls.recoverMediaError();
                break;
              default:
                console.error("HLS fatal unrecoverable error:", data);
                break;
            }
          }
        });
      } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
        // Native support (Safari / iOS)
        videoElement.src = video.videoUrl;
        videoElement.load();
        videoElement.play()
          .then(() => setIsPlaying(true))
          .catch(err => console.log("Native auto-play blocked: ", err));
      }
    } else {
      // Standard video streaming fallback
      videoElement.src = video.videoUrl;
      videoElement.load();
      videoElement.play()
        .then(() => setIsPlaying(true))
        .catch(err => console.log("Standard auto-play blocked: ", err));
    }

    setCurrentTime(0);

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [video.videoUrl, video.id]);

  const resetControlsTimer = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  useEffect(() => {
    resetControlsTimer();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isPlaying]);

  const handlePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
    resetControlsTimer();
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      const pct = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      video.progress = Math.round(pct);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleScrub = (e) => {
    if (!videoRef.current || !duration) return;
    const clickPercent = parseFloat(e.target.value);
    const newTime = (clickPercent / 100) * duration;
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    resetControlsTimer();
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
    }
    resetControlsTimer();
  };

  const toggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    if (videoRef.current) {
      videoRef.current.muted = nextMute;
      videoRef.current.volume = nextMute ? 0 : volume;
    }
    resetControlsTimer();
  };

  const cycleSpeed = () => {
    const rates = [1, 1.25, 1.5, 2];
    const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
    const nextRate = rates[nextIdx];
    setPlaybackRate(nextRate);
    if (videoRef.current) {
      videoRef.current.playbackRate = nextRate;
    }
    resetControlsTimer();
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(err => console.error("Fullscreen failed: ", err));
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
    resetControlsTimer();
  };

  const skip = (seconds) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(
        Math.max(0, videoRef.current.currentTime + seconds),
        duration
      );
      resetControlsTimer();
    }
  };

  const formatTime = (timeInSeconds) => {
    if (isNaN(timeInSeconds)) return '0:00';
    const hrs = Math.floor(timeInSeconds / 3600);
    const mins = Math.floor((timeInSeconds % 3600) / 60);
    const secs = Math.floor(timeInSeconds % 60);
    
    if (hrs > 0) {
      return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(video.url || window.location.href);
    setCopiedFeedback(true);
    setTimeout(() => setCopiedFeedback(false), 2000);
  };

  const handleShare = () => {
    setSharedFeedback(true);
    setTimeout(() => setSharedFeedback(false), 2000);
  };

  const handleRelatedClick = (relVideo) => {
    onVideoSelect(relVideo);
    navigate(`/player/${relVideo.id}`);
  };

  // Video Quality Switcher (Simulated Buffer loader)
  const handleQualityChange = (res) => {
    if (res === currentResolution) return;
    setIsBuffering(true);
    setBufferingResolution(res);
    setShowQualityMenu(false);
    
    const timeSnapshot = videoRef.current ? videoRef.current.currentTime : 0;
    const wasPlaying = isPlaying;
    
    if (videoRef.current) {
      videoRef.current.pause();
    }

    setTimeout(() => {
      setCurrentResolution(res);
      setIsBuffering(false);
      if (videoRef.current) {
        // Restore time and playback states
        videoRef.current.currentTime = timeSnapshot;
        if (wasPlaying) {
          videoRef.current.play()
            .then(() => setIsPlaying(true))
            .catch(e => console.log(e));
        }
      }
    }, 1200);
  };

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div 
      className="w-full grid grid-cols-1 lg:grid-cols-[1fr_400px] lg:overflow-hidden rounded-3xl border border-custom-border bg-surface shadow-glass relative h-auto lg:h-[calc(100vh-120px)]" 
      onMouseMove={resetControlsTimer}
    >
      {/* Floating Back Button */}
      <div className="absolute top-3 left-3 md:top-6 md:left-6 z-50">
        <button 
          onClick={onBack} 
          className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-black/50 backdrop-blur-md grid place-items-center text-white border border-white/10 hover:bg-black/80 hover:text-accent hover:-translate-x-1 transition-all cursor-pointer" 
          aria-label="Go back to home"
        >
          <ChevronLeft size={20} className="md:w-6 md:h-6" />
        </button>
      </div>

      {/* Video Viewport Column */}
      <section ref={containerRef} className="bg-black relative flex items-center justify-center overflow-hidden w-full aspect-video lg:aspect-auto lg:h-full select-none">
        <video 
          ref={videoRef}
          src={video.videoUrl}
          className="w-full h-full object-contain cursor-pointer opacity-100"
          onClick={handlePlayPause}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => setIsPlaying(false)}
        />

        {/* simulated quality buffer loader overlay */}
        {isBuffering && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm z-30 flex flex-col items-center justify-center gap-4 animate-fade-in text-center">
            <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-semibold tracking-wide text-fg">Optimizing buffer for {bufferingResolution}...</p>
          </div>
        )}

        {/* Keyboard shortcuts HUD help overlay map */}
        {showShortcuts && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-40 flex items-center justify-center p-6 animate-fade-in">
            <div className="glass p-6 md:p-8 rounded-2xl border border-custom-border max-w-sm w-full shadow-glass flex flex-col gap-5 relative text-fg">
              <button 
                onClick={() => setShowShortcuts(false)} 
                className="absolute top-4 right-4 text-muted hover:text-fg font-bold text-lg cursor-pointer" 
                aria-label="Close shortcuts map"
              >
                ✕
              </button>
              <h3 className="font-bold text-lg border-b border-custom-border/50 pb-3 flex items-center gap-2 text-accent select-none">
                Keyboard Shortcuts
              </h3>
              <div className="flex flex-col gap-3.5 font-medium text-xs md:text-sm">
                <div className="flex justify-between items-center"><span className="text-muted">Play / Pause</span><kbd className="bg-surface-elevated border border-custom-border px-2 py-0.5 rounded-md text-xs font-mono">Space</kbd></div>
                <div className="flex justify-between items-center"><span className="text-muted">Skip Forward 10s</span><kbd className="bg-surface-elevated border border-custom-border px-2 py-0.5 rounded-md text-xs font-mono">➡ Arrow</kbd></div>
                <div className="flex justify-between items-center"><span className="text-muted">Skip Backward 10s</span><kbd className="bg-surface-elevated border border-custom-border px-2 py-0.5 rounded-md text-xs font-mono">⬅ Arrow</kbd></div>
                <div className="flex justify-between items-center"><span className="text-muted">Volume Up / Down</span><kbd className="bg-surface-elevated border border-custom-border px-2 py-0.5 rounded-md text-xs font-mono">⬆ / ⬇ Arrows</kbd></div>
                <div className="flex justify-between items-center"><span className="text-muted">Toggle Mute</span><kbd className="bg-surface-elevated border border-custom-border px-2 py-0.5 rounded-md text-xs font-mono">M</kbd></div>
                <div className="flex justify-between items-center"><span className="text-muted">Toggle Fullscreen</span><kbd className="bg-surface-elevated border border-custom-border px-2 py-0.5 rounded-md text-xs font-mono">F</kbd></div>
                <div className="flex justify-between items-center"><span className="text-muted">Toggle Shortcuts Map</span><kbd className="bg-surface-elevated border border-custom-border px-2 py-0.5 rounded-md text-xs font-mono">?</kbd></div>
              </div>
            </div>
          </div>
        )}

        {/* Custom HUD Player Controls */}
        <div 
          className="absolute bottom-3 left-3 right-3 p-3 md:bottom-6 md:left-6 md:right-6 md:p-5 rounded-2xl flex flex-col gap-3 md:gap-4 bg-glass backdrop-blur-3xl border border-custom-border shadow-glass z-20"
          style={{ 
            opacity: showControls && !isBuffering ? 1 : 0, 
            pointerEvents: showControls && !isBuffering ? 'auto' : 'none',
            transition: 'opacity 0.3s ease'
          }}
        >
          {/* Timeline scrub */}
          <div className="relative w-full flex items-center">
            <input 
              type="range" 
              min="0" 
              max="100" 
              step="0.1"
              value={progressPercent}
              onChange={handleScrub}
              className="progress-slider w-full cursor-pointer accent-accent h-1.5 rounded-full outline-none appearance-none"
              style={{
                background: `linear-gradient(to right, var(--color-accent) ${progressPercent}%, oklch(100% 0 0 / 0.1) ${progressPercent}%)`
              }}
              aria-label="Playback timeline"
            />
          </div>

          <div className="flex justify-between items-center">
            <div className="flex items-center gap-6">
              <button onClick={() => skip(-10)} className="text-white hover:text-accent hover:scale-110 active:scale-95 transition-all cursor-pointer" aria-label="Rewind 10s">
                <RotateCcw size={20} />
              </button>
              <button onClick={handlePlayPause} className="text-white hover:text-accent hover:scale-110 active:scale-95 transition-all cursor-pointer" aria-label={isPlaying ? 'Pause' : 'Play'}>
                {isPlaying ? <Pause fill="currentColor" size={26} /> : <Play fill="currentColor" size={26} />}
              </button>
              <button onClick={() => skip(10)} className="text-white hover:text-accent hover:scale-110 active:scale-95 transition-all cursor-pointer" aria-label="Forward 10s">
                <SkipForward size={20} />
              </button>
              
              <div className="text-xs md:text-sm font-mono text-white/80">
                {formatTime(currentTime)} <span className="opacity-50">/</span> {formatTime(duration)}
              </div>
            </div>

            <div className="flex items-center gap-6 relative">
              {/* Volume sliders */}
              <div className="flex items-center gap-2">
                <button onClick={toggleMute} className="text-white hover:text-accent transition-all cursor-pointer" aria-label="Volume">
                  {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
                <input 
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-14 md:w-16 accent-accent cursor-pointer hidden md:block"
                  aria-label="Volume slider"
                />
              </div>

              {/* Resolution selection overlay selector */}
              <div className="relative">
                <button 
                  onClick={() => setShowQualityMenu(!showQualityMenu)} 
                  className="text-white hover:text-accent text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 select-none cursor-pointer"
                  aria-label="Quality selection"
                >
                  {currentResolution.split(' ')[0]}
                </button>
                {showQualityMenu && (
                  <div className="absolute bottom-9 right-0 bg-surface-elevated border border-custom-border rounded-xl p-1 shadow-glass z-30 flex flex-col w-36">
                    {['4K UHD', '1080P Full HD', '720P HD', '480P SD'].map(res => (
                      <button 
                        key={res} 
                        onClick={() => handleQualityChange(res)}
                        className={`px-3 py-2 text-left rounded-lg text-xs font-semibold hover:bg-white/5 cursor-pointer flex items-center justify-between ${currentResolution === res ? 'text-accent' : 'text-fg'}`}
                      >
                        <span>{res}</span>
                        {currentResolution === res && <Check size={12} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Speed rate */}
              <button onClick={cycleSpeed} className="text-white hover:text-accent font-mono text-xs font-semibold cursor-pointer">
                {playbackRate.toFixed(1)}x
              </button>

              {/* Help Keyboard map shortcuts panel */}
              <button 
                onClick={() => setShowShortcuts(!showShortcuts)} 
                className="text-white hover:text-accent hover:scale-110 active:scale-95 transition-all cursor-pointer hidden md:block" 
                aria-label="Keyboard shortcuts"
              >
                <HelpCircle size={20} />
              </button>

              {/* Fullscreen toggle */}
              <button onClick={toggleFullscreen} className="text-white hover:text-accent hover:scale-110 active:scale-95 transition-all cursor-pointer" aria-label="Fullscreen">
                <Maximize2 size={20} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Details Side Panel */}
      <aside className="p-5 md:p-8 lg:border-l border-t lg:border-t-0 border-custom-border bg-surface lg:overflow-y-auto flex flex-col gap-6 h-auto lg:h-full">
        <div>
          <h1 className="text-2xl font-bold leading-tight tracking-tight text-fg mb-4">{video.title}</h1>
          <div className="flex gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-muted bg-surface-elevated border border-custom-border rounded-lg px-2.5 py-1 tracking-wider uppercase">{video.resolution || '1080P'}</span>
            <span className="text-[11px] font-bold text-muted bg-surface-elevated border border-custom-border rounded-lg px-2.5 py-1 tracking-wider uppercase">{video.size}</span>
            <span className="text-[11px] font-bold text-muted bg-surface-elevated border border-custom-border rounded-lg px-2.5 py-1 tracking-wider uppercase">TeraBox link</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 shrink-0">
          <button 
            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-accent text-bg font-semibold text-xs shadow-[0_4px_12px_var(--color-accent-muted)] hover:shadow-[0_8px_20px_var(--color-accent-muted)] hover:-translate-y-0.5 transition-all cursor-pointer"
            onClick={() => onStartDownload(video)}
          >
            <Download size={16} />
            <span>Download</span>
          </button>
          
          <button 
            className={`flex items-center justify-center gap-2 p-3 rounded-xl border border-custom-border bg-surface-elevated font-semibold text-xs text-fg hover:bg-custom-border hover:-translate-y-0.5 transition-all cursor-pointer ${video.favorite ? 'border-accent text-accent' : ''}`}
            onClick={() => onToggleFavorite(video.id)}
          >
            <Heart size={16} fill={video.favorite ? "currentColor" : "none"} />
            <span>{video.favorite ? 'Favorited' : 'Favorite'}</span>
          </button>
          
          <button 
            className="flex items-center justify-center gap-2 p-3 rounded-xl border border-custom-border bg-surface-elevated font-semibold text-xs text-fg hover:bg-custom-border hover:-translate-y-0.5 transition-all cursor-pointer"
            onClick={handleShare}
          >
            <Share2 size={16} />
            <span>{sharedFeedback ? 'Shared!' : 'Share'}</span>
          </button>
          
          <button 
            className="flex items-center justify-center gap-2 p-3 rounded-xl border border-custom-border bg-surface-elevated font-semibold text-xs text-fg hover:bg-custom-border hover:-translate-y-0.5 transition-all cursor-pointer"
            onClick={handleCopyLink}
          >
            <Copy size={16} />
            <span>{copiedFeedback ? 'Copied!' : 'Copy Link'}</span>
          </button>
        </div>

        <p className="text-sm text-muted leading-relaxed font-normal">
          {video.description || 'No description available for this TeraBox link.'}
        </p>

        <div className="border-t border-custom-border pt-6">
          <div className="font-bold text-base text-fg mb-4">Up Next</div>
          
          <div className="flex flex-col gap-4">
            {relatedVideos.filter(v => v.id !== video.id).map(relVideo => (
              <div 
                key={relVideo.id} 
                className="flex gap-4 p-2 rounded-xl hover:bg-surface-elevated cursor-pointer group transition-colors duration-200" 
                onClick={() => handleRelatedClick(relVideo)}
              >
                <div className="w-24 aspect-video bg-surface-elevated border border-custom-border rounded-lg overflow-hidden shrink-0">
                  <img src={relVideo.thumbnail} alt={relVideo.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
                <div className="flex flex-col justify-center min-w-0">
                  <h4 className="font-semibold text-xs text-fg leading-snug line-clamp-2 group-hover:text-accent transition-colors duration-100">{relVideo.title}</h4>
                  <div className="text-[10px] text-muted font-mono mt-1">{relVideo.size} • {relVideo.duration}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
