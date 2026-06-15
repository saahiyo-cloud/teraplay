import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

/**
 * Reusable confirmation dialog that matches the app's glass-card UI using shadcn/ui.
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
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent 
        showCloseButton={true} 
        className="glass-card p-6 rounded-2xl border border-custom-border max-w-sm w-full shadow-glass relative flex flex-col gap-5 bg-popover"
      >
        {/* Icon + heading */}
        <div className="flex items-center gap-3 pr-6">
          <div className={`w-10 h-10 rounded-full grid place-items-center shrink-0 ${danger ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400' : 'bg-accent/10 border border-accent/20 text-accent'}`}>
            <AlertTriangle size={20} />
          </div>
          <DialogTitle className="text-base font-bold text-fg leading-snug">
            {title}
          </DialogTitle>
        </div>

        {/* Message */}
        {message && (
          <p className="text-sm text-muted leading-relaxed">{message}</p>
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-1">
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1 py-2.5 h-auto rounded-xl border border-custom-border bg-surface-elevated hover:bg-white/5 text-fg font-semibold text-sm transition-all cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            className={`flex-1 py-2.5 h-auto rounded-xl font-semibold text-sm transition-all cursor-pointer ${
              danger
                ? 'bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-400 hover:text-rose-400'
                : 'bg-accent text-bg shadow-[0_4px_12px_var(--color-accent-muted)] hover:shadow-[0_8px_20px_var(--color-accent-muted)] hover:-translate-y-0.5'
            }`}
          >
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
