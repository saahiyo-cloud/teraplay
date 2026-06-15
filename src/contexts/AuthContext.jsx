import React, { useState, useEffect, useContext, createContext } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, get, set } from 'firebase/database';

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);

      if (user) {
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

  return (
    <AuthContext.Provider value={{ currentUser, authLoading }}>
      {children}
    </AuthContext.Provider>
  );
}
