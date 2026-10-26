// ── Main App — Cozy 16-bit Pixel Art Nature Layout with Admin Auth Gate ──

import { useState, useCallback, useEffect } from 'react';
import { Toast } from './components/Toast';
import { Header } from './components/Header';
import { LoginScreen } from './components/LoginScreen';
import { SettingsModal, type SettingsTab } from './components/SettingsModal';
import { DeviceGrid } from './components/DeviceGrid';
import { DeviceDetail } from './components/DeviceDetail';
import { LogPanel } from './components/LogPanel';
import { useToast } from './hooks/useToast';
import { useBotEngine } from './hooks/useBotEngine';
import { store } from './utils';
import * as api from './api';
import type { InstanceInfo, QRCodeData, LogEntry, ServerConfig } from './types';

export default function App() {
  const { message, type, toast, dismiss } = useToast();

  // ── Admin Authentication ──
  const [authenticated, setAuthenticated] = useState<boolean>(() =>
    Boolean(api.getAuthToken())
  );

  useEffect(() => {
    const handleUnauthorized = () => {
      setAuthenticated(false);
    };
    window.addEventListener('whatz:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('whatz:unauthorized', handleUnauthorized);
  }, []);

  // ── Instances ──
  const [instances, setInstances] = useState<InstanceInfo[]>([]);
  const [instanceNames, setInstanceNames] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<string | null>(null);
  const [instanceConfigs, setInstanceConfigs] = useState<ServerConfig['instances']>({});

  // ── Evolution API, Ollama & Whisper state ──
  const [evolutionUrl, setEvolutionUrl] = useState(
    store.get('evo_url') || 'http://p2.hcraft.online:8102'
  );
  const [evolutionApiKey, setEvolutionApiKey] = useState(store.get('evo_key') || '');
  const [ollamaUrl, setOllamaUrl] = useState('http://100.95.97.25:11434');
  const [models, setModels] = useState<string[]>(['llama3.1:8b']);
  const [selectedModel, setSelectedModel] = useState('llama3.1:8b');
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [whisperUrl, setWhisperUrl] = useState('http://100.95.97.25:8000');
  const [whisperModel, setWhisperModel] = useState('whisper-1');

  // ── Settings Modal state ──
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [initialSettingsTab, setInitialSettingsTab] = useState<SettingsTab>('evolution');

  const handleOpenSettings = useCallback((tab: SettingsTab = 'evolution') => {
    setInitialSettingsTab(tab);
    setSettingsOpen(true);
  }, []);

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

  // ── Initial state sync with Go backend (only when authenticated) ──
  useEffect(() => {
    if (!authenticated) return;
    api.fetchState()
      .then((state) => {
        if (state.config) {
          if (state.config.evolutionUrl) {
            setEvolutionUrl(state.config.evolutionUrl);
            store.set('evo_url', state.config.evolutionUrl);
          }
          if (state.config.evolutionApiKey) {
            setEvolutionApiKey(state.config.evolutionApiKey);
            store.set('evo_key', state.config.evolutionApiKey);
          }
          if (state.config.ollamaUrl) setOllamaUrl(state.config.ollamaUrl);
          if (state.config.ollamaModel) setSelectedModel(state.config.ollamaModel);
          if (state.config.audioEnabled !== undefined) setAudioEnabled(state.config.audioEnabled);
          if (state.config.whisperUrl) setWhisperUrl(state.config.whisperUrl);
          if (state.config.whisperModel) setWhisperModel(state.config.whisperModel);
          if (state.config.instances) setInstanceConfigs(state.config.instances);
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
  }, [authenticated, loadInstances, botEngine.setActiveBots]);

  const handleConnect = useCallback(async (url: string, key: string) => {
    try {
      await api.updateConfig({ evolutionUrl: url, evolutionApiKey: key });
      await loadInstances();
      setConnected(true);
      toast('Conectado à Evolution API!', 'ok');
    } catch (e) {
      const msg = (e as Error).message;
      setConnected(false);
      toast(
        msg === 'Failed to fetch'
          ? 'Não consegui acessar a API. Confira a URL e a porta.'
          : msg,
        'err'
      );
    }
  }, [loadInstances, toast]);

  const handleCreateInstance = useCallback(async (name: string) => {
    try {
      await api.createInstance(name);
      await loadInstances();
      toast(`"${name}" criada na floresta!`, 'ok');
    } catch (e) {
      toast((e as Error).message, 'err');
    }
  }, [loadInstances, toast]);

  const handleConnectQR = useCallback(async (name: string): Promise<QRCodeData | null> => {
    try {
      const d = await api.connectInstance(name);
      if ((d as Record<string, unknown>).state === 'open') {
        toast('Já está conectada.', 'ok');
        return null;
      }
      return d;
    } catch (e) {
      toast((e as Error).message, 'err');
      return null;
    }
  }, [toast]);

  const handleLogoutInstance = useCallback(async (name: string) => {
    try {
      await api.logoutInstance(name);
      toast('Desconectada.', 'ok');
      await loadInstances();
    } catch (e) {
      toast((e as Error).message, 'err');
    }
  }, [loadInstances, toast]);

  const handleDelete = useCallback(async (name: string) => {
    try {
      await api.deleteInstance(name);
      toast('Instância excluída.', 'ok');
      setSelectedInstance(null);
      await loadInstances();
    } catch (e) {
      toast((e as Error).message, 'err');
    }
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

  if (!authenticated) {
    return (
      <>
        <Toast message={message} type={type} onDismiss={dismiss} />
        <LoginScreen
          onLoginSuccess={() => {
            setAuthenticated(true);
            toast('Bem-vindo ao Santuário, Administrador!', 'ok');
          }}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen forest-bg-pattern text-dark-text">
      <Toast message={message} type={type} onDismiss={dismiss} />

      <Header
        connected={connected}
        selectedModel={selectedModel}
        audioEnabled={audioEnabled}
        whisperModel={whisperModel}
        onOpenSettings={handleOpenSettings}
        onLogout={() => {
          api.clearAuthToken();
          setAuthenticated(false);
          toast('Sessão encerrada.', 'ok');
        }}
      />

      <DeviceGrid
        instanceNames={instanceNames}
        selectedInstance={selectedInstance}
        isBotActive={isBotActive}
        onSelect={handleSelectDevice}
        onCreateInstance={handleCreateInstance}
        onOpenSettings={() => handleOpenSettings('evolution')}
        onToast={toast}
      />

      {selectedInfo && (
        <DeviceDetail
          key={selectedInfo.name}
          instance={selectedInfo}
          initialBotConfig={instanceConfigs?.[selectedInfo.name]}
          onClose={() => setSelectedInstance(null)}
          onToast={toast}
          onRefresh={async () => {
            await loadInstances();
          }}
          onConnectQR={handleConnectQR}
          onLogout={handleLogoutInstance}
          onDelete={handleDelete}
          botEngine={wrappedBotEngine}
        />
      )}

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        initialTab={initialSettingsTab}
        connected={connected}
        evolutionUrl={evolutionUrl}
        setEvolutionUrl={setEvolutionUrl}
        evolutionApiKey={evolutionApiKey}
        setEvolutionApiKey={setEvolutionApiKey}
        onConnect={handleConnect}
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

      <LogPanel logs={logs} onClear={clearLogs} />
    </div>
  );
}
