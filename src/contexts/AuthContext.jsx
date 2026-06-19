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
  const [apiKey, setApiKey] = useState(null);
  const [apiBase, setApiBase] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
      
      if (user) {
        const dbRef = ref(db, 'config');
        get(dbRef)
          .then((snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.val();
              setApiKey(data.apiKey || null);
              setApiBase(data.apibase || null);
            } else {
              console.warn('No config found in Realtime Database at /config');
              setApiKey(null);
              setApiBase(null);
            }
          })
          .catch((e) => {
            console.error('Failed to load config from RTDB:', e);
            setApiKey(null);
            setApiBase(null);
          });
      } else {
        setApiKey(null);
        setApiBase(null);
      }
    });
    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, authLoading, apiKey, apiBase }}>
      {children}
    </AuthContext.Provider>
  );
}
