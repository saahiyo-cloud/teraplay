import { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { ref, onValue, set } from 'firebase/database';
import { calculateTopCreators } from '../utils/calculateTopCreators';

export function useDiscover(currentUser) {
  const [discoverVideos, setDiscoverVideos] = useState([]);
  const discoverVideosRef = useRef([]);
  const [dbCategories, setDbCategories] = useState([]);
  const [topCreators, setTopCreators] = useState([]);

  useEffect(() => {
    discoverVideosRef.current = discoverVideos;
  }, [discoverVideos]);

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
        const defaultCategories = ['Cinema', 'Lo-Fi', 'Animation', 'Nature', 'Tech', 'Tutorials'];
        set(categoriesRef, defaultCategories);
        setDbCategories(defaultCategories);
      }
    });
    return unsubscribe;
  }, [currentUser]);

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

  return { discoverVideos, discoverVideosRef, dbCategories, topCreators };
}
