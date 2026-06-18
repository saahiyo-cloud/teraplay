import React, { useState, useEffect } from 'react';
import { Settings, Play, Check, EyeOff, RefreshCw, Sliders, ChevronDown, Cloud, Sun, Moon, Monitor, Image } from 'lucide-react';
import { db } from '../firebase';
import { ref, set, onValue } from 'firebase/database';
import { ACCENT_COLORS } from '../lib/accentColors';
import ConfirmDialog from './ConfirmDialog';

export default function SettingsView({ settings = { autoplay: true, rememberProgress: true, resolution: 'auto', accentColor: 'mono', autoFetch: true, themeMode: 'dark', shareToDiscover: false }, onUpdateSettings, onResetData, currentUser }) {
  const [selectedColor, setSelectedColor] = useState(settings.accentColor);
  const [autoplay, setAutoplay] = useState(settings.autoplay);
  const [rememberProgress, setRememberProgress] = useState(settings.rememberProgress);
  const [resolution, setResolution] = useState(settings.resolution);
  const [themeMode, setThemeMode] = useState(settings.themeMode || 'dark');
  const [showBackground, setShowBackground] = useState(settings.showBackground !== false);
  const [shareToDiscover, setShareToDiscover] = useState(settings.shareToDiscover || false);

  const [resetFeedback, setResetFeedback] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    setSelectedColor(settings.accentColor);
    setAutoplay(settings.autoplay);
    setRememberProgress(settings.rememberProgress);
    setResolution(settings.resolution);
    setThemeMode(settings.themeMode || 'dark');
    setShowBackground(settings.showBackground !== false);
    setShareToDiscover(settings.shareToDiscover || false);
  }, [settings]);

  const applyColor = (color) => {
    document.documentElement.style.setProperty('--color-accent', color.value);
    document.documentElement.style.setProperty('--color-accent-muted', color.muted);
    document.documentElement.style.setProperty('--accent', color.value);
    document.documentElement.style.setProperty('--accent-muted', color.muted);
    localStorage.setItem('teraplay_accent', JSON.stringify(color));
    setSelectedColor(color.name);
    if (onUpdateSettings) {
      onUpdateSettings({ accentColor: color.name });
    }
  };

  const applyThemeMode = (mode) => {
    setThemeMode(mode);
    if (onUpdateSettings) {
      onUpdateSettings({ themeMode: mode });
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (onUpdateSettings) {
      try {
        await onUpdateSettings({
          autoplay,
          rememberProgress,
          resolution,
          themeMode,
          shareToDiscover
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
      <header className="mb-2 md:mb-4">
        <h1 className="text-2xl md:text-4xl font-bold tracking-tight text-fg">Settings</h1>
        <p className="text-muted text-xs md:text-sm mt-1 md:mt-2">Adjust application configurations, playback rules, and color palettes.</p>
      </header>

      {/* Firebase Cloud Connection Card */}
      <div className="glass-card p-5 md:p-6 border border-custom-border rounded-2xl">
        <div className="flex items-center gap-3 mb-4 select-none text-fg font-bold text-base md:text-lg border-b border-custom-border/50 pb-3">
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
        <div className="glass-card p-5 md:p-6 border border-custom-border rounded-2xl">
          <div className="flex items-center gap-3 mb-6 select-none text-fg font-bold text-base md:text-lg border-b border-custom-border/50 pb-3">
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
        <div className="glass-card p-5 md:p-6 border border-custom-border rounded-2xl">
          <div className="flex items-center gap-3 mb-6 select-none text-fg font-bold text-base md:text-lg border-b border-custom-border/50 pb-3">
            <Settings size={20} className="text-accent" />
            <h2>Theme & Customization</h2>
          </div>

          <div className="flex flex-col gap-6">
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

            <div className="border-t border-custom-border/50 pt-6">
              <label className="font-semibold text-sm text-fg block mb-2 select-none">Theme Mode</label>
              <span className="text-xs text-muted block mb-5">Switch between dark, light, or OS-syncing system color scheme.</span>
              
              <div className="grid grid-cols-3 gap-3 md:gap-4 max-w-lg">
                {[
                  { mode: 'dark', label: 'Dark Mode', desc: 'Sleek & deep dark theme', icon: Moon },
                  { mode: 'light', label: 'Light Mode', desc: 'Clean & high contrast', icon: Sun },
                  { mode: 'system', label: 'System Mode', desc: 'Syncs with your device', icon: Monitor }
                ].map(({ mode, label, desc, icon: Icon }) => {
                  const isActive = themeMode === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => applyThemeMode(mode)}
                      className={`flex flex-col items-center gap-2.5 p-3 md:p-4 rounded-xl border text-center transition-all duration-200 cursor-pointer select-none group relative overflow-hidden ${
                        isActive 
                          ? 'border-accent bg-accent-muted text-fg' 
                          : 'border-custom-border hover:border-muted hover:bg-surface-elevated/40 text-muted hover:text-fg'
                      }`}
                    >
                      <Icon size={18} className={isActive ? 'text-accent' : 'text-muted group-hover:text-fg transition-colors'} />
                      <div>
                        <div className="text-xs font-bold">{label}</div>
                        <div className="text-[9px] opacity-65 mt-0.5 leading-tight hidden sm:block">{desc}</div>
                      </div>
                      {isActive && (
                        <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-accent"></div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-custom-border/50 pt-6">
              <div className="flex justify-between items-center">
                <div>
                  <label className="font-semibold text-sm text-fg block select-none">Custom Background</label>
                  <span className="text-xs text-muted">Show the dynamic wave backdrop image behind page content.</span>
                </div>
                <button 
                  type="button" 
                  onClick={() => {
                    const next = !showBackground;
                    setShowBackground(next);
                    if (onUpdateSettings) onUpdateSettings({ showBackground: next });
                  }}
                  className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors duration-200 ${showBackground ? 'bg-accent' : 'bg-surface-elevated border border-custom-border'}`}
                  aria-label="Toggle custom background"
                >
                  <div className={`w-4 h-4 rounded-full transition-transform duration-200 ${showBackground ? 'translate-x-6 bg-bg' : 'translate-x-0 bg-muted'}`} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Privacy Settings */}
        <div className="glass-card p-5 md:p-6 border border-custom-border rounded-2xl">
          <div className="flex items-center gap-3 mb-6 select-none text-fg font-bold text-base md:text-lg border-b border-custom-border/50 pb-3">
            <EyeOff size={20} className="text-accent" />
            <h2>Privacy</h2>
          </div>
          <div className="flex justify-between items-center">
            <div>
              <label className="font-semibold text-sm text-fg block select-none">Share videos to Discover</label>
              <span className="text-xs text-muted">When enabled, videos you import are published to the public Discover feed for other users to browse. Off by default to protect your privacy.</span>
            </div>
            <button
              type="button"
              onClick={() => {
                const next = !shareToDiscover;
                setShareToDiscover(next);
                if (onUpdateSettings) onUpdateSettings({ shareToDiscover: next });
              }}
              className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors duration-200 ${shareToDiscover ? 'bg-accent' : 'bg-surface-elevated border border-custom-border'}`}
              aria-label="Toggle share videos to Discover"
            >
              <div className={`w-4 h-4 rounded-full transition-transform duration-200 ${shareToDiscover ? 'translate-x-6 bg-bg' : 'translate-x-0 bg-muted'}`} />
            </button>
          </div>
        </div>

        {/* Danger zone / resets */}
        <div className="glass-card p-5 md:p-6 border border-rose-500/20 bg-rose-500/[0.02] rounded-2xl">
          <div className="flex items-center gap-3 mb-6 select-none text-rose-400 font-bold text-base md:text-lg border-b border-rose-500/10 pb-3">
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
