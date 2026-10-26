// ── Main App — minimalist layout ──

import { useState, useCallback, useEffect } from 'react';
import { Toast } from './components/Toast';
import { Header } from './components/Header';
import { OllamaBar } from './components/OllamaBar';
import { DeviceGrid } from './components/DeviceGrid';
import { DeviceDetail } from './components/DeviceDetail';
import { LogPanel } from './components/LogPanel';
import { useToast } from './hooks/useToast';
import { useBotEngine } from './hooks/useBotEngine';
import * as api from './api';
import type { InstanceInfo, QRCodeData, LogEntry } from './types';

export default function App() {
  const { message, type, toast, dismiss } = useToast();

  // ── Instances ──
  const [instances, setInstances] = useState<InstanceInfo[]>([]);
  const [instanceNames, setInstanceNames] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<string | null>(null);

  // ── Ollama & Whisper state ──
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [whisperUrl, setWhisperUrl] = useState('http://localhost:9000');
  const [whisperModel, setWhisperModel] = useState('base');

  // ── Bot engine & logs ──
  const [, forceUpdate] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = useCallback((entry: LogEntry) => {
    setLogs((prev) => [...prev.slice(-200), entry]);
  }, []);

  const clearLogs = useCallback(async () => {
    try {
      await api.clearLogs();
      setLogs([]);
    } catch {
      setLogs([]);
    }
  }, []);

  const botEngine = useBotEngine(addLog);

  // ── Load instances ──
  const loadInstances = useCallback(async () => {
    const infos = await api.fetchInstances();
    const names = infos.map((i) => i.name);
    setInstances(infos);
    setInstanceNames(names);
    return infos;
  }, []);

  // ── Initial state sync with Go backend ──
  useEffect(() => {
    api.fetchState()
      .then((state) => {
        if (state.config) {
          if (state.config.ollamaUrl) setOllamaUrl(state.config.ollamaUrl);
          if (state.config.ollamaModel) setSelectedModel(state.config.ollamaModel);
          if (state.config.audioEnabled !== undefined) setAudioEnabled(state.config.audioEnabled);
          if (state.config.whisperUrl) setWhisperUrl(state.config.whisperUrl);
          if (state.config.whisperModel) setWhisperModel(state.config.whisperModel);
        }
        if (state.logs && state.logs.length > 0) {
          setLogs(state.logs);
        }
        if (state.activeBots) {
          botEngine.setActiveBots(state.activeBots);
        }
        if (state.config?.evolutionUrl && state.config?.evolutionApiKey) {
          loadInstances()
            .then(() => setConnected(true))
            .catch(() => setConnected(false));
        }
      })
      .catch(() => {});
  }, [loadInstances, botEngine.setActiveBots]);

  const handleConnect = useCallback(async (url: string, key: string) => {
    try {
      await api.updateConfig({ evolutionUrl: url, evolutionApiKey: key });
      await loadInstances();
      setConnected(true);
      toast('Conectado à Evolution API!', 'ok');
    } catch (e) {
      const msg = (e as Error).message;
      setConnected(false);
      toast(msg === 'Failed to fetch'
        ? 'Não consegui acessar a API. Confira a URL e a porta.'
        : msg, 'err');
    }
  }, [loadInstances, toast]);

  const handleCreateInstance = useCallback(async (name: string) => {
    try {
      await api.createInstance(name);
      await loadInstances();
      toast(`"${name}" criada!`, 'ok');
    } catch (e) { toast((e as Error).message, 'err'); }
  }, [loadInstances, toast]);

  const handleConnectQR = useCallback(async (name: string): Promise<QRCodeData | null> => {
    try {
      const d = await api.connectInstance(name);
      if ((d as Record<string, unknown>).state === 'open') {
        toast('Já está conectada.', 'ok');
        return null;
      }
      return d;
    } catch (e) { toast((e as Error).message, 'err'); return null; }
  }, [toast]);

  const handleLogout = useCallback(async (name: string) => {
    try {
      await api.logoutInstance(name);
      toast('Desconectada.', 'ok');
      await loadInstances();
    } catch (e) { toast((e as Error).message, 'err'); }
  }, [loadInstances, toast]);

  const handleDelete = useCallback(async (name: string) => {
    try {
      await api.deleteInstance(name);
      toast('Excluída.', 'ok');
      setSelectedInstance(null);
      await loadInstances();
    } catch (e) { toast((e as Error).message, 'err'); }
  }, [loadInstances, toast]);

  const handleSelectDevice = useCallback((name: string) => {
    setSelectedInstance((prev) => (prev === name ? null : name));
  }, []);

  const isBotActive = useCallback((name: string) => {
    return botEngine.isActive(name);
  }, [botEngine]);

  const wrappedBotEngine = {
    ...botEngine,
    toggle: async (name: string) => {
      await botEngine.toggle(name);
      forceUpdate((n) => n + 1);
    },
  };

  const selectedInfo = instances.find((i) => i.name === selectedInstance);

  return (
    <div className="min-h-screen bg-dark-bg">
      <Toast message={message} type={type} onDismiss={dismiss} />
      <Header connected={connected} onConnect={handleConnect} />
      <OllamaBar
        ollamaUrl={ollamaUrl}
        setOllamaUrl={setOllamaUrl}
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
        models={models}
        setModels={setModels}
        audioEnabled={audioEnabled}
        setAudioEnabled={setAudioEnabled}
        whisperUrl={whisperUrl}
        setWhisperUrl={setWhisperUrl}
        whisperModel={whisperModel}
        setWhisperModel={setWhisperModel}
        onToast={toast}
      />
      <DeviceGrid
        instanceNames={instanceNames}
        selectedInstance={selectedInstance}
        isBotActive={isBotActive}
        onSelect={handleSelectDevice}
        onCreateInstance={handleCreateInstance}
        onToast={toast}
      />

      {selectedInfo && (
        <DeviceDetail
          key={selectedInfo.name}
          instance={selectedInfo}
          onClose={() => setSelectedInstance(null)}
          onToast={toast}
          onRefresh={async () => { await loadInstances(); }}
          onConnectQR={handleConnectQR}
          onLogout={handleLogout}
          onDelete={handleDelete}
          botEngine={wrappedBotEngine}
        />
      )}

      <LogPanel logs={logs} onClear={clearLogs} />
    </div>
  );
}
