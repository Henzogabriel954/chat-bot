// ── Floating Log Panel — Pergaminho / Console da Floresta ──

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
      {/* Floating Pixel Button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="fixed bottom-5 right-5 z-40 pixel-btn flex items-center gap-2.5 px-4 py-2.5 bg-dark-card hover:bg-dark-card-hover hover:border-dark-accent cursor-pointer group"
      >
        <div className="relative">
          <Terminal className="w-4 h-4 text-dark-accent" />
          {logs.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-2 h-2 bg-sun-gold animate-pulse" />
          )}
        </div>
        <span className="font-pixel text-xs text-dark-text">
          📜 LOGS {logs.length > 0 && `(${logs.length})`}
        </span>
      </button>

      {/* Console Window */}
      {open && (
        <div className="fixed bottom-16 right-5 z-40 w-[500px] max-w-[calc(100vw-40px)] pixel-card animate-slide-up overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-dark-bg border-b-2 border-dark-border">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-dark-accent" />
              <span className="font-pixel text-xs text-dark-text">
                CONSOLE DA FLORESTA
              </span>
              <span className="text-[10px] font-pixel px-1.5 py-0.5 bg-dark-accent/15 text-dark-accent border border-dark-accent/40">
                {logs.length}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onClear}
                className="pixel-btn p-1.5 bg-dark-input-bg text-dark-muted hover:text-dark-text cursor-pointer"
                title="Limpar logs"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="pixel-btn p-1.5 bg-dark-input-bg text-dark-muted hover:text-dark-text cursor-pointer"
                title="Fechar console"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Log content */}
          <div
            ref={scrollRef}
            className="p-3.5 max-h-[340px] overflow-y-auto font-mono text-xs leading-relaxed bg-dark-input-bg/90"
          >
            {logs.length === 0 ? (
              <p className="text-dark-muted font-pixel text-[11px] text-center py-8">
                NENHUM REGISTRO AINDA. INICIE UM BOT PARA OBSERVAR A FLORESTA.
              </p>
            ) : (
              logs.map((l, i) => (
                <div
                  key={i}
                  className={`py-1 px-1.5 border-b border-dark-border/30 ${
                    l.instance === 'fila' ? 'bg-dark-accent/10' : 'hover:bg-dark-card/60'
                  }`}
                >
                  <span className="text-dark-muted">{l.timestamp}</span>{' '}
                  <span
                    className={
                      l.instance === 'fila'
                        ? 'text-dark-accent font-semibold'
                        : 'text-sun-gold font-semibold'
                    }
                  >
                    [{l.instance}]
                  </span>{' '}
                  <span className="text-dark-text">{l.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
}
