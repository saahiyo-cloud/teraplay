import React, { useState, useEffect } from 'react';
import { Settings, Play, Check, EyeOff, RefreshCw, Sliders, ChevronDown, Cloud } from 'lucide-react';
import { db } from '../firebase';
import { ref, set, onValue } from 'firebase/database';
import ConfirmDialog from './ConfirmDialog';

const ACCENT_COLORS = [
  { name: 'blue', value: 'oklch(65% 0.18 250)', muted: 'oklch(65% 0.18 250 / 0.15)', hex: '#3b82f6' },
  { name: 'emerald', value: 'oklch(70% 0.18 140)', muted: 'oklch(70% 0.18 140 / 0.15)', hex: '#10b981' },
  { name: 'purple', value: 'oklch(65% 0.22 300)', muted: 'oklch(65% 0.22 300 / 0.15)', hex: '#8b5cf6' },
  { name: 'red', value: 'oklch(62% 0.22 25)', muted: 'oklch(62% 0.22 25 / 0.15)', hex: '#ef4444' },
  { name: 'orange', value: 'oklch(68% 0.18 55)', muted: 'oklch(68% 0.18 55 / 0.15)', hex: '#f97316' }
];

export default function SettingsView({ onResetData, currentUser }) {
  const [selectedColor, setSelectedColor] = useState('blue');
  const [autoplay, setAutoplay] = useState(true);
  const [rememberProgress, setRememberProgress] = useState(true);
  const [resolution, setResolution] = useState('auto');

  const [resetFeedback, setResetFeedback] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    // Load local storage accent
    const savedAccent = localStorage.getItem('teraplay_accent');
    if (savedAccent) {
      try {
        setSelectedColor(JSON.parse(savedAccent).name);
      } catch (e) {
        setSelectedColor('blue');
      }
    }

    if (!currentUser) return;
    const settingsRef = ref(db, `users/${currentUser.uid}/settings`);
    const unsubscribe = onValue(settingsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        if (data.autoplay !== undefined) setAutoplay(data.autoplay);
        if (data.rememberProgress !== undefined) setRememberProgress(data.rememberProgress);
        if (data.resolution !== undefined) setResolution(data.resolution);
      }
    });
    return unsubscribe;
  }, [currentUser]);

  const applyColor = (color) => {
    document.documentElement.style.setProperty('--color-accent', color.value);
    document.documentElement.style.setProperty('--color-accent-muted', color.muted);
    localStorage.setItem('teraplay_accent', JSON.stringify(color));
    setSelectedColor(color.name);
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (currentUser) {
      try {
        await set(ref(db, `users/${currentUser.uid}/settings`), {
          autoplay,
          rememberProgress,
          resolution
        });
        setSaveFeedback(true);
        setTimeout(() => setSaveFeedback(false), 2000);
      } catch (err) {
        console.error('Save settings error:', err);
      }
    }
  };

  const triggerReset = () => {
    setConfirmOpen(true);
  };

  const handleConfirmReset = () => {
    setConfirmOpen(false);
    onResetData();
    setResetFeedback(true);
    setTimeout(() => setResetFeedback(false), 2000);
  };

  return (
    <div className="animate-fade-in max-w-4xl flex flex-col gap-6">
      <header className="mb-4">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-fg">Settings</h1>
        <p className="text-muted text-sm mt-2">Adjust application configurations, playback rules, and color palettes.</p>
      </header>

      {/* Firebase Cloud Connection Card */}
      <div className="glass-card p-6 border border-custom-border rounded-2xl">
        <div className="flex items-center gap-3 mb-4 select-none text-fg font-bold text-lg border-b border-custom-border/50 pb-3">
          <Cloud size={20} className="text-accent" />
          <h2>Cloud Sync Status</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-sm text-fg font-medium">Synced with Firebase Realtime Database</span>
        </div>
        <p className="text-xs text-muted mt-2">
          Logged in as <span className="text-accent font-semibold">{currentUser?.email}</span>. Your playlists, history, and configuration preferences are securely stored in the cloud.
        </p>
      </div>

      <form onSubmit={handleSaveSettings} className="flex flex-col gap-6">
        
        {/* Playback Settings Card */}
        <div className="glass-card p-6 border border-custom-border rounded-2xl">
          <div className="flex items-center gap-3 mb-6 select-none text-fg font-bold text-lg border-b border-custom-border/50 pb-3">
            <Sliders size={20} className="text-accent" />
            <h2>Playback Options</h2>
          </div>

          <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <div>
                <label className="font-semibold text-sm text-fg block select-none">Auto-play next video</label>
                <span className="text-xs text-muted">Automatically open and stream the next video queue item.</span>
              </div>
              <button 
                type="button" 
                onClick={() => setAutoplay(!autoplay)}
                className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors duration-200 ${autoplay ? 'bg-accent' : 'bg-surface-elevated border border-custom-border'}`}
                aria-label="Toggle auto-play next video"
              >
                <div className={`w-4 h-4 rounded-full transition-transform duration-200 ${autoplay ? 'translate-x-6 bg-bg' : 'translate-x-0 bg-muted'}`} />
              </button>
            </div>

            <div className="flex justify-between items-center">
              <div>
                <label className="font-semibold text-sm text-fg block select-none">Remember watch progress</label>
                <span className="text-xs text-muted">Continue video playback exactly where you left off.</span>
              </div>
              <button 
                type="button" 
                onClick={() => setRememberProgress(!rememberProgress)}
                className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors duration-200 ${rememberProgress ? 'bg-accent' : 'bg-surface-elevated border border-custom-border'}`}
                aria-label="Toggle remember watch progress"
              >
                <div className={`w-4 h-4 rounded-full transition-transform duration-200 ${rememberProgress ? 'translate-x-6 bg-bg' : 'translate-x-0 bg-muted'}`} />
              </button>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <label htmlFor="resolution" className="font-semibold text-sm text-fg block select-none">Default playback quality</label>
                <span className="text-xs text-muted">Initial target video quality to stream from TeraBox link.</span>
              </div>
              <div className="relative w-full sm:w-48 bg-surface border border-custom-border rounded-xl text-sm text-fg px-3 py-2 flex items-center justify-between focus-within:border-accent">
                <select 
                  id="resolution"
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  className="w-full bg-transparent border-none outline-none appearance-none pr-8 cursor-pointer text-fg"
                >
                  <option value="auto" className="bg-surface">Auto Adjust</option>
                  <option value="720p" className="bg-surface">720P HD</option>
                  <option value="480p" className="bg-surface">480P</option>
                </select>
                <ChevronDown size={16} className="text-muted absolute right-3 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Theme customization */}
        <div className="glass-card p-6 border border-custom-border rounded-2xl">
          <div className="flex items-center gap-3 mb-6 select-none text-fg font-bold text-lg border-b border-custom-border/50 pb-3">
            <Settings size={20} className="text-accent" />
            <h2>Theme & Customization</h2>
          </div>

          <div>
            <label className="font-semibold text-sm text-fg block mb-2 select-none">Application Accent Theme</label>
            <span className="text-xs text-muted block mb-5">Change the core highlight tint of links, glows, sliders, and progress indicators.</span>
            
            <div className="flex gap-4 items-center">
              {ACCENT_COLORS.map(color => (
                <button
                  key={color.name}
                  type="button"
                  onClick={() => applyColor(color)}
                  className="w-10 h-10 rounded-full flex items-center justify-center border-2 transition-transform duration-150 hover:scale-110 shadow-soft cursor-pointer relative"
                  style={{ 
                    backgroundColor: color.hex,
                    borderColor: selectedColor === color.name ? '#ffffff' : 'transparent'
                  }}
                  aria-label={`Select ${color.name} theme`}
                >
                  {selectedColor === color.name && (
                    <Check size={18} className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Danger zone / resets */}
        <div className="glass-card p-6 border border-rose-500/20 bg-rose-500/[0.02] rounded-2xl">
          <div className="flex items-center gap-3 mb-6 select-none text-rose-400 font-bold text-lg border-b border-rose-500/10 pb-3">
            <EyeOff size={20} />
            <h2>Danger Zone</h2>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="font-semibold text-sm text-fg select-none">Reset cloud database</h3>
              <p className="text-xs text-muted">Clear all custom downloads, favorites, and reset default library streams in the cloud.</p>
            </div>
            <button 
              type="button" 
              onClick={triggerReset}
              className="flex items-center gap-2 px-5 py-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/25 hover:border-rose-500/30 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer"
            >
              <RefreshCw size={16} />
              <span>Reset Database</span>
            </button>
          </div>
          {resetFeedback && (
            <div className="mt-4 text-xs text-rose-400 font-medium animate-fade-in">Cloud database reset completed.</div>
          )}
        </div>

        {/* Settings Buttons */}
        <div className="flex items-center gap-4">
          <button 
            type="submit" 
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-accent text-bg rounded-xl font-semibold shadow-[0_4px_12px_var(--color-accent-muted)] hover:-translate-y-0.5 hover:shadow-[0_8px_20px_var(--color-accent-muted)] transition-all cursor-pointer"
          >
            {saveFeedback ? <Check size={18} /> : null}
            <span>{saveFeedback ? 'Settings Saved' : 'Save Configs'}</span>
          </button>
          {saveFeedback && (
            <span className="text-xs text-accent animate-fade-in font-medium">Configurations written to cloud database.</span>
          )}
        </div>
        
      </form>

      <ConfirmDialog
        isOpen={confirmOpen}
        title="Reset Cloud Database"
        message="This will clear all video watch progress, custom links, and active downloads. This cannot be undone."
        confirmLabel="Reset Database"
        danger={true}
        onConfirm={handleConfirmReset}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
