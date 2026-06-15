import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Play, Home, Layers, Heart, History, User, Settings, LogOut, Compass, ChevronLeft, ChevronRight, Sun, Moon } from 'lucide-react';
import ConfirmDialog from './ConfirmDialog';

/* Minimal tooltip that shows to the right of collapsed sidebar items */
function Tooltip({ label, children, show }) {
  if (!show) return children;
  return (
    <div className="relative group/tip">
      {children}
      <span
        className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap pointer-events-none opacity-0 scale-95 group-hover/tip:opacity-100 group-hover/tip:scale-100 transition-all duration-150 z-[200]"
        style={{
          background: 'var(--color-surface-elevated)',
          color: 'var(--color-fg)',
          border: '1px solid var(--color-custom-border)',
        }}
      >
        {/* Left-pointing arrow */}
        <span
          className="absolute top-1/2 -translate-y-1/2 -left-[6px]"
          style={{
            width: 0,
            height: 0,
            borderTop: '5px solid transparent',
            borderBottom: '5px solid transparent',
            borderRight: '6px solid var(--color-custom-border)',
          }}
        />
        <span
          className="absolute top-1/2 -translate-y-1/2 -left-[5px]"
          style={{
            width: 0,
            height: 0,
            borderTop: '5px solid transparent',
            borderBottom: '5px solid transparent',
            borderRight: '6px solid var(--color-surface-elevated)',
          }}
        />
        {label}
      </span>
    </div>
  );
}

export default function Sidebar({ isCollapsed = false, onToggleCollapse, settings = { themeMode: 'dark' }, onUpdateSettings }) {
  const location = useLocation();
  const [signOutConfirm, setSignOutConfirm] = useState(false);

  const handleToggleTheme = () => {
    if (onUpdateSettings) {
      let nextTheme = 'dark';
      if (settings.themeMode === 'dark') {
        nextTheme = 'light';
      } else if (settings.themeMode === 'light') {
        nextTheme = 'dark';
      } else {
        const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        nextTheme = isSystemDark ? 'light' : 'dark';
      }
      onUpdateSettings({ themeMode: nextTheme });
    }
  };

  const isLibraryActive = (tab = 'all') => {
    if (location.pathname !== '/library') return false;
    const searchParams = new URLSearchParams(location.search);
    const currentTab = searchParams.get('tab') || 'all';
    return currentTab === tab;
  };

  const isHomeActive = () => {
    return location.pathname === '/' || location.pathname.startsWith('/player');
  };

  return (
    <>
      {/* Sidebar for Desktop & Tablet */}
      <aside className={`fixed left-0 top-0 ${isCollapsed ? 'w-20 px-3 py-6' : 'w-64 p-6'} h-screen flex flex-col border-r border-custom-border bg-glass backdrop-blur-3xl z-[100] hidden md:flex transition-all duration-300`}>
        {/* Toggle Collapse Button */}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="absolute top-7 right-0 translate-x-1/2 z-[110] w-7 h-7 rounded-full bg-surface-elevated border border-custom-border text-muted hover:text-fg hover:scale-105 active:scale-95 flex items-center justify-center transition-all cursor-pointer shadow-glass"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <Link 
          to="/" 
          className={`flex items-center ${isCollapsed ? 'justify-center mb-8' : 'gap-3 mb-10'} font-bold text-xl text-fg cursor-pointer select-none transition-all duration-300`}
        >
          <div className="w-8 h-8 bg-accent rounded-lg grid place-items-center text-bg shrink-0">
            <Play fill="currentColor" size={16} className="ml-0.5" />
          </div>
          <span className={`transition-all duration-300 origin-left truncate ${isCollapsed ? 'opacity-0 w-0 scale-95 pointer-events-none' : 'opacity-100 w-auto'}`}>
            TeraBox Player
          </span>
        </Link>

        <nav className="mb-8">
          <div className={`text-[11px] uppercase tracking-widest text-muted mb-3 transition-all duration-300 truncate select-none ${isCollapsed ? 'opacity-0 h-0 mb-0 pl-0 overflow-hidden' : 'pl-3'}`}>Explore</div>
          <Tooltip label="Home" show={isCollapsed}>
            <Link 
              to="/" 
              className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-3'} py-2.5 rounded-xl text-muted hover:bg-surface hover:text-fg transition-all duration-200 mb-1 font-medium ${location.pathname === '/' ? 'bg-accent-muted text-accent hover:bg-accent-muted hover:text-accent' : ''}`}
            >
              <Home size={20} className="shrink-0" />
              <span className={`transition-all duration-300 origin-left truncate ${isCollapsed ? 'opacity-0 w-0 scale-95 pointer-events-none' : 'opacity-100 w-auto'}`}>
                Home
              </span>
            </Link>
          </Tooltip>
          <Tooltip label="Discover" show={isCollapsed}>
            <Link 
              to="/discover" 
              className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-3'} py-2.5 rounded-xl text-muted hover:bg-surface hover:text-fg transition-all duration-200 mb-1 font-medium ${location.pathname === '/discover' ? 'bg-accent-muted text-accent hover:bg-accent-muted hover:text-accent' : ''}`}
            >
              <Compass size={20} className="shrink-0" />
              <span className={`transition-all duration-300 origin-left truncate ${isCollapsed ? 'opacity-0 w-0 scale-95 pointer-events-none' : 'opacity-100 w-auto'}`}>
                Discover
              </span>
            </Link>
          </Tooltip>
          <Tooltip label="My Library" show={isCollapsed}>
            <Link 
              to="/library" 
              className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-3'} py-2.5 rounded-xl text-muted hover:bg-surface hover:text-fg transition-all duration-200 mb-1 font-medium ${isLibraryActive('all') ? 'bg-accent-muted text-accent hover:bg-accent-muted hover:text-accent' : ''}`}
            >
              <Layers size={20} className="shrink-0" />
              <span className={`transition-all duration-300 origin-left truncate ${isCollapsed ? 'opacity-0 w-0 scale-95 pointer-events-none' : 'opacity-100 w-auto'}`}>
                My Library
              </span>
            </Link>
          </Tooltip>
        </nav>

        <nav className="mb-8">
          <div className={`text-[11px] uppercase tracking-widest text-muted mb-3 transition-all duration-300 truncate select-none ${isCollapsed ? 'opacity-0 h-0 mb-0 pl-0 overflow-hidden' : 'pl-3'}`}>Library</div>
          <Tooltip label="Favorites" show={isCollapsed}>
            <Link 
              to="/library?tab=favorites" 
              className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-3'} py-2.5 rounded-xl text-muted hover:bg-surface hover:text-fg transition-all duration-200 mb-1 font-medium ${isLibraryActive('favorites') ? 'bg-accent-muted text-accent hover:bg-accent-muted hover:text-accent' : ''}`}
            >
              <Heart size={20} className="shrink-0" />
              <span className={`transition-all duration-300 origin-left truncate ${isCollapsed ? 'opacity-0 w-0 scale-95 pointer-events-none' : 'opacity-100 w-auto'}`}>
                Favorites
              </span>
            </Link>
          </Tooltip>
          <Tooltip label="History" show={isCollapsed}>
            <Link 
              to="/history" 
              className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-3'} py-2.5 rounded-xl text-muted hover:bg-surface hover:text-fg transition-all duration-200 mb-1 font-medium ${location.pathname === '/history' ? 'bg-accent-muted text-accent hover:bg-accent-muted hover:text-accent' : ''}`}
            >
              <History size={20} className="shrink-0" />
              <span className={`transition-all duration-300 origin-left truncate ${isCollapsed ? 'opacity-0 w-0 scale-95 pointer-events-none' : 'opacity-100 w-auto'}`}>
                History
              </span>
            </Link>
          </Tooltip>
        </nav>

        <div className="mt-auto flex flex-col gap-1">
          <Tooltip label={`Switch to ${settings.themeMode === 'light' ? 'Dark' : 'Light'} Theme`} show={isCollapsed}>
            <button 
              type="button"
              onClick={handleToggleTheme}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-3'} py-2.5 rounded-xl text-muted hover:bg-surface hover:text-fg transition-all duration-200 font-medium text-left cursor-pointer border-none outline-none group`}
            >
              {settings.themeMode === 'light' ? (
                <Moon size={20} className="shrink-0 text-violet-500 transition-transform duration-300 group-hover:rotate-12" />
              ) : (
                <Sun size={20} className="shrink-0 text-amber-400 transition-transform duration-500 group-hover:rotate-45" />
              )}
              <span className={`transition-all duration-300 origin-left truncate ${isCollapsed ? 'opacity-0 w-0 scale-95 pointer-events-none' : 'opacity-100 w-auto'}`}>
                {settings.themeMode === 'light' ? 'Dark Mode' : 'Light Mode'}
              </span>
            </button>
          </Tooltip>
          <Tooltip label="Profile" show={isCollapsed}>
            <Link 
              to="/profile" 
              className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-3'} py-2.5 rounded-xl text-muted hover:bg-surface hover:text-fg transition-all duration-200 font-medium ${location.pathname === '/profile' ? 'bg-accent-muted text-accent hover:bg-accent-muted hover:text-accent' : ''}`}
            >
              <User size={20} className="shrink-0" />
              <span className={`transition-all duration-300 origin-left truncate ${isCollapsed ? 'opacity-0 w-0 scale-95 pointer-events-none' : 'opacity-100 w-auto'}`}>
                Profile
              </span>
            </Link>
          </Tooltip>
          <Tooltip label="Settings" show={isCollapsed}>
            <Link 
              to="/settings" 
              className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-3'} py-2.5 rounded-xl text-muted hover:bg-surface hover:text-fg transition-all duration-200 font-medium ${location.pathname === '/settings' ? 'bg-accent-muted text-accent hover:bg-accent-muted hover:text-accent' : ''}`}
            >
              <Settings size={20} className="shrink-0" />
              <span className={`transition-all duration-300 origin-left truncate ${isCollapsed ? 'opacity-0 w-0 scale-95 pointer-events-none' : 'opacity-100 w-auto'}`}>
                Settings
              </span>
            </Link>
          </Tooltip>
          <Tooltip label="Sign Out" show={isCollapsed}>
            <button 
              type="button"
              onClick={() => setSignOutConfirm(true)}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-3'} py-2.5 rounded-xl text-rose-400/80 hover:bg-rose-500/10 hover:text-rose-400 transition-all duration-200 font-medium text-left cursor-pointer mt-1 border-none outline-none`}
            >
              <LogOut size={20} className="shrink-0" />
              <span className={`transition-all duration-300 origin-left truncate ${isCollapsed ? 'opacity-0 w-0 scale-95 pointer-events-none' : 'opacity-100 w-auto'}`}>
                Sign Out
              </span>
            </button>
          </Tooltip>
        </div>
      </aside>

      {/* Bottom Bar for Mobile Viewports */}
      <div className="fixed bottom-0 left-0 right-0 h-[72px] z-[99] flex justify-around items-center px-2 border-t border-custom-border bg-glass backdrop-blur-3xl md:hidden">
        <Link 
          to="/" 
          className={`flex flex-col items-center justify-center gap-1 px-3 py-1.5 rounded-xl text-muted hover:text-fg transition-all duration-200 ${isHomeActive() ? 'text-accent bg-accent-muted' : ''}`}
        >
          <Home size={22} />
          <span className="text-[10px]">Home</span>
        </Link>
        <Link 
          to="/discover" 
          className={`flex flex-col items-center justify-center gap-1 px-3 py-1.5 rounded-xl text-muted hover:text-fg transition-all duration-200 ${location.pathname === '/discover' ? 'text-accent bg-accent-muted' : ''}`}
        >
          <Compass size={22} />
          <span className="text-[10px]">Discover</span>
        </Link>
        <Link 
          to="/library" 
          className={`flex flex-col items-center justify-center gap-1 px-3 py-1.5 rounded-xl text-muted hover:text-fg transition-all duration-200 ${location.pathname === '/library' && !isLibraryActive('favorites') ? 'text-accent bg-accent-muted' : ''}`}
        >
          <Layers size={22} />
          <span className="text-[10px]">Library</span>
        </Link>
        <Link 
          to="/library?tab=favorites" 
          className={`flex flex-col items-center justify-center gap-1 px-3 py-1.5 rounded-xl text-muted hover:text-fg transition-all duration-200 ${isLibraryActive('favorites') ? 'text-accent bg-accent-muted' : ''}`}
        >
          <Heart size={22} />
          <span className="text-[10px]">Favorites</span>
        </Link>

      </div>

      <ConfirmDialog
        isOpen={signOutConfirm}
        title="Sign Out"
        message="Are you sure you want to sign out of TeraPlay?"
        confirmLabel="Sign Out"
        danger={true}
        onConfirm={() => {
          setSignOutConfirm(false);
          import('../firebase').then(({ auth }) => auth.signOut());
        }}
        onCancel={() => setSignOutConfirm(false)}
      />
    </>
  );
}
