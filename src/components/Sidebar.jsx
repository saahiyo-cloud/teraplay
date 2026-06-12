import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Play, Home, Layers, Clock, Download, Heart, History, User, Settings } from 'lucide-react';

export default function Sidebar() {
  const location = useLocation();

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
      <aside className="fixed left-0 top-0 w-64 h-screen flex flex-col p-6 border-r border-custom-border bg-glass backdrop-blur-3xl z-[100] hidden md:flex">
        <Link 
          to="/" 
          className="flex items-center gap-3 font-bold text-xl mb-10 text-fg cursor-pointer select-none"
        >
          <div className="w-8 h-8 bg-accent rounded-lg grid place-items-center text-bg">
            <Play fill="currentColor" size={16} className="ml-0.5" />
          </div>
          <span>TeraBox Player</span>
        </Link>

        <nav className="mb-8">
          <div className="text-[11px] uppercase tracking-widest text-muted mb-3 pl-3 select-none">Explore</div>
          <Link 
            to="/" 
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted hover:bg-surface hover:text-fg transition-all duration-200 mb-1 font-medium ${location.pathname === '/' ? 'bg-accent-muted text-accent hover:bg-accent-muted hover:text-accent' : ''}`}
          >
            <Home size={20} />
            <span>Home</span>
          </Link>
          <Link 
            to="/library" 
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted hover:bg-surface hover:text-fg transition-all duration-200 mb-1 font-medium ${isLibraryActive('all') ? 'bg-accent-muted text-accent hover:bg-accent-muted hover:text-accent' : ''}`}
          >
            <Layers size={20} />
            <span>My Library</span>
          </Link>
          <Link 
            to="/library?tab=recent" 
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted hover:bg-surface hover:text-fg transition-all duration-200 mb-1 font-medium ${isLibraryActive('recent') ? 'bg-accent-muted text-accent hover:bg-accent-muted hover:text-accent' : ''}`}
          >
            <Clock size={20} />
            <span>Recent Plays</span>
          </Link>
          <Link 
            to="/downloads" 
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted hover:bg-surface hover:text-fg transition-all duration-200 mb-1 font-medium ${location.pathname === '/downloads' ? 'bg-accent-muted text-accent hover:bg-accent-muted hover:text-accent' : ''}`}
          >
            <Download size={20} />
            <span>Downloads</span>
          </Link>
        </nav>

        <nav className="mb-8">
          <div className="text-[11px] uppercase tracking-widest text-muted mb-3 pl-3 select-none">Library</div>
          <Link 
            to="/library?tab=favorites" 
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted hover:bg-surface hover:text-fg transition-all duration-200 mb-1 font-medium ${isLibraryActive('favorites') ? 'bg-accent-muted text-accent hover:bg-accent-muted hover:text-accent' : ''}`}
          >
            <Heart size={20} />
            <span>Favorites</span>
          </Link>
          <Link 
            to="/history" 
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted hover:bg-surface hover:text-fg transition-all duration-200 mb-1 font-medium ${location.pathname === '/history' ? 'bg-accent-muted text-accent hover:bg-accent-muted hover:text-accent' : ''}`}
          >
            <History size={20} />
            <span>History</span>
          </Link>
        </nav>

        <div className="mt-auto flex flex-col gap-1">
          <Link 
            to="/profile" 
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted hover:bg-surface hover:text-fg transition-all duration-200 font-medium ${location.pathname === '/profile' ? 'bg-accent-muted text-accent hover:bg-accent-muted hover:text-accent' : ''}`}
          >
            <User size={20} />
            <span>Profile</span>
          </Link>
          <Link 
            to="/settings" 
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted hover:bg-surface hover:text-fg transition-all duration-200 font-medium ${location.pathname === '/settings' ? 'bg-accent-muted text-accent hover:bg-accent-muted hover:text-accent' : ''}`}
          >
            <Settings size={20} />
            <span>Settings</span>
          </Link>
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
        <Link 
          to="/downloads" 
          className={`flex flex-col items-center justify-center gap-1 px-3 py-1.5 rounded-xl text-muted hover:text-fg transition-all duration-200 ${location.pathname === '/downloads' ? 'text-accent bg-accent-muted' : ''}`}
        >
          <Download size={22} />
          <span className="text-[10px]">Downloads</span>
        </Link>
      </div>
    </>
  );
}
