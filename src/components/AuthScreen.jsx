import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult
} from 'firebase/auth';
import { ref, set, get } from 'firebase/database';
import { Play, Mail, Lock, User, Eye, EyeOff, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';

/**
 * Ensure the Google user has a profile node in the Realtime Database.
 * Called after both popup and redirect flows.
 */
async function ensureGoogleUserProfile(user) {
  const profileRef = ref(db, `users/${user.uid}/profile`);
  const profileSnap = await get(profileRef);

  if (!profileSnap.exists()) {
    await set(profileRef, {
      username: user.displayName || user.email.split('@')[0],
      email: user.email,
      tier: 'Premium Pro',
      avatar: user.photoURL || 'https://i.pinimg.com/736x/62/26/9f/62269f2a2d55fe0bd0c8e611a6b2974d.jpg',
      createdAt: new Date().toISOString()
    });
  }
}

export default function AuthScreen({ onClose, initialIsSignUp = false }) {
  const [isSignUp, setIsSignUp] = useState(initialIsSignUp);
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

  // Handle redirect result for the rare fallback case where popup was blocked
  useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          setLoading(true);
          await ensureGoogleUserProfile(result.user);
        }
      } catch (err) {
        console.error('Redirect result error:', err);
        // Only show error if it's not a trivial "no redirect" scenario
        if (err.code !== 'auth/popup-closed-by-user') {
          setError(err.message || 'Failed to complete Google Sign-In.');
        }
      } finally {
        setLoading(false);
      }
    };
    handleRedirectResult();
  }, []);

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    const provider = new GoogleAuthProvider();

    try {
      // Primary: use popup (reliable across all environments)
      const result = await signInWithPopup(auth, provider);
      await ensureGoogleUserProfile(result.user);
      // onAuthStateChanged in AuthContext will handle the rest
    } catch (err) {
      // If popup was blocked by browser, fall back to redirect
      if (err.code === 'auth/popup-blocked') {
        try {
          await signInWithRedirect(auth, provider);
          return; // page will reload on redirect
        } catch (redirectErr) {
          console.error('Redirect fallback error:', redirectErr);
          setError(redirectErr.message || 'Failed to sign in with Google.');
        }
      } else if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        // User closed the popup — not an error, just reset loading
        setLoading(false);
        return;
      } else {
        console.error('Google auth error:', err);
        setError(err.message || 'Failed to sign in with Google.');
      }
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center font-body select-none overflow-hidden p-4 md:p-8">
      
      {/* Main Background Image */}
      <img 
        src="https://i.pinimg.com/1200x/a4/ea/09/a4ea0979c86de029b75aaf4dd5f86e52.jpg" 
        alt="Background Cover" 
        className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none z-0"
      />
      {/* Dim layer and gradient fade for the background image */}
      <div className="absolute inset-0 bg-black/35 z-0" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/40 to-transparent z-0" />

      {/* Floating Back to Home button on the top left of the screen */}
      {onClose && (
        <button 
          onClick={onClose}
          className="absolute top-6 left-6 px-4 py-2.5 text-white bg-black/40 hover:bg-black/65 border border-white/10 backdrop-blur-md rounded-xl text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer z-50 shadow-lg"
          aria-label="Back to landing page"
        >
          <ArrowLeft size={16} />
          <span>Back to Home</span>
        </button>
      )}

      {/* Main Container Card */}
      <div className="w-full max-w-4xl bg-surface text-fg border border-custom-border/80 rounded-[28px] shadow-2xl flex flex-col md:flex-row p-3 gap-6 items-stretch min-h-[580px] relative z-10 animate-fade-in">
        
        {/* Left Side: Image Block */}
        <div className="hidden md:block md:w-[45%] relative overflow-hidden rounded-[20px] bg-black">
          <img 
            src="https://i.pinimg.com/736x/5f/8c/5c/5f8c5cc6e3cb964acdcd86de442603a7.jpg" 
            alt="Welcome Cover"
            className="w-full h-full object-cover select-none pointer-events-none absolute inset-0 opacity-85"
          />
          {/* Dark Overlay Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30 z-10" />
          
          {/* Text Overlay on Left Side Image */}
          <div className="absolute inset-0 p-8 flex flex-col justify-between z-20 text-white">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-semibold border border-white/10 w-fit">
              <Play fill="currentColor" size={10} />
              <span>TeraPlay Vault</span>
            </div>
            
            <div>
              <h2 className="text-2xl font-bold leading-snug tracking-tight text-white/95">
                Convert your streams into pure enjoyment.
              </h2>
            </div>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="flex-1 flex flex-col justify-center p-6 md:p-8">
          
          {/* Header */}
          <div className="mb-6">
            <div className="w-10 h-10 bg-accent/10 text-accent rounded-full flex items-center justify-center mb-4">
              <Play fill="currentColor" size={18} className="ml-0.5" />
            </div>
            <h1 className="text-2xl font-bold text-fg tracking-tight">
              {isSignUp ? 'Get Started' : 'Welcome home'}
            </h1>
            <p className="text-muted text-xs mt-1">
              {isSignUp ? 'Welcome to TeraPlay — Let\'s get started' : 'Welcome to TeraPlay — Please enter your details'}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-start gap-2.5">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {isSignUp && (
              <div>
                <label className="text-xs font-semibold text-muted mb-1.5 block">Nickname</label>
                <input 
                  type="text" 
                  placeholder="e.g. Shakir" 
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full bg-bg border border-custom-border/60 focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none px-4 py-2.5 rounded-xl text-sm text-fg placeholder-muted/50 transition-all animate-fade-in"
                  required={isSignUp}
                />
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-muted mb-1.5 block">Your email</label>
              <input 
                type="email" 
                placeholder="hi@hextastudio.in" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-bg border border-custom-border/60 focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none px-4 py-2.5 rounded-xl text-sm text-fg placeholder-muted/50 transition-all"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted mb-1.5 block">
                {isSignUp ? 'Create new password' : 'Password'}
              </label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="••••••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-bg border border-custom-border/60 focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none px-4 py-2.5 rounded-xl text-sm text-fg placeholder-muted/50 transition-all"
                  required
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-fg transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="mt-4 w-full py-2.5 bg-accent text-bg hover:opacity-90 font-semibold rounded-xl text-sm shadow-md transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:transform-none"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <span>{isSignUp ? 'Create new account' : 'Login'}</span>
              )}
            </button>

            {/* Divider */}
            <div className="relative flex items-center py-1 mt-1">
              <div className="flex-grow border-t border-custom-border/60"></div>
              <span className="flex-shrink mx-4 text-xs text-muted">or</span>
              <div className="flex-grow border-t border-custom-border/60"></div>
            </div>

            {/* Google Sign-In */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-2.5 bg-surface-elevated border border-custom-border text-fg hover:bg-surface-elevated/70 font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
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
              <span>Continue with Google</span>
            </button>
          </form>

          {/* Toggle */}
          <div className="mt-6 text-center text-xs text-muted">
            {isSignUp ? 'Already have account?' : "Don't have an account?"}
            <button 
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
              }}
              className="ml-1 text-accent font-semibold hover:underline bg-transparent border-none outline-none cursor-pointer"
            >
              {isSignUp ? 'Login' : 'Sign Up'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
