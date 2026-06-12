import React, { useState, useEffect } from 'react';
import { Settings, Play, Check, Server, EyeOff, RefreshCw, Sliders, ChevronDown } from 'lucide-react';

const ACCENT_COLORS = [
  { name: 'blue', value: 'oklch(65% 0.18 250)', muted: 'oklch(65% 0.18 250 / 0.15)', hex: '#3b82f6' },
  { name: 'emerald', value: 'oklch(70% 0.18 140)', muted: 'oklch(70% 0.18 140 / 0.15)', hex: '#10b981' },
  { name: 'purple', value: 'oklch(65% 0.22 300)', muted: 'oklch(65% 0.22 300 / 0.15)', hex: '#8b5cf6' },
  { name: 'red', value: 'oklch(62% 0.22 25)', muted: 'oklch(62% 0.22 25 / 0.15)', hex: '#ef4444' },
  { name: 'orange', value: 'oklch(68% 0.18 55)', muted: 'oklch(68% 0.18 55 / 0.15)', hex: '#f97316' }
];

export default function SettingsView({ onResetData }) {
  const [selectedColor, setSelectedColor] = useState(() => {
    const saved = localStorage.getItem('teraplay_accent');
    if (saved) {
      try {
        return JSON.parse(saved).name;
      } catch (e) {
        return 'blue';
      }
    }
    return 'blue';
  });

  const [autoplay, setAutoplay] = useState(() => {
    return localStorage.getItem('settings_autoplay') !== 'false';
  });
  const [rememberProgress, setRememberProgress] = useState(() => {
    return localStorage.getItem('settings_remember_progress') !== 'false';
  });
  const [resolution, setResolution] = useState(() => {
    return localStorage.getItem('settings_resolution') || 'auto';
  });
  const [concurrentDownloads, setConcurrentDownloads] = useState(() => {
    return localStorage.getItem('settings_concurrent') || '2';
  });
  const [downloadFolder, setDownloadFolder] = useState(() => {
    return localStorage.getItem('settings_folder') || 'C:\\Users\\Shakir\\Downloads\\teraplay\\downloads';
  });

  const [resetFeedback, setResetFeedback] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState(false);

  const applyColor = (color) => {
    document.documentElement.style.setProperty('--color-accent', color.value);
    document.documentElement.style.setProperty('--color-accent-muted', color.muted);
    localStorage.setItem('teraplay_accent', JSON.stringify(color));
    setSelectedColor(color.name);
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    localStorage.setItem('settings_autoplay', autoplay.toString());
    localStorage.setItem('settings_remember_progress', rememberProgress.toString());
    localStorage.setItem('settings_resolution', resolution);
    localStorage.setItem('settings_concurrent', concurrentDownloads);
    localStorage.setItem('settings_folder', downloadFolder);

    setSaveFeedback(true);
    setTimeout(() => setSaveFeedback(false), 2000);
  };

  const triggerReset = () => {
    if (window.confirm("Are you sure you want to clear your local database? This resets all video watch progresses, custom links, and active downloads.")) {
      onResetData();
      setResetFeedback(true);
      setTimeout(() => setResetFeedback(false), 2000);
    }
  };

  return (
    <div className="animate-fade-in max-w-4xl">
      <header className="mb-10">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-fg">Settings</h1>
        <p className="text-muted text-sm mt-2">Adjust application configurations, playback rules, and color palettes.</p>
      </header>

      <form onSubmit={handleSaveSettings} className="flex flex-col gap-8">
        
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
                <label htmlFor="resolution" className="font-semibold text-sm text-fg block select-none">Default playback buffer</label>
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
                  <option value="4k" className="bg-surface">4K UHD</option>
                  <option value="1080p" className="bg-surface">1080P Full HD</option>
                  <option value="720p" className="bg-surface">720P HD</option>
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

        {/* Download settings */}
        <div className="glass-card p-6 border border-custom-border rounded-2xl">
          <div className="flex items-center gap-3 mb-6 select-none text-fg font-bold text-lg border-b border-custom-border/50 pb-3">
            <Server size={20} className="text-accent" />
            <h2>Download Configs</h2>
          </div>

          <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <label htmlFor="concurrent" className="font-semibold text-sm text-fg block select-none">Max concurrent tasks</label>
                <span className="text-xs text-muted">Number of active offline download workers.</span>
              </div>
              <div className="relative w-full sm:w-48 bg-surface border border-custom-border rounded-xl text-sm text-fg px-3 py-2 flex items-center justify-between focus-within:border-accent">
                <select 
                  id="concurrent"
                  value={concurrentDownloads}
                  onChange={(e) => setConcurrentDownloads(e.target.value)}
                  className="w-full bg-transparent border-none outline-none appearance-none pr-8 cursor-pointer text-fg"
                >
                  <option value="1" className="bg-surface">1 Task</option>
                  <option value="2" className="bg-surface">2 Tasks</option>
                  <option value="5" className="bg-surface">5 Tasks</option>
                  <option value="99" className="bg-surface">Unlimited</option>
                </select>
                <ChevronDown size={16} className="text-muted absolute right-3 pointer-events-none" />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="folder" className="font-semibold text-sm text-fg select-none">Default download directory</label>
              <span className="text-xs text-muted">File path where MP4 streaming assets are compiled.</span>
              <div className="bg-surface border border-custom-border px-4 py-2.5 rounded-xl text-fg text-sm flex items-center focus-within:border-accent transition-colors duration-200">
                <input 
                  type="text" 
                  id="folder"
                  value={downloadFolder}
                  onChange={(e) => setDownloadFolder(e.target.value)}
                  className="w-full bg-transparent border-none outline-none text-fg"
                />
              </div>
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
              <h3 className="font-semibold text-sm text-fg select-none">Reset library database</h3>
              <p className="text-xs text-muted">Clear all custom downloads, favorites, and reset default library streams.</p>
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
            <div className="mt-4 text-xs text-rose-400 font-medium animate-fade-in">Registry reset completed. Reloading settings.</div>
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
            <span className="text-xs text-accent animate-fade-in font-medium">Configurations written to browser storage.</span>
          )}
        </div>
        
      </form>
    </div>
  );
}
