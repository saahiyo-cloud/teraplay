import React, { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

/**
 * Reusable confirmation dialog that matches the app's glass-card UI.
 *
 * Props:
 *  - isOpen        {boolean}   Whether the dialog is visible
 *  - onConfirm     {function}  Called when the user clicks the confirm button
 *  - onCancel      {function}  Called when the user clicks Cancel or the backdrop/X
 *  - title         {string}    Dialog heading
 *  - message       {string}    Body text
 *  - confirmLabel  {string}    Confirm button label (default: "Confirm")
 *  - danger        {boolean}   If true, the confirm button uses rose/red styling (default: true)
 */
export default function ConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
  title = 'Are you sure?',
  message = '',
  confirmLabel = 'Confirm',
  danger = true,
}) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-bg/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4 animate-fade-in"
      onClick={onCancel}
      aria-modal="true"
      role="dialog"
      aria-labelledby="confirm-dialog-title"
    >
      <div
        className="glass-card p-6 rounded-2xl border border-custom-border max-w-sm w-full shadow-glass relative flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-muted hover:text-fg rounded-full p-1 hover:bg-white/5 transition-all cursor-pointer"
          aria-label="Cancel"
        >
          <X size={18} />
        </button>

        {/* Icon + heading */}
        <div className="flex items-center gap-3 pr-6">
          <div className={`w-10 h-10 rounded-full grid place-items-center shrink-0 ${danger ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400' : 'bg-accent/10 border border-accent/20 text-accent'}`}>
            <AlertTriangle size={20} />
          </div>
          <h3 id="confirm-dialog-title" className="text-base font-bold text-fg leading-snug">
            {title}
          </h3>
        </div>

        {/* Message */}
        {message && (
          <p className="text-sm text-muted leading-relaxed">{message}</p>
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-1">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-custom-border bg-surface-elevated hover:bg-white/5 text-fg font-semibold text-sm transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all cursor-pointer ${
              danger
                ? 'bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-400'
                : 'bg-accent text-bg shadow-[0_4px_12px_var(--color-accent-muted)] hover:shadow-[0_8px_20px_var(--color-accent-muted)] hover:-translate-y-0.5'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
