import React, { useState, useRef, useCallback } from 'react';
import { db } from '../firebase';
import { ref, set } from 'firebase/database';
import { useAuth } from '../contexts/AuthContext';
import { formatDuration } from '../utils/formatDuration';
import { detectResolution } from '../utils/detectResolution';
import { categorizeVideo } from '../utils/categorizeVideo';

export function useFetch(currentUser, navigate, { videosRef, historyRef, userProfile, setVideosInDb, setHistoryInDb, shareToDiscover }) {
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [fetchStep, setFetchStep] = useState('');
  const resolveAbortRef = useRef(null);

  const { apiBase } = useAuth();

  const handleFetch = useCallback(async (url) => {
    if (resolveAbortRef.current) {
      resolveAbortRef.current.abort();
    }
    const controller = new AbortController();
    resolveAbortRef.current = controller;

    setIsFetching(true);
    setFetchError(null);
    setFetchStep('Connecting to TeraBridge...');

    // Always authenticate with the signed-in user's Firebase ID token.
    // The master TeraBridge API key is deliberately NOT used anywhere on
    // the client — it used to leak through /config/apiKey. The backend's
    // check_auth() accepts a Firebase JWT via verify_firebase_token().
    const doResolve = async (forceRefresh) => {
      const idToken = await currentUser.getIdToken(forceRefresh);
      const activeApiBase = apiBase || '';
      return fetch(`${activeApiBase}/api/resolve?url=${encodeURIComponent(url)}&mode=stream`, {
        signal: controller.signal,
        headers: { Authorization: `Bearer ${idToken}` }
      });
    };

    try {
      let response = await doResolve(false);

      // 401 can mean the cached ID token expired (~1h lifetime). Force a
      // refresh once and retry before surfacing an auth error to the user.
      if (response.status === 401) {
        response = await doResolve(true);
      }

      // Rate-limited: surface a friendly, actionable message rather than a
      // generic "status 429" string. The backend sends Retry-After (seconds).
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const wait = retryAfter ? ` Try again in ${retryAfter}s.` : ' Please try again shortly.';
        throw new Error(`Too many requests — rate limit reached.${wait}`);
      }

      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }

      setFetchStep('Parsing file details...');
      const data = await response.json();

      const VIDEO_EXTENSIONS = ['.mp4', '.mkv', '.webm', '.avi', '.mov', '.flv', '.wmv', '.m4v', '.3gp', '.mpg', '.mpeg', '.ts', '.m3u8'];
      const videoFiles = (data.files || []).filter(file => {
        if (file.is_directory) return false;
        const name = (file.filename || '').toLowerCase();
        return VIDEO_EXTENSIONS.some(ext => name.endsWith(ext));
      });
      
      if (videoFiles.length === 0) {
        const otherFiles = (data.files || []).filter(file => !file.is_directory);
        if (otherFiles.length > 0) {
          navigate(`/files?url=${encodeURIComponent(url)}`, { state: { resolvedData: data } });
          return;
        }
        throw new Error('No files found in this share link.');
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

        // Use the signed stream URL from the API (contains time-limited HMAC sig).
        // Never fall back to embedding the static API_KEY in the URL — that leaks
        // the master key into network tabs, shared links, and the public DB.
        const streamUrl = file.stream_url || null;

        const detectedRes = detectResolution(file.filename, file.streams);
        const autoCategory = categorizeVideo(file.filename);

        return {
          id: fileId,
          title: file.filename || `TeraBox Video #${fileId.substring(0, 6)}`,
          description: `Imported from TeraBox URL. High-speed HLS stream proxied via TeraBridge. Original Path: ${file.path || '/'}`,
          size: sizeStr,
          duration: typeof file.duration === 'number'
            ? formatDuration(file.duration)
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
        setVideosInDb(updatedVideos);
        setHistoryInDb(updatedHistory);

        // Only publish to the public Discover feed if the user has explicitly
        // opted in via Settings → Privacy. Default is OFF to protect privacy —
        // pasting a private TeraBox link must never silently broadcast it.
        if (shareToDiscover) {
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
            delete publicVideo.progress;
            delete publicVideo.favorite;

            set(ref(db, `discoverVideos/${nv.id}`), publicVideo)
              .catch(err => console.error("Failed to post public video:", err));
          });
        }
      } else {
        setVideosInDb(updatedVideos);
        setHistoryInDb(updatedHistory);
      }

      const firstFileId = newVideos[0].id;
      navigate(`/player/${firstFileId}`);

    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('API Resolve Error:', err);
      setFetchError(err.message || 'An unexpected error occurred while resolving your link. Please try again.');
    } finally {
      setIsFetching(false);
    }
  }, [currentUser, navigate, shareToDiscover, apiBase]);

  return { isFetching, fetchError, fetchStep, handleFetch, setFetchError };
}
