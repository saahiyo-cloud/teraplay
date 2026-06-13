import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile 
} from 'firebase/auth';
import { ref, set } from 'firebase/database';
import { Play, Mail, Lock, User, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';

export default function AuthScreen() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        if (!nickname.trim()) {
          throw new Error('Please enter a nickname');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters');
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Set nickname in Auth Profile
        await updateProfile(user, {
          displayName: nickname.trim(),
          photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150'
        });

        // Initialize user database profile
        await set(ref(db, `users/${user.uid}/profile`), {
          username: nickname.trim(),
          email: user.email,
          tier: 'Premium Pro',
          avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150',
          createdAt: new Date().toISOString()
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      console.error('Auth error:', err);
      let message = err.message;
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        message = 'Invalid email or password.';
      } else if (err.code === 'auth/email-already-in-use') {
        message = 'This email address is already in use.';
      } else if (err.code === 'auth/invalid-email') {
        message = 'Please enter a valid email address.';
      } else if (err.code === 'auth/weak-password') {
        message = 'Password should be at least 6 characters.';
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-bg z-[9999] flex items-center justify-center p-4 overflow-y-auto font-body">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/10 rounded-full blur-[120px] pointer-events-none animate-pulse duration-[8000ms]"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-muted/20 rounded-full blur-[150px] pointer-events-none animate-pulse duration-[10000ms]"></div>

      <div className="w-full max-w-md my-auto relative z-10 animate-fade-in">
        {/* Logo Header */}
        <div className="flex flex-col items-center mb-8 select-none">
          <div className="w-14 h-14 bg-accent rounded-2xl grid place-items-center text-bg mb-4 shadow-[0_8px_30px_oklch(65%_0.18_250_/_0.3)]">
            <Play fill="currentColor" size={24} className="ml-1" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-fg glow-text-accent">TeraPlay</h1>
          <p className="text-muted text-sm mt-2">Your Premium Cloud Streaming Vault</p>
        </div>

        {/* Card */}
        <div className="glass-card p-8 border border-custom-border/80 shadow-[0_20px_50px_oklch(0%_0_0_/_0.5)] rounded-2xl">
          <h2 className="text-xl font-bold text-fg mb-6 text-center">
            {isSignUp ? 'Create your Account' : 'Sign in to TeraPlay'}
          </h2>

          {error && (
            <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-start gap-3 animate-fade-in">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {isSignUp && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-muted uppercase tracking-wider pl-1">Nickname</label>
                <div className="bg-surface border border-custom-border/60 px-4 py-3 rounded-xl text-fg text-sm flex items-center gap-3 focus-within:border-accent/60 transition-colors duration-200">
                  <User size={16} className="text-muted shrink-0" />
                  <input 
                    type="text" 
                    placeholder="e.g. Shakir" 
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="w-full bg-transparent border-none outline-none text-fg"
                    required={isSignUp}
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-muted uppercase tracking-wider pl-1">Email Address</label>
              <div className="bg-surface border border-custom-border/60 px-4 py-3 rounded-xl text-fg text-sm flex items-center gap-3 focus-within:border-accent/60 transition-colors duration-200">
                <Mail size={16} className="text-muted shrink-0" />
                <input 
                  type="email" 
                  placeholder="name@example.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent border-none outline-none text-fg"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-muted uppercase tracking-wider pl-1">Password</label>
              <div className="bg-surface border border-custom-border/60 px-4 py-3 rounded-xl text-fg text-sm flex items-center gap-3 focus-within:border-accent/60 transition-colors duration-200">
                <Lock size={16} className="text-muted shrink-0" />
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent border-none outline-none text-fg"
                  required
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-muted hover:text-fg transition-colors flex items-center"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="mt-4 w-full py-3 bg-accent text-bg hover:opacity-95 font-bold rounded-xl text-sm transition-all duration-200 shadow-[0_4px_12px_var(--color-accent-muted)] hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:transform-none"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <span>{isSignUp ? 'Sign Up' : 'Sign In'}</span>
              )}
            </button>
          </form>

          {/* Toggle */}
          <div className="mt-6 text-center text-xs text-muted">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            <button 
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
              }}
              className="ml-1 text-accent font-semibold hover:underline bg-transparent border-none outline-none cursor-pointer"
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
