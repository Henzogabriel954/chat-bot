// ── Bot engine client bridge: connects UI to Go backend ──

import { useState, useCallback, useEffect, useRef } from 'react';
import type { LogEntry } from '../types';
import * as api from '../api';

export function useBotEngine(
  addLog: (entry: LogEntry) => void,
) {
  const [activeBots, setActiveBots] = useState<Record<string, boolean>>({});
  const [queueLength, setQueueLength] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);

  // Conexão WebSocket para receber logs e eventos em tempo real
  useEffect(() => {
    let unmounted = false;
    let reconnectTimeout: ReturnType<typeof setTimeout>;

    function connect() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/ws`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'log' && msg.data) {
            addLog(msg.data);
          }
        } catch {
          // ignore
        }
      };

      ws.onclose = () => {
        if (!unmounted) {
          reconnectTimeout = setTimeout(connect, 3000);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      unmounted = true;
      clearTimeout(reconnectTimeout);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [addLog]);

  // Atualiza estado do bot
  const syncState = useCallback(async () => {
    try {
      const state = await api.fetchState();
      setActiveBots(state.activeBots || {});
      setQueueLength(state.queueLength || 0);
    } catch {
      // Backend pode estar iniciando
    }
  }, []);

  useEffect(() => {
    syncState();
    const interval = setInterval(syncState, 5000);
    return () => clearInterval(interval);
  }, [syncState]);

  const toggle = useCallback(
    async (name: string) => {
      const res = await api.updateBot(name, { toggle: true });
      setActiveBots((prev) => ({ ...prev, [name]: res.isActive }));
      await syncState();
    },
    [syncState]
  );

  const saveConfig = useCallback(
    async (name: string, config: { anyPerson?: boolean; targetNum?: string; sysPrompt?: string }) => {
      await api.updateBot(name, config);
    },
    []
  );

  const diagnose = useCallback(async (name: string) => {
    await api.diagnose(name);
  }, []);

  const isActive = useCallback(
    (name: string) => {
      return !!activeBots[name];
    },
    [activeBots]
  );

  return {
    toggle,
    diagnose,
    isActive,
    saveConfig,
    activeBots,
    setActiveBots,
    getQueueLength: () => queueLength,
    syncState,
  };
}
