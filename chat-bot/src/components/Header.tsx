// ── Pixel Art Nature Header with Quick Status Badges, Settings & Logout ──

import { Settings, Bot, Mic, LogOut } from 'lucide-react';
import type { SettingsTab } from './SettingsModal';

interface Props {
  connected: boolean;
  selectedModel: string;
  audioEnabled: boolean;
  whisperModel: string;
  onOpenSettings: (tab?: SettingsTab) => void;
  onLogout: () => void;
}

export function Header({
  connected,
  selectedModel,
  audioEnabled,
  whisperModel,
  onOpenSettings,
  onLogout,
}: Props) {
  return (
    <header className="relative border-b-2 border-dark-border bg-dark-card sticky top-0 z-40 overflow-hidden shadow-lg">
      {/* Panoramic 16-bit Forest Canopy Banner Background */}
      <img
        src="/assets/forest-banner.png"
        alt=""
        className="absolute inset-0 w-full h-full object-cover pixel-art opacity-35 pointer-events-none"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-dark-bg/90 via-dark-card/85 to-dark-bg/95 pointer-events-none" />

      {/* Ambient Firefly Particles */}
      <span
        className="absolute top-3 left-1/4 w-2 h-2 bg-sun-gold rounded-none animate-firefly pointer-events-none shadow-[0_0_8px_#f59e0b]"
        style={{ animationDelay: '0.2s' }}
      />
      <span
        className="absolute bottom-3 left-1/2 w-1.5 h-1.5 bg-dark-accent rounded-none animate-firefly pointer-events-none shadow-[0_0_8px_#22c55e]"
        style={{ animationDelay: '1.4s' }}
      />
      <span
        className="absolute top-4 right-1/3 w-2 h-2 bg-sun-gold rounded-none animate-firefly pointer-events-none shadow-[0_0_8px_#f59e0b]"
        style={{ animationDelay: '2.3s' }}
      />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Brand Emblem & Title */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 sm:w-14 sm:h-14 pixel-card-wood p-1.5 flex items-center justify-center shrink-0">
            <img
              src="/assets/sprout-bot-icon.png"
              alt="WhatzBot Mascot"
              className="w-full h-full object-contain pixel-art"
            />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-pixel text-lg sm:text-xl text-dark-text tracking-wider drop-shadow">
                WHATZBOT
              </h1>
              <span className="text-[10px] font-pixel px-2 py-0.5 bg-dark-accent/20 text-dark-accent border border-dark-accent/40">
                16-BIT NATURE
              </span>
            </div>
            <p className="text-xs text-dark-muted mt-0.5">
              Guardião da Floresta • Painel de Automação IA
            </p>
          </div>
        </div>

        {/* Status Badges & Unified Settings Button */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Evolution API Badge */}
          <button
            type="button"
            onClick={() => onOpenSettings('evolution')}
            title="Configurar Evolution API"
            className="pixel-btn px-3 py-1.5 bg-dark-bg/90 hover:bg-dark-card-hover flex items-center gap-2 text-xs text-dark-text cursor-pointer"
          >
            <span
              className={`w-2.5 h-2.5 inline-block ${
                connected
                  ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                  : 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.6)]'
              }`}
            />
            <span className="font-pixel text-[11px]">
              {connected ? 'API: Conectada' : 'API: Offline'}
            </span>
          </button>

          {/* AI Model Badge */}
          <button
            type="button"
            onClick={() => onOpenSettings('ollama')}
            title="Configurar Modelo de IA (Ollama)"
            className="pixel-btn px-3 py-1.5 bg-dark-bg/90 hover:bg-dark-card-hover flex items-center gap-2 text-xs text-dark-text cursor-pointer"
          >
            <Bot className="w-3.5 h-3.5 text-dark-accent shrink-0" />
            <span className="font-pixel text-[11px] truncate max-w-[170px]">
              IA: {selectedModel || 'Não definido'}
            </span>
          </button>

          {/* Whisper Audio Badge */}
          <button
            type="button"
            onClick={() => onOpenSettings('whisper')}
            title="Configurar Transcrição de Áudio (Whisper)"
            className="pixel-btn px-3 py-1.5 bg-dark-bg/90 hover:bg-dark-card-hover flex items-center gap-2 text-xs text-dark-text cursor-pointer"
          >
            <Mic
              className={`w-3.5 h-3.5 shrink-0 ${
                audioEnabled ? 'text-sun-gold' : 'text-dark-muted'
              }`}
            />
            <span className="font-pixel text-[11px]">
              {audioEnabled ? `Áudio: Whisper (${whisperModel})` : 'Áudio: Off'}
            </span>
          </button>

          {/* Prominent Settings Modal Trigger */}
          <button
            type="button"
            onClick={() => onOpenSettings('evolution')}
            className="pixel-btn px-4 py-2 bg-dark-accent hover:bg-dark-accent-hover text-dark-bg font-pixel text-xs flex items-center gap-2 cursor-pointer ml-auto sm:ml-1"
          >
            <Settings className="w-4 h-4" />
            <span>⚙️ Configurações</span>
          </button>

          {/* Logout Button */}
          <button
            type="button"
            onClick={onLogout}
            title="Sair do painel"
            className="pixel-btn px-3 py-2 bg-dark-input-bg hover:border-red-500/50 text-dark-muted hover:text-red-300 font-pixel text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </div>
    </header>
  );
}
