import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { ref, onValue, set } from 'firebase/database';
import { ACCENT_COLORS } from '../lib/accentColors';

const DEFAULT_SETTINGS = {
  autoplay: true,
  rememberProgress: true,
  resolution: 'auto',
  accentColor: 'mono',
  autoFetch: true,
  themeMode: 'dark',
  showBackground: true,
  shareToDiscover: true
};

function loadLocalSettings() {
  const autoplay = localStorage.getItem('teraplay_autoplay') !== 'false';
  const rememberProgress = localStorage.getItem('teraplay_remember_progress') !== 'false';
  const resolution = localStorage.getItem('teraplay_resolution') || 'auto';
  const autoFetch = localStorage.getItem('teraplay_autofetch') !== 'false';
  const themeMode = localStorage.getItem('teraplay_theme_mode') || 'dark';
  const showBackground = localStorage.getItem('teraplay_show_background') !== 'false';
  const shareToDiscover = localStorage.getItem('teraplay_share_to_discover') !== 'false';

  let accentColor = 'mono';
  const savedAccent = localStorage.getItem('teraplay_accent');
  if (savedAccent) {
    try {
      accentColor = JSON.parse(savedAccent).name || 'mono';
    } catch (e) {
      accentColor = 'mono';
    }
  }

  return { autoplay, rememberProgress, resolution, accentColor, autoFetch, themeMode, showBackground, shareToDiscover };
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
          accentColor: data.accentColor || 'mono',
          autoFetch: data.autoFetch !== undefined ? data.autoFetch : true,
          themeMode: data.themeMode || 'dark',
          showBackground: data.showBackground !== undefined ? data.showBackground : true,
          shareToDiscover: data.shareToDiscover !== undefined ? data.shareToDiscover : true
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
      document.documentElement.style.setProperty('--accent', color.value);
      document.documentElement.style.setProperty('--accent-muted', color.muted);
      localStorage.setItem('teraplay_accent', JSON.stringify(color));
    }
  }, [settings.accentColor]);

  // Effect to apply light/dark/system theme classes
  useEffect(() => {
    const applyTheme = (theme) => {
      const root = document.documentElement;
      const meta = document.querySelector('meta[name="theme-color"]');
      if (theme === 'light') {
        root.classList.add('light');
        root.classList.remove('dark');
        if (meta) meta.setAttribute('content', '#f7f8fa');
      } else if (theme === 'dark') {
        root.classList.add('dark');
        root.classList.remove('light');
        if (meta) meta.setAttribute('content', '#0a0a0f');
      } else if (theme === 'system') {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.classList.toggle('dark', isDark);
        root.classList.toggle('light', !isDark);
        if (meta) meta.setAttribute('content', isDark ? '#0a0a0f' : '#f7f8fa');
      }
    };

    if (!settings.themeMode) return;
    applyTheme(settings.themeMode);

    if (settings.themeMode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = (e) => {
        const root = document.documentElement;
        root.classList.toggle('dark', e.matches);
        root.classList.toggle('light', !e.matches);
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', e.matches ? '#0a0a0f' : '#f7f8fa');
      };

      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', listener);
        return () => mediaQuery.removeEventListener('change', listener);
      } else {
        mediaQuery.addListener(listener);
        return () => mediaQuery.removeListener(listener);
      }
    }
  }, [settings.themeMode]);

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
        if (updated.shareToDiscover !== undefined) {
          localStorage.setItem('teraplay_share_to_discover', updated.shareToDiscover.toString());
        }
      }
      
      // Sync theme mode and background preference to localStorage in either case to prevent boot flash of unstyled content
      if (updated.showBackground !== undefined) {
        localStorage.setItem('teraplay_show_background', updated.showBackground.toString());
      }
      if (updated.themeMode) {
        localStorage.setItem('teraplay_theme_mode', updated.themeMode);
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
      localStorage.removeItem('teraplay_theme_mode');
      localStorage.removeItem('teraplay_share_to_discover');
    }
    setSettings(DEFAULT_SETTINGS);
    if (onResetOtherData) onResetOtherData();
  };

  return { settings, handleUpdateSettings, handleResetData };
}
