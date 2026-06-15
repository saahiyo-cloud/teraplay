import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult
} from 'firebase/auth';
import { ref, set, get } from 'firebase/database';
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

  useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          setLoading(true);
          const user = result.user;
          const profileRef = ref(db, `users/${user.uid}/profile`);
          const profileSnap = await get(profileRef);
          
          if (!profileSnap.exists()) {
            await set(profileRef, {
              username: user.displayName || user.email.split('@')[0],
              email: user.email,
              tier: 'Premium Pro',
              avatar: user.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150',
              createdAt: new Date().toISOString()
            });
          }
        }
      } catch (err) {
        console.error('Redirect result error:', err);
        setError(err.message || 'Failed to complete Google Sign-In.');
      } finally {
        setLoading(false);
      }
    };
    handleRedirectResult();
  }, []);

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithRedirect(auth, provider);
    } catch (err) {
      console.error('Google auth error:', err);
      setError(err.message || 'Failed to redirect to Google.');
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

            {/* Divider */}
            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-custom-border/60"></div>
              <span className="flex-shrink mx-4 text-[10px] font-bold text-muted uppercase tracking-wider">Or continue with</span>
              <div className="flex-grow border-t border-custom-border/60"></div>
            </div>

            {/* Google Login Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-3 bg-surface border border-custom-border/80 hover:bg-white/5 text-fg font-bold rounded-xl text-sm transition-all duration-200 flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 disabled:transform-none"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Google</span>
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
