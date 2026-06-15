import React, { useState, useEffect, useRef } from 'react';
import { createHashRouter, RouterProvider, Routes, Route, useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import { Play, History, User, Settings, Loader2, AlertCircle, X, LogOut } from 'lucide-react';
import Sidebar from './components/Sidebar';
import HomeView from './components/HomeView';
import DiscoverView from './components/DiscoverView';
import PlayerView from './components/PlayerView';
import LibraryView from './components/LibraryView';
import ProfileView from './components/ProfileView';
import SettingsView, { ACCENT_COLORS } from './components/SettingsView';
import HistoryView from './components/HistoryView';
import ErrorBoundary from './components/ErrorBoundary';
import AuthScreen from './components/AuthScreen';
import ConfirmDialog from './components/ConfirmDialog';
import ShareModal from './components/ShareModal';
import NotFoundView from './components/NotFoundView';
import { auth, db } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, onValue, set, get, update, increment } from 'firebase/database';
import { API_BASE, API_KEY } from './config';

// Synchronously apply theme and migrate/clear mock data from localStorage
(() => {
  const saved = localStorage.getItem('teraplay_accent');
  if (saved) {
    try {
      const color = JSON.parse(saved);
      document.documentElement.style.setProperty('--color-accent', color.value);
      document.documentElement.style.setProperty('--color-accent-muted', color.muted);
    } catch (e) {
      console.error('Failed to parse theme color on boot: ', e);
    }
  }

  // Clean up old mock template data from local storage once
  if (!localStorage.getItem('teraplay_mock_cleaned_v2')) {
    localStorage.removeItem('teraplay_videos');
    localStorage.removeItem('teraplay_downloads');
    localStorage.removeItem('teraplay_history');
    localStorage.setItem('teraplay_mock_cleaned_v2', 'true');
  }

  // Handle share link redirect: /?id=VIDEO_ID → /#/player/VIDEO_ID
  const params = new URLSearchParams(window.location.search);
  const sharedVideoId = params.get('id');
  if (sharedVideoId) {
    // Clean the query param from the URL and redirect to the hash route
    window.history.replaceState(null, '', window.location.pathname);
    window.location.hash = `/player/${sharedVideoId}`;
  }
})();

const INITIAL_VIDEOS = [];

export const DISCOVER_VIDEOS = [];

const calculateTopCreators = (discoverVideosList) => {
  const creatorMap = {};
  
  discoverVideosList.forEach(vid => {
    if (!vid || !vid.uploader || !vid.uploader.uid) return;
    const uid = vid.uploader.uid;
    if (!creatorMap[uid]) {
      creatorMap[uid] = {
        uid,
        username: vid.uploader.username || `User_${uid.substring(0, 5)}`,
        avatar: vid.uploader.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150',
        videoCount: 0,
        totalViews: 0
      };
    }
    creatorMap[uid].videoCount += 1;
    creatorMap[uid].totalViews += (typeof vid.views === 'number' ? vid.views : 0);
  });

  // Sort by total views desc, then by video count desc
  const sorted = Object.values(creatorMap)
    .sort((a, b) => {
      if (b.totalViews !== a.totalViews) {
        return b.totalViews - a.totalViews;
      }
      return b.videoCount - a.videoCount;
    });

  return sorted.slice(0, 10);
};

const formatDurationHelper = (timeInSeconds) => {
  if (isNaN(timeInSeconds) || timeInSeconds <= 0) return '02:00';
  const hrs = Math.floor(timeInSeconds / 3600);
  const mins = Math.floor((timeInSeconds % 3600) / 60);
  const secs = Math.floor(timeInSeconds % 60);
  
  if (hrs > 0) {
    return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};



function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();

  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('teraplay_sidebar_collapsed') === 'true';
  });

  const handleToggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('teraplay_sidebar_collapsed', next.toString());
      return next;
    });
  };

  const [videos, setVideos] = useState([]);
  const [history, setHistory] = useState([]);
  const [discoverVideos, setDiscoverVideos] = useState([]);
  const [settings, setSettings] = useState({
    autoplay: true,
    rememberProgress: true,
    resolution: 'auto',
    accentColor: 'blue',
    autoFetch: true
  });
  const [dbCategories, setDbCategories] = useState([]);
  const [topCreators, setTopCreators] = useState([]);

  const [userProfile, setUserProfile] = useState(null);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [fetchStep, setFetchStep] = useState('');

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
  const [previewImage, setPreviewImage] = useState(null);
  const [shareVideo, setShareVideo] = useState(null);

  const resolveAbortRef = useRef(null);          // for the /api/resolve call

  // Refs to prevent stale state issues in callback functions
  const videosRef = useRef([]);
  const historyRef = useRef([]);
  const discoverVideosRef = useRef([]);
  const deletingVideoIdRef = useRef(null);

  // Scroll restoration and dynamic browser title syncing
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });

    const routeTitles = {
      '/': 'Home | TeraPlay',
      '/discover': 'Discover | TeraPlay',
      '/library': 'My Library | TeraPlay',
      '/profile': 'Profile | TeraPlay',
      '/settings': 'Settings | TeraPlay',
      '/history': 'History | TeraPlay',
    };

    const pathname = location.pathname;
    if (pathname.startsWith('/player')) {
      const parts = pathname.split('/');
      const videoId = parts[parts.length - 1];
      const allVideos = [...videos, ...discoverVideos];
      const video = allVideos.find(v => String(v.id) === String(videoId));
      document.title = video ? `${video.title} | TeraPlay` : 'Playing | TeraPlay';
    } else {
      document.title = routeTitles[pathname] || 'TeraPlay';
    }
  }, [location.pathname, videos, discoverVideos]);

  useEffect(() => {
    videosRef.current = videos;
  }, [videos]);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    discoverVideosRef.current = discoverVideos;
  }, [discoverVideos]);

  // Auth State Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);

      if (user) {
        // Run migration check: if /discoverVideos is empty, populate it from /users
        const discoverRef = ref(db, 'discoverVideos');
        get(discoverRef).then((snap) => {
          if (!snap.exists() || !snap.val()) {
            const usersRef = ref(db, 'users');
            get(usersRef).then((usersSnap) => {
              const usersData = usersSnap.val();
              if (usersData) {
                const publicVideos = {};
                Object.entries(usersData).forEach(([uid, userObj]) => {
                  const profile = userObj.profile || {};
                  const videosList = userObj.videos ? (Array.isArray(userObj.videos) ? userObj.videos : Object.values(userObj.videos)) : [];
                  videosList.forEach(vid => {
                    if (vid && vid.id) {
                      publicVideos[vid.id] = {
                        ...vid,
                        uploader: {
                          uid: uid,
                          username: profile.username || vid.uploader?.username || `User_${uid.substring(0, 5)}`,
                          avatar: profile.avatar || vid.uploader?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150'
                        }
                      };
                      delete publicVideos[vid.id].progress;
                      delete publicVideos[vid.id].favorite;
                    }
                  });
                });
                if (Object.keys(publicVideos).length > 0) {
                  set(discoverRef, publicVideos)
                    .then(() => console.log('Successfully migrated videos to discoverVideos node'))
                    .catch(err => console.error('Migration failed:', err));
                }
              }
            }).catch(err => console.error('Failed to read users for migration:', err));
          }
        }).catch(err => console.error('Failed to read discoverVideos status:', err));
      }
    });
    return unsubscribe;
  }, []);

  // Sync Database
  useEffect(() => {
    if (!currentUser) {
      setVideos([]);
      setHistory([]);
      return;
    }

    const dbVideosRef = ref(db, `users/${currentUser.uid}/videos`);
    const unsubscribeVideos = onValue(dbVideosRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setVideos(data);
      } else {
        const local = localStorage.getItem('teraplay_videos');
        if (local) {
          try {
            const parsed = JSON.parse(local);
            if (parsed && parsed.length > 0) {
              set(dbVideosRef, parsed);
              setVideos(parsed);
              localStorage.removeItem('teraplay_videos');
              return;
            }
          } catch (e) {
            console.error('Failed to parse local videos: ', e);
          }
        }
        setVideos([]);
      }
    });

    const dbHistoryRef = ref(db, `users/${currentUser.uid}/history`);
    const unsubscribeHistory = onValue(dbHistoryRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setHistory(data);
      } else {
        const local = localStorage.getItem('teraplay_history');
        if (local) {
          try {
            const parsed = JSON.parse(local);
            if (parsed && parsed.length > 0) {
              set(dbHistoryRef, parsed);
              setHistory(parsed);
              localStorage.removeItem('teraplay_history');
              return;
            }
          } catch (e) {
            console.error('Failed to parse local history: ', e);
          }
        }
        setHistory([]);
      }
    });

    return () => {
      unsubscribeVideos();
      unsubscribeHistory();
    };
  }, [currentUser]);

  // Sync Settings
  useEffect(() => {
    if (!currentUser) {
      // Load from localStorage
      const autoplay = localStorage.getItem('teraplay_autoplay') !== 'false';
      const rememberProgress = localStorage.getItem('teraplay_remember_progress') !== 'false';
      const resolution = localStorage.getItem('teraplay_resolution') || 'auto';
      const autoFetch = localStorage.getItem('teraplay_autofetch') !== 'false';
      
      let accentColor = 'blue';
      const savedAccent = localStorage.getItem('teraplay_accent');
      if (savedAccent) {
        try {
          accentColor = JSON.parse(savedAccent).name || 'blue';
        } catch (e) {
          accentColor = 'blue';
        }
      }

      setSettings({
        autoplay,
        rememberProgress,
        resolution,
        accentColor,
        autoFetch
      });
      return;
    }

    const settingsRef = ref(db, `users/${currentUser.uid}/settings`);
    const unsubscribe = onValue(settingsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setSettings({
          autoplay: data.autoplay !== undefined ? data.autoplay : true,
          rememberProgress: data.rememberProgress !== undefined ? data.rememberProgress : true,
          resolution: data.resolution || 'auto',
          accentColor: data.accentColor || 'blue',
          autoFetch: data.autoFetch !== undefined ? data.autoFetch : true
        });
      } else {
        // First-time logged-in user: migrate from localStorage if present
        const autoplay = localStorage.getItem('teraplay_autoplay') !== 'false';
        const rememberProgress = localStorage.getItem('teraplay_remember_progress') !== 'false';
        const resolution = localStorage.getItem('teraplay_resolution') || 'auto';
        const autoFetch = localStorage.getItem('teraplay_autofetch') !== 'false';
        
        let accentColor = 'blue';
        const savedAccent = localStorage.getItem('teraplay_accent');
        if (savedAccent) {
          try {
            accentColor = JSON.parse(savedAccent).name || 'blue';
          } catch (e) {
            accentColor = 'blue';
          }
        }

        const initialSettings = {
          autoplay,
          rememberProgress,
          resolution,
          accentColor,
          autoFetch
        };
        set(settingsRef, initialSettings);
        setSettings(initialSettings);
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Apply accent color theme whenever settings change
  useEffect(() => {
    if (!settings.accentColor) return;
    const color = ACCENT_COLORS.find(c => c.name === settings.accentColor);
    if (color) {
      document.documentElement.style.setProperty('--color-accent', color.value);
      document.documentElement.style.setProperty('--color-accent-muted', color.muted);
      localStorage.setItem('teraplay_accent', JSON.stringify(color));
    }
  }, [settings.accentColor]);

  // Sync Realtime User Profile Data globally
  useEffect(() => {
    if (!currentUser) {
      setUserProfile(null);
      return;
    }
    const profileRef = ref(db, `users/${currentUser.uid}/profile`);
    const unsubscribe = onValue(profileRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setUserProfile(data);
      } else {
        const initialProfile = {
          username: currentUser.displayName || 'User',
          email: currentUser.email || '',
          tier: 'Premium Pro',
          avatar: currentUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150'
        };
        setUserProfile(initialProfile);
      }
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Fetch Categories from RTDB
  useEffect(() => {
    if (!currentUser) {
      setDbCategories([]);
      return;
    }
    const categoriesRef = ref(db, 'categories');
    const unsubscribe = onValue(categoriesRef, (snapshot) => {
      const data = snapshot.val();
      if (data && Array.isArray(data)) {
        setDbCategories(data);
      } else {
        // Initialize if not present
        const defaultCategories = ['Cinema', 'Lo-Fi', 'Animation', 'Nature', 'Tech', 'Tutorials'];
        set(categoriesRef, defaultCategories);
        setDbCategories(defaultCategories);
      }
    });
    return unsubscribe;
  }, [currentUser]);

  // Fetch Top Creators from RTDB
  useEffect(() => {
    if (!currentUser) {
      setTopCreators([]);
      return;
    }
    const topCreatorsRef = ref(db, 'topCreators');
    const unsubscribe = onValue(topCreatorsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setTopCreators(Array.isArray(data) ? data : Object.values(data));
      } else {
        setTopCreators([]);
      }
    });
    return unsubscribe;
  }, [currentUser]);

  // Fetch Discover Videos dynamically from Realtime Database
  useEffect(() => {
    if (!currentUser) {
      setDiscoverVideos([]);
      return;
    }
    const discoverRef = ref(db, 'discoverVideos');
    const unsubscribe = onValue(discoverRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const videoList = Array.isArray(data) ? data : Object.values(data);
        const uniqueVids = videoList.filter(vid => vid && vid.id);
        setDiscoverVideos(uniqueVids);

        // Calculate and update top creators list in database
        const calculatedCreators = calculateTopCreators(uniqueVids);
        set(ref(db, 'topCreators'), calculatedCreators);
      } else {
        setDiscoverVideos([]);
      }
    }, (error) => {
      console.error("Firebase Discover fetch failed:", error);
      setDiscoverVideos([]);
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Sync public metadata updates into the current user's private library
  useEffect(() => {
    if (!currentUser || !videos || videos.length === 0 || !discoverVideos || discoverVideos.length === 0) {
      return;
    }
    
    let mutated = false;
    const synced = videos.map(v => {
      const publicVid = discoverVideos.find(pv => String(pv.id) === String(v.id));
      if (publicVid) {
        const updates = {};
        if (publicVid.duration && publicVid.duration !== '02:00' && publicVid.duration !== v.duration) {
          updates.duration = publicVid.duration;
        }
        if (publicVid.resolution && publicVid.resolution !== 'Auto' && publicVid.resolution !== v.resolution) {
          updates.resolution = publicVid.resolution;
        }
        if (publicVid.category && publicVid.category !== v.category) {
          updates.category = publicVid.category;
        }
        if (typeof publicVid.views === 'number' && publicVid.views !== v.views) {
          updates.views = publicVid.views;
        }
        if (typeof publicVid.plays === 'number' && publicVid.plays !== v.plays) {
          updates.plays = publicVid.plays;
        }
        
        if (Object.keys(updates).length > 0) {
          mutated = true;
          return { ...v, ...updates };
        }
      }
      return v;
    });

    if (mutated) {
      console.log('[App] Syncing public video metadata changes to private library');
      set(ref(db, `users/${currentUser.uid}/videos`), synced);
    }
  }, [currentUser, videos, discoverVideos]);

  const handleVideoSelect = (video) => {
    const currentVideos = videosRef.current;
    const currentHistory = historyRef.current;

    const vidIdStr = String(video.id);
    const updatedVideos = currentVideos.map(v => {
      const isSelected = String(v.id) === vidIdStr;
      const currentProgress = typeof v.progress === 'number' && !isNaN(v.progress) ? v.progress : 0;
      return {
        ...v,
        progress: isSelected 
          ? (currentProgress === 0 ? 1 : currentProgress)
          : currentProgress,
        relativeTime: isSelected ? 'Just now' : (v.relativeTime || 'Just now'),
        addedDate: isSelected ? new Date().toISOString() : (v.addedDate || new Date().toISOString())
      };
    });

    // Update watch history logs
    const filteredHistory = currentHistory.filter(h => String(h.videoId) !== vidIdStr);
    const videoProgress = typeof video.progress === 'number' && !isNaN(video.progress) ? video.progress : 0;
    const newRecord = {
      id: `h_${Date.now()}`,
      videoId: video.id,
      title: video.title,
      size: video.size,
      duration: video.duration,
      thumbnail: video.thumbnail,
      progress: videoProgress === 0 ? 1 : videoProgress,
      watchedAt: new Date().toISOString()
    };
    const updatedHistory = [newRecord, ...filteredHistory].slice(0, 50);

    if (currentUser) {
      set(ref(db, `users/${currentUser.uid}/videos`), updatedVideos);
      set(ref(db, `users/${currentUser.uid}/history`), updatedHistory);
    } else {
      setVideos(updatedVideos);
      setHistory(updatedHistory);
    }
  };

  const handleImportVideo = React.useCallback((video) => {
    const currentVideos = videosRef.current;
    const vidIdStr = String(video.id);
    if (currentVideos.some(v => String(v.id) === vidIdStr)) {
      return; // Already imported
    }

    const imported = {
      ...video,
      favorite: video.favorite || false,
      progress: 0,
      addedDate: new Date().toISOString(),
      relativeTime: 'Just now'
    };

    const updated = [imported, ...currentVideos];
    if (currentUser) {
      set(ref(db, `users/${currentUser.uid}/videos`), updated);
    } else {
      setVideos(updated);
    }
  }, [currentUser]);

  const handleToggleFavorite = (videoId) => {
    const currentVideos = videosRef.current;
    const vidIdStr = String(videoId);
    const exists = currentVideos.some(v => String(v.id) === vidIdStr);
    
    if (!exists) {
      // Look up in discoverVideos and import as favorited
      const activeDiscover = discoverVideosRef.current || [];
      const discVid = activeDiscover.find(v => String(v.id) === vidIdStr);
      if (discVid) {
        handleImportVideo({ ...discVid, favorite: true });
        return;
      }
    }

    const updated = currentVideos.map(v => {
      if (String(v.id) === vidIdStr) {
        return { ...v, favorite: !v.favorite };
      }
      return v;
    });
    if (currentUser) {
      set(ref(db, `users/${currentUser.uid}/videos`), updated);
    } else {
      setVideos(updated);
    }
  };

  const handleFetch = React.useCallback(async (url) => {
    // Abort any in-flight resolve request
    if (resolveAbortRef.current) {
      resolveAbortRef.current.abort();
    }
    const controller = new AbortController();
    resolveAbortRef.current = controller;

    setIsFetching(true);
    setFetchError(null);
    setFetchStep('Connecting to TeraBridge...');
    
    try {
      let headers = {};
      if (currentUser) {
        try {
          const idToken = await currentUser.getIdToken();
          headers['Authorization'] = `Bearer ${idToken}`;
        } catch (e) {
          console.error('Failed to get Firebase ID token: ', e);
        }
      }

      const response = await fetch(`${API_BASE}/api/resolve?url=${encodeURIComponent(url)}&mode=stream`, {
        signal: controller.signal,
        headers: headers
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }
      
      setFetchStep('Parsing file details...');
      const data = await response.json();
      
      const videoFiles = (data.files || []).filter(file => !file.is_directory);
      if (videoFiles.length === 0) {
        throw new Error('No playable video files found in this share link.');
      }
      
      const newVideos = videoFiles.map((file, idx) => {
        const fileId = file.fs_id || `${Date.now()}_${idx}`;
        let sizeStr = 'Unknown Size';
        if (file.size_mb) {
          sizeStr = `${file.size_mb.toFixed(1)} MB`;
        } else if (file.size_bytes) {
          sizeStr = `${(file.size_bytes / (1024 * 1024)).toFixed(1)} MB`;
        }
        
        const thumbUrl = file.thumbnails?.url2 || file.thumbnails?.url1 || file.thumbnails?.icon || 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=600';
        
        // Use the backend-provided signed stream URL, fallback if unavailable
        const streamUrl = file.stream_url || `${API_BASE}/api/stream/manifest?url=${encodeURIComponent(url)}&index=${idx}&key=${API_KEY}`;
        
        let detectedRes = '';
        if (file.streams && Object.keys(file.streams).length > 0) {
          if (file.streams['M3U8_AUTO_1080']) detectedRes = '1080P Full HD';
          else if (file.streams['M3U8_AUTO_720']) detectedRes = '720P HD';
          else if (file.streams['M3U8_AUTO_480']) detectedRes = '480P';
          else if (file.streams['M3U8_AUTO_360']) detectedRes = '360P';
        }
        if (!detectedRes) {
          const nameLower = (file.filename || '').toLowerCase();
          if (nameLower.includes('4k') || nameLower.includes('2160p')) {
            detectedRes = '4K Ultra HD';
          } else if (nameLower.includes('1080p') || nameLower.includes('fhd')) {
            detectedRes = '1080P Full HD';
          } else if (nameLower.includes('720p') || nameLower.includes('hdtc') || nameLower.includes('hdrip') || nameLower.includes('720')) {
            detectedRes = '720P HD';
          } else if (nameLower.includes('480p') || nameLower.includes('480')) {
            detectedRes = '480P';
          } else if (nameLower.includes('360p') || nameLower.includes('360')) {
            detectedRes = '360P';
          } else {
            detectedRes = 'Auto';
          }
        }

        const titleLower = (file.filename || '').toLowerCase();
        let autoCategory = 'General';
        if (titleLower.includes('movie') || titleLower.includes('film') || titleLower.includes('trailer') || titleLower.includes('cinematic') || titleLower.includes('cinema') || titleLower.includes('teaser') || titleLower.includes('episode') || titleLower.includes('season')) {
          autoCategory = 'Cinema';
        } else if (titleLower.includes('lofi') || titleLower.includes('lo-fi') || titleLower.includes('relax') || titleLower.includes('beats') || titleLower.includes('chill') || titleLower.includes('music') || titleLower.includes('song') || titleLower.includes('ambient') || titleLower.includes('playlist')) {
          autoCategory = 'Lo-Fi';
        } else if (titleLower.includes('animation') || titleLower.includes('anime') || titleLower.includes('cartoon') || titleLower.includes('blender') || titleLower.includes('cgi') || titleLower.includes('animated') || titleLower.includes('sintel') || titleLower.includes('bunny')) {
          autoCategory = 'Animation';
        } else if (titleLower.includes('nature') || titleLower.includes('travel') || titleLower.includes('fjord') || titleLower.includes('scenery') || titleLower.includes('forest') || titleLower.includes('documentary') || titleLower.includes('drone')) {
          autoCategory = 'Nature';
        } else if (titleLower.includes('tech') || titleLower.includes('science') || titleLower.includes('nasa') || titleLower.includes('space') || titleLower.includes('dev') || titleLower.includes('code') || titleLower.includes('program')) {
          autoCategory = 'Tech';
        } else if (titleLower.includes('tutorial') || titleLower.includes('course') || titleLower.includes('guide') || titleLower.includes('learn') || titleLower.includes('how to') || titleLower.includes('how-to') || titleLower.includes('lesson')) {
          autoCategory = 'Tutorials';
        }

        return {
          id: fileId,
          title: file.filename || `TeraBox Video #${fileId.substring(0, 6)}`,
          description: `Imported from TeraBox URL. High-speed HLS stream proxied via TeraBridge. Original Path: ${file.path || '/'}`,
          size: sizeStr,
          duration: typeof file.duration === 'number' 
            ? formatDurationHelper(file.duration) 
            : (typeof file.duration === 'string' && file.duration.trim() ? file.duration : '02:00'),
          progress: 0,
          favorite: false,
          videoUrl: streamUrl,
          downloadUrl: file.dlink,
          thumbnail: thumbUrl,
          relativeTime: 'Just now',
          addedDate: new Date().toISOString(),
          resolution: detectedRes,
          streamReady: true,
          originalUrl: url,
          fileIndex: idx,
          category: autoCategory,
          views: 0,
          plays: 0
        };
      });
      
      const currentVideos = videosRef.current;
      const currentHistory = historyRef.current;

      const existingIds = new Set(currentVideos.map(v => String(v.id)));
      const filteredNew = newVideos.filter(nv => !existingIds.has(String(nv.id)));
      const updatedVideos = [...filteredNew, ...currentVideos];

      const historyRecords = newVideos.map(nv => ({
        id: `h_${Date.now()}_${nv.id}`,
        videoId: nv.id,
        title: nv.title,
        size: nv.size,
        duration: nv.duration,
        thumbnail: nv.thumbnail,
        progress: 0,
        watchedAt: new Date().toISOString()
      }));
      const updatedHistory = [...historyRecords, ...currentHistory].slice(0, 50);

      if (currentUser) {
        set(ref(db, `users/${currentUser.uid}/videos`), updatedVideos);
        set(ref(db, `users/${currentUser.uid}/history`), updatedHistory);

        // Publish newly fetched videos to the public discoverVideos pool
        newVideos.forEach(nv => {
          const uploaderObj = {
            uid: currentUser.uid,
            username: userProfile?.username || currentUser.displayName || `User_${currentUser.uid.substring(0, 5)}`,
            avatar: userProfile?.avatar || currentUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150'
          };
          const publicVideo = {
            ...nv,
            uploader: uploaderObj
          };
          // Remove user-specific properties
          delete publicVideo.progress;
          delete publicVideo.favorite;

          set(ref(db, `discoverVideos/${nv.id}`), publicVideo)
            .catch(err => console.error("Failed to post public video:", err));
        });
      } else {
        setVideos(updatedVideos);
        setHistory(updatedHistory);
      }

      const firstFileId = newVideos[0].id;
      navigate(`/player/${firstFileId}`);
      
    } catch (err) {
      if (err.name === 'AbortError') return; // User typed a new link — silently ignore
      console.error('API Resolve Error:', err);
      setFetchError(err.message || 'An unexpected error occurred while resolving your link. Please try again.');
    } finally {
      setIsFetching(false);
    }
  }, [currentUser, navigate]);

  const handleClearAllHistory = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Clear Watch History',
      message: 'Are you sure you want to clear your complete watch history? This cannot be undone.',
      onConfirm: () => {
        if (currentUser) {
          set(ref(db, `users/${currentUser.uid}/history`), null);
        } else {
          setHistory([]);
        }
        setConfirmDialog(d => ({ ...d, isOpen: false }));
      },
    });
  };

  const handleRemoveHistoryItem = (id) => {
    const currentHistory = historyRef.current;
    const updated = currentHistory.filter(h => String(h.id) !== String(id));
    if (currentUser) {
      set(ref(db, `users/${currentUser.uid}/history`), updated.length > 0 ? updated : null);
    } else {
      setHistory(updated);
    }
  };

  const handlePlayFromHistory = (videoId) => {
    const matched = videos.find(v => String(v.id) === String(videoId));
    if (matched) {
      handleVideoSelect(matched);
      navigate(`/player/${videoId}`);
    } else {
      navigate('/');
    }
  };

  const handleUpdateVideo = (updatedVideo) => {
    if (deletingVideoIdRef.current && String(updatedVideo.id) === String(deletingVideoIdRef.current)) {
      console.log('Skipping update/progress save for deleting video:', updatedVideo.id);
      return;
    }
    const currentVideos = videosRef.current;
    // Sanitize the updated video properties
    const safe = { ...updatedVideo };
    if (safe.progress === undefined || safe.progress === null || isNaN(safe.progress)) {
      safe.progress = 0;
    }
    const updated = currentVideos.map(v => {
      const isTarget = String(v.id) === String(safe.id);
      const videoObj = isTarget ? { ...v, ...safe } : v;
      if (videoObj.progress === undefined || videoObj.progress === null || isNaN(videoObj.progress)) {
        videoObj.progress = 0;
      }
      return videoObj;
    });
    if (currentUser) {
      set(ref(db, `users/${currentUser.uid}/videos`), updated);
      // Also update views and plays dynamically in discoverVideos if this video exists there
      const publicVideoRef = ref(db, `discoverVideos/${updatedVideo.id}`);
      get(publicVideoRef).then(snap => {
        if (snap.exists()) {
          const dbVid = snap.val() || {};
          const updateData = {};
          
          if (typeof updatedVideo.views === 'number' && updatedVideo.views > (dbVid.views || 0)) {
            updateData.views = updatedVideo.views;
          }
          if (typeof updatedVideo.plays === 'number' && updatedVideo.plays > (dbVid.plays || 0)) {
            updateData.plays = updatedVideo.plays;
          }
          if (updatedVideo.duration && updatedVideo.duration !== '02:00' && updatedVideo.duration !== dbVid.duration) {
            updateData.duration = updatedVideo.duration;
          }
          if (updatedVideo.category && updatedVideo.category !== dbVid.category) {
            updateData.category = updatedVideo.category;
          }
          
          if (Object.keys(updateData).length > 0) {
            console.log('[App] Updating public discover video fields:', updateData);
            update(publicVideoRef, updateData).catch(err => console.error('Failed to update discover video fields:', err));
          }
        }
      });
    } else {
      setVideos(updated);
    }
  };

  const handleIncrementVideoViewsAndPlays = (videoId) => {
    if (!currentUser) return;
    const publicVideoRef = ref(db, `discoverVideos/${videoId}`);
    update(publicVideoRef, {
      views: increment(1),
      plays: increment(1)
    }).catch(err => console.error("Failed to increment views/plays atomically:", err));
  };

  const handleDeleteVideo = (videoId) => {
    const vidIdStr = String(videoId);
    deletingVideoIdRef.current = vidIdStr;
    const matched = videosRef.current.find(v => String(v.id) === vidIdStr);
    const title = matched ? matched.title : 'this video';
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Video',
      message: `Are you sure you want to delete "${title}" from your library?`,
      onConfirm: () => {
        setConfirmDialog(d => ({ ...d, isOpen: false }));
        
        const currentVideos = videosRef.current;
        const currentHistory = historyRef.current;
        const updatedVideos = currentVideos.filter(v => String(v.id) !== vidIdStr);
        const updatedHistory = currentHistory.filter(h => String(h.videoId) !== vidIdStr);

        // If we are currently playing this video, navigate to home immediately
        if (window.location.hash.includes(vidIdStr)) {
          navigate('/', { replace: true });
        }

        if (currentUser) {
          set(ref(db, `users/${currentUser.uid}/videos`), updatedVideos.length > 0 ? updatedVideos : null)
            .catch(err => console.error('Failed to delete video from database:', err));
          set(ref(db, `users/${currentUser.uid}/history`), updatedHistory.length > 0 ? updatedHistory : null)
            .catch(err => console.error('Failed to delete history from database:', err));
          set(ref(db, `users/${currentUser.uid}/progress/${videoId}`), null)
            .catch(err => console.error('Failed to delete progress from database:', err));
        } else {
          setVideos(updatedVideos);
          setHistory(updatedHistory);
        }
        
        // Reset deleting ref after a brief timeout to let route transition complete
        setTimeout(() => {
          if (deletingVideoIdRef.current === vidIdStr) {
            deletingVideoIdRef.current = null;
          }
        }, 100);
      },
      onCancel: () => {
        setConfirmDialog(d => ({ ...d, isOpen: false }));
        deletingVideoIdRef.current = null;
      }
    });
  };

  const handleUpdateSettings = (newSettings) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      if (currentUser) {
        set(ref(db, `users/${currentUser.uid}/settings`), updated);
      } else {
        localStorage.setItem('teraplay_autoplay', updated.autoplay.toString());
        localStorage.setItem('teraplay_remember_progress', updated.rememberProgress.toString());
        localStorage.setItem('teraplay_resolution', updated.resolution);
        localStorage.setItem('teraplay_autofetch', updated.autoFetch.toString());
      }
      return updated;
    });
  };

  const handleResetData = () => {
    if (currentUser) {
      set(ref(db, `users/${currentUser.uid}/videos`), null);
      set(ref(db, `users/${currentUser.uid}/history`), null);
      set(ref(db, `users/${currentUser.uid}/settings`), null);
    } else {
      localStorage.removeItem('teraplay_videos');
      localStorage.removeItem('teraplay_history');
      localStorage.removeItem('teraplay_autoplay');
      localStorage.removeItem('teraplay_remember_progress');
      localStorage.removeItem('teraplay_resolution');
      localStorage.removeItem('teraplay_autofetch');
      localStorage.removeItem('teraplay_accent');
      setVideos(INITIAL_VIDEOS);
      setHistory([]);
      setSettings({
        autoplay: true,
        rememberProgress: true,
        resolution: 'auto',
        accentColor: 'blue',
        autoFetch: true
      });
    }
  };

  if (authLoading) {
    return (
      <div className="fixed inset-0 bg-bg z-[9999] flex items-center justify-center font-body">
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 size={40} className="text-accent animate-spin" />
          <p className="text-sm text-muted animate-pulse font-medium">Initializing Secure Connection...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthScreen />;
  }

  return (
    <div className="flex min-h-screen bg-bg relative text-fg">
      <Sidebar isCollapsed={sidebarCollapsed} onToggleCollapse={handleToggleSidebar} />

      {/* Mobile Top Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-glass backdrop-blur-3xl border-b border-custom-border z-[90] flex items-center justify-between px-4 md:hidden select-none">
        <Link to="/" className="flex items-center gap-2 font-bold text-base text-fg cursor-pointer">
          <div className="w-7 h-7 bg-accent rounded-lg grid place-items-center text-bg">
            <Play fill="currentColor" size={12} className="ml-0.5" />
          </div>
          <span>TeraBox Player</span>
        </Link>
        <div className="flex items-center gap-1">
          <Link to="/history" className="p-2 text-muted hover:text-accent hover:bg-surface-elevated rounded-xl transition-all" aria-label="Watch history">
            <History size={20} />
          </Link>
          <Link to="/profile" className="p-2 text-muted hover:text-accent hover:bg-surface-elevated rounded-xl transition-all" aria-label="Profile">
            <User size={20} />
          </Link>
          <Link to="/settings" className="p-2 text-muted hover:text-accent hover:bg-surface-elevated rounded-xl transition-all" aria-label="Settings">
            <Settings size={20} />
          </Link>
        </div>
      </header>

      <main className={`flex-1 ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'} transition-all duration-300 p-4 pt-20 md:p-10 w-full min-h-screen pb-28 md:pb-10 box-border flex flex-col`}>
        <div className="max-w-[1400px] w-full mx-auto flex-1 flex flex-col">
          <Routes>
            <Route path="/" element={
              <HomeView 
                videos={videos} 
                userProfile={userProfile}
                onVideoSelect={handleVideoSelect}
                onFetch={handleFetch}
                onPreviewImage={setPreviewImage}
                onDeleteVideo={handleDeleteVideo}
                onShareVideo={setShareVideo}
                currentUser={currentUser}
                settings={settings}
                onUpdateSettings={handleUpdateSettings}
              />
            } />
            <Route path="/player/:id?" element={
              <PlayerRouteWrapper 
                videos={videos} 
                discoverVideos={discoverVideos}
                handleToggleFavorite={handleToggleFavorite}
                handleVideoSelect={handleVideoSelect}
                handleUpdateVideo={handleUpdateVideo}
                handleIncrementVideoViewsAndPlays={handleIncrementVideoViewsAndPlays}
                currentUser={currentUser}
                onDeleteVideo={handleDeleteVideo}
                onShareVideo={setShareVideo}
                settings={settings}
              />
            } />
            <Route path="/discover" element={
              <DiscoverView 
                videos={videos} 
                discoverVideos={discoverVideos}
                onVideoSelect={handleVideoSelect}
                onPreviewImage={setPreviewImage}
                onShareVideo={setShareVideo}
                onImportVideo={handleImportVideo}
                currentUser={currentUser}
                dbCategories={dbCategories}
                topCreators={topCreators}
              />
            } />
            <Route path="/library" element={
              <LibraryView 
                videos={videos} 
                onVideoSelect={handleVideoSelect}
                onPreviewImage={setPreviewImage}
                onDeleteVideo={handleDeleteVideo}
                onShareVideo={setShareVideo}
              />
            } />
            <Route path="/profile" element={
              <ProfileView videos={videos} history={history} currentUser={currentUser} userProfile={userProfile} onVideoSelect={handleVideoSelect} />
            } />
            <Route path="/settings" element={
              <SettingsView settings={settings} onUpdateSettings={handleUpdateSettings} onResetData={handleResetData} currentUser={currentUser} />
            } />
            <Route path="/history" element={
              <HistoryView 
                history={history}
                onClearHistory={handleClearAllHistory}
                onRemoveItem={handleRemoveHistoryItem}
                onPlayVideo={handlePlayFromHistory}
              />
            } />
            <Route path="*" element={<NotFoundView />} />
          </Routes>
        </div>
      </main>

      {/* Loading Overlay */}
      {isFetching && (
        <div className="fixed inset-0 bg-bg/85 backdrop-blur-md z-[9999] flex items-center justify-center animate-fade-in p-4">
          <div className="glass-card p-8 rounded-2xl border border-custom-border max-w-sm w-full text-center flex flex-col items-center gap-6 shadow-glass animate-in fade-in zoom-in-95 duration-200">
            <div className="relative flex items-center justify-center w-16 h-16">
              <Loader2 size={40} className="text-accent animate-spin" />
              <div className="absolute inset-0 w-16 h-16 rounded-full border border-accent/20 animate-pulse"></div>
            </div>
            <div>
              <h3 className="text-lg font-bold text-fg mb-1">Resolving TeraBox URL</h3>
              <p className="text-xs text-accent font-medium animate-pulse">{fetchStep}</p>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              We are connecting to the high-speed cache resolver to construct your direct media stream.
            </p>
          </div>
        </div>
      )}

      {/* Error Overlay Modal */}
      {fetchError && (
        <div className="fixed inset-0 bg-bg/85 backdrop-blur-md z-[9999] flex items-center justify-center animate-fade-in p-4">
          <div className="glass-card p-6 rounded-2xl border border-rose-500/20 max-w-md w-full shadow-glass relative flex flex-col items-center text-center gap-5 animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setFetchError(null)} 
              className="absolute top-4 right-4 text-muted hover:text-fg rounded-full p-1 hover:bg-white/5 transition-all cursor-pointer"
              aria-label="Dismiss error"
            >
              <X size={18} />
            </button>
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 grid place-items-center text-rose-400">
              <AlertCircle size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-fg mb-2">Resolution Failed</h3>
              <p className="text-sm text-muted leading-relaxed break-words">{fetchError}</p>
            </div>
            <button 
              onClick={() => setFetchError(null)}
              className="w-full py-2.5 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-400 font-semibold rounded-xl text-xs transition-all cursor-pointer animate-out duration-200"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Custom Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel="Yes, proceed"
        danger={true}
        onConfirm={confirmDialog.onConfirm}
        onCancel={confirmDialog.onCancel || (() => setConfirmDialog(d => ({ ...d, isOpen: false })))}
      />

      {/* Share Video Modal */}
      <ShareModal
        isOpen={!!shareVideo}
        onClose={() => setShareVideo(null)}
        video={shareVideo}
      />

      {/* Fullscreen Thumbnail Preview Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-[9999] flex flex-col items-center justify-center animate-fade-in p-4 cursor-zoom-out select-none" 
          onClick={() => setPreviewImage(null)}
        >
          <button 
            type="button"
            onClick={() => setPreviewImage(null)} 
            className="absolute top-6 right-6 text-white/70 hover:text-white hover:bg-white/10 rounded-full p-2.5 transition-all cursor-pointer"
            aria-label="Close preview"
          >
            <X size={24} />
          </button>
          <div 
            className="max-w-4xl max-h-[85vh] flex flex-col items-center gap-4 animate-in fade-in zoom-in-95 duration-200 cursor-default" 
            onClick={(e) => e.stopPropagation()}
          >
            <img 
              src={previewImage.url} 
              alt={previewImage.title} 
              className="max-w-full max-h-[75vh] object-contain rounded-2xl border border-white/10 shadow-2xl"
            />
            <p className="text-white/90 text-sm font-semibold text-center px-4 line-clamp-2 select-text max-w-2xl">{previewImage.title}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function PlayerRouteWrapper({ videos, discoverVideos = [], handleToggleFavorite, handleVideoSelect, handleUpdateVideo, handleIncrementVideoViewsAndPlays, currentUser, onDeleteVideo, onShareVideo, settings }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const activeDiscover = discoverVideos || [];

  const activeVideoId = id || (videos.length > 0 ? videos[0].id : (activeDiscover.length > 0 ? activeDiscover[0].id : null));
  
  let activeVideo = videos.find(v => String(v.id) === String(activeVideoId));
  if (!activeVideo) {
    activeVideo = activeDiscover.find(v => String(v.id) === String(activeVideoId));
  }

  if (!activeVideo) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center text-muted gap-4">
        <p>No video selected.</p>
        <button 
          className="px-5 py-2 bg-accent text-bg rounded-xl font-semibold hover:opacity-90 cursor-pointer"
          onClick={() => navigate('/')}
        >
          Go back Home
        </button>
      </div>
    );
  }

  const combinedRelated = [...videos, ...activeDiscover.filter(dv => !videos.some(v => String(v.id) === String(dv.id)))];

  return (
    <PlayerView 
      video={activeVideo} 
      relatedVideos={combinedRelated}
      onVideoSelect={handleVideoSelect}
      onBack={() => navigate(-1)}
      onToggleFavorite={handleToggleFavorite}
      onUpdateVideo={handleUpdateVideo}
      onIncrementViewsAndPlays={handleIncrementVideoViewsAndPlays}
      currentUser={currentUser}
      onDeleteVideo={onDeleteVideo}
      onShareVideo={onShareVideo}
      settings={settings}
    />
  );
}

const router = createHashRouter([
  {
    path: '*',
    element: <AppShell />
  }
]);

export default function App() {
  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  );
}
