import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, ArrowLeft, Compass } from 'lucide-react';

export default function NotFoundView() {
  const navigate = useNavigate();
  const location = useLocation();
  const attemptedPath = location.pathname || '/unknown';

  return (
    <div className="flex flex-col items-center justify-center min-h-[75vh] text-center select-none px-4">

      {/* 404 number — large, muted, typographic */}
      <p
        className="font-bold tracking-tight leading-none"
        style={{
          fontSize: 'clamp(120px, 20vw, 220px)',
          fontFamily: 'var(--font-display)',
          color: 'var(--color-custom-border)',
          userSelect: 'none',
        }}
      >
        404
      </p>

      {/* Thin accent divider */}
      <div
        style={{
          width: '48px',
          height: '3px',
          borderRadius: '4px',
          background: 'var(--color-accent)',
          marginTop: '-8px',
          marginBottom: '24px',
        }}
      />

      {/* Copy */}
      <h2
        className="text-lg md:text-xl font-semibold mb-2"
        style={{ color: 'var(--color-fg)', fontFamily: 'var(--font-display)' }}
      >
        Page not found
      </h2>
      <p
        className="text-sm max-w-sm leading-relaxed mb-6"
        style={{ color: 'var(--color-muted)' }}
      >
        The page at{' '}
        <code
          className="px-1.5 py-0.5 rounded-md text-xs font-mono"
          style={{
            background: 'oklch(100% 0 0 / 0.05)',
            border: '1px solid var(--color-custom-border)',
            color: 'var(--color-fg)',
          }}
        >
          {attemptedPath}
        </code>{' '}
        doesn't exist or has been moved.
      </p>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer"
          style={{
            background: 'var(--color-accent)',
            color: 'var(--color-bg)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          <Home size={15} />
          Go Home
        </button>

        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer"
          style={{
            background: 'oklch(100% 0 0 / 0.05)',
            border: '1px solid var(--color-custom-border)',
            color: 'var(--color-fg)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'oklch(100% 0 0 / 0.08)';
            e.currentTarget.style.borderColor = 'var(--color-muted)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'oklch(100% 0 0 / 0.05)';
            e.currentTarget.style.borderColor = 'var(--color-custom-border)';
          }}
        >
          <ArrowLeft size={15} />
          Go Back
        </button>

        <button
          onClick={() => navigate('/discover')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer"
          style={{
            background: 'oklch(100% 0 0 / 0.05)',
            border: '1px solid var(--color-custom-border)',
            color: 'var(--color-fg)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'oklch(100% 0 0 / 0.08)';
            e.currentTarget.style.borderColor = 'var(--color-muted)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'oklch(100% 0 0 / 0.05)';
            e.currentTarget.style.borderColor = 'var(--color-custom-border)';
          }}
        >
          <Compass size={15} />
          Discover
        </button>
      </div>
    </div>
  );
}
