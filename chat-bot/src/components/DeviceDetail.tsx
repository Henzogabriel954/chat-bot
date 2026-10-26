// ── Device detail modal: Pixel Art Nature bot config + manual messages ──

import { useState, useEffect } from 'react';
import {
  X, Send, Play, Square, Stethoscope, QrCode, LogOut, Trash2,
  Loader2, Bot, Users, User,
  RefreshCw, Wifi, WifiOff, MessageSquare,
} from 'lucide-react';
import { store, DEFAULT_SYSTEM_PROMPT } from '../utils';
import type { InstanceInfo, QRCodeData } from '../types';
import { useBotEngine } from '../hooks/useBotEngine';
import * as api from '../api';

interface Props {
  instance: InstanceInfo;
  initialBotConfig?: {
    active: boolean;
    anyPerson: boolean;
    targetNum: string;
    sysPrompt: string;
  };
  onClose: () => void;
  onToast: (msg: string, type: 'ok' | 'err') => void;
  onRefresh: () => Promise<void>;
  onConnectQR: (name: string) => Promise<QRCodeData | null>;
  onLogout: (name: string) => Promise<void>;
  onDelete: (name: string) => Promise<void>;
  botEngine: ReturnType<typeof useBotEngine>;
}

export function DeviceDetail({
  instance,
  initialBotConfig,
  onClose,
  onToast,
  onRefresh,
  onConnectQR,
  onLogout,
  onDelete,
  botEngine,
}: Props) {
  const { name, status, owner } = instance;

  // ── Tab state ──
  const [tab, setTab] = useState<'message' | 'bot'>('bot');

  // ── Message state ──
  const [number, setNumber] = useState('');
  const [text, setText] = useState('Olá! Mensagem enviada pelo Guardião da Floresta.');
  const [sending, setSending] = useState(false);
  const [response, setResponse] = useState('');

  // ── Bot state (synced with backend config or localStorage) ──
  const [anyPerson, setAnyPerson] = useState(
    initialBotConfig?.anyPerson ?? store.get('evo_a_' + name) === '1'
  );
  const [targetNum, setTargetNum] = useState(
    initialBotConfig?.targetNum ?? store.get('evo_n_' + name)
  );
  const [sysPrompt, setSysPrompt] = useState(
    initialBotConfig?.sysPrompt || store.get('evo_s_' + name) || DEFAULT_SYSTEM_PROMPT
  );
  const [toggling, setToggling] = useState(false);
  const [diagnosing, setDiagnosing] = useState(false);

  // ── QR ──
  const [qrSrc, setQrSrc] = useState('');
  const [qrLoading, setQrLoading] = useState(false);

  // ── Instance actions ──
  const [actionLoading, setActionLoading] = useState('');

  const isActive = botEngine.isActive(name);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSend = async () => {
    const num = number.replace(/\D/g, '');
    if (!num || !text.trim()) return onToast('Preencha o número e a mensagem.', 'err');
    setSending(true);
    try {
      const d = await api.sendText(name, num, text.trim());
      setResponse(JSON.stringify(d, null, 2));
      onToast('Mensagem enviada.', 'ok');
    } catch (e) {
      onToast((e as Error).message, 'err');
    } finally {
      setSending(false);
    }
  };

  const handleToggleBot = async () => {
    setToggling(true);
    try {
      await botEngine.saveConfig(name, { anyPerson, targetNum, sysPrompt });
      await botEngine.toggle(name);
    } catch (e) {
      onToast((e as Error).message, 'err');
    } finally {
      setToggling(false);
    }
  };

  const handleDiagnose = async () => {
    setDiagnosing(true);
    try {
      await botEngine.diagnose(name);
      onToast('Diagnóstico enviado para o console de logs!', 'ok');
    } catch (e) {
      onToast((e as Error).message, 'err');
    } finally {
      setDiagnosing(false);
    }
  };

  const handleQR = async () => {
    setQrLoading(true);
    try {
      const data = await onConnectQR(name);
      if (data?.base64) setQrSrc(data.base64);
    } finally {
      setQrLoading(false);
    }
  };

  const handleLogout = async () => {
    setActionLoading('logout');
    try {
      await onLogout(name);
    } finally {
      setActionLoading('');
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Excluir "${name}"? Isso não pode ser desfeito.`)) return;
    setActionLoading('delete');
    try {
      await onDelete(name);
      onClose();
    } finally {
      setActionLoading('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 pb-8 px-4 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />

      {/* Pixel Art Panel */}
      <div className="relative w-full max-w-xl pixel-card animate-slide-up z-10 overflow-hidden">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar painel da instância"
          className="absolute top-4 right-4 pixel-btn p-2 bg-dark-input-bg text-dark-muted hover:text-dark-text z-10 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Device header */}
        <div className="p-6 pb-4 flex items-center gap-4 bg-dark-bg/60 border-b border-dark-border">
          <div className="relative shrink-0">
            <div className="w-16 h-16 pixel-card-wood p-2 flex items-center justify-center">
              <img
                src="/assets/pixel-phone-totem.png"
                alt={name}
                className="w-full h-full object-contain pixel-art"
              />
            </div>
            <span
              className={`absolute -top-1.5 -right-1.5 w-4 h-4 border-2 border-dark-card ${
                isActive
                  ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]'
                  : 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.5)]'
              }`}
            />
          </div>
          <div className="flex-1 min-w-0 pr-8">
            <h2 className="font-pixel text-base sm:text-lg text-dark-text truncate">{name}</h2>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-pixel px-2 py-0.5 border ${
                  status === 'open'
                    ? 'text-emerald-300 border-emerald-500/40 bg-emerald-500/15'
                    : 'text-red-300 border-red-500/40 bg-red-500/15'
                }`}
              >
                {status === 'open' ? (
                  <Wifi className="w-3 h-3" />
                ) : (
                  <WifiOff className="w-3 h-3" />
                )}
                {status === 'open' ? 'CONECTADA' : 'DESCONECTADA'}
              </span>
              <span className="text-xs text-dark-muted font-mono">
                {owner || 'Sem número vinculado'}
              </span>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="px-6 py-3 bg-dark-card flex gap-2 flex-wrap border-b border-dark-border">
          <button
            type="button"
            onClick={handleQR}
            disabled={qrLoading}
            className="pixel-btn flex items-center gap-1.5 px-3 py-1.5 text-xs font-pixel bg-dark-input-bg text-dark-muted hover:text-dark-text disabled:opacity-50 cursor-pointer"
          >
            {qrLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <QrCode className="w-3.5 h-3.5 text-dark-accent" />
            )}
            QR CODE
          </button>
          <button
            type="button"
            onClick={handleLogout}
            disabled={actionLoading === 'logout'}
            className="pixel-btn flex items-center gap-1.5 px-3 py-1.5 text-xs font-pixel bg-dark-input-bg text-dark-muted hover:text-dark-text disabled:opacity-50 cursor-pointer"
          >
            {actionLoading === 'logout' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <LogOut className="w-3.5 h-3.5" />
            )}
            DESCONECTAR
          </button>
          <button
            type="button"
            onClick={() => onRefresh()}
            className="pixel-btn flex items-center gap-1.5 px-3 py-1.5 text-xs font-pixel bg-dark-input-bg text-dark-muted hover:text-dark-text cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> ATUALIZAR
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={actionLoading === 'delete'}
            className="pixel-btn flex items-center gap-1.5 px-3 py-1.5 text-xs font-pixel bg-dark-input-bg border-red-500/40 text-red-400 hover:bg-red-500/15 disabled:opacity-50 ml-auto cursor-pointer"
          >
            {actionLoading === 'delete' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
            EXCLUIR
          </button>
        </div>

        {/* QR Code */}
        {qrSrc && (
          <div className="mx-6 my-4 p-4 bg-white border-4 border-wood-border text-center">
            <img src={qrSrc} alt="QR Code" className="max-w-[220px] mx-auto" />
            <p className="text-xs text-gray-700 font-medium mt-2">
              WhatsApp → Aparelhos conectados → Conectar aparelho
            </p>
            <button
              type="button"
              onClick={() => setQrSrc('')}
              className="text-xs font-pixel text-gray-500 mt-1 hover:text-gray-800 cursor-pointer"
            >
              [FECHAR QR]
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="px-6 pt-2 flex gap-2 border-b-2 border-dark-border bg-dark-bg/40">
          <button
            type="button"
            onClick={() => setTab('bot')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-pixel border-t-2 border-x-2 -mb-[2px] transition-all cursor-pointer ${
              tab === 'bot'
                ? 'bg-dark-card border-dark-accent text-dark-accent'
                : 'bg-dark-input-bg/60 border-transparent text-dark-muted hover:text-dark-text'
            }`}
          >
            <Bot className="w-4 h-4" /> Bot Guardião IA
          </button>
          <button
            type="button"
            onClick={() => setTab('message')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-pixel border-t-2 border-x-2 -mb-[2px] transition-all cursor-pointer ${
              tab === 'message'
                ? 'bg-dark-card border-dark-accent text-dark-accent'
                : 'bg-dark-input-bg/60 border-transparent text-dark-muted hover:text-dark-text'
            }`}
          >
            <MessageSquare className="w-4 h-4" /> Mensagem Manual
          </button>
        </div>

        {/* Tab content */}
        <div className="p-6">
          {tab === 'message' ? (
            /* ── Manual message tab ── */
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-pixel text-dark-muted mb-1.5">
                  NÚMERO COM DDI E DDD
                </label>
                <input
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 pixel-input text-sm text-dark-text"
                  placeholder="5543999999999"
                  inputMode="numeric"
                />
              </div>
              <div>
                <label className="block text-xs font-pixel text-dark-muted mb-1.5">
                  MENSAGEM
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="w-full px-3.5 py-2.5 pixel-input text-sm text-dark-text resize-y min-h-[80px]"
                />
              </div>
              <button
                type="button"
                onClick={handleSend}
                disabled={sending}
                className="pixel-btn flex items-center gap-2 px-5 py-2.5 bg-dark-accent hover:bg-dark-accent-hover text-dark-bg font-pixel text-xs disabled:opacity-50 cursor-pointer"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                ENVIAR MENSAGEM
              </button>
              {response && (
                <pre className="p-3 pixel-input text-xs text-dark-muted overflow-auto max-h-[150px]">
                  {response}
                </pre>
              )}
            </div>
          ) : (
            /* ── Bot tab ── */
            <div className="space-y-4">
              {/* Who to respond */}
              <label className="pixel-card-wood p-3.5 flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={anyPerson}
                  onChange={(e) => {
                    setAnyPerson(e.target.checked);
                    store.set('evo_a_' + name, e.target.checked ? '1' : '0');
                  }}
                  className="w-4 h-4 accent-dark-accent"
                />
                <span className="text-xs font-pixel text-dark-text flex items-center gap-2">
                  <Users className="w-4 h-4 text-sun-gold" /> RESPONDER QUALQUER PESSOA
                </span>
              </label>

              {!anyPerson && (
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-pixel text-dark-muted mb-1.5">
                    <User className="w-3.5 h-3.5 text-dark-accent" /> ATENDER APENAS ESTE NÚMERO
                  </label>
                  <input
                    value={targetNum}
                    onChange={(e) => {
                      setTargetNum(e.target.value);
                      store.set('evo_n_' + name, e.target.value);
                    }}
                    className="w-full px-3.5 py-2.5 pixel-input text-sm text-dark-text"
                    placeholder="5543999999999"
                    inputMode="numeric"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-pixel text-dark-muted mb-1.5">
                  INSTRUÇÃO DO SISTEMA (PROMPT DO GUARDIÃO)
                </label>
                <textarea
                  value={sysPrompt}
                  onChange={(e) => {
                    setSysPrompt(e.target.value);
                    store.set('evo_s_' + name, e.target.value);
                  }}
                  className="w-full px-3.5 py-2.5 pixel-input text-sm text-dark-text resize-y min-h-[85px]"
                />
              </div>

              {/* Bot actions */}
              <div className="flex gap-3 flex-wrap pt-2">
                <button
                  type="button"
                  onClick={handleToggleBot}
                  disabled={toggling}
                  className={`pixel-btn flex items-center gap-2 px-5 py-2.5 font-pixel text-xs disabled:opacity-50 cursor-pointer ${
                    isActive
                      ? 'bg-dark-danger hover:bg-dark-danger-hover text-white border-red-800'
                      : 'bg-dark-accent hover:bg-dark-accent-hover text-dark-bg'
                  }`}
                >
                  {toggling ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isActive ? (
                    <Square className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  {isActive ? 'PARAR BOT' : 'INICIAR BOT'}
                </button>
                <button
                  type="button"
                  onClick={handleDiagnose}
                  disabled={diagnosing}
                  className="pixel-btn flex items-center gap-2 px-4 py-2.5 font-pixel text-xs bg-dark-input-bg text-dark-text hover:border-dark-accent disabled:opacity-50 cursor-pointer"
                >
                  {diagnosing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Stethoscope className="w-4 h-4 text-sun-gold" />
                  )}
                  DIAGNÓSTICO
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
