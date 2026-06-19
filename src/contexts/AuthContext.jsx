import React, { useState, useEffect, useContext, createContext } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, get } from 'firebase/database';

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [apiBase, setApiBase] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);

      if (user) {
        // Only the API base URL is read from /config — it is service
        // discovery, not a secret. The master API key is intentionally
        // NOT loaded here: it used to be read from /config/apiKey, which
        // made it readable by every authenticated user and effectively
        // leaked the master key. The frontend now authenticates to
        // TeraBridge with the signed-in user's own Firebase ID token
        // (see useFetch.js / FilesView.jsx), which the backend verifies
        // via verify_firebase_token().
        const dbRef = ref(db, 'config');
        get(dbRef)
          .then((snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.val();
              setApiBase(data.apibase || null);
            } else {
              console.warn('No config found in Realtime Database at /config');
              setApiBase(null);
            }
          })
          .catch((e) => {
            console.error('Failed to load config from RTDB:', e);
            setApiBase(null);
          });
      } else {
        setApiBase(null);
      }
    });
    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, authLoading, apiBase }}>
      {children}
    </AuthContext.Provider>
  );
}
