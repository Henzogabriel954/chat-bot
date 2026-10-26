// ── Compact Ollama & Whisper config bar ──

import { useState } from 'react';
import { Bot, RefreshCw, Mic, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import * as api from '../api';

interface Props {
  ollamaUrl: string;
  setOllamaUrl: (v: string) => void;
  selectedModel: string;
  setSelectedModel: (v: string) => void;
  models: string[];
  setModels: (v: string[]) => void;
  audioEnabled: boolean;
  setAudioEnabled: (v: boolean) => void;
  whisperUrl: string;
  setWhisperUrl: (v: string) => void;
  whisperModel: string;
  setWhisperModel: (v: string) => void;
  onToast: (msg: string, type: 'ok' | 'err') => void;
}

export function OllamaBar({
  ollamaUrl, setOllamaUrl,
  selectedModel, setSelectedModel,
  models, setModels,
  audioEnabled, setAudioEnabled,
  whisperUrl, setWhisperUrl,
  whisperModel, setWhisperModel,
  onToast,
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLoad = async () => {
    setLoading(true);
    try {
      // Atualiza URL no backend primeiro
      await api.updateConfig({ ollamaUrl });
      const m = await api.fetchOllamaModels();
      setModels(m);
      if (selectedModel && m.includes(selectedModel)) {
        // mantém selecionado
      } else if (m.length) {
        setSelectedModel(m[0]);
        await api.updateConfig({ ollamaModel: m[0] });
      }
      onToast(m.length ? `${m.length} modelo(s) encontrado(s) no Ollama.` : 'Nenhum modelo.', m.length ? 'ok' : 'err');
    } catch (e) {
      onToast((e as Error).message, 'err');
    } finally {
      setLoading(false);
    }
  };

  const handleModelChange = async (m: string) => {
    setSelectedModel(m);
    await api.updateConfig({ ollamaModel: m });
  };

  const handleAudioToggle = async (enabled: boolean) => {
    setAudioEnabled(enabled);
    await api.updateConfig({ audioEnabled: enabled });
  };

  const handleWhisperUrlChange = async (url: string) => {
    setWhisperUrl(url);
    await api.updateConfig({ whisperUrl: url });
  };

  const handleWhisperModelChange = async (mod: string) => {
    setWhisperModel(mod);
    await api.updateConfig({ whisperModel: mod });
  };

  return (
    <div className="border-b border-dark-border bg-dark-card/50">
      <div className="max-w-5xl mx-auto px-6">
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between py-3 text-sm text-dark-muted hover:text-dark-text transition-colors"
        >
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4" />
            <span>IA & Transcrição (PC com GPU via Tailscale)</span>
            {selectedModel && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-dark-accent/10 text-dark-accent border border-dark-accent/20">
                {selectedModel}
              </span>
            )}
            {audioEnabled && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <Mic className="w-3 h-3" /> Whisper ({whisperModel})
              </span>
            )}
          </div>
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {open && (
          <div className="pb-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
              <div>
                <label className="block text-xs text-dark-muted mb-1">URL do Ollama (IP Tailscale do PC da IA)</label>
                <input
                  value={ollamaUrl}
                  placeholder="http://100.x.x.x:11434"
                  onChange={(e) => setOllamaUrl(e.target.value)}
                  onBlur={() => api.updateConfig({ ollamaUrl })}
                  className="w-full px-3 py-2 bg-dark-input-bg border border-dark-border rounded-lg text-sm text-dark-text focus:outline-none focus:ring-2 focus:ring-dark-accent/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs text-dark-muted mb-1">Modelo de IA</label>
                <select
                  value={selectedModel}
                  onChange={(e) => handleModelChange(e.target.value)}
                  className="w-full px-3 py-2 bg-dark-input-bg border border-dark-border rounded-lg text-sm text-dark-text focus:outline-none focus:ring-2 focus:ring-dark-accent/50 transition-all"
                >
                  {!models.length && <option value="">Carregar modelos...</option>}
                  {models.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleLoad}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 border border-dark-border rounded-lg text-sm text-dark-muted hover:text-dark-text hover:bg-dark-input-bg transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Carregar
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[auto_1fr_auto] gap-4 items-center pt-2 border-t border-dark-border/50">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-dark-muted hover:text-dark-text transition-colors">
                <input
                  type="checkbox"
                  checked={audioEnabled}
                  onChange={(e) => handleAudioToggle(e.target.checked)}
                  className="w-4 h-4 rounded accent-dark-accent"
                />
                <Mic className="w-4 h-4 text-emerald-400" /> Transcrever áudios no PC da IA
              </label>

              <div>
                <input
                  value={whisperUrl}
                  placeholder="URL Whisper (ex: http://100.x.x.x:9000)"
                  onChange={(e) => setWhisperUrl(e.target.value)}
                  onBlur={(e) => handleWhisperUrlChange(e.target.value)}
                  className="w-full px-3 py-1.5 bg-dark-input-bg border border-dark-border rounded-lg text-xs text-dark-text focus:outline-none focus:ring-2 focus:ring-dark-accent/50 transition-all"
                />
              </div>

              <div>
                <select
                  value={whisperModel}
                  onChange={(e) => handleWhisperModelChange(e.target.value)}
                  className="px-3 py-1.5 bg-dark-input-bg border border-dark-border rounded-lg text-xs text-dark-text focus:outline-none focus:ring-2 focus:ring-dark-accent/50 transition-all"
                >
                  <option value="base">Whisper Base (Mais rápido)</option>
                  <option value="small">Whisper Small (Recomendado)</option>
                  <option value="medium">Whisper Medium (Mais preciso)</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
