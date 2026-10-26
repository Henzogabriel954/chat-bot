// ── Header with connection config (collapsible) ──

import { useState } from 'react';
import { Settings, Save, Eye, EyeOff, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { store } from '../utils';

interface Props {
  connected: boolean;
  onConnect: (url: string, key: string) => Promise<void>;
}

export function Header({ connected, onConnect }: Props) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState(store.get('evo_url') || 'http://p2.hcraft.online:8102');
  const [key, setKey] = useState(store.get('evo_key'));
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      store.set('evo_url', url.trim());
      store.set('evo_key', key.trim());
      await onConnect(url.trim(), key.trim());
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <header className="border-b border-dark-border bg-dark-card/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-2xl">⚡</div>
          <div>
            <h1 className="text-lg font-bold text-dark-text tracking-tight">Evolution API</h1>
            <p className="text-[11px] text-dark-muted">Painel de controle</p>
          </div>
        </div>

        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dark-border text-sm text-dark-muted hover:text-dark-text hover:border-dark-accent/40 transition-all"
        >
          <div className="relative">
            <Settings className="w-4 h-4" />
            <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-red-400'}`} />
          </div>
          API
          {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-dark-border bg-dark-card px-6 py-4">
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
            <div>
              <label className="block text-xs text-dark-muted mb-1">URL da API</label>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-3 py-2 bg-dark-input-bg border border-dark-border rounded-lg text-sm text-dark-text focus:outline-none focus:ring-2 focus:ring-dark-accent/50 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs text-dark-muted mb-1">API Key</label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  className="w-full px-3 py-2 pr-10 bg-dark-input-bg border border-dark-border rounded-lg text-sm text-dark-text focus:outline-none focus:ring-2 focus:ring-dark-accent/50 transition-all"
                  autoComplete="off"
                />
                <button onClick={() => setShowKey(!showKey)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-dark-muted hover:text-dark-text">
                  {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-dark-accent hover:bg-dark-accent-hover text-white text-sm font-semibold rounded-lg transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Conectar
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
