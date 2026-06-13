import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Hls from 'hls.js';
import { 
  ChevronLeft, Play, Pause, RotateCcw, Volume2, VolumeX, Maximize2, Minimize2,
  Download, Heart, Share2, Copy, SkipForward,
  HelpCircle, Check, AlertCircle, X
} from 'lucide-react';
import { db } from '../firebase';
import { ref, set, get } from 'firebase/database';
import { API_BASE, API_KEY } from '../config';

class CustomLoader extends Hls.DefaultConfig.loader {
  constructor(config) {
    super(config);
  }

  load(context, config, callbacks) {
    console.log("CustomLoader.load requested URL:", context.url);
    if (context.url) {
      try {
        let urlObj;
        try {
          urlObj = new URL(context.url);
        } catch {
          urlObj = new URL(context.url, API_BASE);
        }

        // Rewrite to use the configured API_BASE protocol and host
        const apiBaseUrl = new URL(API_BASE);
        urlObj.protocol = apiBaseUrl.protocol;
        urlObj.host = apiBaseUrl.host;

        // Add API_KEY if missing and the request is not already signed
        if (API_KEY && !urlObj.searchParams.has('key') && !urlObj.searchParams.has('sig')) {
          urlObj.searchParams.set('key', API_KEY);
        }

        const oldUrl = context.url;
        context.url = urlObj.toString();
        if (oldUrl !== context.url) {
          console.log("CustomLoader.load modified URL to:", context.url);
        }
      } catch (e) {
        console.error("Error customizing HLS request URL:", e);
      }
    }
    super.load(context, config, callbacks);
  }
}

export default function PlayerView({ video, relatedVideos, onVideoSelect, onBack, onToggleFavorite, onStartDownload, onUpdateVideo, currentUser }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const navigate = useNavigate();
  const lastSavedTimeRef = useRef(0);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(() => {
    const saved = parseFloat(localStorage.getItem('teraplay_volume') ?? '1');
    return isNaN(saved) ? 1 : saved;
  });
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const volumeAreaRef = useRef(null);

  // Scrubber hover tooltip
  const [scrubHover, setScrubHover] = useState(null); // { pct, time }

  // Skip feedback overlay: { dir: 'fwd'|'bwd', key: number }
  const [skipFeedback, setSkipFeedback] = useState(null);

  // Toast notifications
  const [toasts, setToasts] = useState([]);
  const toastIdRef = useRef(0);

  // HUD play/pause animation
  const [clickAction, setClickAction] = useState(null);

  // Buffering / loading
  const [isBuffering, setIsBuffering] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [bufferingResolution, setBufferingResolution] = useState('');

  // Quality / resolution
  const [currentResolution, setCurrentResolution] = useState(video.resolution || 'Auto');
  const [activeResolution, setActiveResolution] = useState('');
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [qualities, setQualities] = useState([]);

  // Shortcuts overlay
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Ping
  const [ping, setPing] = useState(null);

  // Error
  const [videoError, setVideoError] = useState(null);

  // HLS fallback state
  const isUsingFallback = false;
  const hasHlsFailed = false;
  
  const controlsTimeoutRef = useRef(null);
  const actionTimeoutRef = useRef(null);
  const skipFeedbackTimeoutRef = useRef(null);
  const hlsRef = useRef(null);

  // Refs for keyboard handler — always point to the latest stable callback.
  const handlePlayPauseRef = useRef(null);
  const skipRef = useRef(null);
  const toggleFullscreenRef = useRef(null);
  const toggleMuteRef = useRef(null);

  const saveProgress = (time, duration) => {
    if (!duration || isNaN(duration) || duration <= 0) return;
    if (isNaN(time)) return;
    const pct = Math.round((time / duration) * 100);
    
    if (onUpdateVideo) {
      onUpdateVideo({
        ...video,
        progress: pct
      });
    }

    if (currentUser) {
      const progressPath = `users/${currentUser.uid}/progress/${video.id}`;
      if (time > 5 && time < duration * 0.95) {
        set(ref(db, progressPath), time);
      } else if (time >= duration * 0.95 || time <= 0) {
        set(ref(db, progressPath), null);
      }
    } else {
      if (time > 5 && time < duration * 0.95) {
        localStorage.setItem(`progress_${video.id}`, time.toString());
      } else if (time >= duration * 0.95 || time <= 0) {
        localStorage.removeItem(`progress_${video.id}`);
      }
    }
  };

  // Sync resolution when active video changes
  useEffect(() => {
    setCurrentResolution(video.resolution || 'Auto');
    setQualities([]);
    setShowQualityMenu(false);
    setIsBuffering(false);
    setIsInitialLoading(true);
    setActiveResolution('');
    setVideoError(null);
  }, [video.id]);

  // Toast helper
  const showToast = useCallback((message, type = 'success') => {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 2800);
  }, []);

  // Sync fullscreen state from browser events (handles Esc key exit)
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

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

  // Keep handler refs in sync with latest functions.
  useEffect(() => {
    handlePlayPauseRef.current = handlePlayPause;
    skipRef.current = skip;
    toggleFullscreenRef.current = toggleFullscreen;
    toggleMuteRef.current = toggleMute;
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
        case 'm':
          e.preventDefault();
          toggleMuteRef.current?.();
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

    if (video.videoUrl) {
      if (Hls.isSupported()) {
        hls = new Hls({
          maxMaxBufferLength: 30, // Keep buffer efficient for high speeds
          enableWorker: true,
          lowLatencyMode: false,
          loader: CustomLoader,
          fLoader: CustomLoader,
          pLoader: CustomLoader
        });
        hls.loadSource(video.videoUrl);
        hls.attachMedia(videoElement);
        hlsRef.current = hls;

        hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
          const levels = hls.levels.map((level, index) => {
            let name = level.name;
            if (!name || /^level\s+\d+$/i.test(name.trim())) {
              if (level.height) {
                name = `${level.height}p`;
              } else if (level.bitrate) {
                name = level.bitrate > 1000000 
                  ? `${(level.bitrate / 1000000).toFixed(1)} Mbps` 
                  : `${Math.round(level.bitrate / 1000)} kbps`;
              } else if (video.resolution) {
                name = video.resolution;
              } else {
                name = name || `Level ${index}`;
              }
            }
            return { id: index, name };
          });
          setQualities([{ id: -1, name: "Auto" }, ...levels]);
          setCurrentResolution("Auto");
          
          const activeLvlName = levels[hls.currentLevel]?.name || levels[0]?.name || '';
          setActiveResolution(activeLvlName);

          // ── Apply saved resolution preference ──
          const savedRes = localStorage.getItem('settings_resolution') || 'auto';
          const resHeightMap = { '4k': 2160, '1080p': 1080, '720p': 720, '480p': 480 };
          const targetHeight = resHeightMap[savedRes];
          if (targetHeight) {
            const matchIdx = hls.levels.findIndex(l => l.height && Math.abs(l.height - targetHeight) < targetHeight * 0.25);
            if (matchIdx >= 0) {
              hls.currentLevel = matchIdx;
              const matched = hls.levels[matchIdx];
              const mName = matched.name || `${matched.height}p`;
              setCurrentResolution(mName);
              setActiveResolution(mName);
            }
          }
          
          videoElement.play()
            .then(() => setIsPlaying(true))
            .catch(err => console.log("Auto-play blocked: ", err));
        });

        hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
          const currentLevel = hls.levels[data.level];
          if (currentLevel) {
            let name = currentLevel.name;
            if (!name || /^level\s+\d+$/i.test(name.trim())) {
              if (currentLevel.height) {
                name = `${currentLevel.height}p`;
              } else if (currentLevel.bitrate) {
                name = currentLevel.bitrate > 1000000 
                  ? `${(currentLevel.bitrate / 1000000).toFixed(1)} Mbps` 
                  : `${Math.round(currentLevel.bitrate / 1000)} kbps`;
              } else if (video.resolution) {
                name = video.resolution;
              } else {
                name = name || `Level ${data.level}`;
              }
            }
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
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.warn("HLS fatal media error, recovering...", data);
                hls.recoverMediaError();
                break;
              default:
                console.error("HLS fatal unrecoverable error:", data);
                setVideoError("HLS playback failed. The proxy server returned an error.");
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
    }

    setCurrentTime(0);

    return () => {
      // ── Save playback position before cleanup ──
      if (videoElement && localStorage.getItem('settings_remember_progress') !== 'false') {
        saveProgress(videoElement.currentTime, videoElement.duration);
      }
      if (hls) {
        hls.destroy();
        hlsRef.current = null;
      }
    };
  }, [video.videoUrl, video.id]);

  const resetControlsTimer = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    // Only auto-hide when playing and not buffering
    if (isPlaying && !isBuffering) {
      controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
    }
  };

  useEffect(() => {
    resetControlsTimer();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      if (actionTimeoutRef.current) clearTimeout(actionTimeoutRef.current);
      if (skipFeedbackTimeoutRef.current) clearTimeout(skipFeedbackTimeoutRef.current);
    };
  }, [isPlaying, isBuffering]);

  const handlePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
      triggerClickAction('pause');
      saveProgress(videoRef.current.currentTime, videoRef.current.duration);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
      triggerClickAction('play');
    }
    resetControlsTimer();
  };

  // ── Autoplay: advance to the next video when the current one ends ──
  const handleEnded = () => {
    setIsPlaying(false);
    // Clear saved progress — video finished
    saveProgress(0, duration);

    const autoplay = localStorage.getItem('settings_autoplay') !== 'false';
    if (!autoplay || !relatedVideos || relatedVideos.length === 0) return;

    // Find the next playable video after the current one
    const currentIdx = relatedVideos.findIndex(v => v.id === video.id);
    const after = relatedVideos.slice(currentIdx + 1);
    const nextVideo = after.find(v => !v.is_directory) || relatedVideos.find(v => !v.is_directory && v.id !== video.id);

    if (nextVideo && onVideoSelect) {
      onVideoSelect(nextVideo);
      navigate(`/player/${nextVideo.id}`);
    }
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
      const ct = videoRef.current.currentTime;
      const dur = videoRef.current.duration;
      setCurrentTime(ct);

      if (Math.abs(ct - lastSavedTimeRef.current) >= 5) {
        lastSavedTimeRef.current = ct;
        saveProgress(ct, dur);
      }
    }
  };

  const handleLoadedMetadata = async () => {
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
      // ── Restore saved playback position ──
      if (localStorage.getItem('settings_remember_progress') !== 'false') {
        let savedTime = 0;
        if (currentUser) {
          try {
            const progressRef = ref(db, `users/${currentUser.uid}/progress/${video.id}`);
            const snapshot = await get(progressRef);
            if (snapshot.exists()) {
              savedTime = parseFloat(snapshot.val() || '0');
            }
          } catch (e) {
            console.error("Failed to restore progress from database:", e);
          }
        } else {
          savedTime = parseFloat(localStorage.getItem(`progress_${video.id}`) || '0');
        }

        if (savedTime > 5 && savedTime < (dur || Infinity) * 0.95 && videoRef.current) {
          videoRef.current.currentTime = savedTime;
          lastSavedTimeRef.current = savedTime;
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

  const handleScrubMove = (e) => {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    setScrubHover({ pct: pct * 100, time: formatTime(pct * duration) });
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
      // Show skip feedback overlay
      const dir = seconds > 0 ? 'fwd' : 'bwd';
      setSkipFeedback({ dir, key: Date.now() });
      if (skipFeedbackTimeoutRef.current) clearTimeout(skipFeedbackTimeoutRef.current);
      skipFeedbackTimeoutRef.current = setTimeout(() => setSkipFeedback(null), 600);
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
    const linkToCopy = video.originalUrl || window.location.href;
    navigator.clipboard.writeText(linkToCopy)
      .then(() => showToast('Link copied to clipboard', 'success'))
      .catch(() => showToast('Failed to copy link', 'error'));
  };

  const handleShare = async () => {
    const shareUrl = video.originalUrl || window.location.href;
    const shareData = {
      title: video.title,
      text: `Watch "${video.title}" on TeraPlay`,
      url: shareUrl,
    };
    try {
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        showToast('Shared successfully', 'success');
      } else {
        await navigator.clipboard.writeText(shareUrl);
        showToast('Link copied to clipboard', 'success');
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        showToast('Share failed', 'error');
      }
    }
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
    localStorage.setItem('teraplay_volume', val.toString());
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    videoRef.current.muted = newMuted;
    if (newMuted) {
      setVolume(0);
      localStorage.setItem('teraplay_volume', '0');
    } else {
      const restored = volume > 0 ? volume : 1;
      setVolume(restored);
      localStorage.setItem('teraplay_volume', restored.toString());
      videoRef.current.volume = restored;
    }
  };

  const handleRelatedClick = (relVideo) => {
    onVideoSelect(relVideo);
    navigate(`/player/${relVideo.id}`);
  };

  const handleVideoDoubleClick = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const half = rect.width / 2;
    if (x < half) {
      skip(-10);
    } else {
      skip(10);
    }
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
    
    // If HLS.js is active, let it handle its own errors. The native video element
    // often fires misleading format support errors during source transitions.
    if (hlsRef.current) {
      return;
    }
    
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
    
    setVideoError(errorMsg);
    setIsBuffering(false);
    setIsInitialLoading(false);
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
          onDoubleClick={handleVideoDoubleClick}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
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

        {/* Skip feedback overlay — left/right flash on double-click or skip button */}
        {skipFeedback && (
          <div
            key={skipFeedback.key}
            className={`absolute inset-y-0 z-10 pointer-events-none flex items-center justify-center w-1/2 ${skipFeedback.dir === 'bwd' ? 'left-0' : 'right-0'}`}
          >
            <div className="flex flex-col items-center gap-1 animate-hud-ping">
              <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 grid place-items-center text-white">
                {skipFeedback.dir === 'bwd'
                  ? <RotateCcw size={26} />
                  : <SkipForward size={26} />}
              </div>
              <span className="text-white text-xs font-bold bg-black/50 px-2 py-0.5 rounded-full">
                {skipFeedback.dir === 'bwd' ? '-10s' : '+10s'}
              </span>
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
                <div className="flex justify-between items-center"><span className="text-muted">Toggle Mute</span><kbd className="bg-surface-elevated border border-custom-border px-2 py-0.5 rounded-md text-xs font-mono">M</kbd></div>
                <div className="flex justify-between items-center"><span className="text-muted">Toggle Shortcuts Map</span><kbd className="bg-surface-elevated border border-custom-border px-2 py-0.5 rounded-md text-xs font-mono">?</kbd></div>
              </div>
            </div>
          </div>
        )}
 
        {/* Custom HUD Player Controls */}
        <div 
          className="absolute bottom-0 left-0 right-0 w-full p-2.5 md:p-4 pb-3 md:pb-5 flex flex-col gap-1.5 md:gap-2.5 bg-gradient-to-t from-black/95 via-black/55 to-transparent z-20"
          style={{ 
            opacity: showControls ? 1 : 0, 
            pointerEvents: showControls ? 'auto' : 'none',
            transition: 'opacity 0.3s ease'
          }}
        >
          {/* Timeline scrub */}
          <div className="relative w-full flex items-center px-1">
            <input 
              type="range" 
              min="0" 
              max="100" 
              step="0.1"
              value={progressPercent}
              onChange={handleScrub}
              onMouseMove={handleScrubMove}
              onMouseLeave={() => setScrubHover(null)}
              className="progress-slider w-full cursor-pointer accent-accent h-1 rounded-full outline-none appearance-none hover:h-1.5 transition-all duration-150"
              style={{
                background: `linear-gradient(to right, var(--color-accent) ${progressPercent}%, oklch(100% 0 0 / 0.1) ${progressPercent}%)`
              }}
              aria-label="Playback timeline"
            />
            {/* Hover time tooltip */}
            {scrubHover && (
              <div
                className="absolute -top-8 pointer-events-none bg-black/80 backdrop-blur-sm text-white text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-md border border-white/10 whitespace-nowrap"
                style={{ left: `calc(${scrubHover.pct}% - 18px)` }}
              >
                {scrubHover.time}
              </div>
            )}
          </div>
 
          <div className="flex justify-between items-center w-full px-1">
            <div className="flex items-center gap-3.5 md:gap-6">
              <button onClick={() => skip(-10)} className="text-white hover:text-accent hover:scale-110 active:scale-95 transition-all cursor-pointer" aria-label="Rewind 10s">
                <RotateCcw size={18} className="md:w-5 md:h-5" />
              </button>
              <button onClick={handlePlayPause} className="text-white hover:text-accent hover:scale-110 active:scale-95 transition-all cursor-pointer" aria-label={isPlaying ? 'Pause' : 'Play'}>
                {isPlaying ? <Pause fill="currentColor" size={22} className="md:w-6 md:h-6" /> : <Play fill="currentColor" size={22} className="md:w-6 md:h-6" />}
              </button>
              <button onClick={() => skip(10)} className="text-white hover:text-accent hover:scale-110 active:scale-95 transition-all cursor-pointer" aria-label="Forward 10s">
                <SkipForward size={18} className="md:w-5 md:h-5" />
              </button>
              
              <div className="text-xs md:text-sm font-mono text-white/95 whitespace-nowrap">
                {formatTime(currentTime)} <span className="opacity-40">/</span> {formatTime(duration)}
              </div>

              {/* Volume control */}
              <div
                ref={volumeAreaRef}
                className="hidden sm:flex items-center gap-2 group/vol relative"
                onMouseEnter={() => setShowVolumeSlider(true)}
                onMouseLeave={() => setShowVolumeSlider(false)}
              >
                <button
                  onClick={toggleMute}
                  className="text-white hover:text-accent hover:scale-110 active:scale-95 transition-all cursor-pointer"
                  aria-label={isMuted || volume === 0 ? 'Unmute' : 'Mute'}
                >
                  {isMuted || volume === 0
                    ? <VolumeX size={18} className="md:w-5 md:h-5" />
                    : <Volume2 size={18} className="md:w-5 md:h-5" />}
                </button>
                <div
                  className="overflow-hidden transition-all duration-200"
                  style={{ width: showVolumeSlider ? '72px' : '0px', opacity: showVolumeSlider ? 1 : 0 }}
                >
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="progress-slider w-full cursor-pointer h-1 rounded-full outline-none appearance-none"
                    style={{
                      background: `linear-gradient(to right, var(--color-accent) ${(isMuted ? 0 : volume) * 100}%, oklch(100% 0 0 / 0.2) ${(isMuted ? 0 : volume) * 100}%)`
                    }}
                    aria-label="Volume"
                  />
                </div>
              </div>
            </div>
 
            <div className="flex items-center gap-4 md:gap-6 relative">
              {/* Ping latency status badge (hidden on mobile/small viewports) */}
              {ping !== null && (
                <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono font-bold select-none cursor-help whitespace-nowrap" title="Latency to stream bridge API server">
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
              <button onClick={toggleFullscreen} className="text-white hover:text-accent hover:scale-110 active:scale-95 transition-all cursor-pointer" aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
                {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Details Side Panel */}
      <aside className="p-5 md:p-8 lg:border-l border-t lg:border-t-0 border-custom-border bg-surface lg:overflow-y-auto flex flex-col gap-6 h-auto lg:h-full">
        <div>
          <h1 className="text-2xl font-bold leading-tight tracking-tight text-fg mb-4 break-words break-all">{video.title}</h1>
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

        </div>

        <div className="grid grid-cols-2 gap-3 shrink-0">
          <a 
            href={video.downloadUrl || video.videoUrl || ''}
            download={`${video.title}.mp4`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => showToast('Download started', 'success')}
            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-accent text-bg font-semibold text-xs shadow-[0_4px_12px_var(--color-accent-muted)] hover:shadow-[0_8px_20px_var(--color-accent-muted)] hover:-translate-y-0.5 transition-all cursor-pointer text-center select-none"
          >
            <Download size={16} />
            <span>Download</span>
          </a>

          <button 
            className={`flex items-center justify-center gap-2 p-3 rounded-xl border border-custom-border bg-surface-elevated font-semibold text-xs text-fg hover:bg-custom-border hover:-translate-y-0.5 transition-all cursor-pointer ${video.favorite ? 'border-accent text-accent' : ''}`}
            onClick={() => {
              onToggleFavorite(video.id);
              showToast(video.favorite ? 'Removed from favorites' : 'Added to favorites', 'success');
            }}
          >
            <Heart size={16} fill={video.favorite ? "currentColor" : "none"} />
            <span>{video.favorite ? 'Favorited' : 'Favorite'}</span>
          </button>
          
          <button 
            className="flex items-center justify-center gap-2 p-3 rounded-xl border border-custom-border bg-surface-elevated font-semibold text-xs text-fg hover:bg-custom-border hover:-translate-y-0.5 transition-all cursor-pointer"
            onClick={handleShare}
          >
            <Share2 size={16} />
            <span>Share</span>
          </button>
          
          <button 
            className="flex items-center justify-center gap-2 p-3 rounded-xl border border-custom-border bg-surface-elevated font-semibold text-xs text-fg hover:bg-custom-border hover:-translate-y-0.5 transition-all cursor-pointer"
            onClick={handleCopyLink}
          >
            <Copy size={16} />
            <span>Copy Link</span>
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
                <div className="w-24 aspect-video bg-surface-elevated border border-custom-border rounded-lg overflow-hidden shrink-0 flex items-center justify-center relative">
                  <img src={relVideo.thumbnail} alt="" className="absolute inset-0 w-full h-full object-cover blur-md opacity-35 scale-110 pointer-events-none select-none" />
                  <img src={relVideo.thumbnail} alt={relVideo.title} className="relative z-10 max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-300" />
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

      {/* Toast notification stack */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-surface border border-custom-border shadow-glass backdrop-blur-md text-sm font-medium text-fg animate-fade-in pointer-events-auto"
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${toast.type === 'error' ? 'bg-rose-400' : 'bg-emerald-400'}`} />
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
}
