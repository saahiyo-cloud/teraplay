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
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
      
      if (user) {
        const dbRef = ref(db, 'config/apiKey');
        get(dbRef)
          .then((snapshot) => {
            if (snapshot.exists()) {
              setApiKey(snapshot.val());
            } else {
              console.warn('No API key found in Realtime Database at config/apiKey');
              setApiKey(null);
            }
          })
          .catch((e) => {
            console.error('Failed to load API key from RTDB:', e);
            setApiKey(null);
          });
      } else {
        setApiKey(null);
      }
    });
    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, authLoading, apiKey }}>
      {children}
    </AuthContext.Provider>
  );
}
