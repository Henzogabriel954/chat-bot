// ── Floating log panel ──

import { useState, useRef, useEffect } from 'react';
import { Terminal, X, Trash2 } from 'lucide-react';
import type { LogEntry } from '../types';

interface Props {
  logs: LogEntry[];
  onClear: () => void;
}

export function LogPanel({ logs, onClear }: Props) {
  const [open, setOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, open]);

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 px-4 py-2.5 bg-dark-card border border-dark-border rounded-full shadow-xl hover:border-dark-accent/40 transition-all group"
      >
        <div className="relative">
          <Terminal className="w-4 h-4 text-dark-muted group-hover:text-dark-accent transition-colors" />
          {logs.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-2 h-2 rounded-full bg-dark-accent animate-pulse" />
          )}
        </div>
        <span className="text-xs text-dark-muted group-hover:text-dark-text transition-colors">
          Logs {logs.length > 0 && `(${logs.length})`}
        </span>
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-16 right-5 z-40 w-[480px] max-w-[calc(100vw-40px)] bg-dark-card border border-dark-border rounded-2xl shadow-2xl animate-slide-up overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-dark-border">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-dark-accent" />
              <span className="text-sm font-medium text-dark-text">Logs em tempo real</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-dark-accent/10 text-dark-accent border border-dark-accent/20">
                {logs.length}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={onClear}
                className="p-1.5 rounded-lg text-dark-muted hover:text-dark-text hover:bg-dark-input-bg transition-all"
                title="Limpar logs"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-dark-muted hover:text-dark-text hover:bg-dark-input-bg transition-all"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Log content */}
          <div
            ref={scrollRef}
            className="p-3 max-h-[350px] overflow-y-auto font-mono text-xs leading-relaxed"
          >
            {logs.length === 0 ? (
              <p className="text-dark-muted text-center py-6">
                Nenhum log ainda. Inicie um bot para ver a atividade.
              </p>
            ) : (
              logs.map((l, i) => (
                <div key={i} className={`py-0.5 rounded px-1 -mx-1 ${l.instance === 'fila' ? 'bg-cyan-500/10' : 'hover:bg-dark-input-bg'}`}>
                  <span className="text-dark-muted">{l.timestamp}</span>{' '}
                  <span className={l.instance === 'fila' ? 'text-cyan-400 font-semibold' : 'text-amber-400'}>[{l.instance}]</span>{' '}
                  <span className={l.instance === 'fila' ? 'text-cyan-300' : 'text-dark-text'}>{l.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
}
