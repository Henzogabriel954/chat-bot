// ── Toast notification component (Pixel Art Nature style) ──

import { X, CheckCircle, AlertCircle } from 'lucide-react';
import type { ToastType } from '../types';

interface Props {
  message: string;
  type: ToastType;
  onDismiss: () => void;
}

export function Toast({ message, type, onDismiss }: Props) {
  if (!type || !message) return null;

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in max-w-md">
      <div
        className={`pixel-card flex items-center gap-3 px-4 py-3 ${
          type === 'ok'
            ? 'bg-dark-card border-dark-accent text-dark-text'
            : 'bg-wood-bg border-dark-danger text-dark-text'
        }`}
      >
        {type === 'ok' ? (
          <CheckCircle className="w-5 h-5 text-dark-accent shrink-0" />
        ) : (
          <AlertCircle className="w-5 h-5 text-dark-danger shrink-0" />
        )}
        <span className="text-xs font-pixel flex-1 leading-relaxed">{message}</span>
        <button
          type="button"
          onClick={onDismiss}
          className="p-1 text-dark-muted hover:text-dark-text transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
