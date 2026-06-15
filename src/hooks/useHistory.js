import { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { ref, onValue, set } from 'firebase/database';

export function useHistory(currentUser) {
  const [history, setHistory] = useState([]);
  const historyRef = useRef([]);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    if (!currentUser) {
      setHistory([]);
      return;
    }

    const dbHistoryRef = ref(db, `users/${currentUser.uid}/history`);
    const unsubscribe = onValue(dbHistoryRef, (snapshot) => {
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

    return () => unsubscribe();
  }, [currentUser]);

  const setHistoryInDb = (updated) => {
    if (currentUser) {
      set(ref(db, `users/${currentUser.uid}/history`), updated);
    } else {
      setHistory(updated || []);
    }
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

  const clearAllHistory = () => {
    if (currentUser) {
      set(ref(db, `users/${currentUser.uid}/history`), null);
    } else {
      setHistory([]);
    }
  };

  return { history, historyRef, setHistoryInDb, handleRemoveHistoryItem, clearAllHistory };
}
