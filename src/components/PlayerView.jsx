import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Hls from 'hls.js';
import { 
  ChevronLeft, Play, Pause, RotateCcw, Volume2, VolumeX, Maximize2, 
  Settings, Download, Heart, Share2, Copy, SkipBack, SkipForward,
  HelpCircle, Check, AlertCircle 
} from 'lucide-react';
import { API_BASE, API_KEY } from '../config';

export default function PlayerView({ video, relatedVideos, onVideoSelect, onBack, onToggleFavorite, onStartDownload, onUpdateVideo }) {
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
  const [isCheckingHls, setIsCheckingHls] = useState(false);
  const [hlsCheckMessage, setHlsCheckMessage] = useState('');
  
  // New features state
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [bufferingResolution, setBufferingResolution] = useState('');
  const [currentResolution, setCurrentResolution] = useState(video.resolution || 'Auto');
  const [activeResolution, setActiveResolution] = useState('');
  const [clickAction, setClickAction] = useState(null); // 'play' or 'pause'
  const [ping, setPing] = useState(null);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [isUsingFallback, setIsUsingFallback] = useState(false);
  const [qualities, setQualities] = useState([]);
  const [videoError, setVideoError] = useState(null);
  
  const controlsTimeoutRef = useRef(null);
  const actionTimeoutRef = useRef(null);
  const hlsRef = useRef(null);

  // Refs for keyboard handler — always point to the latest stable callback.
  // The keyboard listener is registered once (empty deps) and calls through
  // these refs, so it never suffers from stale closures over isPlaying,
  // duration, or isFullscreen.
  const handlePlayPauseRef = useRef(null);
  const skipRef = useRef(null);
  const toggleFullscreenRef = useRef(null);

  // Sync resolution when active video changes
  useEffect(() => {
    setCurrentResolution(video.resolution || 'Auto');
    setQualities([]);
    setShowQualityMenu(false);
    setIsBuffering(false);
    setIsUsingFallback(false);
    setIsCheckingHls(false);
    setHlsCheckMessage('');
    setIsInitialLoading(true);
    setActiveResolution('');
    setVideoError(null);
  }, [video.id]);

  const checkHlsStatus = async (isBackground = false) => {
    if (!video.originalUrl) return;
    
    if (!isBackground) {
      setIsCheckingHls(true);
      setHlsCheckMessage("Checking stream status...");
    }
    
    try {
      const manifestUrl = `${API_BASE}/api/stream/manifest?url=${encodeURIComponent(video.originalUrl)}&index=${video.fileIndex || 0}&key=${API_KEY}`;
      const res = await fetch(manifestUrl);
      if (res.status === 200) {
        const text = await res.text();
        if (text.includes("#EXTM3U")) {
          // HLS is ready!
          if (!isBackground) {
            setHlsCheckMessage("Stream ready! Switching to HLS...");
          }
          
          const updated = {
            ...video,
            streamReady: true,
            videoUrl: manifestUrl
          };
          if (onUpdateVideo) {
            onUpdateVideo(updated);
          }
          setIsUsingFallback(false);
          
          if (!isBackground) {
            setTimeout(() => {
              setIsCheckingHls(false);
              setHlsCheckMessage("");
            }, 1500);
          }
          return true;
        }
      }
      if (!isBackground) {
        setHlsCheckMessage("HLS stream is still transcoding. Playing direct link...");
      }
    } catch (e) {
      console.error("Failed to check HLS status:", e);
      if (!isBackground) {
        setHlsCheckMessage("Connection check failed.");
      }
    }
    
    if (!isBackground) {
      setTimeout(() => {
        setIsCheckingHls(false);
      }, 3000);
    }
    return false;
  };

  // Background check for HLS transcoding completion
  useEffect(() => {
    if (!video.originalUrl) return;
    
    // Check if it's either in fallback state OR was imported as direct link originally
    const needsCheck = isUsingFallback || !video.streamReady;
    if (!needsCheck) return;
    
    let active = true;
    
    // Run background check on mount or ID change immediately
    checkHlsStatus(true);
    
    const interval = setInterval(async () => {
      if (!active) return;
      const ready = await checkHlsStatus(true);
      if (ready) {
        clearInterval(interval);
      }
    }, 15000); // Check every 15 seconds
    
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [isUsingFallback, video.id, video.originalUrl, video.streamReady]);

  // Measure latency (ping) to the API gateway in the background
  useEffect(() => {
    let active = true;
    const measurePing = async () => {
      const start = performance.now();
      try {
        await fetch(`${API_BASE}/`, { method: 'HEAD', cache: 'no-store' });
        const end = performance.now();
        if (active) {
          setPing(Math.round(end - start));
        }
      } catch (e) {
        try {
          await fetch(`${API_BASE}/`, { cache: 'no-store' });
          const end = performance.now();
          if (active) {
            setPing(Math.round(end - start));
          }
        } catch (err) {
          if (active) setPing(-1); // server is offline or unreachable
        }
      }
    };

    measurePing();
    const interval = setInterval(measurePing, 30000); // Check latency every 30s

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // Keep handler refs in sync with latest functions. Runs every render but
  // no-op if nothing changed (ref assignment is cheap).
  useEffect(() => {
    handlePlayPauseRef.current = handlePlayPause;
    skipRef.current = skip;
    toggleFullscreenRef.current = toggleFullscreen;
  });

  // Keyboard Shortcuts — registered once, calls through refs so it always
  // uses the latest handlePlayPause / skip / toggleFullscreen without
  // re-registering the listener on every state change.
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore keys inside inputs
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
        return;
      }

      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault();
          handlePlayPauseRef.current?.();
          break;
        case 'arrowright':
          e.preventDefault();
          skipRef.current?.(10);
          break;
        case 'arrowleft':
          e.preventDefault();
          skipRef.current?.(-10);
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreenRef.current?.();
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
  }, []); // Empty deps — register once, calls go through refs

  // Handle HLS stream loading or standard playback
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    let hls = null;
    setIsPlaying(false);
    setIsInitialLoading(true);

    if (isUsingFallback) {
      // Standard video streaming fallback using direct download link
      videoElement.src = video.downloadUrl || video.videoUrl;
      videoElement.load();
      videoElement.play()
        .then(() => setIsPlaying(true))
        .catch(err => console.log("Fallback stream play blocked: ", err));
    } else if (video.videoUrl && (video.videoUrl.includes('.m3u8') || video.videoUrl.includes('/api/stream/manifest'))) {
      if (Hls.isSupported()) {
        hls = new Hls({
          maxMaxBufferLength: 30, // Keep buffer efficient for high speeds
          enableWorker: true,
          lowLatencyMode: false
        });
        hls.loadSource(video.videoUrl);
        hls.attachMedia(videoElement);
        hlsRef.current = hls;

        hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
          const levels = hls.levels.map((level, index) => {
            const name = level.name || (level.height ? `${level.height}p` : `Level ${index}`);
            return { id: index, name };
          });
          setQualities([{ id: -1, name: "Auto" }, ...levels]);
          setCurrentResolution("Auto");
          
          const initialLevel = hls.levels[hls.currentLevel];
          if (initialLevel) {
            setActiveResolution(initialLevel.name || (initialLevel.height ? `${initialLevel.height}p` : ''));
          }
          
          videoElement.play()
            .then(() => setIsPlaying(true))
            .catch(err => console.log("Auto-play blocked: ", err));
        });

        hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
          const currentLevel = hls.levels[data.level];
          if (currentLevel) {
            const name = currentLevel.name || (currentLevel.height ? `${currentLevel.height}p` : '');
            setActiveResolution(name);
            if (hls.autoLevelEnabled) {
              setBufferingResolution(name);
            }
          }
        });
        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.warn("HLS fatal network error, trying to recover...", data);
                if (data.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR) {
                  console.warn("Manifest load error (possibly transcoding 202). Falling back to direct stream...");
                  setIsUsingFallback(true);
                } else {
                  hls.startLoad();
                }
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.warn("HLS fatal media error, recovering...", data);
                hls.recoverMediaError();
                break;
              default:
                console.error("HLS fatal unrecoverable error:", data);
                setIsUsingFallback(true);
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
        hlsRef.current = null;
      }
    };
  }, [video.videoUrl, video.id, isUsingFallback]);

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
      if (actionTimeoutRef.current) clearTimeout(actionTimeoutRef.current);
    };
  }, [isPlaying]);

  const handlePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
      triggerClickAction('pause');
    } else {
      videoRef.current.play();
      setIsPlaying(true);
      triggerClickAction('play');
    }
    resetControlsTimer();
  };

  const triggerClickAction = (action) => {
    setClickAction(action);
    if (actionTimeoutRef.current) clearTimeout(actionTimeoutRef.current);
    actionTimeoutRef.current = setTimeout(() => {
      setClickAction(null);
    }, 500);
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
      const dur = videoRef.current.duration;
      setDuration(dur);
      if (!hlsRef.current && videoRef.current.videoHeight) {
        setActiveResolution(`${videoRef.current.videoHeight}p`);
      }
      if (dur && onUpdateVideo) {
        const formatted = formatTime(dur);
        if (video.duration !== formatted) {
          onUpdateVideo({
            ...video,
            duration: formatted
          });
        }
      }
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

  // Video Quality Switcher (Leverages HLS seamless switching or brief fallback simulation)
  const handleQualityChange = (quality) => {
    const qName = typeof quality === 'string' ? quality : quality.name;
    if (qName === currentResolution) return;
    
    setBufferingResolution(qName);
    setShowQualityMenu(false);
    
    if (hlsRef.current && typeof quality === 'object' && quality.id !== undefined) {
      hlsRef.current.currentLevel = quality.id;
      setCurrentResolution(qName);
    } else {
      // Non-HLS or direct stream fallback path: simulate quality switch briefly
      setIsBuffering(true);
      const timeSnapshot = videoRef.current ? videoRef.current.currentTime : 0;
      const wasPlaying = isPlaying;
      
      if (videoRef.current) {
        videoRef.current.pause();
      }

      setTimeout(() => {
        setCurrentResolution(qName);
        setIsBuffering(false);
        
        if (videoRef.current) {
          videoRef.current.currentTime = timeSnapshot;
          if (wasPlaying) {
            videoRef.current.play()
               .then(() => setIsPlaying(true))
               .catch(e => console.log(e));
          }
        }
      }, 500);
    }
  };

  const handleWaiting = () => {
    setIsBuffering(true);
    setBufferingResolution(''); // Clear quality-specific text for standard network buffering
  };

  const handlePlaying = () => {
    setIsBuffering(false);
  };

  const handleLoadedData = () => {
    setIsInitialLoading(false);
    if (!hlsRef.current && videoRef.current && videoRef.current.videoHeight) {
      setActiveResolution(`${videoRef.current.videoHeight}p`);
    }
  };

  const handleVideoError = (e) => {
    const videoElement = videoRef.current;
    if (!videoElement) return;
    
    console.error("Video element error:", videoElement.error);
    
    let errorMsg = "Failed to load video stream.";
    if (videoElement.error) {
      switch (videoElement.error.code) {
        case 1: // MEDIA_ERR_ABORTED
          errorMsg = "Playback aborted by user.";
          break;
        case 2: // MEDIA_ERR_NETWORK
          errorMsg = "Network error while loading video. The proxy server may be unreachable.";
          break;
        case 3: // MEDIA_ERR_DECODE
          errorMsg = "Video playback aborted due to a corruption problem or unsupported format.";
          break;
        case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
          errorMsg = "The video format is not supported, or the proxy server returned an error (e.g. invalid cookie/session).";
          break;
        default:
          break;
      }
    }
    
    if (video.videoUrl && video.downloadUrl && video.videoUrl !== video.downloadUrl && !isUsingFallback) {
      console.warn("Video play error. Switching to direct download link stream...");
      setIsUsingFallback(true);
    } else {
      setVideoError(errorMsg);
      setIsBuffering(false);
      setIsInitialLoading(false);
    }
  };

  const isHlsActive = !isUsingFallback && video.videoUrl && (video.videoUrl.includes('.m3u8') || video.videoUrl.includes('/api/stream/manifest'));
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
          onError={handleVideoError}
          onWaiting={handleWaiting}
          onPlaying={handlePlaying}
          onSeeking={handleWaiting}
          onSeeked={handlePlaying}
          onCanPlay={handlePlaying}
          onLoadedData={handleLoadedData}
        />

        {/* Play/Pause HUD Animation Indicator */}
        {clickAction && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none select-none">
            <div className="w-20 h-20 rounded-full bg-black/55 backdrop-blur-md border border-white/10 flex items-center justify-center text-white animate-hud-ping">
              {clickAction === 'play' ? <Play fill="currentColor" size={32} className="ml-1" /> : <Pause fill="currentColor" size={32} />}
            </div>
          </div>
        )}

        {/* Initial loading screen with thumbnail cover and center spinner */}
        {isInitialLoading && video.thumbnail && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black animate-fade-in">
            <img 
              src={video.thumbnail} 
              alt={video.title} 
              className="w-full h-full object-contain pointer-events-none" 
            />
            <div className="absolute inset-0 bg-black/10 pointer-events-none"></div>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-14 h-14 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
            </div>
          </div>
        )}

        {/* buffering loader overlay */}
        {isBuffering && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm z-30 flex flex-col items-center justify-center gap-4 animate-fade-in text-center">
            <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-semibold tracking-wide text-fg">
              {bufferingResolution ? `Optimizing buffer for ${bufferingResolution}...` : 'Buffering stream...'}
            </p>
          </div>
        )}

        {/* Video Load Error Overlay */}
        {videoError && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-6 text-center gap-4 animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 grid place-items-center text-rose-400 select-none">
              <AlertCircle size={24} />
            </div>
            <div className="select-none">
              <h4 className="font-bold text-fg mb-1 text-sm md:text-base">Stream Loading Failed</h4>
              <p className="text-xs text-muted max-w-xs leading-relaxed">{videoError}</p>
            </div>
            {video.originalUrl && (
              <button 
                onClick={() => {
                  setVideoError(null);
                  setIsInitialLoading(true);
                  if (videoRef.current) {
                    videoRef.current.load();
                  }
                }}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/10 text-white font-semibold rounded-xl text-xs transition-all cursor-pointer select-none"
              >
                Retry Playback
              </button>
            )}
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
              {/* Ping latency status badge */}
              {ping !== null && (
                <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold select-none cursor-help" title="Latency to stream bridge API server">
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    ping === -1 ? 'bg-rose-500 animate-pulse' :
                    ping < 100 ? 'bg-emerald-400' :
                    ping < 220 ? 'bg-amber-400' : 'bg-rose-400'
                  }`}></span>
                  <span className="text-white/60">
                    {ping === -1 ? 'Offline' : `${ping}ms`}
                  </span>
                </div>
              )}

              {/* Resolution selection overlay selector */}
              <div className="relative">
                {isHlsActive ? (
                  <>
                    <button 
                      onClick={() => setShowQualityMenu(!showQualityMenu)} 
                      className="text-white hover:text-accent text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 select-none cursor-pointer"
                      aria-label="Quality selection"
                    >
                      {currentResolution === 'Auto' 
                        ? `Auto${activeResolution ? ` (${activeResolution.split(' ')[0]})` : ''}` 
                        : currentResolution.split(' ')[0]}
                    </button>
                    {showQualityMenu && (
                      <div className="absolute bottom-9 right-0 bg-surface-elevated border border-custom-border rounded-xl p-1 shadow-glass z-30 flex flex-col w-36">
                        {qualities.length > 0 ? (
                          qualities.map(q => (
                            <button 
                              key={q.name} 
                              onClick={() => handleQualityChange(q)}
                              className={`px-3 py-2 text-left rounded-lg text-xs font-semibold hover:bg-white/5 cursor-pointer flex items-center justify-between ${currentResolution === q.name ? 'text-accent' : 'text-fg'}`}
                            >
                              <span>{q.name}</span>
                              {currentResolution === q.name && <Check size={12} />}
                            </button>
                          ))
                        ) : (
                          ['Auto', '720p', '480p', '360p'].map(res => (
                            <button 
                              key={res} 
                              onClick={() => handleQualityChange(res)}
                              className={`px-3 py-2 text-left rounded-lg text-xs font-semibold hover:bg-white/5 cursor-pointer flex items-center justify-between ${currentResolution === res ? 'text-accent' : 'text-fg'}`}
                            >
                              <span>{res}</span>
                              {currentResolution === res && <Check size={12} />}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-white/60 text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-white/5 select-none cursor-default">
                    {activeResolution ? activeResolution.split(' ')[0] : (video.resolution ? video.resolution.split(' ')[0] : 'Original')}
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
            <span className="text-[11px] font-bold text-muted bg-surface-elevated border border-custom-border rounded-lg px-2.5 py-1 tracking-wider uppercase">
              {activeResolution ? activeResolution.toUpperCase() : (video.resolution || 'AUTO')}
            </span>
            <span className="text-[11px] font-bold text-muted bg-surface-elevated border border-custom-border rounded-lg px-2.5 py-1 tracking-wider uppercase">{video.size}</span>
            {isHlsActive ? (
              <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2.5 py-1 tracking-wider uppercase">⚡ HLS Stream</span>
            ) : (
              <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1 tracking-wider uppercase">🔗 Direct Link {isUsingFallback ? '(Fallback)' : ''}</span>
            )}
          </div>
          {!isHlsActive && video.originalUrl && (
            <div className="mt-3 flex flex-col gap-2 bg-amber-500/[0.03] border border-amber-500/10 rounded-xl p-3">
              <p className="text-[11px] text-amber-400/90 flex items-center gap-1.5 animate-pulse select-none font-semibold">
                <span>⚠️ {isUsingFallback ? 'HLS Stream transcoding. Switched to Direct Link.' : 'Playing Direct Link. HLS stream may still be transcoding.'}</span>
              </p>
              {video.originalUrl && (
                <button
                  type="button"
                  disabled={isCheckingHls}
                  onClick={() => checkHlsStatus(false)}
                  className="w-full mt-1 py-1.5 px-3 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 disabled:bg-amber-500/5 disabled:border-amber-500/10 text-amber-400 font-bold rounded-lg text-[10px] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isCheckingHls && <div className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>}
                  <span>{isCheckingHls ? (hlsCheckMessage || 'Checking...') : 'Check HLS stream status'}</span>
                </button>
              )}
            </div>
          )}
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
          {isHlsActive 
            ? `Imported from TeraBox URL. High-speed HLS stream proxied via TeraBridge. Original Path: ${video.path || '/'}`
            : `Imported from TeraBox URL. Direct stream link. Original Path: ${video.path || '/'}`}
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
