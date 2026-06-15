import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { ref, onValue, set } from 'firebase/database';
import { ACCENT_COLORS } from '../components/SettingsView';

const DEFAULT_SETTINGS = {
  autoplay: true,
  rememberProgress: true,
  resolution: 'auto',
  accentColor: 'blue',
  autoFetch: true
};

function loadLocalSettings() {
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

  return { autoplay, rememberProgress, resolution, accentColor, autoFetch };
}

export function useSettings(currentUser) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    if (!currentUser) {
      setSettings(loadLocalSettings());
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
        const initialSettings = loadLocalSettings();
        set(settingsRef, initialSettings);
        setSettings(initialSettings);
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    if (!settings.accentColor) return;
    const color = ACCENT_COLORS.find(c => c.name === settings.accentColor);
    if (color) {
      document.documentElement.style.setProperty('--color-accent', color.value);
      document.documentElement.style.setProperty('--color-accent-muted', color.muted);
      localStorage.setItem('teraplay_accent', JSON.stringify(color));
    }
  }, [settings.accentColor]);

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

  const handleResetData = (onResetOtherData) => {
    if (currentUser) {
      set(ref(db, `users/${currentUser.uid}/settings`), null);
    } else {
      localStorage.removeItem('teraplay_autoplay');
      localStorage.removeItem('teraplay_remember_progress');
      localStorage.removeItem('teraplay_resolution');
      localStorage.removeItem('teraplay_autofetch');
      localStorage.removeItem('teraplay_accent');
    }
    setSettings(DEFAULT_SETTINGS);
    if (onResetOtherData) onResetOtherData();
  };

  return { settings, handleUpdateSettings, handleResetData };
}
