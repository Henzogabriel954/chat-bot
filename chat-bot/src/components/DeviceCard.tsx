// ── Device card: phone icon + name + status light ──

import { Smartphone } from 'lucide-react';

interface Props {
  name: string;
  botActive: boolean;
  selected: boolean;
  onClick: () => void;
}

export function DeviceCard({ name, botActive, selected, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className={`group flex flex-col items-center gap-2 p-5 rounded-2xl border transition-all duration-200 cursor-pointer w-full ${
        selected
          ? 'bg-dark-accent/10 border-dark-accent/50 shadow-lg shadow-dark-accent/10'
          : 'bg-dark-card border-dark-border hover:border-dark-accent/30 hover:bg-dark-card-hover'
      }`}
    >
      {/* Phone icon with status light */}
      <div className="relative">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
          selected ? 'bg-dark-accent/20' : 'bg-dark-input-bg group-hover:bg-dark-border/50'
        }`}>
          <Smartphone className={`w-7 h-7 transition-colors ${
            selected ? 'text-dark-accent' : 'text-dark-muted group-hover:text-dark-text'
          }`} />
        </div>
        {/* Status light */}
        <span className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-dark-bg ${
          botActive ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.3)]'
        }`} />
      </div>

      {/* Instance name */}
      <span className={`text-sm font-medium truncate max-w-full transition-colors ${
        selected ? 'text-dark-accent' : 'text-dark-text'
      }`}>
        {name}
      </span>
    </button>
  );
}
