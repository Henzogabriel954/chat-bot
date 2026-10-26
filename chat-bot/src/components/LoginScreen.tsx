// ── Cozy 16-bit Pixel Art Nature Admin Login Gate ──

import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, Loader2, ShieldCheck, AlertCircle, Lock, User } from 'lucide-react';
import * as api from '../api';

interface Props {
  onLoginSuccess: () => void;
}

export function LoginScreen({ onLoginSuccess }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) {
      setError('Preencha o usuário e a senha do Guardião.');
      return;
    }

    setLoading(true);
    try {
      await api.login(username.trim(), password);
      onLoginSuccess();
    } catch (err) {
      setError((err as Error).message || 'Credenciais inválidas.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen forest-bg-pattern text-dark-text relative flex items-center justify-center p-4 overflow-hidden">
      {/* Panoramic 16-bit Forest Background */}
      <img
        src="/assets/forest-banner.png"
        alt=""
        className="absolute inset-0 w-full h-full object-cover pixel-art opacity-35 pointer-events-none"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-dark-bg/85 via-dark-bg/80 to-dark-bg/95 pointer-events-none" />

      {/* Floating Firefly Particles */}
      <span
        className="absolute top-1/4 left-1/5 w-2.5 h-2.5 bg-sun-gold animate-firefly pointer-events-none shadow-[0_0_10px_#f59e0b]"
        style={{ animationDelay: '0.1s' }}
      />
      <span
        className="absolute bottom-1/4 right-1/4 w-2 h-2 bg-dark-accent animate-firefly pointer-events-none shadow-[0_0_10px_#22c55e]"
        style={{ animationDelay: '1.2s' }}
      />
      <span
        className="absolute top-1/3 right-1/5 w-2 h-2 bg-sun-gold animate-firefly pointer-events-none shadow-[0_0_10px_#f59e0b]"
        style={{ animationDelay: '2.1s' }}
      />

      {/* Login Gate Card */}
      <div className="relative z-10 w-full max-w-md pixel-card animate-slide-up overflow-hidden">
        {/* Card Header Banner */}
        <div className="relative px-6 pt-7 pb-5 text-center border-b-2 border-dark-border bg-dark-bg/80">
          <div className="w-20 h-20 mx-auto pixel-card-wood p-2.5 flex items-center justify-center mb-4">
            <img
              src="/assets/sprout-bot-icon.png"
              alt="WhatzBot Mascot"
              className="w-full h-full object-contain pixel-art"
            />
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 mb-2 bg-dark-accent/15 border border-dark-accent/40 text-dark-accent font-pixel text-[10px]">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>PORTÃO DO GUARDIÃO</span>
          </div>

          <h1 className="font-pixel text-xl text-dark-text tracking-wider">
            WHATZBOT
          </h1>
          <p className="text-xs text-dark-muted mt-1">
            Acesso restrito ao Administrador da Floresta
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 border-2 border-red-500/40 bg-red-500/10 text-red-300 flex items-center gap-2.5 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span className="font-pixel text-[11px] leading-relaxed">{error}</span>
            </div>
          )}

          <div>
            <label
              htmlFor="admin-username"
              className="flex items-center gap-1.5 text-xs font-pixel text-dark-muted mb-1.5"
            >
              <User className="w-3.5 h-3.5 text-dark-accent" />
              <span>USUÁRIO</span>
            </label>
            <input
              id="admin-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="administrador"
              autoComplete="username"
              autoFocus
              className="w-full px-3.5 py-2.5 pixel-input text-sm text-dark-text"
            />
          </div>

          <div>
            <label
              htmlFor="admin-password"
              className="flex items-center gap-1.5 text-xs font-pixel text-dark-muted mb-1.5"
            >
              <Lock className="w-3.5 h-3.5 text-sun-gold" />
              <span>SENHA</span>
            </label>
            <div className="relative">
              <input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full px-3.5 py-2.5 pr-10 pixel-input text-sm text-dark-text font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-muted hover:text-dark-text cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="pixel-btn w-full py-3 bg-dark-accent hover:bg-dark-accent-hover text-dark-bg font-pixel text-xs flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <span>🔓 ENTRAR NO PAINEL</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
