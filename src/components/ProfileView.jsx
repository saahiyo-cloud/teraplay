import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  Mail, 
  Shield, 
  Check, 
  PlayCircle, 
  Clock, 
  Heart, 
  Activity,
  Camera,
  X
} from 'lucide-react';
import { auth, db } from '../firebase';
import { updateProfile } from 'firebase/auth';
import { ref, set, onValue, get, update } from 'firebase/database';

const PRESET_AVATARS = [
  { name: 'Classic Male', url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150' },
  { name: 'Classic Female', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150' },
  { name: 'Cyber Neon', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150' },
  { name: 'Creative Red', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150' },
  { name: 'Tech Orange', url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&q=80&w=150' },
  { name: 'Gradient Spark', url: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&q=80&w=150' }
];

export default function ProfileView({ videos = [], history = [], currentUser, onVideoSelect }) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState({
    username: currentUser?.displayName || 'User',
    email: currentUser?.email || '',
    tier: 'Premium Pro',
    avatar: currentUser?.photoURL || PRESET_AVATARS[0].url
  });

  const [username, setUsername] = useState(profile.username);
  const [avatar, setAvatar] = useState(profile.avatar);
  const [saveFeedback, setSaveFeedback] = useState(false);
  const [errorFeedback, setErrorFeedback] = useState(null);
  const [showAvatarModal, setShowAvatarModal] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    const profileRef = ref(db, `users/${currentUser.uid}/profile`);
    const unsubscribe = onValue(profileRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setProfile(data);
        setUsername(data.username || data.displayName || currentUser.displayName || 'User');
        setAvatar(data.avatar || data.photoURL || currentUser.photoURL || PRESET_AVATARS[0].url);
      } else {
        // DB profile doesn't exist yet: initialize from Auth user object
        setUsername(currentUser.displayName || 'User');
        setAvatar(currentUser.photoURL || PRESET_AVATARS[0].url);
        setProfile({
          username: currentUser.displayName || 'User',
          email: currentUser.email || '',
          tier: 'Premium Pro',
          avatar: currentUser.photoURL || PRESET_AVATARS[0].url
        });
      }
    });
    return unsubscribe;
  }, [currentUser]);

  useEffect(() => {
    if (showAvatarModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showAvatarModal]);

  const handleSave = async (e) => {
    e.preventDefault();
    setErrorFeedback(null);
    setSaveFeedback(false);

    try {
      if (!username.trim()) {
        throw new Error('Please enter a username');
      }

      const activeUser = auth.currentUser || currentUser;
      if (activeUser) {
        await updateProfile(activeUser, {
          displayName: username.trim(),
          photoURL: avatar.trim()
        });

        const updatedProfile = {
          ...profile,
          username: username.trim(),
          avatar: avatar.trim(),
          email: activeUser.email
        };

        await set(ref(db, `users/${activeUser.uid}/profile`), updatedProfile);
        setProfile(updatedProfile);

        // Also update uploader info on all videos in discoverVideos published by this user!
        try {
          const discoverRef = ref(db, 'discoverVideos');
          const discoverSnap = await get(discoverRef);
          const discoverData = discoverSnap.val();
          if (discoverData) {
            const updates = {};
            Object.entries(discoverData).forEach(([vidId, videoObj]) => {
              if (videoObj && videoObj.uploader && videoObj.uploader.uid === activeUser.uid) {
                updates[`discoverVideos/${vidId}/uploader/username`] = username.trim();
                updates[`discoverVideos/${vidId}/uploader/avatar`] = avatar.trim();
              }
            });
            if (Object.keys(updates).length > 0) {
              await update(ref(db), updates);
            }
          }
        } catch (syncErr) {
          console.error("Failed to sync discover videos uploader profile:", syncErr);
        }

        setSaveFeedback(true);
        setTimeout(() => setSaveFeedback(false), 2000);
      }
    } catch (err) {
      console.error('Save profile error:', err);
      setErrorFeedback(err.message || 'Failed to save profile changes.');
    }
  };

  const handlePlayRecentVideo = (videoId) => {
    const matched = videos.find(v => String(v.id) === String(videoId));
    if (matched) {
      if (onVideoSelect) {
        onVideoSelect(matched);
      }
      navigate(`/player/${videoId}`);
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

  const favoriteVideosCount = videos.filter(v => v.favorite).length;

  return (
    <div className="animate-fade-in max-w-4xl">
      <header className="mb-10 select-none">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-fg">My Profile</h1>
        <p className="text-muted text-sm mt-2">Manage your account credentials and monitor streaming metrics.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Left Column: User & Subscription Details */}
        <div className="md:col-span-1 self-start">
          <div className="glass-card p-6 flex flex-col items-center border border-custom-border rounded-2xl relative overflow-hidden h-full">
            {/* Tier Badge */}
            <div className="absolute top-4 right-4 text-accent bg-accent-muted border border-accent/20 px-2 py-0.5 rounded-lg text-[9px] font-extrabold tracking-wider uppercase flex items-center gap-1 select-none">
              <Shield size={10} fill="currentColor" />
              <span>{profile.tier}</span>
            </div>

            {/* Click-to-select Avatar */}
            <div 
              onClick={() => setShowAvatarModal(true)}
              className="relative w-24 h-24 rounded-full border-2 border-accent/40 p-1 mt-6 mb-4 shrink-0 cursor-pointer overflow-hidden select-none group/avatar"
              title="Click to change profile picture"
            >
              <img src={avatar || profile.avatar} alt="User Avatar" className="w-full h-full object-cover rounded-full group-hover/avatar:scale-105 transition-transform duration-200 pointer-events-none" />
              <div className="absolute inset-0 bg-black/40 rounded-full flex flex-col items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-200 text-[10px] font-semibold text-white pointer-events-none">
                <Camera size={16} className="mb-0.5" />
                <span>Change</span>
              </div>
            </div>

            <h2 className="text-xl font-bold text-fg leading-tight mb-1 text-center">{profile.username}</h2>
            <p className="text-xs text-muted mb-6 text-center select-all">{profile.email}</p>

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

        {/* Right Column: Stats, Profile Form & Activity */}
        <div className="md:col-span-2 flex flex-col gap-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="glass-card p-5 border border-custom-border rounded-2xl flex flex-col items-center text-center gap-2 hover:-translate-y-0.5 transition-all duration-200">
              <PlayCircle size={22} className="text-accent shrink-0" />
              <div>
                <div className="text-2xl md:text-3xl font-mono font-bold text-fg leading-tight">{history.length}</div>
                <div className="text-[9px] md:text-[10px] text-muted font-semibold mt-1 uppercase tracking-wider block whitespace-nowrap">Total Streamed</div>
              </div>
            </div>

            <div className="glass-card p-5 border border-custom-border rounded-2xl flex flex-col items-center text-center gap-2 hover:-translate-y-0.5 transition-all duration-200">
              <Clock size={22} className="text-accent shrink-0" />
              <div>
                <div className="text-2xl md:text-3xl font-mono font-bold text-fg leading-tight">{formattedPlayback}</div>
                <div className="text-[9px] md:text-[10px] text-muted font-semibold mt-1 uppercase tracking-wider block whitespace-nowrap">Playback Time</div>
              </div>
            </div>

            <div className="glass-card p-5 border border-custom-border rounded-2xl flex flex-col items-center text-center gap-2 hover:-translate-y-0.5 transition-all duration-200">
              <Heart size={22} className="text-accent shrink-0" />
              <div>
                <div className="text-2xl md:text-3xl font-mono font-bold text-fg leading-tight">{favoriteVideosCount}</div>
                <div className="text-[9px] md:text-[10px] text-muted font-semibold mt-1 uppercase tracking-wider block whitespace-nowrap">Saved Favorites</div>
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

              {/* Custom Avatar URL Field */}
              <div className="flex flex-col gap-2">
                <label htmlFor="avatarUrl" className="text-xs font-semibold text-muted uppercase tracking-wider select-none">Custom Avatar URL (Optional)</label>
                <div className="bg-surface border border-custom-border px-4 py-2.5 rounded-xl text-fg text-sm flex items-center gap-3 focus-within:border-accent transition-colors duration-200">
                  <User size={16} className="text-muted shrink-0" />
                  <input 
                    type="text" 
                    id="avatarUrl"
                    placeholder="https://example.com/your-image.jpg"
                    value={avatar}
                    onChange={(e) => setAvatar(e.target.value)}
                    className="w-full bg-transparent border-none outline-none text-fg"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 mt-2">
                <button 
                  type="submit" 
                  className="flex items-center justify-center gap-2 px-6 py-2.5 bg-accent text-bg rounded-xl font-semibold shadow-[0_4px_12px_var(--color-accent-muted)] hover:opacity-95 transition-all cursor-pointer text-sm"
                >
                  {saveFeedback ? <Check size={18} /> : null}
                  <span>{saveFeedback ? 'Changes Saved' : 'Save Changes'}</span>
                </button>
                {saveFeedback && (
                  <span className="text-xs text-accent animate-fade-in font-medium">Successfully saved.</span>
                )}
                {errorFeedback && (
                  <span className="text-xs text-rose-400 animate-fade-in font-medium">{errorFeedback}</span>
                )}
              </div>
            </form>
          </div>

          {/* Recent Watch Activity Feed */}
          <div className="glass-card p-6 border border-custom-border rounded-2xl flex flex-col flex-1">
            <h3 className="font-bold text-lg text-fg mb-4 select-none">Recent Watch Activity</h3>
            {history.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 border border-dashed border-custom-border rounded-2xl bg-white/[0.01] text-center gap-2 select-none">
                <p className="text-sm text-muted">No recently played videos found.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {history.slice(0, 3).map(item => {
                  return (
                    <div 
                      key={item.id} 
                      className="glass-card p-3 rounded-xl border border-custom-border flex items-center gap-4 group cursor-pointer hover:bg-white/5"
                      onClick={() => handlePlayRecentVideo(item.videoId)}
                    >
                      {/* Mini Thumbnail */}
                      <div className="w-20 aspect-video bg-surface-elevated rounded-lg overflow-hidden shrink-0 relative select-none">
                        <img src={item.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                          <PlayCircle size={20} className="text-accent" />
                        </div>
                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-white/10">
                          <div className="h-full bg-accent" style={{ width: `${item.progress}%` }}></div>
                        </div>
                      </div>

                      {/* Text Details */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-xs md:text-sm text-fg leading-snug line-clamp-1 group-hover:text-accent transition-colors duration-100">
                          {item.title}
                        </h4>
                        <div className="flex items-center gap-2 text-[10px] md:text-xs text-muted font-medium mt-1">
                          <span className="font-mono text-accent">{item.progress}% watched</span>
                          <span>•</span>
                          <span>{item.size}</span>
                          <span>•</span>
                          <span className="text-[10px]">{new Date(item.watchedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Preset Avatar Selection Modal */}
      {showAvatarModal && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowAvatarModal(false)}>
          <div className="glass-card p-6 max-w-sm w-full border border-custom-border relative flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <button 
              type="button"
              onClick={() => setShowAvatarModal(false)} 
              className="absolute top-4 right-4 text-muted hover:text-fg rounded-full p-1.5 hover:bg-white/5 transition-all cursor-pointer"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
            
            <div>
              <h3 className="font-bold text-base text-fg">Select Profile Avatar</h3>
              <p className="text-xs text-muted mt-1">Choose from our default preset avatars.</p>
            </div>

            <div className="grid grid-cols-3 gap-3 my-2">
              {PRESET_AVATARS.map(item => {
                const isSelected = avatar === item.url;
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => {
                      setAvatar(item.url);
                      setShowAvatarModal(false);
                    }}
                    className={`relative aspect-square rounded-xl overflow-hidden border-2 cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 group/btn ${isSelected ? 'border-accent' : 'border-custom-border opacity-70 hover:opacity-100'}`}
                    title={item.name}
                  >
                    <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                    {isSelected && (
                      <div className="absolute inset-0 bg-accent/20 flex items-center justify-center">
                        <Check size={20} className="stroke-[3.5] text-fg" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            
            <button 
              type="button"
              onClick={() => setShowAvatarModal(false)}
              className="w-full py-2 bg-surface hover:bg-white/5 border border-custom-border text-fg font-medium rounded-xl text-xs transition-all cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
