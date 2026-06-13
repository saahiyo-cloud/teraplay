import React, { useState, useEffect } from 'react';
import { User, Mail, Shield, Check, PlayCircle, Clock } from 'lucide-react';
import { auth, db } from '../firebase';
import { updateProfile } from 'firebase/auth';
import { ref, set, onValue } from 'firebase/database';

export default function ProfileView({ videos = [], history = [], currentUser }) {
  const [profile, setProfile] = useState({
    username: currentUser?.displayName || 'User',
    email: currentUser?.email || '',
    tier: 'Premium Pro',
    avatar: currentUser?.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150'
  });

  const [username, setUsername] = useState(profile.username);
  const [saveFeedback, setSaveFeedback] = useState(false);
  const [errorFeedback, setErrorFeedback] = useState(null);

  useEffect(() => {
    if (!currentUser) return;
    const profileRef = ref(db, `users/${currentUser.uid}/profile`);
    const unsubscribe = onValue(profileRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setProfile(data);
        setUsername(data.username || data.displayName || '');
      }
    });
    return unsubscribe;
  }, [currentUser]);

  const handleSave = async (e) => {
    e.preventDefault();
    setErrorFeedback(null);
    setSaveFeedback(false);

    try {
      if (!username.trim()) {
        throw new Error('Please enter a username');
      }

      if (currentUser) {
        await updateProfile(currentUser, {
          displayName: username.trim()
        });

        await set(ref(db, `users/${currentUser.uid}/profile`), {
          ...profile,
          username: username.trim(),
          email: currentUser.email
        });

        setSaveFeedback(true);
        setTimeout(() => setSaveFeedback(false), 2000);
      }
    } catch (err) {
      console.error('Save profile error:', err);
      setErrorFeedback(err.message || 'Failed to save profile changes.');
    }
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
      <header className="mb-10 select-none">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-fg">My Profile</h1>
        <p className="text-muted text-sm mt-2">Manage your account credentials and monitor streaming metrics.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Left Column: User & Subscription Details */}
        <div className="md:col-span-1">
          <div className="glass-card p-6 flex flex-col items-center text-center border border-custom-border rounded-2xl relative overflow-hidden h-full">
            {/* Tier Badge */}
            <div className="absolute top-4 right-4 text-accent bg-accent-muted border border-accent/20 px-2 py-0.5 rounded-lg text-[9px] font-extrabold tracking-wider uppercase flex items-center gap-1 select-none">
              <Shield size={10} fill="currentColor" />
              <span>{profile.tier}</span>
            </div>

            {/* Avatar with Glow */}
            <div className="w-24 h-24 rounded-full border-2 border-accent/40 p-1 mt-6 mb-4 shadow-[0_0_20px_var(--color-accent-muted)] shrink-0 overflow-hidden select-none">
              <img src={profile.avatar} alt="User Avatar" className="w-full h-full object-cover rounded-full" />
            </div>

            <h2 className="text-xl font-bold text-fg leading-tight mb-1">{profile.username}</h2>
            <p className="text-xs text-muted mb-6">{profile.email}</p>

            {/* Subscription Details List */}
            <div className="w-full pt-6 border-t border-custom-border/80 text-left mt-auto">
              <h3 className="text-xs font-bold text-fg uppercase tracking-widest mb-4 select-none">Subscription Details</h3>
              <div className="flex flex-col gap-3 text-xs">
                <div className="flex justify-between border-b border-custom-border/30 pb-2">
                  <span className="text-muted">Membership Tier</span>
                  <span className="font-bold text-accent">{profile.tier}</span>
                </div>
                <div className="flex justify-between border-b border-custom-border/30 pb-2">
                  <span className="text-muted">Monthly Price</span>
                  <span className="font-mono text-fg font-medium">$0.00 (Developer Trial)</span>
                </div>
                <div className="flex justify-between pb-1">
                  <span className="text-muted">Next Renewal</span>
                  <span className="text-fg font-medium">{getNextRenewalDate()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Stats & Profile Form */}
        <div className="md:col-span-2 flex flex-col gap-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="glass-card p-5 border border-custom-border rounded-2xl flex flex-col items-center text-center gap-3 hover:-translate-y-0.5 transition-all duration-200">
              <div className="w-12 h-12 rounded-xl bg-surface-elevated border border-custom-border grid place-items-center text-accent shrink-0">
                <PlayCircle size={22} />
              </div>
              <div>
                <div className="text-2xl md:text-3xl font-mono font-bold text-fg leading-tight">{history.length}</div>
                <div className="text-[10px] md:text-xs text-muted font-semibold mt-1 uppercase tracking-widest">Total Streamed</div>
              </div>
            </div>

            <div className="glass-card p-5 border border-custom-border rounded-2xl flex flex-col items-center text-center gap-3 hover:-translate-y-0.5 transition-all duration-200">
              <div className="w-12 h-12 rounded-xl bg-surface-elevated border border-custom-border grid place-items-center text-accent shrink-0">
                <Clock size={22} />
              </div>
              <div>
                <div className="text-2xl md:text-3xl font-mono font-bold text-fg leading-tight">{formattedPlayback}</div>
                <div className="text-[10px] md:text-xs text-muted font-semibold mt-1 uppercase tracking-widest">Playback Time</div>
              </div>
            </div>
          </div>

          {/* Update Details Form */}
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
                
                <div className="flex flex-col gap-2 opacity-60">
                  <label htmlFor="email" className="text-xs font-semibold text-muted uppercase tracking-wider select-none">Email Address</label>
                  <div className="bg-surface border border-custom-border px-4 py-2.5 rounded-xl text-muted text-sm flex items-center gap-3 select-none">
                    <Mail size={16} className="shrink-0" />
                    <input 
                      type="email" 
                      id="email"
                      value={currentUser?.email || ''}
                      className="w-full bg-transparent border-none outline-none text-muted cursor-not-allowed"
                      disabled
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
                  <span>{saveFeedback ? 'Changes Saved' : 'Save Changes'}</span>
                </button>
                {saveFeedback && (
                  <span className="text-xs text-accent animate-fade-in font-medium">Successfully written to secure cloud database.</span>
                )}
                {errorFeedback && (
                  <span className="text-xs text-rose-400 animate-fade-in font-medium">{errorFeedback}</span>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
