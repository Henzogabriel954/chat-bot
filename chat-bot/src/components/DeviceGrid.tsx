// ── Device grid: all instances as phone icons + add button ──

import { Plus, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { DeviceCard } from './DeviceCard';

interface Props {
  instanceNames: string[];
  selectedInstance: string | null;
  isBotActive: (name: string) => boolean;
  onSelect: (name: string) => void;
  onCreateInstance: (name: string) => Promise<void>;
  onToast: (msg: string, type: 'ok' | 'err') => void;
}

export function DeviceGrid({
  instanceNames,
  selectedInstance,
  isBotActive,
  onSelect,
  onCreateInstance,
  onToast,
}: Props) {
  const [showInput, setShowInput] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

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
    <div className="px-6 py-8">
      <div className="max-w-5xl mx-auto">
        {instanceNames.length === 0 && !showInput ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3 opacity-50">📱</div>
            <p className="text-dark-muted mb-4">Nenhuma instância encontrada</p>
            <button
              onClick={() => setShowInput(true)}
              className="px-4 py-2 bg-dark-accent hover:bg-dark-accent-hover text-white text-sm font-semibold rounded-xl transition-all"
            >
              Criar primeira instância
            </button>
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

            {/* Add new instance button */}
            {showInput ? (
              <div className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-dashed border-dark-accent/40 bg-dark-accent/5">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  autoFocus
                  placeholder="Nome..."
                  className="w-full px-3 py-1.5 bg-dark-input-bg border border-dark-border rounded-lg text-sm text-dark-text text-center focus:outline-none focus:ring-2 focus:ring-dark-accent/50"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleCreate}
                    disabled={creating}
                    className="px-3 py-1 bg-dark-accent text-white text-xs font-semibold rounded-lg disabled:opacity-50"
                  >
                    {creating ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Criar'}
                  </button>
                  <button
                    onClick={() => { setShowInput(false); setNewName(''); }}
                    className="px-3 py-1 text-dark-muted text-xs rounded-lg hover:text-dark-text"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowInput(true)}
                className="flex flex-col items-center justify-center gap-2 p-5 rounded-2xl border border-dashed border-dark-border hover:border-dark-accent/40 hover:bg-dark-accent/5 transition-all cursor-pointer"
              >
                <div className="w-14 h-14 rounded-2xl bg-dark-input-bg flex items-center justify-center">
                  <Plus className="w-6 h-6 text-dark-muted" />
                </div>
                <span className="text-xs text-dark-muted">Nova instância</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
