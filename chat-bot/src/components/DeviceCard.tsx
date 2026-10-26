// ── Device card: 16-bit Pixel Phone Totem + Name + Firefly Status Light ──

interface Props {
  name: string;
  botActive: boolean;
  selected: boolean;
  onClick: () => void;
}

export function DeviceCard({ name, botActive, selected, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex flex-col items-center gap-3 p-5 transition-all duration-150 cursor-pointer w-full text-center ${
        selected
          ? 'pixel-card border-dark-accent bg-dark-card-hover shadow-[0_0_20px_rgba(34,197,94,0.2)]'
          : 'pixel-card hover:border-dark-accent/60 hover:bg-dark-card-hover'
      }`}
    >
      {/* Totem icon container with glowing firefly status */}
      <div className="relative">
        <div
          className={`w-16 h-16 p-2 flex items-center justify-center border-2 transition-all ${
            selected
              ? 'bg-dark-accent/15 border-dark-accent'
              : 'bg-dark-input-bg border-dark-border group-hover:border-dark-accent/50'
          }`}
        >
          <img
            src="/assets/pixel-phone-totem.png"
            alt={name}
            className="w-full h-full object-contain pixel-art group-hover:scale-105 transition-transform"
          />
        </div>

        {/* Firefly status indicator */}
        <span
          className={`absolute -top-1.5 -right-1.5 w-3.5 h-3.5 border-2 border-dark-bg ${
            botActive
              ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)] animate-pulse'
              : 'bg-red-400/80 shadow-[0_0_6px_rgba(248,113,113,0.4)]'
          }`}
          title={botActive ? 'Bot Guardião Ativo' : 'Bot Inativo'}
        />
      </div>

      {/* Instance Name */}
      <div className="w-full space-y-1">
        <span
          className={`block font-pixel text-xs truncate max-w-full transition-colors ${
            selected ? 'text-dark-accent' : 'text-dark-text group-hover:text-dark-accent'
          }`}
        >
          {name}
        </span>

        <span
          className={`inline-block text-[10px] font-pixel px-2 py-0.5 border ${
            botActive
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
              : 'bg-dark-input-bg border-dark-border text-dark-muted'
          }`}
        >
          {botActive ? '✨ BOT ATIVO' : '💤 INATIVO'}
        </span>
      </div>
    </button>
  );
}
