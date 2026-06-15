import React, { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../firebase';
import { ref, onValue, set, get, update, increment } from 'firebase/database';

export function useVideos(currentUser) {
  const [videos, setVideos] = useState([]);
  const videosRef = useRef([]);
  const deletingVideoIdRef = useRef(null);

  useEffect(() => {
    videosRef.current = videos;
  }, [videos]);

  useEffect(() => {
    if (!currentUser) {
      setVideos([]);
      return;
    }

    const dbVideosRef = ref(db, `users/${currentUser.uid}/videos`);
    const unsubscribe = onValue(dbVideosRef, (snapshot) => {
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

    return () => unsubscribe();
  }, [currentUser]);

  const setVideosInDb = (updated) => {
    if (currentUser) {
      set(ref(db, `users/${currentUser.uid}/videos`), updated);
    } else {
      setVideos(updated || []);
    }
  };

  const handleImportVideo = useCallback((video) => {
    const currentVideos = videosRef.current;
    const vidIdStr = String(video.id);
    if (currentVideos.some(v => String(v.id) === vidIdStr)) {
      return;
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

  const handleToggleFavorite = (videoId, discoverVideosRef) => {
    const currentVideos = videosRef.current;
    const vidIdStr = String(videoId);
    const exists = currentVideos.some(v => String(v.id) === vidIdStr);

    if (!exists) {
      const activeDiscover = discoverVideosRef?.current || [];
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

  const handleUpdateVideo = (updatedVideo) => {
    if (deletingVideoIdRef.current && String(updatedVideo.id) === String(deletingVideoIdRef.current)) {
      console.log('Skipping update/progress save for deleting video:', updatedVideo.id);
      return;
    }
    const currentVideos = videosRef.current;
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

  return {
    videos,
    videosRef,
    deletingVideoIdRef,
    setVideosInDb,
    handleImportVideo,
    handleToggleFavorite,
    handleUpdateVideo,
    handleIncrementVideoViewsAndPlays
  };
}
