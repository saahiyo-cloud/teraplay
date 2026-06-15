import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, Zap, Shield, Database, ChevronDown, Check, 
  Sun, Moon, Monitor, X, ExternalLink, ArrowRight, Video, 
  CloudLightning, Bookmark, Sparkles, HelpCircle, Sliders, Volume2
} from 'lucide-react';
import AuthScreen from './AuthScreen';
import { useSettings } from '../hooks/useSettings';
import { ACCENT_COLORS } from './SettingsView';
import { SlotText } from 'slot-text/react';
import 'slot-text/style.css';

export default function LandingPage({ onNavigateToAuth }) {
  const { settings, handleUpdateSettings } = useSettings(null);
  
  // Word rolling animation state
  const words = [
    'Without Buffering',
    'In High Definition',
    'Directly From Cloud',
    'To Any Device'
  ];
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex(prev => (prev + 1) % words.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);
  
  // Interactive Mock Player State
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [quality, setQuality] = useState('1080p');
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [prewarmIndicator, setPrewarmIndicator] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // FAQs open state (accordion)
  const [openFaq, setOpenFaq] = useState(null);

  // Playback timer simulation
  useEffect(() => {
    let interval;
    if (isPlaying && !isBuffering) {
      interval = setInterval(() => {
        setPlaybackTime(prev => {
          if (prev >= 1420) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, isBuffering]);

  const togglePlay = () => {
    if (!isPlaying) {
      setIsPlaying(true);
      // Show pre-warm latency toast
      setToastMessage('Resolving HLS streams... Pre-warming caches');
      setIsBuffering(true);
      setTimeout(() => {
        setIsBuffering(false);
        setToastMessage('Stream active: 0.8s latency (Zero-stall)');
        setTimeout(() => setToastMessage(''), 3000);
      }, 900);
    } else {
      setIsPlaying(false);
    }
  };

  const handleQualityChange = (q) => {
    setQuality(q);
    setShowQualityMenu(false);
    setIsBuffering(true);
    setToastMessage(`Switching to ${q}...`);
    setTimeout(() => {
      setIsBuffering(false);
      setToastMessage(`Quality updated: HLS segment pre-warmed`);
      setTimeout(() => setToastMessage(''), 2500);
    }, 600);
  };

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  // Convert seconds to MM:SS
  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainSecs.toString().padStart(2, '0')}`;
  };

  // Accent selector helper
  const handleSelectAccent = (colorObj) => {
    document.documentElement.style.setProperty('--color-accent', colorObj.value);
    document.documentElement.style.setProperty('--color-accent-muted', colorObj.muted);
    localStorage.setItem('teraplay_accent', JSON.stringify(colorObj));
    handleUpdateSettings({ accentColor: colorObj.name });
  };

  // Theme selector helper
  const handleSelectTheme = (mode) => {
    handleUpdateSettings({ themeMode: mode });
  };

  const openAuth = (mode = 'signin') => {
    if (onNavigateToAuth) {
      onNavigateToAuth(mode === 'signup');
    }
  };

  const faqs = [
    {
      q: "How does TeraPlay work?",
      a: "TeraPlay is a high-speed cloud media client. When you paste a TeraBox, Terashare, or 1024terabox link, our backend bridge resolves the direct download links, generates an optimized HLS stream manifest, and caches video segments dynamically. You can stream high-definition videos with native player qualities without downloading anything."
    },
    {
      q: "What is HLS quality pre-warming?",
      a: "Traditional cloud streaming starts with high latency while checking what qualities are available. TeraPlay runs parallel server-side probing on 1080p, 720p, 480p, and 360p streams and stores them in high-speed Redis caches. When you click play, the stream initializes in less than a second."
    },
    {
      q: "Is TeraPlay really free?",
      a: "Yes! Currently, TeraPlay is in public beta. Every user who registers is automatically assigned to our 'Premium Pro' tier, which gives you unlimited video resolutions, zero loading restrictions, and cloud sync features completely free."
    },
    {
      q: "How is watch history and progress managed?",
      a: "When signed in, all resolved videos, favorites, and watch playback progress (down to the exact second) are synced to your account via Firebase Realtime Database. You can close a tab on your laptop and resume exactly where you left off on your mobile browser."
    },
    {
      q: "Is my library private?",
      a: "Absolutely. Your watch history, imported videos, and settings are saved under your secure private user profile. The only exception is the 'Discover' tab, which is a collection of public media catalogs contributed by administrators and featured creators."
    }
  ];

  return (
    <div className="min-h-screen bg-bg text-fg font-body relative overflow-x-hidden select-none">
      
      {/* Background container wrapper */}

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-16 sm:h-20 bg-glass/65 backdrop-blur-2xl border-b border-custom-border/80 z-[100] select-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-accent rounded-lg sm:rounded-xl grid place-items-center text-bg">
              <Play fill="currentColor" size={14} className="ml-0.5" />
            </div>
            <span className="text-lg sm:text-xl font-extrabold tracking-tight text-fg">TeraPlay</span>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Quick customization toggles directly on header for Wow factor */}
            <div className="hidden sm:flex items-center gap-2 bg-surface/50 border border-custom-border/60 p-1.5 rounded-xl">
              {/* Color Accents */}
              <div className="flex gap-1 pr-2 border-r border-custom-border/60">
                {ACCENT_COLORS.map(color => (
                  <button
                    key={color.name}
                    type="button"
                    onClick={() => handleSelectAccent(color)}
                    className="w-5 h-5 rounded-full transition-transform hover:scale-125 cursor-pointer relative"
                    style={{ backgroundColor: color.hex }}
                    title={`Accent: ${color.name}`}
                  >
                    {settings.accentColor === color.name && (
                      <div className="absolute inset-1 rounded-full bg-white/40"></div>
                    )}
                  </button>
                ))}
              </div>
              {/* Dark/Light Switcher */}
              <button
                type="button"
                onClick={() => handleSelectTheme(settings.themeMode === 'light' ? 'dark' : 'light')}
                className="p-1 text-muted hover:text-fg rounded-lg hover:bg-white/5 transition-all cursor-pointer"
                title="Toggle Theme"
              >
                {settings.themeMode === 'light' ? <Moon size={15} /> : <Sun size={15} />}
              </button>
            </div>

            <button
              onClick={() => openAuth('signin')}
              className="text-xs sm:text-sm font-semibold text-fg hover:text-accent px-2.5 py-1.5 sm:px-4 sm:py-2 transition-colors cursor-pointer"
            >
              Sign In
            </button>
            <button
              onClick={() => openAuth('signup')}
              className="px-3.5 py-2 sm:px-5 sm:py-2.5 bg-accent text-bg hover:opacity-95 font-bold rounded-lg sm:rounded-xl text-xs transition-all hover:-translate-y-0.5 cursor-pointer"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-28 pb-12 sm:pt-36 sm:pb-20 md:pt-44 md:pb-28 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            
            {/* Hero Left Content */}
            <div className="lg:col-span-7 flex flex-col gap-6 text-left">
              {/* Beta Badge */}
              <div className="inline-flex items-center gap-2 self-start rounded-full bg-accent-muted border border-accent/20 px-3.5 py-1 text-[10px] sm:text-xs font-semibold text-accent animate-pulse select-none">
                <Sparkles size={12} className="shrink-0" />
                <span>Free Premium Pro Beta Access</span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-fg leading-[1.1] md:max-w-2xl">
                Stream TeraBox Videos <br className="hidden sm:inline" />
                <span className="text-accent inline-block min-w-[220px] sm:min-w-[360px] md:min-w-[420px] text-left">
                  <SlotText 
                    text={words[wordIndex]} 
                    options={{
                      duration: 900,
                      stagger: 80,
                    }}
                  />
                </span>
              </h1>

              <p className="text-muted text-xs sm:text-base lg:text-lg leading-relaxed max-w-xl">
                Convert files from TeraBox sharing links into premium high-definition HLS streams. Experience instantaneous playback, quality controls, and watch history synchronization.
              </p>

              {/* Stats badges - Bento Grid on small screens, row on sm+ */}
              <div className="grid grid-cols-2 gap-2 max-w-md mt-2 sm:grid-cols-3 sm:gap-3">
                <div className="bg-surface/30 border border-custom-border/50 p-2.5 sm:p-3 rounded-xl backdrop-blur-sm col-span-1 sm:col-span-1">
                  <div className="text-base sm:text-lg font-bold text-accent">0.8s</div>
                  <div className="text-[9px] sm:text-[10px] text-muted font-medium uppercase tracking-wider">Start Time</div>
                </div>
                <div className="bg-surface/30 border border-custom-border/50 p-2.5 sm:p-3 rounded-xl backdrop-blur-sm col-span-1 sm:col-span-1">
                  <div className="text-base sm:text-lg font-bold text-accent">Free Pro</div>
                  <div className="text-[9px] sm:text-[10px] text-muted font-medium uppercase tracking-wider">Public Beta</div>
                </div>
                <div className="bg-surface/30 border border-custom-border/50 p-2.5 sm:p-3 rounded-xl backdrop-blur-sm col-span-2 sm:col-span-1">
                  <div className="text-base sm:text-lg font-bold text-accent">HLS Client</div>
                  <div className="text-[9px] sm:text-[10px] text-muted font-medium uppercase tracking-wider">Adaptive Quality</div>
                </div>
              </div>

              <div className="mt-4 flex flex-col sm:flex-row items-center gap-4 max-w-md">
                <button
                  onClick={() => openAuth('signup')}
                  className="w-full sm:w-auto px-8 py-3.5 sm:py-4 bg-accent text-bg hover:opacity-95 font-bold rounded-xl text-sm sm:text-base transition-all duration-200 hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Start Streaming Now</span>
                  <ArrowRight size={18} />
                </button>
                <a 
                  href="#how-it-works"
                  className="w-full sm:w-auto text-center py-3.5 sm:py-4 text-muted hover:text-fg hover:bg-white/5 border border-transparent hover:border-custom-border/80 px-6 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-1.5"
                >
                  Learn More
                </a>
              </div>

              <p className="text-[9px] sm:text-[10px] text-muted-500 pl-1 mt-1">
                ⚡ No credit card required. Stream resolved links in standard browser sandbox safely.
              </p>
            </div>

            {/* Hero Right Visual: Interactive Mockup Player */}
            <div className="lg:col-span-5 relative w-full flex justify-center">
              <div className="w-full max-w-sm aspect-[4/3] sm:aspect-square bg-gradient-to-tr from-accent/5 to-accent/20 rounded-3xl p-3 md:p-4 border border-accent/20 shadow-2xl relative overflow-hidden backdrop-blur-sm flex flex-col justify-between">
                
                {/* Background Video Simulator image */}
                <div className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-[10000ms] ease-out scale-105" 
                  style={{ 
                    backgroundImage: `var(--mock-video-bg-url)`,
                    filter: isPlaying ? 'brightness(0.65)' : 'brightness(0.4) contrast(1.1) blur(1px)'
                  }}
                ></div>

                {/* Toast Notification for pre-warming details */}
                {toastMessage && (
                  <div className="absolute top-4 left-4 right-4 z-50 py-2 px-3 bg-surface/90 border border-custom-border/80 text-fg rounded-xl text-[10px] flex items-center gap-2 shadow-lg backdrop-blur-md animate-fade-in font-medium">
                    <CloudLightning size={12} className="text-accent animate-bounce" />
                    <span>{toastMessage}</span>
                  </div>
                )}

                {/* Mockup Header info */}
                <div className="relative z-10 flex justify-between items-start">
                  <div className="bg-black/60 backdrop-blur-md border border-white/10 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg text-white">
                    <div className="text-[9px] sm:text-[10px] font-bold tracking-wide flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-red-500 animate-pulse' : 'bg-zinc-500'}`}></div>
                      <span>{isPlaying ? 'STREAMING ACTIVE' : 'CLIENT IDLE'}</span>
                    </div>
                  </div>
                  <div className="bg-black/60 backdrop-blur-md border border-white/10 px-2 py-1 rounded-lg text-white text-[8px] sm:text-[9px] font-medium flex items-center gap-1">
                    <Database size={10} className="text-accent" />
                    <span>CACHE: {isPlaying ? 'HIT' : 'READY'}</span>
                  </div>
                </div>

                {/* Center play state */}
                <div className="relative z-10 flex flex-col items-center justify-center my-auto">
                  <button
                    onClick={togglePlay}
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-accent text-bg flex items-center justify-center transition-all hover:scale-110 shadow-lg cursor-pointer"
                    aria-label={isPlaying ? 'Pause Demo' : 'Play Demo'}
                  >
                    {isBuffering ? (
                      <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-bg border-t-transparent rounded-full animate-spin"></div>
                    ) : isPlaying ? (
                      <Pause size={20} className="sm:w-6 sm:h-6" fill="currentColor" />
                    ) : (
                      <Play size={20} className="sm:w-6 sm:h-6 sm:ml-1 ml-0.5" fill="currentColor" />
                    )}
                  </button>
                  {!isPlaying && (
                    <span className="text-[9px] sm:text-[10px] font-bold text-white/80 mt-2 sm:mt-3 bg-black/40 backdrop-blur-md px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full border border-white/5 uppercase tracking-wider">
                      Demo Live HLS Switcher
                    </span>
                  )}
                </div>

                {/* Player Controls Bar */}
                <div className="relative z-10 bg-black/70 border border-white/10 p-3 rounded-2xl backdrop-blur-lg flex flex-col gap-2">
                  <div className="text-[10px] text-white/90 font-medium truncate">
                    Solo_Leveling_S01E12_1080p_Dual.mkv
                  </div>

                  <div className="flex items-center justify-between text-[9px] text-white/70">
                    <div className="flex items-center gap-2">
                      <button onClick={togglePlay} className="hover:text-white transition-colors">
                        {isPlaying ? <Pause size={12} /> : <Play size={12} />}
                      </button>
                      <span>{formatTime(playbackTime)} / 23:40</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <Volume2 size={12} className="opacity-70" />
                      
                      {/* Quality selection popup */}
                      <div className="relative">
                        <button 
                          onClick={() => setShowQualityMenu(!showQualityMenu)}
                          className="px-2 py-0.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded text-white flex items-center gap-1 font-semibold"
                        >
                          <span>{quality}</span>
                          <ChevronDown size={8} />
                        </button>
                        
                        {showQualityMenu && (
                          <div className="absolute bottom-6 right-0 w-24 bg-zinc-950 border border-white/10 rounded-xl overflow-hidden shadow-2xl flex flex-col text-[9px] z-50">
                            {['1080p', '720p', '480p', 'Auto'].map(q => (
                              <button
                                key={q}
                                onClick={() => handleQualityChange(q)}
                                className={`px-2.5 py-1.5 text-left hover:bg-white/10 w-full transition-colors flex items-center justify-between ${quality === q ? 'text-accent font-bold' : 'text-white/80'}`}
                              >
                                <span>{q}</span>
                                {quality === q && <Check size={8} />}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Progress slide */}
                  <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden relative">
                    <div 
                      className="h-full bg-accent transition-all duration-300"
                      style={{ width: `${(playbackTime / 1420) * 100}%` }}
                    ></div>
                    <div className="absolute top-0 bottom-0 left-0 bg-white/10" style={{ width: '65%' }}></div> {/* Mock load buffer */}
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Social Proof Stats Banner */}
      <section className="bg-surface/30 border-y border-custom-border/80 py-10 backdrop-blur-sm select-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-extrabold text-accent">1.2s</div>
              <div className="mt-1 text-xs text-muted font-medium">Average Manifest Load Time</div>
            </div>
            <div>
              <div className="text-3xl font-extrabold text-accent">Zero-Stall</div>
              <div className="mt-1 text-xs text-muted font-medium">HLS Level Quality Switching</div>
            </div>
            <div>
              <div className="text-3xl font-extrabold text-accent">99.9%</div>
              <div className="mt-1 text-xs text-muted font-medium">Bridge API Resolution Uptime</div>
            </div>
            <div>
              <div className="text-3xl font-extrabold text-accent">100%</div>
              <div className="mt-1 text-xs text-muted font-medium">Secure Browser Sandbox</div>
            </div>
          </div>
        </div>
      </section>

      {/* Bento Grid Features Section */}
      <section className="py-20 md:py-28 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 select-none">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-fg">
              A Premium Cloud Media Experience
            </h2>
            <p className="mt-4 text-muted text-sm sm:text-base max-w-2xl mx-auto">
              We leverage cutting-edge caching pipelines to provide a gorgeous client interface that outmatches standard cloud player platforms.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            
            {/* Bento Grid Card 1: Main feature (Spans 4 col on md, 2 col by default) */}
            <div className="col-span-2 md:col-span-4 bg-gradient-to-br from-accent/5 via-accent/10 to-accent-muted rounded-3xl p-5 sm:p-8 border border-accent/20 min-h-[240px] sm:min-h-[300px] flex flex-col justify-between text-left relative overflow-hidden group">
              <div className="absolute top-5 right-5 p-2 sm:p-3 bg-accent/20 rounded-2xl text-accent">
                <CloudLightning size={20} className="sm:w-6 sm:h-6" />
              </div>
              <div className="max-w-md mt-10 sm:mt-24">
                <div className="inline-flex items-center gap-1 bg-accent/10 text-accent text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mb-3">
                  Core tech
                </div>
                <h3 className="text-base sm:text-2xl font-extrabold text-fg mb-2">HLS quality pre-warming</h3>
                <p className="text-muted text-[11px] sm:text-sm leading-relaxed">
                  Our Flask & Upstash Redis middleware caches valid file streams in parallel. That means when you select quality toggles, segments switch instantly without buffer stuttering.
                </p>
              </div>
            </div>

            {/* Bento Grid Card 2: Personal Library (Spans 2 col on md, 1 col by default) */}
            <div className="col-span-1 md:col-span-2 bg-surface/30 border border-custom-border/80 hover:border-accent/40 rounded-3xl p-5 sm:p-8 flex flex-col justify-between text-left backdrop-blur-sm transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] hover:translate-y-[-4px]">
              <div className="w-9 h-9 sm:w-12 sm:h-12 bg-accent/15 border border-accent/25 rounded-2xl grid place-items-center text-accent">
                <Bookmark size={16} className="sm:w-5 sm:h-5" />
              </div>
              <div className="mt-5 sm:mt-8">
                <h3 className="text-sm sm:text-lg font-bold text-fg mb-1.5 sm:mb-2">Secure Library</h3>
                <p className="text-muted text-[10px] sm:text-xs leading-normal sm:leading-relaxed">
                  Add custom resolved videos, group items into bookmarks, and access watch progress logs on any device automatically.
                </p>
              </div>
            </div>

            {/* Bento Grid Card 3: Theme Personalization (Spans 2 col on md, 1 col by default) */}
            <div className="col-span-1 md:col-span-2 bg-surface/30 border border-custom-border/80 hover:border-accent/40 rounded-3xl p-5 sm:p-8 flex flex-col justify-between text-left backdrop-blur-sm transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] hover:translate-y-[-4px]">
              <div className="w-9 h-9 sm:w-12 sm:h-12 bg-accent/15 border border-accent/25 rounded-2xl grid place-items-center text-accent">
                <Sliders size={16} className="sm:w-5 sm:h-5" />
              </div>
              <div className="mt-5 sm:mt-8">
                <h3 className="text-sm sm:text-lg font-bold text-fg mb-1.5 sm:mb-2">Bespoke Styling</h3>
                <p className="text-muted text-[10px] sm:text-xs leading-normal sm:leading-relaxed">
                  Tailor visual elements using our theme customizer. Select colors, switch light/dark/OS modes, and manage interface layouts.
                </p>
              </div>
            </div>

            {/* Bento Grid Card 4: Link compatibility (Spans 4 col on md, 2 col by default) */}
            <div className="col-span-2 md:col-span-4 bg-gradient-to-tr from-surface/20 to-surface-elevated/40 border border-custom-border/80 hover:border-accent/40 rounded-3xl p-5 sm:p-8 flex flex-col justify-between text-left backdrop-blur-sm transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] hover:translate-y-[-4px]">
              <div className="flex justify-between items-start">
                <div className="w-9 h-9 sm:w-12 sm:h-12 bg-accent/15 border border-accent/25 rounded-2xl grid place-items-center text-accent">
                  <Database size={16} className="sm:w-5 sm:h-5" />
                </div>
                <div className="flex flex-wrap gap-1 sm:gap-2 justify-end max-w-[70%]">
                  <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-[7px] sm:text-[8px] uppercase px-1.5 py-0.5 rounded-full">terabox</span>
                  <span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold text-[7px] sm:text-[8px] uppercase px-1.5 py-0.5 rounded-full">terashare</span>
                  <span className="bg-purple-500/10 border border-purple-500/20 text-purple-400 font-bold text-[7px] sm:text-[8px] uppercase px-1.5 py-0.5 rounded-full">1024terabox</span>
                </div>
              </div>
              <div className="mt-5 sm:mt-8">
                <h3 className="text-base sm:text-lg font-bold text-fg mb-1.5 sm:mb-2">Universal Link Compatibility</h3>
                <p className="text-muted text-[11px] sm:text-sm leading-normal sm:leading-relaxed">
                  Accepts standard formats from TeraBox share domains. Restructured API requests check validation codes and return complete meta tags including duration, resolution list, and file thumbnail cover.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="bg-surface/10 py-20 md:py-28 lg:py-32 border-y border-custom-border/60 backdrop-blur-sm select-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-fg mb-16">
            Get Streaming in 3 Steps
          </h2>
          
          <div className="grid grid-cols-3 gap-3 sm:gap-8 md:gap-12 relative">
            
            {/* Visual guide line behind circle indicators */}
            <div className="absolute top-5 sm:top-8 left-[16%] right-[16%] h-[1px] sm:h-[2px] bg-gradient-to-r from-accent/40 via-transparent to-accent/40 z-0"></div>

            <div className="text-center relative z-10 flex flex-col items-center">
              <div className="w-10 h-10 sm:w-16 sm:h-16 rounded-full bg-accent/10 border border-accent/30 text-accent font-extrabold text-xs sm:text-lg flex items-center justify-center shadow-lg shadow-accent/5 mb-3 sm:mb-6">
                1
              </div>
              <h3 className="text-[11px] sm:text-lg font-bold text-fg mb-1 sm:mb-2">Copy TeraBox URL</h3>
              <p className="text-muted text-[9px] sm:text-xs max-w-xs leading-normal sm:leading-relaxed px-1 sm:px-0">
                Grab any sharing URL from your TeraBox account, private share or community link.
              </p>
            </div>

            <div className="text-center relative z-10 flex flex-col items-center">
              <div className="w-10 h-10 sm:w-16 sm:h-16 rounded-full bg-accent/10 border border-accent/30 text-accent font-extrabold text-xs sm:text-lg flex items-center justify-center shadow-lg shadow-accent/5 mb-3 sm:mb-6">
                2
              </div>
              <h3 className="text-[11px] sm:text-lg font-bold text-fg mb-1 sm:mb-2">Paste & Resolve</h3>
              <p className="text-muted text-[9px] sm:text-xs max-w-xs leading-normal sm:leading-relaxed px-1 sm:px-0">
                Insert it into our input interface. Our cloud workers resolve signatures.
              </p>
            </div>

            <div className="text-center relative z-10 flex flex-col items-center">
              <div className="w-10 h-10 sm:w-16 sm:h-16 rounded-full bg-accent/10 border border-accent/30 text-accent font-extrabold text-xs sm:text-lg flex items-center justify-center shadow-lg shadow-accent/5 mb-3 sm:mb-6">
                3
              </div>
              <h3 className="text-[11px] sm:text-lg font-bold text-fg mb-1 sm:mb-2">Stream in HD</h3>
              <p className="text-muted text-[9px] sm:text-xs max-w-xs leading-normal sm:leading-relaxed px-1 sm:px-0">
                Enjoy zero-latency loading and select custom quality streams.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Pricing / Public Beta Access Tier */}
      <section className="py-12 sm:py-20 md:py-28 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-16 select-none">
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-fg">
              Pricing Options
            </h2>
            <p className="mt-2 sm:mt-4 text-muted text-xs sm:text-base max-w-xl mx-auto">
              Our beta release offers full premium capabilities at no cost.
            </p>
          </div>

          <div className="max-w-md mx-auto px-2 sm:px-0">
            {/* Pro Plan Card - Highly styled */}
            <div className="glass-card border-2 border-accent relative p-6 sm:p-8 rounded-3xl bg-surface/50 backdrop-blur-md shadow-2xl scale-100 sm:scale-105">
              
              <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 bg-accent text-bg px-4 py-1.5 rounded-full font-bold text-[9px] uppercase tracking-wider whitespace-nowrap">
                Most Popular / Public Beta
              </div>

              <div className="text-left select-none">
                <h3 className="text-lg sm:text-xl font-bold text-fg">Premium Pro</h3>
                <p className="text-muted text-[10px] sm:text-xs mt-1">Full access to HLS streaming tools.</p>
                <div className="mt-4 sm:mt-6 flex items-baseline gap-1.5">
                  <span className="text-4xl sm:text-5xl font-black text-fg">$0</span>
                  <span className="text-muted text-xs sm:text-sm font-semibold">/ lifetime</span>
                </div>
                <div className="mt-2 text-accent text-[10px] sm:text-xs font-bold bg-accent/10 py-1.5 px-3 rounded-lg inline-block">
                  Free Access in Public Beta
                </div>
              </div>

              {/* Feature check list */}
              <ul className="mt-6 sm:mt-8 space-y-3 sm:space-y-4 border-t border-custom-border/60 pt-5 sm:pt-6 text-left text-[11px] sm:text-xs select-none">
                {[
                  "Unlimited TeraBox resolutions & link decodes",
                  "HD quality switcher option (1080p / 720p / 480p / 360p)",
                  "Parallel API query resolving with pre-warming",
                  "Secure Watch History & playlist bookmarks",
                  "Custom theme accents and dark/light modes",
                  "Priority server stream proxies (Zero-Stall)"
                ].map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-accent/15 grid place-items-center text-accent shrink-0">
                      <Check size={10} />
                    </div>
                    <span className="text-fg/90">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6 sm:mt-8">
                <button
                  onClick={() => openAuth('signup')}
                  className="w-full py-3 sm:py-3.5 bg-accent text-bg hover:opacity-95 font-bold rounded-xl text-sm transition-all hover:-translate-y-0.5 cursor-pointer animate-none"
                >
                  Register Free Account
                </button>
              </div>

              <p className="mt-4 text-[9px] sm:text-[10px] text-muted text-center">
                Instant registration. Cloud synchronization via secure database.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQs Section */}
      <section className="py-12 sm:py-20 md:py-28 lg:py-32 bg-surface/5 border-t border-custom-border/60">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-16 select-none flex flex-col items-center">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-accent/10 border border-accent/30 text-accent grid place-items-center mb-3 sm:mb-4">
              <HelpCircle size={20} className="sm:w-[22px] sm:h-[22px]" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-fg">
              Frequently Asked Questions
            </h2>
            <p className="mt-2 text-muted text-xs sm:text-sm">
              Answers to common technical queries about TeraPlay streaming infrastructure.
            </p>
          </div>

          <div className="space-y-3 sm:space-y-4 text-left">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div 
                  key={idx}
                  className="glass-card border border-custom-border/80 rounded-2xl overflow-hidden backdrop-blur-sm"
                >
                  <button
                    onClick={() => toggleFaq(idx)}
                    className="w-full px-4 py-4 sm:px-6 sm:py-5 flex items-center justify-between text-left font-bold text-xs sm:text-base text-fg hover:bg-white/5 transition-all cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown 
                      size={16} 
                      className={`text-muted transition-transform duration-300 ${isOpen ? 'rotate-180 text-accent' : 'rotate-0'}`} 
                    />
                  </button>
                  
                  {isOpen && (
                    <div className="px-4 pb-4 sm:px-6 sm:pb-6 text-[11px] sm:text-sm text-muted leading-relaxed border-t border-custom-border/40 pt-3 sm:pt-4 animate-fade-in">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Final Call to Action Section */}
      <section className="py-12 sm:py-16 bg-gradient-to-b from-transparent to-accent-muted/10 relative overflow-hidden select-none">
        {/* Glowing background spotlight */}
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[280px] h-[280px] sm:w-[500px] sm:h-[500px] bg-accent/5 rounded-full blur-[80px] sm:blur-[120px] pointer-events-none z-0"></div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-left relative z-10 flex flex-col items-start gap-4">
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-fg leading-tight">
            Ready to Upgrade Your Streaming?
          </h2>
          <p className="text-muted text-xs sm:text-base max-w-xl leading-relaxed">
            Register your free account today during our public beta and experience instantaneous, high-definition streaming directly from the cloud.
          </p>

          <button
            onClick={() => openAuth('signup')}
            className="px-6 py-3 bg-accent text-bg hover:opacity-95 font-bold rounded-xl text-sm sm:text-base transition-all hover:scale-105 hover:shadow-[0_0_25px_var(--accent-muted)] flex items-center justify-center gap-2 cursor-pointer mt-1 sm:mt-2"
          >
            <span>Get Started for Free</span>
            <ArrowRight size={16} className="sm:w-[18px] sm:h-[18px]" />
          </button>

          <div className="flex items-center gap-2 text-[9px] sm:text-[10px] text-muted mt-1">
            <span>Unlimited streams</span>
            <span className="opacity-40">•</span>
            <span>Zero buffering</span>
            <span className="opacity-40">•</span>
            <span>Cloud sync</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-zinc-950 border-t border-custom-border/80 py-8 text-xs text-muted select-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-left">
          
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-surface border border-custom-border/80 rounded-lg grid place-items-center text-accent">
              <Play fill="currentColor" size={10} className="ml-0.5" />
            </div>
            <span className="text-xs sm:text-sm font-bold tracking-wider text-fg uppercase">TeraPlay</span>
          </div>

          <div className="flex flex-col gap-1 text-left sm:text-right max-w-xl">
            <p className="text-[9px] sm:text-[10px] text-muted opacity-70">
              © {new Date().getFullYear()} TeraPlay. All rights reserved.
            </p>
            <p className="text-[8px] sm:text-[9px] text-muted opacity-40 leading-normal">
              Disclaimer: TeraPlay is an independent application tool utilizing public streaming endpoints. We are not officially connected with TeraBox.
            </p>
          </div>

        </div>
      </footer>

    </div>
  );
}
