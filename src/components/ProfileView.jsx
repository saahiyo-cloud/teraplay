import React, { useState, useEffect } from 'react';
import { User, Mail, Shield, Check, Database, PlayCircle, Clock } from 'lucide-react';

export default function ProfileView({ videos = [], history = [], downloads = [] }) {
  const [profile, setProfile] = useState(() => {
    const saved = localStorage.getItem('teraplay_profile');
    return saved ? JSON.parse(saved) : {
      username: 'Shakir',
      email: 'shakir@teraplay.io',
      tier: 'Premium Pro',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150'
    };
  });

  const [username, setUsername] = useState(profile.username);
  const [email, setEmail] = useState(profile.email);
  const [saveFeedback, setSaveFeedback] = useState(false);

  useEffect(() => {
    localStorage.setItem('teraplay_profile', JSON.stringify(profile));
  }, [profile]);

  const handleSave = (e) => {
    e.preventDefault();
    setProfile(prev => ({
      ...prev,
      username,
      email
    }));
    setSaveFeedback(true);
    setTimeout(() => setSaveFeedback(false), 2000);
  };

  // Helper to parse duration string to seconds
  const parseDurationToSeconds = (durStr) => {
    if (!durStr) return 0;
    const parts = durStr.split(':').map(Number);
    if (parts.some(isNaN)) return 0;
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1]; // mm:ss
    } else if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2]; // hh:mm:ss
    }
    return 0;
  };

  // Dynamically calculate accumulated watched time in seconds
  const totalPlaybackSeconds = history.reduce((sum, item) => {
    const secs = parseDurationToSeconds(item.duration);
    const progressFactor = (item.progress || 0) / 100;
    return sum + Math.round(secs * progressFactor);
  }, 0);

  const formatPlaybackTime = (totalSecs) => {
    if (totalSecs <= 0) return '0m';
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formattedPlayback = formatPlaybackTime(totalPlaybackSeconds);

  // Dynamically calculate storage space used from completed downloads (out of 100 GB)
  const totalStorageBytes = downloads
    .filter(d => d.status === 'completed')
    .reduce((sum, d) => sum + (d.totalBytes || 0), 0);

  const formatStorage = (bytes) => {
    if (bytes <= 0) return '0.0 GB';
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const storagePercentage = Math.max(0.5, Math.min(100, (totalStorageBytes / (100 * 1024 * 1024 * 1024)) * 100));

  // Dynamically compute a renewal date (1 month from today)
  const getNextRenewalDate = () => {
    const nextDate = new Date();
    nextDate.setMonth(nextDate.getMonth() + 1);
    return nextDate.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="animate-fade-in max-w-4xl">
      <header className="mb-10">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-fg">My Profile</h1>
        <p className="text-muted text-sm mt-2">Manage your account credentials and monitor streaming metrics.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
        {/* User Card */}
        <div className="md:col-span-1 glass-card p-6 flex flex-col items-center text-center border border-custom-border rounded-2xl relative overflow-hidden">
          <div className="absolute top-3 right-3 text-accent bg-accent-muted border border-accent/20 px-2 py-0.5 rounded-lg text-[10px] font-bold tracking-wider uppercase flex items-center gap-1 select-none">
            <Shield size={10} fill="currentColor" />
            <span>{profile.tier}</span>
          </div>

          <div className="w-24 h-24 rounded-full border-2 border-accent/50 p-1 mb-4 shadow-[0_0_15px_var(--color-accent-muted)] shrink-0 overflow-hidden select-none">
            <img src={profile.avatar} alt="User Avatar" className="w-full h-full object-cover rounded-full" />
          </div>

          <h2 className="text-xl font-bold text-fg leading-tight mb-1">{profile.username}</h2>
          <p className="text-xs text-muted mb-4">{profile.email}</p>

          <div className="w-full pt-4 border-t border-custom-border text-left mt-auto">
            <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-2 select-none">Storage Index</div>
            <div className="flex justify-between items-center text-xs font-mono mb-1 text-fg">
              <span className="flex items-center gap-1"><Database size={12} /> {formatStorage(totalStorageBytes)}</span>
              <span className="opacity-60">100 GB Max</span>
            </div>
            <div className="w-full h-1.5 bg-custom-border rounded-full overflow-hidden">
              <div className="h-full bg-accent rounded-full shadow-[0_0_8px_var(--color-accent)]" style={{ width: `${storagePercentage}%` }}></div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="glass-card p-6 border border-custom-border rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-surface-elevated border border-custom-border grid place-items-center text-accent shrink-0">
              <PlayCircle size={24} />
            </div>
            <div>
              <div className="text-2xl font-mono font-bold text-fg leading-tight">{history.length}</div>
              <div className="text-xs text-muted font-medium mt-1">Total Videos Streamed</div>
            </div>
          </div>

          <div className="glass-card p-6 border border-custom-border rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-surface-elevated border border-custom-border grid place-items-center text-accent shrink-0">
              <Clock size={24} />
            </div>
            <div>
              <div className="text-2xl font-mono font-bold text-fg leading-tight">{formattedPlayback}</div>
              <div className="text-xs text-muted font-medium mt-1">Accumulated Playback Time</div>
            </div>
          </div>

          <div className="sm:col-span-2 glass-card p-6 border border-custom-border rounded-2xl">
            <h3 className="font-bold text-base text-fg mb-4 select-none">Subscription Details</h3>
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex justify-between border-b border-custom-border/50 pb-2.5">
                <span className="text-muted">Membership Tier</span>
                <span className="font-semibold text-accent">{profile.tier}</span>
              </div>
              <div className="flex justify-between border-b border-custom-border/50 pb-2.5">
                <span className="text-muted">Monthly Price</span>
                <span className="font-mono text-fg">$0.00 (Developer Trial)</span>
              </div>
              <div className="flex justify-between pb-1">
                <span className="text-muted">Next Renewal</span>
                <span className="text-fg">{getNextRenewalDate()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Details */}
      <div className="glass-card p-6 border border-custom-border rounded-2xl">
        <h3 className="font-bold text-lg text-fg mb-5 select-none">Update Personal Information</h3>
        <form onSubmit={handleSave} className="flex flex-col gap-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="flex flex-col gap-2">
              <label htmlFor="nickname" className="text-xs font-semibold text-muted uppercase tracking-wider select-none">Nickname</label>
              <div className="bg-surface border border-custom-border px-4 py-2.5 rounded-xl text-fg text-sm flex items-center gap-3 focus-within:border-accent transition-colors duration-200">
                <User size={16} className="text-muted shrink-0" />
                <input 
                  type="text" 
                  id="nickname"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-transparent border-none outline-none text-fg"
                  required
                />
              </div>
            </div>
            
            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="text-xs font-semibold text-muted uppercase tracking-wider select-none">Email Address</label>
              <div className="bg-surface border border-custom-border px-4 py-2.5 rounded-xl text-fg text-sm flex items-center gap-3 focus-within:border-accent transition-colors duration-200">
                <Mail size={16} className="text-muted shrink-0" />
                <input 
                  type="email" 
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent border-none outline-none text-fg"
                  required
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-2">
            <button 
              type="submit" 
              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-accent text-bg rounded-xl font-semibold shadow-[0_4px_12px_var(--color-accent-muted)] hover:-translate-y-0.5 hover:shadow-[0_8px_20px_var(--color-accent-muted)] transition-all cursor-pointer"
            >
              {saveFeedback ? <Check size={18} /> : null}
              <span>{saveFeedback ? 'Changes Saved' : 'Save Profiles'}</span>
            </button>
            {saveFeedback && (
              <span className="text-xs text-accent animate-fade-in font-medium">Successfully written to local registry.</span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
