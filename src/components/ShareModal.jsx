import React, { useState, useEffect, useRef } from 'react';
import { X, Check, Copy } from 'lucide-react';

function getShareUrl(videoId) {
  return `${window.location.origin}/?id=${videoId}`;
}

const SOCIAL_PLATFORMS = [
  {
    name: 'WhatsApp',
    color: '#25D366',
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    ),
    getUrl: (url, title) => `https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`,
  },
  {
    name: 'Telegram',
    color: '#2AABEE',
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
        <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
      </svg>
    ),
    getUrl: (url, title) => `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
  },
  {
    name: 'X',
    color: '#000000',
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
    getUrl: (url, title) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
  },
  {
    name: 'Facebook',
    color: '#1877F2',
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
    getUrl: (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
];

export default function ShareModal({ isOpen, onClose, video }) {
  const [copied, setCopied] = useState(false);
  const inputRef = useRef(null);

  const shareUrl = video ? getShareUrl(video.id) : '';

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  // Reset copied state when modal opens
  useEffect(() => {
    if (isOpen) setCopied(false);
  }, [isOpen]);

  if (!isOpen || !video) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      if (inputRef.current) {
        inputRef.current.select();
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const handleSocialShare = (platform) => {
    const url = platform.getUrl(shareUrl, video.title || 'Check out this video on iTeraPlay');
    window.open(url, '_blank', 'noopener,noreferrer,width=600,height=500');
  };

  return (
    <div
      className="fixed inset-0 bg-bg/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
      aria-labelledby="share-modal-title"
    >
      <div
        className="glass-card p-6 rounded-2xl border border-custom-border max-w-md w-full shadow-glass relative flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 id="share-modal-title" className="text-lg font-bold text-fg">Share Video</h3>
          <button
            onClick={onClose}
            className="text-muted hover:text-fg rounded-full w-8 h-8 grid place-items-center hover:bg-white/5 transition-all cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Copy Link Section */}
        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-bold uppercase tracking-widest text-muted select-none">Copy Link</label>
          <div className="flex items-center gap-2 bg-surface border border-custom-border rounded-xl p-1.5 pl-4 focus-within:border-accent transition-colors">
            <input
              ref={inputRef}
              type="text"
              value={shareUrl}
              readOnly
              className="flex-1 bg-transparent border-none outline-none text-sm text-fg font-mono truncate select-all"
              onClick={(e) => e.target.select()}
            />
            <button
              onClick={handleCopy}
              className={`shrink-0 px-5 py-2.5 rounded-lg font-bold text-sm transition-all duration-200 cursor-pointer flex items-center gap-2 ${
                copied
                  ? 'bg-emerald-500 text-white shadow-[0_4px_12px_rgba(16,185,129,0.3)]'
                  : 'bg-accent text-bg shadow-[0_4px_12px_var(--color-accent-muted)] hover:shadow-[0_8px_20px_var(--color-accent-muted)] hover:-translate-y-0.5 active:translate-y-0'
              }`}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'COPIED!' : 'COPY'}
            </button>
          </div>
        </div>

        {/* Share To Section */}
        <div className="flex flex-col gap-3">
          <label className="text-[11px] font-bold uppercase tracking-widest text-muted select-none">Share To</label>
          <div className="flex items-center justify-center gap-5">
            {SOCIAL_PLATFORMS.map((platform) => (
              <button
                key={platform.name}
                onClick={() => handleSocialShare(platform)}
                className="group flex flex-col items-center gap-2 cursor-pointer"
                title={`Share on ${platform.name}`}
              >
                <div
                  className="w-12 h-12 rounded-xl grid place-items-center text-white transition-all duration-200 group-hover:scale-110 group-hover:-translate-y-0.5 group-active:scale-95"
                  style={{
                    backgroundColor: platform.color,
                    boxShadow: `0 4px 14px ${platform.color}40`,
                  }}
                >
                  {platform.icon}
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted group-hover:text-fg transition-colors select-none">
                  {platform.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-muted select-none pt-1 border-t border-custom-border">
          Share this link to open directly in iTeraPlay
        </p>
      </div>
    </div>
  );
}
