// ── Toast notification component ──

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
        className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-sm border ${
          type === 'ok'
            ? 'bg-emerald-600/95 border-emerald-500/50 text-white'
            : 'bg-red-600/95 border-red-500/50 text-white'
        }`}
      >
        {type === 'ok' ? (
          <CheckCircle className="w-5 h-5 shrink-0" />
        ) : (
          <AlertCircle className="w-5 h-5 shrink-0" />
        )}
        <span className="text-sm font-medium flex-1">{message}</span>
        <button
          onClick={onDismiss}
          className="p-1 rounded-lg hover:bg-white/20 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
