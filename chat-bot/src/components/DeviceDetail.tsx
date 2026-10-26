// ── Device detail panel: messages + bot config ──

import { useState } from 'react';
import {
  X, Send, Play, Square, Stethoscope, QrCode, LogOut, Trash2,
  Loader2, Bot, Users, User,
  RefreshCw, Smartphone, Wifi, WifiOff, MessageSquare,
} from 'lucide-react';
import { store, DEFAULT_SYSTEM_PROMPT } from '../utils';
import type { InstanceInfo, QRCodeData } from '../types';
import { useBotEngine } from '../hooks/useBotEngine';
import * as api from '../api';

interface Props {
  instance: InstanceInfo;
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
  const [text, setText] = useState('Olá! Teste da Evolution API.');
  const [sending, setSending] = useState(false);
  const [response, setResponse] = useState('');

  // ── Bot state ──
  const [anyPerson, setAnyPerson] = useState(store.get('evo_a_' + name) === '1');
  const [targetNum, setTargetNum] = useState(store.get('evo_n_' + name));
  const [sysPrompt, setSysPrompt] = useState(store.get('evo_s_' + name) || DEFAULT_SYSTEM_PROMPT);
  const [toggling, setToggling] = useState(false);
  const [diagnosing, setDiagnosing] = useState(false);

  // ── QR ──
  const [qrSrc, setQrSrc] = useState('');
  const [qrLoading, setQrLoading] = useState(false);

  // ── Instance actions ──
  const [actionLoading, setActionLoading] = useState('');

  const isActive = botEngine.isActive(name);

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
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-xl bg-dark-card border border-dark-border rounded-2xl shadow-2xl animate-slide-up">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-dark-muted hover:text-dark-text hover:bg-dark-input-bg transition-all z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Device header */}
        <div className="p-6 pb-4 flex items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-dark-accent/15 flex items-center justify-center">
              <Smartphone className="w-8 h-8 text-dark-accent" />
            </div>
            <span className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-dark-card ${
              isActive ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)]' : 'bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.4)]'
            }`} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-dark-text truncate">{name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${
                status === 'open'
                  ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                  : 'text-red-400 border-red-500/30 bg-red-500/10'
              }`}>
                {status === 'open' ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                {status === 'open' ? 'conectada' : 'desconectada'}
              </span>
              <span className="text-xs text-dark-muted">{owner || 'sem número'}</span>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="px-6 pb-3 flex gap-2 flex-wrap">
          <button onClick={handleQR} disabled={qrLoading} className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-dark-border rounded-lg text-dark-muted hover:text-dark-text hover:bg-dark-input-bg transition-all disabled:opacity-50">
            {qrLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <QrCode className="w-3 h-3" />} QR Code
          </button>
          <button onClick={handleLogout} disabled={actionLoading === 'logout'} className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-dark-border rounded-lg text-dark-muted hover:text-dark-text hover:bg-dark-input-bg transition-all disabled:opacity-50">
            {actionLoading === 'logout' ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogOut className="w-3 h-3" />} Desconectar
          </button>
          <button onClick={() => onRefresh()} className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-dark-border rounded-lg text-dark-muted hover:text-dark-text hover:bg-dark-input-bg transition-all">
            <RefreshCw className="w-3 h-3" /> Atualizar
          </button>
          <button onClick={handleDelete} disabled={actionLoading === 'delete'} className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-red-500/30 rounded-lg text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50 ml-auto">
            {actionLoading === 'delete' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />} Excluir
          </button>
        </div>

        {/* QR Code */}
        {qrSrc && (
          <div className="mx-6 mb-3 p-4 bg-white rounded-xl text-center">
            <img src={qrSrc} alt="QR Code" className="max-w-[220px] mx-auto" />
            <p className="text-xs text-gray-500 mt-2">WhatsApp → Aparelhos conectados → Conectar</p>
            <button onClick={() => setQrSrc('')} className="text-[10px] text-gray-400 mt-1 hover:text-gray-600">fechar</button>
          </div>
        )}

        {/* Tabs */}
        <div className="px-6 flex gap-1 border-b border-dark-border">
          <button
            onClick={() => setTab('bot')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px ${
              tab === 'bot' ? 'border-dark-accent text-dark-accent' : 'border-transparent text-dark-muted hover:text-dark-text'
            }`}
          >
            <Bot className="w-4 h-4" /> Bot IA
          </button>
          <button
            onClick={() => setTab('message')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px ${
              tab === 'message' ? 'border-dark-accent text-dark-accent' : 'border-transparent text-dark-muted hover:text-dark-text'
            }`}
          >
            <MessageSquare className="w-4 h-4" /> Mensagem manual
          </button>
        </div>

        {/* Tab content */}
        <div className="p-6">
          {tab === 'message' ? (
            /* ── Manual message tab ── */
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-dark-muted mb-1">Número com DDI e DDD</label>
                <input
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-dark-input-bg border border-dark-border rounded-lg text-sm text-dark-text focus:outline-none focus:ring-2 focus:ring-dark-accent/50 transition-all"
                  placeholder="5543999999999"
                  inputMode="numeric"
                />
              </div>
              <div>
                <label className="block text-xs text-dark-muted mb-1">Mensagem</label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="w-full px-3 py-2 bg-dark-input-bg border border-dark-border rounded-lg text-sm text-dark-text focus:outline-none focus:ring-2 focus:ring-dark-accent/50 transition-all resize-y min-h-[70px]"
                />
              </div>
              <button
                onClick={handleSend}
                disabled={sending}
                className="flex items-center gap-2 px-4 py-2 bg-dark-accent hover:bg-dark-accent-hover text-white text-sm font-semibold rounded-lg transition-all disabled:opacity-50"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Enviar
              </button>
              {response && (
                <pre className="p-3 bg-dark-input-bg border border-dark-border rounded-lg text-xs text-dark-muted overflow-auto max-h-[150px]">
                  {response}
                </pre>
              )}
            </div>
          ) : (
            /* ── Bot tab ── */
            <div className="space-y-4">
              {/* Who to respond */}
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={anyPerson}
                  onChange={(e) => {
                    setAnyPerson(e.target.checked);
                    store.set('evo_a_' + name, e.target.checked ? '1' : '0');
                  }}
                  className="w-4 h-4 rounded accent-dark-accent"
                />
                <span className="text-sm text-dark-text flex items-center gap-1.5 group-hover:text-dark-accent transition-colors">
                  <Users className="w-3.5 h-3.5" /> Responder qualquer pessoa
                </span>
              </label>

              {!anyPerson && (
                <div>
                  <label className="flex items-center gap-1.5 text-xs text-dark-muted mb-1">
                    <User className="w-3 h-3" /> Atender só este número
                  </label>
                  <input
                    value={targetNum}
                    onChange={(e) => { setTargetNum(e.target.value); store.set('evo_n_' + name, e.target.value); }}
                    className="w-full px-3 py-2 bg-dark-input-bg border border-dark-border rounded-lg text-sm text-dark-text focus:outline-none focus:ring-2 focus:ring-dark-accent/50 transition-all"
                    placeholder="5543999999999"
                    inputMode="numeric"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs text-dark-muted mb-1">Instrução do sistema</label>
                <textarea
                  value={sysPrompt}
                  onChange={(e) => { setSysPrompt(e.target.value); store.set('evo_s_' + name, e.target.value); }}
                  className="w-full px-3 py-2 bg-dark-input-bg border border-dark-border rounded-lg text-sm text-dark-text focus:outline-none focus:ring-2 focus:ring-dark-accent/50 transition-all resize-y min-h-[70px]"
                />
              </div>

              {/* Bot actions */}
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={handleToggleBot}
                  disabled={toggling}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all disabled:opacity-50 ${
                    isActive
                      ? 'bg-red-500/90 hover:bg-red-500 text-white'
                      : 'bg-dark-accent hover:bg-dark-accent-hover text-white'
                  }`}
                >
                  {toggling ? <Loader2 className="w-4 h-4 animate-spin" /> : isActive ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {isActive ? 'Parar bot' : 'Iniciar bot'}
                </button>
                <button
                  onClick={handleDiagnose}
                  disabled={diagnosing}
                  className="flex items-center gap-2 px-4 py-2 text-sm border border-dark-border rounded-lg text-dark-text hover:bg-dark-input-bg transition-all disabled:opacity-50"
                >
                  {diagnosing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Stethoscope className="w-4 h-4" />}
                  Diagnóstico
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
