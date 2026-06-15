import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { ref, onValue } from 'firebase/database';

export function useProfile(currentUser) {
  const [userProfile, setUserProfile] = useState(null);

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

  return { userProfile };
}
