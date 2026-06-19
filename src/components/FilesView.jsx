import React, { useState, useEffect } from 'react';
import { useLocation, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { 
  FileText, Image as ImageIcon, Archive, FileAudio, File, 
  Download, ArrowLeft, Loader2, AlertCircle, Maximize2, ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE } from '../config';
import { useAuth } from '../contexts/AuthContext';

const getFileIconAndColor = (filename) => {
  const ext = filename.split('.').pop().toLowerCase();
  
  // Image formats
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) {
    return {
      icon: <ImageIcon size={20} />,
      colorClass: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
      isImage: true
    };
  }
  // Archives
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return {
      icon: <Archive size={20} />,
      colorClass: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
    };
  }
  // Documents
  if (['pdf'].includes(ext)) {
    return {
      icon: <FileText size={20} />,
      colorClass: 'text-rose-400 bg-rose-400/10 border-rose-400/20'
    };
  }
  if (['doc', 'docx', 'txt', 'rtf', 'odt'].includes(ext)) {
    return {
      icon: <FileText size={20} />,
      colorClass: 'text-blue-400 bg-blue-400/10 border-blue-400/20'
    };
  }
  // Audio
  if (['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(ext)) {
    return {
      icon: <FileAudio size={20} />,
      colorClass: 'text-purple-400 bg-purple-400/10 border-purple-400/20'
    };
  }
  
  // Default
  return {
    icon: <File size={20} />,
    colorClass: 'text-muted bg-surface-elevated border-custom-border'
  };
};

export default function FilesView({ onPreviewImage }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const url = searchParams.get('url') || '';

  const { currentUser, apiKey } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    // If state contains resolved data, use it directly
    if (location.state?.resolvedData) {
      setData(location.state.resolvedData);
    } else if (url) {
      // Fallback: Fetch resolved data from backend
      const fetchDetails = async () => {
        setLoading(true);
        setError(null);
        try {
          const headers = {};
          if (apiKey) {
            headers['Authorization'] = `Bearer ${apiKey}`;
          } else if (currentUser) {
            try {
              const idToken = await currentUser.getIdToken();
              headers['Authorization'] = `Bearer ${idToken}`;
            } catch (e) {
              console.error('Failed to get Firebase ID token:', e);
            }
          }
          const res = await fetch(`${API_BASE}/api/resolve?url=${encodeURIComponent(url)}&mode=download`, { headers });
          if (!res.ok) {
            throw new Error(`Server responded with status ${res.status}`);
          }
          const json = await res.json();
          if (json.status === 'error') {
            throw new Error(json.message || 'Failed to resolve assets.');
          }
          setData(json);
        } catch (err) {
          console.error('FilesView fetch error:', err);
          setError(err.message || 'Failed to load document metadata.');
        } finally {
          setLoading(false);
        }
      };
      fetchDetails();
    } else {
      setError('No URL provided to resolve.');
    }
  }, [url, location.state, currentUser, apiKey]);

  const handleBack = () => {
    navigate(-1);
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 size={40} className="text-accent animate-spin" />
        <p className="text-sm text-muted animate-pulse font-medium">Retrieving shared assets and credentials...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 text-center gap-5 px-4 select-none animate-fade-in">
        <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/20 grid place-items-center text-rose-400">
          <AlertCircle size={24} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-fg mb-2">Resolution Failed</h2>
          <p className="text-sm text-muted max-w-sm leading-relaxed">{error}</p>
        </div>
        <button 
          onClick={handleBack} 
          className="flex items-center gap-2 px-5 py-2.5 bg-surface hover:bg-surface-elevated border border-custom-border text-fg rounded-xl text-xs font-semibold transition-all cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>Go Back</span>
        </button>
      </div>
    );
  }

  if (!data) return null;

  const files = data.files || [];
  const title = data.title || 'Shared Folder/Files';

  return (
    <div className="animate-fade-in max-w-4xl flex-1 flex flex-col relative pb-10">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6 md:mb-10 select-none">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <button 
              onClick={handleBack}
              className="p-1.5 text-muted hover:text-fg hover:bg-surface rounded-lg transition-all cursor-pointer"
              title="Go Back"
            >
              <ArrowLeft size={16} />
            </button>
            <span className="text-xs font-bold text-accent bg-accent-muted border border-accent/20 px-2.5 py-0.5 rounded-lg uppercase tracking-wider">
              Files Downloader
            </span>
          </div>
          <h1 className="text-xl md:text-3xl font-bold text-fg leading-tight truncate">{title}</h1>
          <p className="text-[11px] md:text-xs text-muted mt-1 leading-snug">
            Download non-video documents, images, and archives proxied directly from high-speed mirrors.
          </p>
        </div>
      </header>

      {/* Share metadata cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 mb-6 md:mb-8">
        <div className="glass-card p-4 border border-custom-border rounded-xl flex flex-col gap-1">
          <span className="text-[9px] font-bold text-muted uppercase tracking-wider pl-0.5">Total Assets</span>
          <span className="text-lg font-mono font-bold text-fg">{files.length} {files.length === 1 ? 'file' : 'files'}</span>
        </div>
        <div className="glass-card p-4 border border-custom-border rounded-xl flex flex-col gap-1 select-all">
          <span className="text-[9px] font-bold text-muted uppercase tracking-wider pl-0.5">Share ID</span>
          <span className="text-lg font-mono font-bold text-accent truncate">{data.share_id || 'N/A'}</span>
        </div>
        <div className="glass-card p-4 border border-custom-border rounded-xl flex flex-col gap-1 select-all col-span-2 sm:col-span-1">
          <span className="text-[9px] font-bold text-muted uppercase tracking-wider pl-0.5">Sharer UK</span>
          <span className="text-lg font-mono font-bold text-muted truncate">{data.uk || 'N/A'}</span>
        </div>
      </div>

      {/* Files List */}
      <div className="flex flex-col gap-3.5">
        <AnimatePresence initial={false}>
          {files.map((file, idx) => {
            const meta = getFileIconAndColor(file.filename || '');
            let sizeStr = 'Unknown Size';
            if (file.size_mb) {
              sizeStr = `${file.size_mb.toFixed(2)} MB`;
            } else if (file.size_bytes) {
              sizeStr = `${(file.size_bytes / (1024 * 1024)).toFixed(2)} MB`;
            }

            return (
              <motion.div
                key={file.original_fs_id || idx}
                layout="position"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="glass-card p-4 border border-custom-border rounded-2xl flex items-center gap-4 hover:border-accent/40 transition-colors duration-200"
              >
                {/* File extension type icon */}
                <div className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 ${meta.colorClass}`}>
                  {meta.icon}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <h3 className="font-semibold text-xs md:text-sm text-fg leading-snug line-clamp-1 select-all hover:text-accent transition-colors">
                    {file.filename}
                  </h3>
                  <div className="flex items-center gap-2 text-[10px] md:text-xs text-muted font-medium">
                    <span className="font-mono text-accent">{sizeStr}</span>
                    {file.path && (
                      <>
                        <span>•</span>
                        <span className="truncate max-w-[200px] md:max-w-md select-all" title={file.path}>
                          Path: {file.path}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Image Lightbox Trigger */}
                  {meta.isImage && (file.thumbnails?.url3 || file.thumbnails?.url2 || file.thumbnails?.url1 || file.dlink) && (
                    <button
                      onClick={() => onPreviewImage && onPreviewImage({ 
                        url: file.thumbnails?.url3 || file.thumbnails?.url2 || file.thumbnails?.url1 || file.dlink, 
                        title: file.filename 
                      })}
                      className="p-2 md:p-2.5 rounded-xl bg-surface border border-custom-border text-muted hover:text-fg hover:scale-105 active:scale-95 transition-all cursor-pointer"
                      title="Preview Image"
                    >
                      <Maximize2 size={15} />
                    </button>
                  )}

                  {/* Proxied Direct Download Button */}
                  <a
                    href={file.dlink}
                    download={file.filename}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-accent text-bg font-bold text-xs shadow-[0_4px_12px_var(--color-accent-muted)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                    title="Download File"
                  >
                    <Download size={14} />
                    <span className="hidden sm:inline">Download</span>
                  </a>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
