// ── Device grid: all instances as 16-bit totems + section header + empty state ──

import { Plus, Loader2, Settings } from 'lucide-react';
import { useState } from 'react';
import { DeviceCard } from './DeviceCard';

interface Props {
  instanceNames: string[];
  selectedInstance: string | null;
  isBotActive: (name: string) => boolean;
  onSelect: (name: string) => void;
  onCreateInstance: (name: string) => Promise<void>;
  onOpenSettings: () => void;
  onToast: (msg: string, type: 'ok' | 'err') => void;
}

export function DeviceGrid({
  instanceNames,
  selectedInstance,
  isBotActive,
  onSelect,
  onCreateInstance,
  onOpenSettings,
  onToast,
}: Props) {
  const [showInput, setShowInput] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const activeCount = instanceNames.filter((n) => isBotActive(n)).length;

  const handleCreate = async () => {
    if (!newName.trim()) return onToast('Digite um nome para a instância.', 'err');
    setCreating(true);
    try {
      await onCreateInstance(newName.trim());
      setNewName('');
      setShowInput(false);
    } finally {
      setCreating(false);
    }
  };

  return (
    <main className="px-4 sm:px-6 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b-2 border-dark-border/80">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="font-pixel text-sm sm:text-base text-dark-text">
              🌿 Instâncias &amp; Comunicadores da Floresta
            </h2>
            <span className="text-[11px] font-pixel px-2.5 py-0.5 bg-dark-card border border-dark-border text-dark-muted">
              {instanceNames.length} TOTAL • {activeCount} ATIVO(S)
            </span>
          </div>

          {!showInput && (
            <button
              type="button"
              onClick={() => setShowInput(true)}
              className="pixel-btn px-3.5 py-2 bg-dark-card hover:bg-dark-card-hover hover:border-dark-accent text-xs font-pixel text-dark-accent flex items-center gap-2 self-start sm:self-auto cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>NOVA INSTÂNCIA</span>
            </button>
          )}
        </div>

        {instanceNames.length === 0 && !showInput ? (
          <div className="pixel-card p-10 text-center max-w-lg mx-auto my-8 space-y-4">
            <div className="w-20 h-20 mx-auto pixel-card-wood p-2.5 flex items-center justify-center">
              <img
                src="/assets/sprout-bot-icon.png"
                alt="Sprout Bot"
                className="w-full h-full object-contain pixel-art"
              />
            </div>
            <div className="space-y-1">
              <h3 className="font-pixel text-sm text-dark-text">
                NENHUM COMUNICADOR ENCONTRADO NA CLAREIRA
              </h3>
              <p className="text-xs text-dark-muted leading-relaxed">
                Crie sua primeira instância do WhatsApp ou configure a conexão com a Evolution
                API no Menu de Configurações.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowInput(true)}
                className="pixel-btn px-4 py-2.5 bg-dark-accent hover:bg-dark-accent-hover text-dark-bg font-pixel text-xs flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                CRIAR PRIMEIRA INSTÂNCIA
              </button>
              <button
                type="button"
                onClick={onOpenSettings}
                className="pixel-btn px-4 py-2.5 bg-dark-input-bg hover:border-dark-accent text-dark-text font-pixel text-xs flex items-center gap-2 cursor-pointer"
              >
                <Settings className="w-4 h-4 text-sun-gold" />
                ABRIR CONFIGURAÇÕES
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {instanceNames.map((name) => (
              <DeviceCard
                key={name}
                name={name}
                botActive={isBotActive(name)}
                selected={selectedInstance === name}
                onClick={() => onSelect(name)}
              />
            ))}

            {/* Add new instance card */}
            {showInput ? (
              <div className="pixel-card-wood p-4 flex flex-col items-center justify-center gap-3">
                <span className="font-pixel text-[11px] text-sun-gold">
                  NOVO COMUNICADOR
                </span>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  autoFocus
                  placeholder="Nome da instância..."
                  className="w-full px-3 py-2 pixel-input text-xs text-dark-text text-center"
                />
                <div className="flex gap-2 w-full">
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={creating}
                    className="pixel-btn flex-1 py-1.5 bg-dark-accent text-dark-bg font-pixel text-[11px] flex items-center justify-center disabled:opacity-50 cursor-pointer"
                  >
                    {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'CRIAR'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowInput(false);
                      setNewName('');
                    }}
                    className="pixel-btn px-2.5 py-1.5 bg-dark-input-bg text-dark-muted hover:text-dark-text font-pixel text-[10px] cursor-pointer"
                  >
                    X
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowInput(true)}
                className="flex flex-col items-center justify-center gap-3 p-5 border-2 border-dashed border-dark-border hover:border-dark-accent bg-dark-card/40 hover:bg-dark-card-hover transition-all cursor-pointer group"
              >
                <div className="w-16 h-16 bg-dark-input-bg border-2 border-dark-border group-hover:border-dark-accent flex items-center justify-center transition-colors">
                  <Plus className="w-6 h-6 text-dark-muted group-hover:text-dark-accent" />
                </div>
                <span className="font-pixel text-xs text-dark-muted group-hover:text-dark-text">
                  + NOVA INSTÂNCIA
                </span>
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
