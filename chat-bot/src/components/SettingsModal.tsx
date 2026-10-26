// ── Unified Settings Modal: Evolution API, Ollama AI Model, Whisper Audio ──

import { useState, useEffect } from 'react';
import {
  X, Eye, EyeOff, Save, RefreshCw, Loader2,
  Zap, Bot, Mic, CheckCircle2, AlertCircle, Sparkles, Server, Radio,
} from 'lucide-react';
import { store } from '../utils';
import * as api from '../api';

export type SettingsTab = 'evolution' | 'ollama' | 'whisper';

interface Props {
  open: boolean;
  onClose: () => void;
  initialTab?: SettingsTab;
  connected: boolean;
  evolutionUrl: string;
  setEvolutionUrl: (v: string) => void;
  evolutionApiKey: string;
  setEvolutionApiKey: (v: string) => void;
  onConnect: (url: string, key: string) => Promise<void>;
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

export function SettingsModal({
  open,
  onClose,
  initialTab = 'evolution',
  connected,
  evolutionUrl,
  setEvolutionUrl,
  evolutionApiKey,
  setEvolutionApiKey,
  onConnect,
  ollamaUrl,
  setOllamaUrl,
  selectedModel,
  setSelectedModel,
  models,
  setModels,
  audioEnabled,
  setAudioEnabled,
  whisperUrl,
  setWhisperUrl,
  whisperModel,
  setWhisperModel,
  onToast,
}: Props) {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [showKey, setShowKey] = useState(false);
  const [testingEvo, setTestingEvo] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [savingAll, setSavingAll] = useState(false);

  useEffect(() => {
    if (open && initialTab) {
      setActiveTab(initialTab);
    }
  }, [open, initialTab]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleTestEvolution = async () => {
    const cleanUrl = evolutionUrl.trim();
    const cleanKey = evolutionApiKey.trim();
    if (!cleanUrl || !cleanKey) {
      onToast('Preencha a URL e a API Key da Evolution API.', 'err');
      return;
    }
    setTestingEvo(true);
    try {
      store.set('evo_url', cleanUrl);
      store.set('evo_key', cleanKey);
      setEvolutionUrl(cleanUrl);
      setEvolutionApiKey(cleanKey);
      await onConnect(cleanUrl, cleanKey);
    } finally {
      setTestingEvo(false);
    }
  };

  const handleSyncModels = async () => {
    const cleanOllama = ollamaUrl.trim();
    if (!cleanOllama) {
      onToast('Informe a URL do servidor Ollama primeiro.', 'err');
      return;
    }
    setLoadingModels(true);
    try {
      await api.updateConfig({ ollamaUrl: cleanOllama });
      const fetched = await api.fetchOllamaModels();
      setModels(fetched);
      if (selectedModel && fetched.includes(selectedModel)) {
        // Keep current selection
      } else if (fetched.length > 0) {
        setSelectedModel(fetched[0]);
        await api.updateConfig({ ollamaModel: fetched[0] });
      }
      onToast(
        fetched.length
          ? `${fetched.length} modelo(s) sincronizado(s) com sucesso!`
          : 'Nenhum modelo encontrado no servidor Ollama.',
        fetched.length ? 'ok' : 'err'
      );
    } catch (e) {
      onToast((e as Error).message, 'err');
    } finally {
      setLoadingModels(false);
    }
  };

  const handleSaveAll = async () => {
    setSavingAll(true);
    try {
      const cleanEvoUrl = evolutionUrl.trim();
      const cleanEvoKey = evolutionApiKey.trim();
      const cleanOllamaUrl = ollamaUrl.trim();
      const cleanWhisperUrl = whisperUrl.trim();

      store.set('evo_url', cleanEvoUrl);
      store.set('evo_key', cleanEvoKey);

      await api.updateConfig({
        evolutionUrl: cleanEvoUrl,
        evolutionApiKey: cleanEvoKey,
        ollamaUrl: cleanOllamaUrl,
        ollamaModel: selectedModel,
        audioEnabled,
        whisperUrl: cleanWhisperUrl,
        whisperModel,
      });

      if (cleanEvoUrl && cleanEvoKey) {
        await onConnect(cleanEvoUrl, cleanEvoKey);
      } else {
        onToast('Configurações salvas no santuário!', 'ok');
      }
      onClose();
    } catch (e) {
      onToast((e as Error).message, 'err');
    } finally {
      setSavingAll(false);
    }
  };

  const availableModels = Array.from(
    new Set([...(selectedModel ? [selectedModel] : []), ...models])
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      {/* Forest Night Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Pixel Art Modal Frame */}
      <div className="relative w-full max-w-2xl pixel-card rounded-none overflow-hidden animate-slide-up z-10">
        {/* Banner Header */}
        <div className="relative overflow-hidden border-b-2 border-dark-border bg-dark-bg">
          <img
            src="/assets/forest-banner.png"
            alt=""
            className="absolute inset-0 w-full h-full object-cover pixel-art opacity-35"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-dark-bg/95 via-dark-card/85 to-dark-bg/95" />

          <div className="relative px-6 py-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 pixel-card-wood flex items-center justify-center p-1.5 shrink-0">
                <img
                  src="/assets/sprout-bot-icon.png"
                  alt="Sprout Bot"
                  className="w-full h-full object-contain pixel-art"
                />
              </div>
              <div>
                <h2
                  id="settings-modal-title"
                  className="font-pixel text-base sm:text-lg text-dark-text tracking-wide flex items-center gap-2"
                >
                  ⚙️ MENU DE CONFIGURAÇÕES
                </h2>
                <p className="text-xs text-dark-muted mt-0.5">
                  Conecte a Evolution API, o Cérebro IA (Ollama) e a Transcrição (Whisper)
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              aria-label="Fechar configurações"
              className="pixel-btn p-2 bg-dark-input-bg text-dark-muted hover:text-dark-text hover:border-dark-accent"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="relative px-6 flex flex-wrap gap-2 pt-1 bg-dark-bg/60 border-t border-dark-border/60">
            <button
              type="button"
              onClick={() => setActiveTab('evolution')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-pixel transition-all border-t-2 border-x-2 -mb-[2px] ${
                activeTab === 'evolution'
                  ? 'bg-dark-card border-dark-accent text-dark-accent'
                  : 'bg-dark-input-bg/70 border-transparent text-dark-muted hover:text-dark-text'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>⚡ Evolution API</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  connected ? 'bg-emerald-400' : 'bg-red-400'
                }`}
              />
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ollama')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-pixel transition-all border-t-2 border-x-2 -mb-[2px] ${
                activeTab === 'ollama'
                  ? 'bg-dark-card border-dark-accent text-dark-accent'
                  : 'bg-dark-input-bg/70 border-transparent text-dark-muted hover:text-dark-text'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              <span>🧠 Modelo de IA (Ollama)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('whisper')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-pixel transition-all border-t-2 border-x-2 -mb-[2px] ${
                activeTab === 'whisper'
                  ? 'bg-dark-card border-dark-accent text-dark-accent'
                  : 'bg-dark-input-bg/70 border-transparent text-dark-muted hover:text-dark-text'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>🎙️ Transcrição (Whisper)</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[65vh] overflow-y-auto">
          {activeTab === 'evolution' && (
            <div className="space-y-4">
              {/* Status Banner */}
              <div className="pixel-card-wood p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  {connected ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                  )}
                  <div>
                    <div className="text-xs font-pixel text-dark-text">
                      STATUS DA EVOLUTION API
                    </div>
                    <div className="text-xs text-dark-muted">
                      {connected
                        ? 'Conectado e pronto para gerenciar instâncias WhatsApp'
                        : 'Desconectado — informe a URL e a API Key Global abaixo'}
                    </div>
                  </div>
                </div>
                <span
                  className={`px-2.5 py-1 text-[11px] font-pixel border ${
                    connected
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                      : 'bg-red-500/15 border-red-500/40 text-red-300'
                  }`}
                >
                  {connected ? 'CONECTADO' : 'OFFLINE'}
                </span>
              </div>

              <div>
                <label
                  htmlFor="evo-url-input"
                  className="block text-xs font-pixel text-dark-muted mb-1.5"
                >
                  URL DA EVOLUTION API
                </label>
                <input
                  id="evo-url-input"
                  type="url"
                  value={evolutionUrl}
                  onChange={(e) => setEvolutionUrl(e.target.value)}
                  placeholder="http://p2.hcraft.online:8102"
                  className="w-full px-3.5 py-2.5 pixel-input text-sm text-dark-text"
                />
                <p className="text-[11px] text-dark-muted mt-1">
                  Endereço raiz onde o servidor Evolution API v2 está rodando.
                </p>
              </div>

              <div>
                <label
                  htmlFor="evo-key-input"
                  className="block text-xs font-pixel text-dark-muted mb-1.5"
                >
                  GLOBAL API KEY
                </label>
                <div className="relative">
                  <input
                    id="evo-key-input"
                    type={showKey ? 'text' : 'password'}
                    value={evolutionApiKey}
                    onChange={(e) => setEvolutionApiKey(e.target.value)}
                    placeholder="Insira sua chave de autenticação..."
                    autoComplete="off"
                    className="w-full px-3.5 py-2.5 pr-10 pixel-input text-sm text-dark-text font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    aria-label={showKey ? 'Ocultar API Key' : 'Mostrar API Key'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-muted hover:text-dark-text"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleTestEvolution}
                  disabled={testingEvo}
                  className="pixel-btn flex items-center justify-center gap-2 px-4 py-2.5 bg-dark-accent hover:bg-dark-accent-hover text-dark-bg font-pixel text-xs w-full sm:w-auto disabled:opacity-50 cursor-pointer"
                >
                  {testingEvo ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Radio className="w-4 h-4" />
                  )}
                  TESTAR & CONECTAR EVOLUTION API
                </button>
              </div>
            </div>
          )}

          {activeTab === 'ollama' && (
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="ollama-url-input"
                  className="block text-xs font-pixel text-dark-muted mb-1.5"
                >
                  URL DO SERVIDOR OLLAMA
                </label>
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <input
                    id="ollama-url-input"
                    type="url"
                    value={ollamaUrl}
                    onChange={(e) => setOllamaUrl(e.target.value)}
                    placeholder="http://100.x.x.x:11434"
                    className="flex-1 px-3.5 py-2.5 pixel-input text-sm text-dark-text"
                  />
                  <button
                    type="button"
                    onClick={handleSyncModels}
                    disabled={loadingModels}
                    className="pixel-btn flex items-center justify-center gap-2 px-4 py-2.5 bg-dark-card-hover hover:border-dark-accent text-dark-text font-pixel text-xs shrink-0 disabled:opacity-50 cursor-pointer"
                  >
                    {loadingModels ? (
                      <Loader2 className="w-4 h-4 animate-spin text-dark-accent" />
                    ) : (
                      <RefreshCw className="w-4 h-4 text-dark-accent" />
                    )}
                    SINCRONIZAR MODELOS
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="ollama-model-select"
                  className="block text-xs font-pixel text-dark-muted mb-1.5"
                >
                  MODELO DE IA ATIVO
                </label>
                <select
                  id="ollama-model-select"
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full px-3.5 py-2.5 pixel-input text-sm text-dark-text"
                >
                  {availableModels.length === 0 && (
                    <option value="">
                      Clique em &quot;Sincronizar Modelos&quot; para listar...
                    </option>
                  )}
                  {availableModels.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pixel-card-wood p-4 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-pixel text-sun-gold">
                  <Sparkles className="w-4 h-4" />
                  <span>DICA DA FLORESTA • CONEXÃO TAILSCALE</span>
                </div>
                <p className="text-xs text-dark-muted leading-relaxed">
                  Se o Ollama roda em um PC com GPU dedicado na sua rede Tailscale, use o IP
                  Tailscale (ex: <code className="text-dark-text">http://100.x.x.x:11434</code>) e
                  certifique-se de que a variável <code className="text-dark-text">OLLAMA_HOST=0.0.0.0</code>{' '}
                  esteja ativa no PC da IA.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'whisper' && (
            <div className="space-y-4">
              <label className="pixel-card p-4 flex items-center justify-between gap-4 cursor-pointer hover:border-dark-accent/60 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-dark-accent/15 border border-dark-accent/40 flex items-center justify-center text-dark-accent">
                    <Mic className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-pixel text-dark-text">
                      ATIVAR TRANSCRIÇÃO AUTOMÁTICA DE ÁUDIOS
                    </div>
                    <div className="text-xs text-dark-muted mt-0.5">
                      Converte mensagens de voz do WhatsApp em texto antes de enviar ao Ollama
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={audioEnabled}
                  onChange={(e) => setAudioEnabled(e.target.checked)}
                  className="w-5 h-5 accent-dark-accent cursor-pointer"
                />
              </label>

              <div>
                <label
                  htmlFor="whisper-url-input"
                  className="block text-xs font-pixel text-dark-muted mb-1.5"
                >
                  URL DA API WHISPER (FASTER-WHISPER)
                </label>
                <input
                  id="whisper-url-input"
                  type="url"
                  value={whisperUrl}
                  onChange={(e) => setWhisperUrl(e.target.value)}
                  placeholder="http://100.95.97.25:8000"
                  disabled={!audioEnabled}
                  className="w-full px-3.5 py-2.5 pixel-input text-sm text-dark-text disabled:opacity-50"
                />
              </div>

              <div>
                <label
                  htmlFor="whisper-model-select"
                  className="block text-xs font-pixel text-dark-muted mb-1.5"
                >
                  MODELO WHISPER
                </label>
                <select
                  id="whisper-model-select"
                  value={whisperModel}
                  onChange={(e) => setWhisperModel(e.target.value)}
                  disabled={!audioEnabled}
                  className="w-full px-3.5 py-2.5 pixel-input text-sm text-dark-text disabled:opacity-50"
                >
                  <option value="whisper-1">
                    whisper-1 (Padrão OpenAI / Faster-Whisper)
                  </option>
                  <option value="base">
                    Whisper Base (Mais rápido • Ideal p/ CPU Ryzen 5)
                  </option>
                  <option value="small">Whisper Small (Equilibrado)</option>
                  <option value="medium">Whisper Medium (Alta precisão)</option>
                </select>
              </div>

              <div className="pixel-card-wood p-4 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-pixel text-sun-gold">
                  <Server className="w-4 h-4" />
                  <span>ENDPOINT & OTIMIZAÇÃO CPU INT8</span>
                </div>
                <p className="text-xs text-dark-muted leading-relaxed">
                  O bot envia o áudio decodificado para{' '}
                  <code className="text-dark-text">/v1/audio/transcriptions</code> compatível com
                  Faster-Whisper. A quantização <code className="text-dark-text">int8</code> garante
                  transcrições rápidas mesmo rodando em CPU.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-dark-bg/90 border-t-2 border-dark-border flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-xs text-dark-muted">
            As configurações ficam salvas no servidor Go e no navegador.
          </span>
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="pixel-btn px-4 py-2 bg-dark-input-bg text-xs font-pixel text-dark-muted hover:text-dark-text cursor-pointer"
            >
              CANCELAR
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={savingAll}
              className="pixel-btn flex items-center justify-center gap-2 px-5 py-2 bg-dark-accent hover:bg-dark-accent-hover text-dark-bg font-pixel text-xs disabled:opacity-50 cursor-pointer"
            >
              {savingAll ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              SALVAR TODAS AS CONFIGURAÇÕES
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
